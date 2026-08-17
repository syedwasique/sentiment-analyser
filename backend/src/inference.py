import os
import re
import json
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel
from nrclex import NRCLex
from typing import Dict
from textblob import TextBlob

MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"

# All model files sit at the repo root (adjust if you move them into a subfolder)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # repo root, since this file lives in src/
WEIGHTS_PATH = os.path.join(BASE_DIR, "best_hybrid_model.pt")
LABEL_MAP_PATH = os.path.join(BASE_DIR, "label_mapping.json")
TOKENIZER_PATH = os.path.join(BASE_DIR, "tokenizer")
MAX_LEN = 256

NRC_EMOTIONS = ["fear", "anger", "anticipation", "trust", "surprise",
                "positive", "negative", "sadness", "disgust", "joy"]

NEGATION_WORDS = {
    "not", "no", "never", "n't", "cant", "cannot", "don't", "dont",
    "doesn't", "doesnt", "didn't", "didnt", "wasn't", "wasnt",
    "weren't", "werent", "haven't", "hasn't", "won't", "wont",
    "wouldn't", "wouldnt", "couldn't", "couldnt", "shouldn't", "shouldnt",
    "without", "lack", "hardly", "barely",
    "nahi", "nahin", "na", "mat", "nhi"
}

ROMAN_URDU_DEP = {
    r"\budas\b", r"\budaas\b", r"\bdukh\b", r"\bdukhi\b", r"\bro\b", r"\brula\b", r"\btoot\b", r"\btoota\b", r"\bmarna\b", r"\bmarnay\b", r"\bmarne\b",
    r"zindagi se tang", r"tang aa gaya", r"tang aa gayi", r"\bbebus\b", r"\bbebas\b", r"\bakela\b", r"\bakele\b", r"\btanha\b",
    r"\btanhaai\b", r"apna koi nahi", r"kuch accha nahi", r"dil nahi lagta", r"dil tut", r"\bmayus\b", r"\bmayoos\b", r"\bnaumeed\b"
}

ROMAN_URDU_ANX_STRESS = {
    r"\btension\b", r"\bpareshan\b", r"\bparishan\b", r"\bpareshani\b", r"\bparishani\b", r"\bdarr\b", r"\bkhauf\b", r"\bghabrahat\b", r"\bghabrana\b",
    r"soch soch", r"dimag kharab", r"dimag fried", r"sar dard", r"sardard", r"thak gaya", r"thak gayi", r"thak chuka",
    r"sakoon nahi", r"sukoon nahi", r"pareshaniya", r"\bstress\b", r"\bmushkil\b", r"\bmusibat\b"
}

ROMAN_URDU_SARCSM_PRAISE = {
    r"\bwah\b", r"wah ji wah", r"kya baat hai", r"kia baat hai", r"bohot khoob", r"bahut khoob", r"sahi hai", r"kya kehne", r"\bshandar\b", r"\bzabardast\b"
}

_device = "cuda" if torch.cuda.is_available() else "cpu"
_tokenizer = None
_model = None
_emotion_labels = None
_sarcasm_pipeline = None


class HybridRobertaLexicon(nn.Module):
    """Must match the architecture used during training in Colab exactly."""
    def __init__(self, model_name, lexicon_dim=10, num_labels=4):
        super().__init__()
        self.roberta = AutoModel.from_pretrained(model_name)
        self.classifier = nn.Sequential(
            nn.Linear(768 + lexicon_dim, 256),
            nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(128, num_labels)
        )

    def forward(self, input_ids, attention_mask, nrc_feats):
        out = self.roberta(input_ids=input_ids, attention_mask=attention_mask)
        last_hidden = out.last_hidden_state
        mask = attention_mask.unsqueeze(-1).float()
        pooled = (last_hidden * mask).sum(1) / mask.sum(1).clamp(min=1e-9)
        combined = torch.cat([pooled, nrc_feats], dim=1)
        return self.classifier(combined)


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"[^\w\s\'\;.,!?]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_nrc_features(text: str) -> Dict[str, float]:
    if not isinstance(text, str) or not text.strip():
        return {emotion: 0.0 for emotion in NRC_EMOTIONS}

    words = re.findall(r"\b[\w']+\b", text.lower())
    if not words:
        return {emotion: 0.0 for emotion in NRC_EMOTIONS}

    raw_scores = {e: 0.0 for e in NRC_EMOTIONS}
    total_matches = 0

    for i, word in enumerate(words):
        lex = NRCLex()
        lex.load_raw_text(word)
        word_affects = lex.affect_frequencies

        # Check for preceding negation within window of 6 words
        window_start = max(0, i - 6)
        is_negated = any(w in NEGATION_WORDS or w.endswith("n't") for w in words[window_start:i])

        for affect, val in word_affects.items():
            if val > 0 and affect in NRC_EMOTIONS:
                if is_negated:
                    if affect in ("positive", "joy"):
                        raw_scores["negative"] += val
                        raw_scores["sadness"] += val
                    elif affect in ("negative", "sadness", "anger", "fear"):
                        raw_scores["positive"] += val
                    else:
                        raw_scores[affect] += val
                else:
                    raw_scores[affect] += val
                total_matches += 1

    if total_matches > 0:
        return {e: float(raw_scores[e] / total_matches) for e in NRC_EMOTIONS}

    lex = NRCLex()
    lex.load_raw_text(text)
    scores = lex.affect_frequencies
    return {e: float(scores.get(e, 0.0)) for e in NRC_EMOTIONS}


def _load_models():
    """Lazy-loads tokenizer, label map, fine-tuned hybrid model, and AI sarcasm pipeline."""
    global _tokenizer, _model, _emotion_labels, _sarcasm_pipeline
    if _model is not None:
        return

    print("Loading label mapping...")
    with open(LABEL_MAP_PATH) as f:
        label_data = json.load(f)
    _emotion_labels = label_data["EMOTION_LABELS"]

    print("Loading tokenizer...")
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    print("Loading fine-tuned hybrid model weights...")
    _model = HybridRobertaLexicon(MODEL_NAME, lexicon_dim=len(NRC_EMOTIONS), num_labels=len(_emotion_labels))
    _model.load_state_dict(torch.load(WEIGHTS_PATH, map_location=_device))
    _model.to(_device)
    _model.eval()

    print("Loading AI Sarcasm & Irony Model (cardiffnlp/twitter-roberta-base-irony)...")
    try:
        from transformers import pipeline
        dev_idx = 0 if _device == "cuda" else -1
        _sarcasm_pipeline = pipeline("text-classification", model="cardiffnlp/twitter-roberta-base-irony", device=dev_idx)
        print("AI Sarcasm model loaded successfully.")
    except Exception as e:
        print("Note: Could not load HuggingFace AI sarcasm pipeline:", e)

    print("Models loaded.")


def predict(raw_text: str) -> dict:
    """Full pipeline: raw text -> cleaned -> tokenized + lexicon features -> hybrid model -> prediction."""
    _load_models()

    cleaned = clean_text(raw_text)
    if not cleaned:
        return {"error": "Text is empty after cleaning."}

    lex_scores = extract_nrc_features(cleaned)
    lex_vector = torch.tensor([[lex_scores[e] for e in NRC_EMOTIONS]], dtype=torch.float32).to(_device)

    enc = _tokenizer(
        cleaned, truncation=True, padding='max_length',
        max_length=MAX_LEN, return_tensors='pt'
    ).to(_device)

    with torch.no_grad():
        logits = _model(enc['input_ids'], enc['attention_mask'], lex_vector)
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

    pred_idx = int(probs.argmax())

    # TextBlob & negation-based sanity check
    tb_polarity = TextBlob(cleaned).sentiment.polarity
    has_negation_of_positive = bool(re.search(
        r'\b(not|never|n\'t|dont|don\'t|don\s+t|doesn\'t|doesnt|didn\'t|didnt|wasn\'t|wasnt|weren\'t|werent|haven\'t|havent|hasn\'t|hasnt|hadn\'t|hadnt|ain\'t|aint|hardly|barely|no|cannot|cant|can\'t|without|lack\s+of|no\s+longer|stopped)\s+(even\s+|really\s+|very\s+|quite\s+|at\s+all\s+|always\s+|ever\s+|actually\s+|truly\s+|personally\s+|currently\s+|lately\s+|recently\s+|today\s+)?(been\s+|being\s+|be\s+|seem\s+|seems\s+|seemed\s+|sound\s+|sounds\s+|sounded\s+|look\s+|looks\s+|looked\s+|feel\s+|feels\s+|feeling\s+|felt\s+|do\s+|does\s+|doing\s+|did\s+|get\s+|gets\s+|getting\s+|got\s+|go\s+|going\s+|went\s+)?(like\s+|to\s+be\s+|up\s+to\s+)?(very\s+|really\s+|ever\s+|even\s+|at\s+all\s+|too\s+|that\s+|so\s+|much\s+|any\s+|completely\s+|fully\s+|100%\s+)?(happy|good|fine|okay|ok|alright|great|joy|joyful|pleased|cheerful|excited|well|peaceful|content|satisfied|better|best|hope|hopeful|smile|smiling|laugh|laughing|relief|relieved|peace|myself|normal|healthy|health|right|positive|positivity|safe|alive|energetic|motivated|rested|sane|thriving)\b|'
        r'\b(nothing|no\s*one|nobody|not\s+a\s+thing|hardly\s+anything|barely\s+anything)\s+(seems\s+to|is\s+able\s+to|can|could|will|ever)?\s*(make\s+me|help\s+me|bring\s+me|give\s+me|lift\s+my|cheer\s+me|comfort\s+me|change)?\s*(feel\s+better|feel\s+good|feel\s+happy|feel\s+well|happy|smile|joy|hope|pleasure|relief|peace|spirits|mood|better|okay|fine|laugh|help|work)\b|'
        r'\b(nothing|no\s*one|nobody|hardly\s+anything)\s+(helps|works|matters|changes|fixes\s+this|makes\s+a\s+difference|makes\s+me\s+smile|brings\s+joy|brings\s+happiness)\b|'
        r'\b(cannot|cant|can\'t|unable\s+to|hard\s+to|impossible\s+to|struggling\s+to|failed\s+to)\s+(seem\s+to\s+)?(find|feel|see|experience|get|have)?\s*(any\s+)?(joy|happiness|peace|hope|pleasure|meaning|purpose|relief|better|good|positive|smile|laugh|care|motivation|wellbeing)\b',
        cleaned, re.IGNORECASE
    ))

    # Social media & conversational sarcasm detection
    sarcasm_marker = bool(re.search(r'(/s|\b#sarcasm\b|\b#sarcastic\b|\b\(sarcasm\)\b)', raw_text, re.IGNORECASE))
    has_positive_word = bool(re.search(r'\b(great|fantastic|wonderful|amazing|love|perfect|perfection|brilliant|awesome|excellent|favorite|joy|best|blessing|outstanding|living the dream|just what i needed|thanks|wow|happier|time of my life|thrilled|blessed|glad|lucky|fun|enjoy|enjoying|best thing|fun time|what a joy|good times|cant wait|can\'t wait|so excited|so happy|excitement|proud|grateful|appreciate|thankful|kindness|incredible|motivated|exhilarating|completed|handled|better|good)\b', cleaned, re.IGNORECASE))
    has_distress_term = bool(re.search(
        r'\b(panic|anxiety|attack|insomnia|sleepless|breakdown|nightmare|stress|stressed|so stressed|stressing|stressful|overwhelmed|concentrate|lose focus|cant focus|can\'t focus|havent been able|haven\'t been able|dont know how i\'ll manage|don\'t know how i\'ll manage|cant manage|can\'t manage|cant cope|can\'t cope|struggling|drowning|terrible|terrible day|horrible|awful|miserable day|unwell|sick|ill|sickness|illness|fever|feverish|nauseous|nausea|dizzy|dizziness|fainting|fainted|vomiting|throwing up|in pain|hurting|hurts|headache|migraine|body ache|stomach ache|bad shape|not feeling well|not feeling good|not doing well)\b',
        cleaned, re.IGNORECASE
    ))

    # Negative/Frustrating situation context clues for sarcasm & disappointment contrast
    negative_context = bool(re.search(
        r'\b(crash|crashed|crashing|down|delay|delayed|late|wait|waiting|stuck|broken|error|fail|failed|failure|worst|bad|terrible|horrible|annoying|ruined|lost|lost my|useless|garbage|trash|pain|problem|issue|bug|glitch|cancelled|canceled|did nothing|did absolutely nothing|nothing was done|never fixed|never responded|ignored|ignoring|ignore|nothing seems|nothing helps|nothing works|wrong|go wrong|went wrong|mess|messed up|disaster|joke|waste|wasting|traffic)\b',
        cleaned, re.IGNORECASE
    ))

    # Conversational sarcasm / rhetorical irony pattern matching
    sarcastic_idioms = bool(re.search(
        r'(\bwhat could possibly go wrong\b|\bsounded (much )?better in your head\b|\bsetting the bar\b|\bexplaining the obvious\b|\bachieving the absolute minimum\b|\bexactly what everyone wanted\b|\brest of the world must be wrong\b|\blove waiting\b|\bfavorite hobby\b|\bpicked a worse (moment|time)\b|\bspecial kind of confidence\b|\balmost started caring\b|\bmaking it up as you go\b|\bdeserve an award\b|\badding more meetings\b|\bdisconnected from reality\b|\bbrilliant idea\b|\bfantastic timing\b|\boh yes, because\b|\bsure, because\b|\bnothing screams\b|\boh,? (great|brilliant|wonderful|fantastic|perfect|amazing)\b|\bjust (great|wonderful|perfect|what i needed)\b|\bso (great|wonderful|thrilled|excited|happy) about\b|\babsolute perfection\b|\bquality service\b|\bwhat a surprise\b|\bcould have been an email\b|\bstory of my life\b|\byay me\b)',
        cleaned, re.IGNORECASE
    ))

    # Burnout requires an exhaustion word + a workplace/overwork context clue
    has_exhaustion_word = bool(re.search(
        r'\b(exhausted|exhaustion|burnout|overworked|overworking|drained|zero patience|no patience|14-hour|12-hour|16-hour|10-hour|overtime|fatigue|fried brain|brain is fried|overwhelmed|so stressed|so much work)\b',
        cleaned, re.IGNORECASE
    ))
    has_work_context = bool(re.search(
        r'\b(working|work|job|days|hours|weeks|deadline|office|shift|sleep|slept|remember|relax|relaxed|cant sleep|no sleep|sleepless|finish|manage|concentrate)\b',
        cleaned, re.IGNORECASE
    ))
    has_burnout_term = (has_exhaustion_word and has_work_context) or bool(re.search(r'\b(so much work|dont know how i\'ll manage|don\'t know how i\'ll manage)\b', cleaned, re.IGNORECASE))

    # Roman Urdu emotion & sarcasm evaluation (using word-boundary regex)
    has_ru_dep = any(bool(re.search(pat, cleaned, re.IGNORECASE)) for pat in ROMAN_URDU_DEP)
    has_ru_anx = any(bool(re.search(pat, cleaned, re.IGNORECASE)) for pat in ROMAN_URDU_ANX_STRESS)
    has_ru_sarc = any(bool(re.search(pat, cleaned, re.IGNORECASE)) for pat in ROMAN_URDU_SARCSM_PRAISE) and (has_distress_term or has_burnout_term or has_ru_dep or has_ru_anx or negative_context)

    # Anger & Hostility keyword detection
    has_anger_term = bool(re.search(
        r'\b(punch|puch|kill|fight|attack|slap|beat|smash|destroy|furious|angry|rage|raging|hatred|hate|hating|enraged|enrage|seething|seethe|livid|outraged|infuriated|infuriating|gussa|ghussa|nafrat|maroonga|maaroonga|shut up|threat|annoyed|annoying|frustrated|frustrating|irritated|irritating|pissed|mad|resent|resentful|disgusted|disgusting|sick of|tired of|fed up|had enough|lost my temper|drives me crazy|driving me crazy|makes me sick|makes me mad|did nothing|did absolutely nothing|didnt do anything|didn\'t do anything|nothing was done|never fixed|never responded|never helped|ignored|scam|liars|lied|empty promise|broken promise|useless|waste of time|rude|rudely|disrespectful|disrespect|appalling|outrageous|unacceptable|unbelievable|cannot believe|can\'t believe|disgusting behavior|disgraceful|shameful|insolent|insolence|contempt|contemptuous|condescending|belittle|belittling|bully|bullying|hostile|hostility|aggressive|aggression|intimidate|intimidating|threatening|terrible|horrible|awful|worst|ruined|ridiculous|wrong|garbage|trash|poor service|complaint|refused|denied|cold|waited)\b|\b(cant stand|can\'t stand|nobody listens|nobody ever listens|no one listens|nobody listens|why does nobody|dont want to talk|don\'t want to talk|dont want to deal|don\'t want to deal|screw this|screw you|how dare|how dare they|how dare you)\b|\bhit\s+(him|her|them|me|us|you|people|person|face|head)\b',
        cleaned, re.IGNORECASE
    ))
    nrc_anger = lex_scores.get("anger", 0.0)
    anger_score = 0.95 if has_anger_term else (min(1.0, nrc_anger * 2.5) if nrc_anger > 0 else 0.0)

    # AI HuggingFace Sarcasm Model Inference (Zero-Shot Irony/Sarcasm Classifier)
    ai_sarcasm_detected = False
    if _sarcasm_pipeline is not None:
        try:
            res = _sarcasm_pipeline(raw_text[:256])[0]
            label = str(res.get('label', '')).lower()
            score = float(res.get('score', 0.0))
            if label in ('label_1', 'irony', 'sarcasm', 'ironic'):
                if score >= 0.85:
                    ai_sarcasm_detected = True
                elif score >= 0.65 and (ironic_contrast or negative_context or has_distress_term or has_burnout_term):
                    ai_sarcasm_detected = True
        except Exception as e:
            pass

    is_genuine_gratitude = bool(re.search(r'\b(thankful|grateful|appreciate|help me|helped me)\b', cleaned, re.IGNORECASE))
    ironic_contrast = False # Disabled: Naive rule breaks mixed emotions
    is_sarcastic = sarcasm_marker or has_ru_sarc or sarcastic_idioms or ai_sarcasm_detected

    # Override: If AI sarcasm fires but all heuristic signals point to genuine positivity → trust the keywords over the AI model
    if is_sarcastic and not sarcasm_marker and not sarcastic_idioms and not ironic_contrast:
        # has_positive_word is already defined above; use it here (has_positive_keywords is defined later)
        if has_positive_word and not negative_context and not has_distress_term and not has_anger_term:
            is_sarcastic = False

    # =========================================================================
    # HOLISTIC FULL-SENTENCE MULTI-CLAUSE EMOTION ENGINE
    # =========================================================================
    # Check for Emotional Growth, Self-Control & Conflict Resolution Patterns
    has_conflict_resolution = bool(re.search(
        r'\b(stood up for myself|instead of letting my anger|control my anger|overcame my anger|managed my anger|solved (the|our|this|a) problem|solved it|resolved (it|the issue|our problem)|worked (it|things) out|fixed it together|helped me calm down|calmed down|calmed me down|feeling calm|feel calm|felt calm|completely calm|stayed calm|remained calm|comfortable|felt comfortable|feel comfortable|completely comfortable|at ease|felt at ease|relaxed|felt relaxed|feeling relaxed|apologized|made peace|forgave|reconciled|made up|peace now|talked it out|talked about it|talked through it|communicated|spoke about it|chose peace|choose peace|chose calm|found peace|deep breath|took a breath|compromise|found a compromise|listened and fixed|cleared my head|clear my head|everything is good now|everything is fine now|all good now|no longer angry|not angry anymore|not angry|no longer mad|not mad anymore|stopped being angry|stopped being mad|no longer sad|not sad anymore|not sad|no longer depressed|no longer scared|not scared anymore|not scared|no longer anxious|not anxious anymore|not anxious|no longer nervous|not nervous anymore|not nervous|over it now|moved past it|let it go|letting it go|no longer upset|not upset anymore)\b',
        cleaned, re.IGNORECASE
    ))

    # 1. Full-Sentence Clause Segmentation & Discourse Transition Detection
    contrast_match = re.search(r'(\b(but|however|yet|nonetheless|nevertheless|although|even though|still|instead|except|though|despite)\b|;)', cleaned, re.IGNORECASE)
    has_contrast_conjunction = bool(contrast_match)

    has_positive_resolution = has_conflict_resolution
    has_negative_resolution = False

    if has_contrast_conjunction or bool(re.search(r'\b(even though|although|despite)\b', cleaned, re.IGNORECASE)):
        parts = re.split(r'(\b(?:but|however|yet|nonetheless|nevertheless|although|even though|still|instead|except|though|despite)\b|;)', cleaned, flags=re.IGNORECASE)
        if len(parts) >= 2:
            resolution_part = " ".join([p for p in parts[1:] if p]).strip()

            # Positive resolution in the final clause (e.g. "past bad event, BUT now laughing / day turned around")
            if bool(re.search(
                r'\b(turned (my|the) day around|turned it around|turned around|laughing|laugh|smiling|smile|feeling better|much better|happy now|glad|great now|fine now|worked out|all good|worth it|made my day|turned out great|turned out well|solved|apologized|calm down|feel calm|felt calm|completely calm|stayed calm|remained calm|comfortable|felt comfortable|feel comfortable|completely comfortable|at ease|felt at ease|relaxed|felt relaxed|feeling relaxed|peaceful|talked it out|talked through it|chose peace|deep breath|compromise|clear my head|good now|fine now|proud|handled it|nailed it|relieved|succeeded|did great|went well|went great|went smoothly|happy with|happy about|hopeful|grateful|thankful|optimistic|excited|looking forward|blessed|better now|better off|learned from it|learned a lot|moved on|moving on|no longer angry|not angry anymore|not angry|no longer mad|not mad anymore|stopped being angry|stopped being mad|no longer sad|not sad anymore|not sad|no longer depressed|no longer scared|not scared anymore|not scared|no longer anxious|not anxious anymore|not anxious|no longer nervous|not nervous anymore|not nervous|over it now|moved past it|let it go|letting it go|no longer upset|not upset anymore|motivated|inspired|determined|confident|stronger|ready|try again|improving|focused)\b',
                resolution_part, re.IGNORECASE
            )):
                has_positive_resolution = True
                
            if not has_positive_resolution:
                # Generalized fallback: If ANY positive keyword exists in the resolution part, count it as a positive resolution
                res_has_pos = bool(re.search(
                    r'\b(happy|great|wonderful|awesome|joy|joyful|joyous|blessed|excited|love|loved|glad|proud|delighted|pleased|feeling good|fitness|milestone|good day|nice|amazing|worth|finally|got the job|promotion|passed|success|successful|achieved|yay|congrats|cheers|laughing|thrilled|overjoyed|elated|ecstatic|jubilant|loving|enjoying|energized|grateful|thankful|pumped|stoked|fantastic|cheerful|radiant|blissful|content|glowing|hopeful|optimistic|motivated|inspired|determined|confident|stronger|ready|try again|improving|focused)\b',
                    resolution_part, re.IGNORECASE
                ))
                if res_has_pos:
                    has_positive_resolution = True
                    
            if has_positive_resolution:
                # Cancel positive resolution if the user is explicitly stating a NEW negative state (e.g. 'I am not angry anymore, I am just disappointed')
                if bool(re.search(r'\b(i am|i\'m|im|i feel|just|still)\s+(sad|depressed|hopeless|miserable|lonely|alone|worthless|useless|exhausted|terrible|disappointed)\b', resolution_part, re.IGNORECASE)):
                    has_positive_resolution = False
                    has_conflict_resolution = False

            # Negative resolution / broken expectation in the final clause (e.g. "promised to fix it, BUT did nothing / failed")
            has_negative_resolution = bool(re.search(
                r'\b(did (absolutely )?nothing|did zero|didnt do anything|didn\'t do anything|nothing was done|never fixed|never came|never responded|never helped|failed to|failed|broken promise|empty promise|waste of time|waste of money|scam|liars|lied|no response|ignored me|ignored us|zero help|useless|worse|worsened)\b',
                resolution_part, re.IGNORECASE
            ))

    if bool(re.search(r'\b(promised|promised they would|said they would|agreed to|supposed to)\b.*?\b(but|however|yet)\b.*?\b(nothing|didnt|didn\'t|never|failed|ignored|useless)\b', cleaned, re.IGNORECASE)):
        has_negative_resolution = True

    # 2. Full-Sentence Polarity & Protect genuinely positive posts
    has_positive_keywords = bool(re.search(
        r'\b(happy|great|wonderful|awesome|joy|joyful|joyous|blessed|excited|love|loved|glad|proud|delighted|pleased|feeling good|fitness|milestone|good day|nice|amazing|worth|finally|got the job|promotion|passed|success|successful|achieved|yay|congrats|cheers|turned my day around|laughing|stood up for myself|calm down|calm|comfortable|relaxed|at ease|peaceful|apologized|thrilled|overjoyed|elated|ecstatic|jubilant|loving|enjoying|energized|grateful|thankful|pumped|stoked|fantastic|cheerful|radiant|wonderful|blissful|content|glowing|hopeful|optimistic|looking forward|motivated|inspired|determined|confident|stronger|ready|try again|improving|focused|incredible|energy|excitement|exhilarating|completed|better|appreciate|kindness|good|handled)\b',
        cleaned, re.IGNORECASE
    ))

    has_explicit_anxiety = bool(re.search(
        r'\b(panic|panicking|anxiety|anxious|nervous|nervousness|attack|fear|fearful|terrified|terrifying|dread|dreading|apprehensive|apprehension|worry|worrying|worried|chest|shaking|trembling|stressed|so stressed|stressing|stressful|under pressure|pressure|so much pressure|mind is racing|racing mind|overwhelming|overwhelmed|cant concentrate|can\'t concentrate|unable to concentrate|havent been able|haven\'t been able|dont know how i\'ll manage|don\'t know how i\'ll manage|cant handle|can\'t handle|cant cope|can\'t cope|struggling to manage|so much work|tense|tension|wound up|keyed up|on edge|on edge|heart is racing|racing heart|heart racing|hyperventilat|scare|scared|scaring)\b',
        cleaned, re.IGNORECASE
    ))

    # Check for Pragmatic Task Management & Fact-based Duty Statements
    has_pragmatic_task = bool(re.search(
        r'\b(thinking about how to manage|how to manage|organizing my|planning my|preparing for|assignments due|tasks due|deadlines this week|busy schedule|managing my workload|figuring out|getting ready for|handling my duties|preparing my|list of tasks|tasks to complete|organize my time|midterms|upcoming midterms|study for|map out a schedule|study routine|work orders|pending work|how to handle|weekly budget|budget|planning how to allocate|allocate my expenses)\b',
        cleaned, re.IGNORECASE
    ))

    # Check for Uncertainty, Result Anticipation & Outcome Suspense Patterns
    has_uncertainty_anticipation = bool(re.search(
        r'\b(dont know what the results|don\'t know what the results|waiting to find out|waiting for (the|my)?\s*results|awaiting (the|my)?\s*results|awaiting the outcome|waiting to hear back|waiting to see|uncertain about the outcome|dont know what will happen|don\'t know what will happen|waiting for news|waiting for an update|anxious about the results|wondering what the result|interview outcome|not sure what to expect|not sure what will happen|waiting for outcome)\b',
        cleaned, re.IGNORECASE
    ))

    has_explicit_depression = bool(re.search(
        r'\b(sad|sadness|depressed|depression|hopeless|hopelessness|empty|emptiness|hollow|'
        r'crying|cried|tears|tearful|sobbing|weeping|miserable|misery|disappoint|disappointed|disappointment|'
        r'lonely|loneliness|alone|isolated|isolation|no one cares|nobody cares|nobody loves me|'
        r'worthless|worthlessness|useless|failure|feel like a failure|i am a failure|i\'m a failure|'
        r'suicidal|suicide|want to die|wanna die|end my life|end it all|'
        r'(?<!not )\b(give up|given up|giving up)\b|cant go on|can\'t go on|cannot go on|no point|no purpose|no reason to live|no will to live|'
        r'cannot take this anymore|can\'t take this anymore|cant take this anymore|cant take it anymore|can\'t take it anymore|cannot take it anymore|'
        r'cannot do this anymore|can\'t do this anymore|cant do this anymore|cant stand this anymore|can\'t stand this anymore|'
        r'cannot handle this anymore|can\'t handle this anymore|cant handle this anymore|'
        r'so done|i am so done|i\'m so done|im so done|done with everything|done with life|done with this|'
        r'nothing matters|nothing feels|nothing feels right|nothing feels good|'
        r'nothing seems to|nothing seems|nothing makes me|nothing helps|nothing works|nothing can fix|'
        r'nothing makes a difference|nothing changes|nothing ever changes|nothing brings joy|'
        r'no matter what i do|even when good things|lost interest in|lost all interest|'
        r'numb|feeling numb|emotionally numb|dead inside|feel dead|'
        r'lost all hope|lost hope|no hope|losing hope|'
        r'exhausted by life|tired of living|tired of everything|tired of feeling|'
        r'dark place|in a dark|very dark place|'
        r'breaking down|fell apart|falling apart|feel broken|i am broken|dying inside|'
        r'sleep all day|stay in bed|lay in bed|lie in bed|sleep forever|want to sleep forever|'
        r'exhausted of living|exhausted of life|exhausted by life|tired of living|tired of life|tired of everything|tired of feeling|'
        r'(cant|can\'t|cannot|hard to)\s+(even\s+)?(get\s+out\s+of\s+bed|wake\s+up|leave\s+the\s+house|leave\s+bed|get\s+up|function|exist)|'
        r'low mood|bad mood|down mood|feel down|feeling down|'
        r'feeling\s+(really\s+|very\s+|so\s+|pretty\s+|a bit\s+|quite\s+|deeply\s+|completely\s+|totally\s+|extremely\s+)?(down|low|sad|blue|depressed|miserable|hopeless|empty|numb|lost|broken|worthless|useless|defeated|drained)|'
        r'feel\s+(really\s+|very\s+|so\s+|pretty\s+|a bit\s+|quite\s+|deeply\s+|completely\s+|totally\s+|extremely\s+)?(down|low|sad|blue|depressed|miserable|hopeless|empty|numb|lost|broken|worthless|useless|defeated|drained)|'
        r'felt\s+(really\s+|very\s+|so\s+|pretty\s+|a bit\s+|quite\s+|deeply\s+|completely\s+|totally\s+|extremely\s+)?(down|low|sad|blue|depressed|miserable|hopeless|empty|numb|lost|broken|worthless|useless|defeated|drained)|'
        r'been\s+(feeling|felt)\s+(really\s+|very\s+|so\s+|pretty\s+|a bit\s+|quite\s+|deeply\s+|completely\s+|totally\s+|extremely\s+)?(down|low|sad|blue|depressed|miserable|hopeless|empty|numb|lost|broken)|'
        r'feeling\s+down\s+lately|feeling\s+really\s+down\s+lately|been\s+feeling\s+down|'
        r'dont want to be here|don\'t want to be here|'
        r'feel like disappearing|want to disappear|wish i could disappear|'
        r'hate\s+(everything\s+about\s+)?(myself|my\s+life|life|who\s+i\s+am|waking\s+up|how\s+i|how\s+my)|'
        r'sick of feeling|sick of living|sick of this pain|tired of this pain|'
        r'frustrated with myself|disgusted with myself|nothing gets better|nothing ever gets better|'
        r'everything is terrible|everything is ruined|terrible day|horrible|awful|miserable day|'
        r'(haven\'t|havent|hasn\'t|hasnt|don\'t|dont|doesn\'t|doesnt|didn\'t|didnt|wasn\'t|wasnt|weren\'t|werent|ain\'t|aint|not|never)\s+(been\s+)?(feeling|feel|felt|doing|do|did|seem|seems|seemed)(\s+(to\s+be|like))?\s+(very\s+|really\s+|so\s+|too\s+|that\s+)?(well|good|great|okay|ok|alright|fine|myself|normal|better|happy|healthy|right|positive|up\s+to\s+it|100%)\b|'
        r'(feeling|feel|felt|am|is|are|was|were|been)\s+(unwell|ill|sick|bad|awful|terrible|horrible|in\s+pain|nauseous|dizzy|weak|feverish|hurting)\b|'
        r'(nobody|no\s*one)\s+(really\s+)?(understands|gets|listens|cares)|'
        r'what\s+i(\'m|\s+am)\s+going\s+through|'
        r'(miss|wish)\s+(how\s+)?things\s+(used\s+to\s+be|were|were\s+like|before)|'
        r'wish\s+i\s+could\s+go\s+back|used\s+to\s+be\s+happier|'
        r'carrying this alone|alone in this|feels so heavy|heavy heart|'
        r'no energy|zero energy|no motivation|lost all motivation|'
        r'crying\s+(all\s+day|nonstop|non-stop|every\s+day|myself\s+to\s+sleep)|'
        r'cant stop crying|can\'t stop crying|cannot stop crying|'
        r'feel\s+like\s+a\s+burden|i am a burden|i\'m a burden|burden to everyone)\b',
        cleaned, re.IGNORECASE
    ))

    # =========================================================================
    # NEGATIVE CONTRAST RESOLUTION (e.g., "I seemed angry, but I was scared")
    # =========================================================================
    if has_contrast_conjunction:
        parts = re.split(r'\b(but|however|yet|nonetheless|nevertheless|although|even though|still|instead|except|though|despite)\b', cleaned, flags=re.IGNORECASE)
        if len(parts) >= 2:
            resolution_part = " ".join(parts[1:]).strip()
            
            res_has_anx = bool(re.search(
                r'\b(panic|panicking|anxiety|anxious|nervous|nervousness|attack|fear|fearful|terrified|terrifying|dread|dreading|apprehensive|apprehension|worry|worrying|worried|chest|shaking|trembling|stressed|so stressed|stressing|stressful|under pressure|pressure|so much pressure|mind is racing|racing mind|overwhelming|overwhelmed|cant concentrate|can\'t concentrate|unable to concentrate|havent been able|haven\'t been able|dont know how i\'ll manage|don\'t know how i\'ll manage|cant handle|can\'t handle|cant cope|can\'t cope|struggling to manage|so much work|tense|tension|wound up|keyed up|on edge|on edge|heart is racing|racing heart|heart racing|hyperventilat|scare|scared|scaring)\b',
                resolution_part, re.IGNORECASE
            ))
            
            res_has_dep = bool(re.search(
                r'\b(sad|sadness|depressed|depression|hopeless|hopelessness|empty|emptiness|hollow|'
                r'crying|cried|tears|tearful|sobbing|weeping|miserable|misery|'
                r'lonely|loneliness|alone|isolated|isolation|no one cares|nobody cares|nobody loves me|'
                r'tired|tired of|exhausted|give up|giving up|can\'t go on|cant go on|'
                r'worthless|worthlessness|useless|failure|burden|'
                r'hurt|hurts|pain|painful|broken|ruined|grief|grieving|lost|'
                r'suicide|suicidal|kill myself|die|dead|end it|end my life|not want to live|dont want to live)\b',
                resolution_part, re.IGNORECASE
            ))

            res_has_ang = bool(re.search(
                r'\b(punch|puch|kill|fight|attack|slap|beat|smash|destroy|furious|angry|rage|raging|hatred|hate|hating|enraged|enrage|seething|seethe|livid|outraged|infuriated|infuriating|gussa|ghussa|nafrat|maroonga|maaroonga|shut up|threat|annoyed|annoying|frustrated|frustrating|irritated|irritating|pissed|mad|resent|resentful|disgusted|disgusting|sick of|tired of|fed up|had enough|lost my temper|drives me crazy|driving me crazy|makes me sick|makes me mad|did nothing|did absolutely nothing|didnt do anything|didn\'t do anything|nothing was done|never fixed|never responded|never helped|ignored|scam|liars|lied|empty promise|broken promise|useless|waste of time)\b',
                resolution_part, re.IGNORECASE
            ))
            
            # If the resolution is explicitly one of the negative emotions, we nullify the others
            # But ONLY if the resolution is not actually a positive/conflict resolution (like "not angry")
            if not (has_positive_resolution or has_conflict_resolution):
                if res_has_anx and not res_has_ang and not res_has_dep:
                    has_explicit_anxiety = True
                    has_anger_term = False
                    has_explicit_depression = False
                elif res_has_dep and not res_has_ang and not res_has_anx:
                    has_explicit_depression = True
                    has_anger_term = False
                    has_explicit_anxiety = False
                elif res_has_ang and not res_has_dep and not res_has_anx:
                    has_anger_term = True
                    has_explicit_anxiety = False
                    has_explicit_depression = False

    if bool(re.search(r'\b(not angry|not mad|no longer angry|no longer mad|stopped being angry|stopped being mad)\b', cleaned, re.IGNORECASE)):
        has_anger_term = False

    # Strictly protect genuinely positive posts: MUST have positive keywords and NO negative cues
    # --- Neutral sentence protection: detect clearly factual/neutral sentences ---
    # A sentence is neutral when it has NO emotional markers of any kind and
    # TextBlob polarity is near zero. We do NOT rely on model raw probabilities
    # because the base model is biased toward Anxious/Stress for factual text.
    has_neutral_sentence = bool(
        not is_sarcastic and
        not has_positive_resolution and
        not has_distress_term and
        not has_explicit_anxiety and
        not has_explicit_depression and
        not has_burnout_term and
        not has_anger_term and
        not has_negation_of_positive and
        not has_ru_dep and
        not has_ru_anx and
        not has_positive_keywords and
        not sarcasm_marker and
        not sarcastic_idioms and
        tb_polarity >= -0.40 and tb_polarity <= 0.55
    )

    has_negative_indicators = bool(
        has_distress_term or
        has_explicit_anxiety or
        has_explicit_depression or
        has_burnout_term or
        has_anger_term or
        has_ru_dep or
        has_ru_anx or
        has_negation_of_positive or
        has_negative_resolution or
        has_pragmatic_task or
        has_uncertainty_anticipation or
        sarcasm_marker or
        sarcastic_idioms or
        tb_polarity < -0.40 or
        bool(re.search(r'\b(nothing|nobody|no one|never|cannot|cant|can\'t|dont|don\'t|bad|sad|pain|hurts|hurt|alone|lost|empty|hopeless|tired|exhausted|useless|broken|fail|failure|dread|dark|miss|sick|sick of|unwell|ill|crying|tears|terrible|horrible|worst|ruined|garbage|trash|not well|not good|not okay|not fine|not great|not happy)\b', cleaned, re.IGNORECASE))
    )

    has_accomplishment_or_gratitude = bool(re.search(r'\b(finally completed|proud|appreciate|grateful|thankful|achieved|success|exhilarating|not giving up|never give up|didn\'t give up|didnt give up|won\'t give up)\b', cleaned, re.IGNORECASE))

    # If clearly neutral or has a positive resolution, override negative indicators
    if has_neutral_sentence or has_positive_resolution or has_accomplishment_or_gratitude:
        has_negative_indicators = False

    is_genuinely_positive = not is_sarcastic and not has_negation_of_positive and (
        has_positive_resolution or has_accomplishment_or_gratitude or
        (has_positive_keywords and (tb_polarity >= -0.20 or has_conflict_resolution) and not has_negative_indicators)
    )

    # 3. Trust the 5-Emotion Neural Network output directly
    # Map native PyTorch model outputs
    hap_prob = float(probs[0])
    neu_prob = float(probs[1])
    anx_prob = float(probs[2])
    dep_prob = float(probs[3])
    ang_prob = float(probs[4]) if len(probs) > 4 else 0.00

    # 4. Strict Negative Fallback (Safety Net)
    # If the sentence has NO genuinely positive context, but contains strong negative indicators,
    # we CANNOT allow Happy/Positive to be the dominant class.
    if not is_genuinely_positive and has_negative_indicators:
        hap_prob = 0.00
        neu_prob = 0.00
        
        # Boost negative probabilities based on explicit keywords
        if has_explicit_anxiety or has_distress_term or has_burnout_term or has_ru_anx or has_pragmatic_task or has_uncertainty_anticipation:
            anx_prob = max(0.85, anx_prob + 0.50)
            
        if has_explicit_depression or has_ru_dep or has_negation_of_positive or tb_polarity < -0.2:
            dep_prob = max(0.85, dep_prob + 0.50)
            
        if (has_anger_term and not has_conflict_resolution) or has_negative_resolution or (is_sarcastic and not sarcasm_marker and not sarcastic_idioms):
            ang_prob = max(0.85, ang_prob + 0.50)
            
        # Fallback if no specific negative category was strongly triggered but it's generally negative
        if anx_prob < 0.3 and dep_prob < 0.3 and ang_prob < 0.3:
            dep_prob = max(0.60, dep_prob + 0.40)

    # 5. Universal TextBlob Safety Net
    # If TextBlob (standard English NLP) clearly sees the sentence as negative
    # but the neural network is still showing Happy/Positive as the top class, override it.
    # This catches any natural everyday sentences the model may have missed.
    if tb_polarity < -0.15 and not is_genuinely_positive and hap_prob > (dep_prob + anx_prob + ang_prob):
        hap_prob = 0.00
        neu_prob = 0.00
        if dep_prob < 0.50:
            dep_prob = max(0.65, dep_prob + 0.40)

    # Build 5-Emotion Class Distribution for UI (Neutral included)
    ui_emotion_scores = {
        "Anger/Hostility": round(ang_prob, 4),
        "Anxious/Stress": round(anx_prob, 4),
        "Depressed/Sad": round(dep_prob, 4),
        "Happy/Positive": round(hap_prob, 4),
        "Neutral": round(neu_prob, 4),
    }

    # Normalize UI scores to sum to 1.0 safely
    total_ui = sum(ui_emotion_scores.values())
    if total_ui > 0:
        ui_emotion_scores = {k: round(v / total_ui, 4) for k, v in ui_emotion_scores.items()}
    else:
        # Fallback to Depressed/Sad if neutral/unclassified low score
        ui_emotion_scores["Depressed/Sad"] = 1.00

    # Primary predicted emotion label
    top_emotion = max(ui_emotion_scores.items(), key=lambda item: item[1])
    predicted_label = top_emotion[0]
    confidence = top_emotion[1]

    return {
        "predicted_label": predicted_label,
        "confidence": confidence,
        "all_scores": ui_emotion_scores,
        "lexicon_scores": lex_scores,
        "cleaned_text": cleaned,
        "is_sarcastic": is_sarcastic,
        "anger_score": round(float(anger_score), 4),
        "keyword_flags": {
            "has_burnout_term": has_burnout_term,
            "has_anger_term": has_anger_term,
            "has_distress_term": has_distress_term,
            "has_negation_of_positive": has_negation_of_positive,
            "has_ru_dep": has_ru_dep,
            "has_ru_anx": has_ru_anx,
            "has_pragmatic_task": has_pragmatic_task,
            "has_uncertainty_anticipation": has_uncertainty_anticipation,
            "has_explicit_anxiety": has_explicit_anxiety,
        },
    }


if __name__ == "__main__":
    tests = [
        "just got back from the gym feeling amazing today",
        "cant stop worrying about my exam tomorrow, my chest feels tight",
        "nothing feels worth it anymore, I just want to sleep all day",
        "i am not very happy",
    ]
    for t in tests:
        result = predict(t)
        print(f"{t!r} -> {result['predicted_label']} ({result['confidence']:.2%})")
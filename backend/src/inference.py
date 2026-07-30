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
    text = re.sub(r"[^\w\s\']", " ", text)
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
        r'\b(not|never|n\'t|dont|don\'t|no|cant|cannot|isnt|isn\'t|wasnt|wasn\'t|aren\'t|arent)\s+(very\s+)?(happy|good|fine|okay|great|joy|pleased|cheerful|excited|well|peaceful|content|satisfied)\b',
        cleaned, re.IGNORECASE
    ))

    # Social media & conversational sarcasm detection
    sarcasm_marker = bool(re.search(r'(/s|\b#sarcasm\b|\b#sarcastic\b|\b\(sarcasm\)\b)', raw_text, re.IGNORECASE))
    has_positive_word = bool(re.search(r'\b(great|fantastic|wonderful|amazing|love|perfect|perfection|brilliant|awesome|excellent|favorite|joy|best|blessing|outstanding|living the dream|just what i needed)\b', cleaned, re.IGNORECASE))
    has_distress_term = bool(re.search(r'\b(panic|anxiety|attack|depressed|depression|insomnia|sleepless|breakdown|miserable|crying|nightmare|stress)\b', cleaned, re.IGNORECASE))
    
    # Negative/Frustrating situation context clues for sarcasm contrast
    negative_context = bool(re.search(
        r'\b(crash|crashed|crashing|down|delay|delayed|late|wait|waiting|stuck|broken|error|fail|failed|failure|worst|bad|terrible|horrible|annoying|ruined|lost|lost my|useless|garbage|trash|pain|problem|issue|bug|glitch|cancelled|canceled)\b',
        cleaned, re.IGNORECASE
    ))

    # Conversational sarcasm / rhetorical irony pattern matching
    sarcastic_idioms = bool(re.search(
        r'(\bwhat could possibly go wrong\b|\bsounded (much )?better in your head\b|\bsetting the bar\b|\bexplaining the obvious\b|\bachieving the absolute minimum\b|\bexactly what everyone wanted\b|\brest of the world must be wrong\b|\blove waiting\b|\bfavorite hobby\b|\bpicked a worse (moment|time)\b|\bspecial kind of confidence\b|\balmost started caring\b|\bmaking it up as you go\b|\bdeserve an award\b|\badding more meetings\b|\bdisconnected from reality\b|\bbrilliant idea\b|\bfantastic timing\b|\boh yes, because\b|\bsure, because\b|\bnothing screams\b|\boh,? (great|brilliant|wonderful|fantastic|perfect|amazing)\b|\bjust (great|wonderful|perfect|what i needed)\b|\bso (great|wonderful|thrilled|excited|happy) about\b|\babsolute perfection\b|\bquality service\b|\bwhat a surprise\b)',
        cleaned, re.IGNORECASE
    ))

    # Burnout requires an exhaustion word + a workplace/overwork context clue
    has_exhaustion_word = bool(re.search(
        r'\b(exhausted|exhaustion|burnout|overworked|overworking|drained|zero patience|no patience|14-hour|12-hour|16-hour|10-hour|overtime|fatigue|fried brain|brain is fried|overwhelmed)\b',
        cleaned, re.IGNORECASE
    ))
    has_work_context = bool(re.search(
        r'\b(working|work|job|days|hours|weeks|deadline|office|shift|sleep|slept|remember|relax|relaxed|cant sleep|no sleep|sleepless)\b',
        cleaned, re.IGNORECASE
    ))
    has_burnout_term = has_exhaustion_word and has_work_context

    # Roman Urdu emotion & sarcasm evaluation (using word-boundary regex)
    has_ru_dep = any(bool(re.search(pat, cleaned, re.IGNORECASE)) for pat in ROMAN_URDU_DEP)
    has_ru_anx = any(bool(re.search(pat, cleaned, re.IGNORECASE)) for pat in ROMAN_URDU_ANX_STRESS)
    has_ru_sarc = any(bool(re.search(pat, cleaned, re.IGNORECASE)) for pat in ROMAN_URDU_SARCSM_PRAISE) and (has_distress_term or has_burnout_term or has_ru_dep or has_ru_anx or negative_context)

    # Anger & Hostility keyword detection (requires physical attack target for "hit")
    has_anger_term = bool(re.search(
        r'\b(punch|puch|kill|fight|attack|slap|beat|smash|destroy|furious|angry|rage|raging|hatred|hate|gussa|ghussa|nafrat|maroonga|maaroonga|shut up|threat)\b|\bhit\s+(him|her|them|me|us|you|people|person|face|head)\b',
        cleaned, re.IGNORECASE
    ))
    nrc_anger = lex_scores.get("anger", 0.0)
    anger_score = 0.92 if has_anger_term else (min(1.0, nrc_anger * 2.5) if nrc_anger > 0 else 0.0)

    # AI HuggingFace Sarcasm Model Inference (Zero-Shot Irony/Sarcasm Classifier)
    ai_sarcasm_detected = False
    if _sarcasm_pipeline is not None:
        try:
            res = _sarcasm_pipeline(raw_text[:256])[0]
            label = str(res.get('label', '')).lower()
            score = float(res.get('score', 0.0))
            if (label in ('label_1', 'irony', 'sarcasm', 'ironic') and score >= 0.45):
                ai_sarcasm_detected = True
        except Exception as e:
            pass

    ironic_contrast = (has_positive_word or has_ru_sarc) and (has_distress_term or has_burnout_term or has_ru_dep or has_ru_anx or has_anger_term or negative_context)
    is_sarcastic = sarcasm_marker or ironic_contrast or has_ru_sarc or sarcastic_idioms or ai_sarcasm_detected

    # Protect genuinely positive posts from false-positive negative overrides
    is_genuinely_positive = (tb_polarity > 0.05 or lex_scores.get("positive", 0.0) > 0.20) and not (
        has_distress_term or has_burnout_term or has_anger_term or has_ru_dep or has_ru_anx or has_negation_of_positive or sarcasm_marker or sarcastic_idioms
    )

    # Calibration for negation, sarcasm, severe burnout, anger, or Roman Urdu indicators
    should_calibrate = not is_genuinely_positive and (
        tb_polarity < -0.05 or
        has_negation_of_positive or
        is_sarcastic or
        has_burnout_term or
        has_anger_term or
        has_ru_dep or
        has_ru_anx
    )

    if should_calibrate and _emotion_labels[pred_idx] in ("Happy/Positive", "Neutral"):
        has_explicit_anxiety = bool(re.search(r'\b(panic|anxiety|attack|fear|worry|worrying|chest|shaking)\b', cleaned, re.IGNORECASE))
        # Prioritise: burnout/anger/distress → Anxious/Stress, pure sadness/negation → Depressed/Sad
        if has_burnout_term or has_anger_term or has_ru_anx or has_explicit_anxiety:
            target_label = "Anxious/Stress"
        elif has_negation_of_positive or has_ru_dep:
            target_label = "Depressed/Sad"
        else:
            target_label = "Depressed/Sad"

        target_idx = _emotion_labels.index(target_label) if target_label in _emotion_labels else 2

        new_probs = probs.copy()
        new_probs[pred_idx] = 0.05
        new_probs[target_idx] = 0.92
        new_probs = new_probs / new_probs.sum()
        probs = new_probs
        pred_idx = target_idx

    confidence_by_label = {_emotion_labels[i]: round(float(probs[i]), 4) for i in range(len(_emotion_labels))}

    return {
        "predicted_label": _emotion_labels[pred_idx],
        "confidence": round(float(probs[pred_idx]), 4),
        "all_scores": confidence_by_label,
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
            "has_explicit_anxiety": bool(re.search(r'\b(panic|anxiety|fear|worry|worrying|chest|shaking|racing heart)\b', cleaned, re.IGNORECASE)),
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
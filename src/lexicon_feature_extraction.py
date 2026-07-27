import re
from nrclex import NRCLex
from typing import Dict
import pandas as pd

NRC_EMOTIONS = ["fear", "anger", "anticipation", "trust", "surprise",
                "positive", "negative", "sadness", "disgust", "joy"]

NEGATION_WORDS = {
    "not", "no", "never", "n't", "cant", "cannot", "don't", "dont",
    "doesn't", "doesnt", "didn't", "didnt", "wasn't", "wasnt",
    "weren't", "werent", "haven't", "hasn't", "won't", "wont",
    "wouldn't", "wouldnt", "couldn't", "couldnt", "shouldn't", "shouldnt",
    "without", "lack", "hardly", "barely"
}


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

        window_start = max(0, i - 3)
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
    return {emotion: float(scores.get(emotion, 0.0)) for emotion in NRC_EMOTIONS}


def extract_nrc_features_batch(texts) -> pd.DataFrame:
    rows = [extract_nrc_features(t) for t in texts]
    return pd.DataFrame(rows, columns=NRC_EMOTIONS)


def extract_liwc_like_features(text: str, lexicon_dict_path: str = None) -> Dict[str, float]:
    return {}
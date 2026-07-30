import re
import pandas as pd
from typing import Tuple

EMOTION_LABELS = ["Happy/Positive", "Neutral", "Anxious/Stress", "Depressed/Sad"]
EMOTION_LABEL2ID = {label: idx for idx, label in enumerate(EMOTION_LABELS)}
EMOTION_ID2LABEL = {idx: label for label, idx in EMOTION_LABEL2ID.items()}

SENTIMENT_LABELS = ["Negative", "Neutral", "Positive"]
SENTIMENT_LABEL2ID = {label: idx for idx, label in enumerate(SENTIMENT_LABELS)}
SENTIMENT_ID2LABEL = {idx: label for label, idx in SENTIMENT_LABEL2ID.items()}


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#(\w+)', r'\1', text)
    text = re.sub(r'([!?.,])\1+', r'\1', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def preprocess_dataframe(df: pd.DataFrame, text_column: str) -> pd.DataFrame:
    df = df.copy()
    df['cleaned_text'] = df[text_column].apply(clean_text)
    return df


def load_mental_health_dataset(file_path: str) -> pd.DataFrame:
    return pd.read_csv(file_path)


def load_and_prepare_labeled_dataset(
    file_path: str,
    text_column: str = "full_text",
    emotion_column: str = "emotion_label",
    sentiment_column: str = "sentiment",
    min_words: int = 3,
) -> pd.DataFrame:
    df = load_mental_health_dataset(file_path)
    df = df.dropna(subset=[text_column, emotion_column, sentiment_column]).copy()
    df = preprocess_dataframe(df, text_column)
    df = df.drop_duplicates(subset=['cleaned_text'])
    df = df[df['cleaned_text'].str.split().str.len() >= min_words]
    df = df[df[emotion_column].isin(EMOTION_LABELS)]
    df = df[df[sentiment_column].isin(SENTIMENT_LABELS)]
    df['emotion_label_id'] = df[emotion_column].map(EMOTION_LABEL2ID)
    df['sentiment_label_id'] = df[sentiment_column].map(SENTIMENT_LABEL2ID)
    return df.reset_index(drop=True)


def stratified_train_val_test_split(
    df: pd.DataFrame,
    stratify_column: str = "emotion_label_id",
    train_frac: float = 0.8,
    val_frac: float = 0.1,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    from sklearn.model_selection import train_test_split
    test_frac = 1.0 - train_frac - val_frac
    assert test_frac > 0
    train_df, temp_df = train_test_split(
        df, train_size=train_frac, random_state=random_state, stratify=df[stratify_column]
    )
    relative_val_frac = val_frac / (val_frac + test_frac)
    val_df, test_df = train_test_split(
        temp_df, train_size=relative_val_frac, random_state=random_state,
        stratify=temp_df[stratify_column]
    )
    return (train_df.reset_index(drop=True), val_df.reset_index(drop=True), test_df.reset_index(drop=True))
    

def truncate_text(text: str, max_words: int = 40) -> str:
    """Truncates text to the first max_words words — used to make long
    therapy-dialogue training text length-realistic for short social posts."""
    words = text.split()
    return " ".join(words[:max_words])
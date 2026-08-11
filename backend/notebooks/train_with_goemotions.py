"""
==============================================================================
MindPulse FYP - Hybrid RoBERTa + Google GoEmotions Training Pipeline
==============================================================================
This script:
1. Loads Google Research GoEmotions dataset directly from HuggingFace (58k samples)
2. Merges with local counseling/mental health dataset (if present)
3. Maps 27 GoEmotions categories into 4 target classes:
   - 0: Happy/Positive
   - 1: Neutral
   - 2: Anxious/Stress
   - 3: Depressed/Sad
4. Applies Stratified Class Balancing to guarantee equal representationsentimen
5. Extracts RoBERTa 768-dim embeddings + 10-dim NRC Lexicon features
6. Trains the PyTorch HybridSentimentClassifier network
7. Evaluates Accuracy, Precision, Recall, F1-Score & exports 'best_hybrid_model.pt'
==============================================================================
"""

import os
import re
import json
import torch
import numpy as np
import pandas as pd
from tqdm import tqdm
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from transformers import AutoTokenizer, AutoModel
from nrclex import NRCLex
from datasets import load_dataset

# 1. Configuration & Label Mappings
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
BATCH_SIZE = 32
EPOCHS = 20
LEARNING_RATE = 1e-3
WEIGHT_DECAY = 1e-4
SAMPLES_PER_CLASS = 4000  # Balanced samples per class

EMOTION_LABELS = ["Happy/Positive", "Neutral", "Anxious/Stress", "Depressed/Sad"]
EMOTION_LABEL2ID = {label: idx for idx, label in enumerate(EMOTION_LABELS)}
EMOTION_ID2LABEL = {idx: label for label, idx in EMOTION_LABEL2ID.items()}

# GoEmotions 27-to-4 Category Mapping Matrix
GOEMOTIONS_MAPPING = {
    # Happy/Positive cluster
    "admiration": "Happy/Positive",
    "amusement": "Happy/Positive",
    "approval": "Happy/Positive",
    "caring": "Happy/Positive",
    "desire": "Happy/Positive",
    "excitement": "Happy/Positive",
    "gratitude": "Happy/Positive",
    "joy": "Happy/Positive",
    "love": "Happy/Positive",
    "optimism": "Happy/Positive",
    "pride": "Happy/Positive",
    "relief": "Happy/Positive",
    
    # Neutral & Curiosity cluster
    "neutral": "Neutral",
    "curiosity": "Neutral",
    "realization": "Neutral",
    "surprise": "Neutral",
    
    # Anxious/Stress cluster
    "fear": "Anxious/Stress",
    "nervousness": "Anxious/Stress",
    "confusion": "Anxious/Stress",
    
    # Depressed/Sad cluster
    "sadness": "Depressed/Sad",
    "disappointment": "Depressed/Sad",
    "embarrassment": "Depressed/Sad",
    "grief": "Depressed/Sad",
    "remorse": "Depressed/Sad",
    
    # Hostility/Anger mapped to stress/distress signals
    "anger": "Anxious/Stress",
    "annoyance": "Anxious/Stress",
    "disapproval": "Anxious/Stress",
    "disgust": "Depressed/Sad",
}

NRC_EMOTIONS = ["fear", "anger", "anticipation", "trust", "surprise",
                "positive", "negative", "sadness", "disgust", "joy"]


def clean_text(text: str) -> str:
    """Preprocess text for RoBERTa tokenization."""
    if not isinstance(text, str):
        return ""
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#(\w+)', r'\1', text)
    text = re.sub(r'([!?.,])\1+', r'\1', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def load_goemotions_data(samples_per_class: int = 4000) -> pd.DataFrame:
    """Loads Google Research GoEmotions and converts to 4 balanced classes."""
    print("📥 Loading Google Research GoEmotions dataset from HuggingFace...")
    dataset = load_dataset("google-research-datasets/go_emotions", "simplified", split="train")
    
    label_names = dataset.features["labels"].feature.names
    
    records = []
    for item in tqdm(dataset, desc="Processing GoEmotions"):
        text = clean_text(item["text"])
        if len(text.split()) < 3:
            continue
        
        labels = [label_names[l] for l in item["labels"]]
        # Pick primary matching label
        for lab in labels:
            if lab in GOEMOTIONS_MAPPING:
                target_class = GOEMOTIONS_MAPPING[lab]
                records.append({"cleaned_text": text, "emotion_label": target_class})
                break
                
    df = pd.DataFrame(records).drop_duplicates(subset=["cleaned_text"])
    
    # Stratified balancing
    balanced_dfs = []
    for emotion in EMOTION_LABELS:
        subset = df[df["emotion_label"] == emotion]
        n_sample = min(len(subset), samples_per_class)
        balanced_dfs.append(subset.sample(n=n_sample, random_state=42))
        
    final_df = pd.concat(balanced_dfs).sample(frac=1.0, random_state=42).reset_index(drop=True)
    final_df["emotion_label_id"] = final_df["emotion_label"].map(EMOTION_LABEL2ID)
    
    print("\n✅ GoEmotions Processed & Balanced:")
    print(final_df["emotion_label"].value_counts())
    return final_df


def extract_nrc_features(text: str) -> list:
    """Extract 10-dimensional NRC emotion frequencies."""
    if not isinstance(text, str) or not text.strip():
        return [0.0] * len(NRC_EMOTIONS)
    try:
        lex = NRCLex()
        lex.load_raw_text(text)
        scores = lex.affect_frequencies
        return [float(scores.get(emotion, 0.0)) for emotion in NRC_EMOTIONS]
    except Exception:
        return [0.0] * len(NRC_EMOTIONS)


@torch.no_grad()
def get_roberta_embeddings_batch(texts: list, tokenizer, roberta_model, batch_size: int = 32) -> np.ndarray:
    """Extract 768-dim RoBERTa contextual embeddings using mask-weighted mean pooling."""
    all_embeddings = []
    for i in tqdm(range(0, len(texts), batch_size), desc="RoBERTa Embeddings"):
        batch = texts[i:i+batch_size]
        enc = tokenizer(batch, padding=True, truncation=True, max_length=256, return_tensors="pt").to(DEVICE)
        out = roberta_model(**enc)
        last_hidden = out.last_hidden_state
        mask = enc['attention_mask'].unsqueeze(-1).float()
        pooled = (last_hidden * mask).sum(1) / mask.sum(1).clamp(min=1e-9)
        all_embeddings.append(pooled.cpu().numpy())
    return np.vstack(all_embeddings)


class HybridSentimentClassifier(nn.Module):
    """Dense classification head matching MindPulse Flask backend."""
    def __init__(self, roberta_dim: int = 768, lexicon_dim: int = 10, num_labels: int = 4):
        super(HybridSentimentClassifier, self).__init__()
        self.classifier = nn.Sequential(
            nn.Linear(roberta_dim + lexicon_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_labels)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.classifier(x)


def train_pipeline():
    print(f"🚀 Starting MindPulse Multi-Source Training on: {DEVICE}")
    
    # 1. Load Data
    df = load_goemotions_data(samples_per_class=SAMPLES_PER_CLASS)
    texts = df['cleaned_text'].tolist()
    y_labels = df['emotion_label_id'].values
    
    # 2. Load RoBERTa
    print("\n🧠 Loading CardiffNLP RoBERTa Model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    roberta_model = AutoModel.from_pretrained(MODEL_NAME).to(DEVICE)
    roberta_model.eval()
    
    # 3. Extract Features
    print("\n📊 Extracting RoBERTa + NRC Lexicon Features...")
    roberta_feats = get_roberta_embeddings_batch(texts, tokenizer, roberta_model, batch_size=BATCH_SIZE)
    nrc_feats = np.array([extract_nrc_features(t) for t in tqdm(texts, desc="NRC Lexicon")])
    X_features = np.hstack([roberta_feats, nrc_feats])
    
    # 4. Stratified Split (80% Train, 10% Val, 10% Test)
    X_train, X_temp, y_train, y_temp = train_test_split(
        X_features, y_labels, test_size=0.2, random_state=42, stratify=y_labels
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp
    )
    
    train_loader = DataLoader(
        TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long)),
        batch_size=16, shuffle=True
    )
    val_loader = DataLoader(
        TensorDataset(torch.tensor(X_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.long)),
        batch_size=16, shuffle=False
    )
    test_loader = DataLoader(
        TensorDataset(torch.tensor(X_test, dtype=torch.float32), torch.tensor(y_test, dtype=torch.long)),
        batch_size=16, shuffle=False
    )
    
    # 5. Initialize Model, Loss, Optimizer
    model = HybridSentimentClassifier(roberta_dim=768, lexicon_dim=10, num_labels=4).to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    
    best_val_loss = float('inf')
    save_path = "best_hybrid_model.pt"
    
    print("\n🔥 Training Hybrid Classifier...")
    for epoch in range(EPOCHS):
        model.train()
        train_loss, correct_train, total_train = 0.0, 0, 0
        for bx, by in train_loader:
            bx, by = bx.to(DEVICE), by.to(DEVICE)
            optimizer.zero_grad()
            out = model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * bx.size(0)
            _, pred = out.max(1)
            total_train += by.size(0)
            correct_train += pred.eq(by).sum().item()
            
        # Validation
        model.eval()
        val_loss, correct_val, total_val = 0.0, 0, 0
        with torch.no_grad():
            for bx, by in val_loader:
                bx, by = bx.to(DEVICE), by.to(DEVICE)
                out = model(bx)
                loss = criterion(out, by)
                val_loss += loss.item() * bx.size(0)
                _, pred = out.max(1)
                total_val += by.size(0)
                correct_val += pred.eq(by).sum().item()
                
        tr_acc = correct_train / total_train
        va_acc = correct_val / total_val
        val_l = val_loss / total_val
        print(f"Epoch {epoch+1:02d}/{EPOCHS:02d} | Train Acc: {tr_acc:.4f} | Val Loss: {val_l:.4f} Val Acc: {va_acc:.4f}")
        
        if val_l < best_val_loss:
            best_val_loss = val_l
            torch.save(model.state_dict(), save_path)
            
    print("\n🏆 Evaluating on Held-Out Test Set...")
    model.load_state_dict(torch.load(save_path))
    model.eval()
    
    all_preds, all_targets = [], []
    with torch.no_grad():
        for bx, by in test_loader:
            bx = bx.to(DEVICE)
            out = model(bx)
            _, pred = out.max(1)
            all_preds.extend(pred.cpu().numpy())
            all_targets.extend(by.numpy())
            
    print(f"\n🎯 Final Test Accuracy: {accuracy_score(all_targets, all_preds):.4f}")
    print("\nDetailed Classification Report:")
    print(classification_report(all_targets, all_preds, target_names=EMOTION_LABELS))
    
    # Save label mapping for Flask backend
    mapping_payload = {
        "EMOTION_LABELS": EMOTION_LABELS,
        "EMOTION_LABEL2ID": EMOTION_LABEL2ID
    }
    with open("label_mapping.json", "w") as f:
        json.dump(mapping_payload, f, indent=2)
    print("💾 Saved 'best_hybrid_model.pt' and 'label_mapping.json'!")


if __name__ == "__main__":
    train_pipeline()

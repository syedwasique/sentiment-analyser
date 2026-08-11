import os
import torch
import torch.nn as nn
import pandas as pd
from torch.utils.data import DataLoader, Dataset
from transformers import AutoTokenizer, AutoModel
import shutil
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.inference import HybridRobertaLexicon, extract_nrc_features, NRC_EMOTIONS, MAX_LEN, MODEL_NAME

_device = "cuda" if torch.cuda.is_available() else "cpu"

class SentimentDataset(Dataset):
    def __init__(self, df, tokenizer):
        self.texts = df["text"].tolist()
        self.labels = df["label"].tolist()
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = int(self.labels[idx])
        
        # Tokenize
        enc = self.tokenizer(text, truncation=True, padding='max_length', max_length=MAX_LEN, return_tensors='pt')
        
        # Lexicon features
        lex_scores = extract_nrc_features(text)
        lex_vector = torch.tensor([lex_scores[e] for e in NRC_EMOTIONS], dtype=torch.float32)

        return {
            "input_ids": enc["input_ids"].squeeze(0),
            "attention_mask": enc["attention_mask"].squeeze(0),
            "lex_vector": lex_vector,
            "label": torch.tensor(label, dtype=torch.long)
        }

def train():
    print(f"Using device: {_device}")
    
    # Paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    weights_path = os.path.join(BASE_DIR, "best_hybrid_model.pt")
    backup_path = os.path.join(BASE_DIR, "best_hybrid_model_BACKUP_before_finetune.pt")
    data_path = os.path.join(BASE_DIR, "finetune_dataset.csv")

    if not os.path.exists(data_path):
        print("Dataset not found!")
        return

    df = pd.read_csv(data_path)
    
    print("Loading tokenizer and model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = HybridRobertaLexicon(MODEL_NAME, lexicon_dim=len(NRC_EMOTIONS), num_labels=5)
    
    # Load existing weights
    if os.path.exists(weights_path):
        state_dict = torch.load(weights_path, map_location=_device)
        if 'classifier.6.weight' in state_dict and state_dict['classifier.6.weight'].shape[0] != 5:
            print("Output dimension mismatch. Reinitializing the final classifier layer for 5 classes...")
            del state_dict['classifier.6.weight']
            del state_dict['classifier.6.bias']
        model.load_state_dict(state_dict, strict=False)
        print("Loaded existing weights.")
    else:
        print("Existing weights not found! Training from scratch (not recommended).")
        
    model.to(_device)
    model.train()

    dataset = SentimentDataset(df, tokenizer)
    loader = DataLoader(dataset, batch_size=8, shuffle=True)

    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
    criterion = nn.CrossEntropyLoss()

    epochs = 3
    print("Starting fine-tuning...")
    for epoch in range(epochs):
        total_loss = 0
        for batch in loader:
            input_ids = batch["input_ids"].to(_device)
            attention_mask = batch["attention_mask"].to(_device)
            lex_vector = batch["lex_vector"].to(_device)
            labels = batch["label"].to(_device)

            optimizer.zero_grad()
            logits = model(input_ids, attention_mask, lex_vector)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs} - Loss: {total_loss/len(loader):.4f}")

    print("Training complete.")
    
    # Backup
    if os.path.exists(weights_path):
        shutil.copy2(weights_path, backup_path)
        print(f"Backed up old model to {backup_path}")
        
    # Save
    torch.save(model.state_dict(), weights_path)
    print(f"Saved new model to {weights_path}")

if __name__ == "__main__":
    train()

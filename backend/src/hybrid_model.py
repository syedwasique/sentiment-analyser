import torch
import torch.nn as nn

class HybridSentimentClassifier(nn.Module):
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
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report
from typing import Dict, Any

def evaluate_predictions(y_true: list, y_pred: list) -> Dict[str, Any]:
    """Calculates accuracy, precision, recall, and F1 score."""
    acc = accuracy_score(y_true, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted')
    report = classification_report(y_true, y_pred, output_dict=True)
    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "classification_report": report
    }

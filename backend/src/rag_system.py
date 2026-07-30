import faiss
import numpy as np
from typing import List, Dict, Any

class RAGSystem:
    def __init__(self, index_path: str = None, documents: List[str] = None):
        """Initializes RAG system with documents and vector index."""
        self.documents = documents or []
        self.index = None
        if index_path:
            self.load_index(index_path)
            
    def load_index(self, index_path: str):
        """Loads FAISS index from disk."""
        self.index = faiss.read_index(index_path)
        
    def retrieve_context(self, query_embedding: np.ndarray, k: int = 3) -> List[str]:
        """Retrieves k most relevant documents using query embedding similarity search."""
        if self.index is None:
            return []
        # Search the index
        distances, indices = self.index.search(query_embedding, k)
        results = [self.documents[idx] for idx in indices[0] if idx < len(self.documents)]
        return results

    def augment_input(self, original_text: str, context: List[str]) -> str:
        """Combines original text with retrieved context."""
        joined_context = "\n".join(context)
        return f"Context:\n{joined_context}\n\nInput:\n{original_text}"

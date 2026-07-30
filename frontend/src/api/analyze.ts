export interface PsychologicalStates {
  depression: 'Low' | 'Medium' | 'High';
  anxiety: 'Low' | 'Medium' | 'High';
  stress: 'Low' | 'Medium' | 'High';
  anger: 'Low' | 'Medium' | 'High';
  happiness: 'Low' | 'Medium' | 'High';
}

export interface ClassScores {
  'Anxious/Stress': number;
  'Depressed/Sad': number;
  'Happy/Positive': number;
  'Neutral': number;
  [key: string]: number;
}

export interface AnalysisResponse {
  text: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  sentiment_score: number;
  predicted_label: string;
  all_scores: ClassScores;
  psychological_states: PsychologicalStates;
  flagged: boolean;
  risk_level: 'None' | 'Low' | 'Medium' | 'High';
  is_sarcastic: boolean;
  error?: string;
}

// In dev, proxy handles /analyze. Can override with VITE_API_BASE_URL env if provided.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export async function analyzeText(text: string): Promise<AnalysisResponse> {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.status}`);
    }

    const data: AnalysisResponse = await response.json();
    
    // Ensure smooth UI transitions for extremely fast (~45ms) low latency responses
    const elapsed = performance.now() - startTime;
    if (elapsed < 350) {
      await new Promise((resolve) => setTimeout(resolve, 350 - elapsed));
    }

    return data;
  } catch (err: any) {
    console.error('API analyzeText failed:', err);
    throw err;
  }
}

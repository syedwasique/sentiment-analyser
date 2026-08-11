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

export interface KeywordFlags {
  has_burnout_term?: boolean;
  has_anger_term?: boolean;
  has_distress_term?: boolean;
  has_negation_of_positive?: boolean;
  has_ru_dep?: boolean;
  has_ru_anx?: boolean;
  has_explicit_anxiety?: boolean;
  [key: string]: boolean | undefined;
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
  keyword_flags?: KeywordFlags;
  error?: string;
  latency_ms?: number;
}

// In dev, proxy handles /analyze. Can override with VITE_API_BASE_URL env if provided.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
      let errMsg = `Server error: ${response.status}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.error || errJson.message || errMsg;
      } catch {
        // use status text
      }
      throw new Error(errMsg);
    }

    const data: AnalysisResponse = await response.json();
    const duration = Math.round(performance.now() - startTime);
    data.latency_ms = duration;

    // Ensure smooth UI transitions for extremely fast (~45ms) low latency responses
    if (duration < 350) {
      await new Promise((resolve) => setTimeout(resolve, 350 - duration));
    }

    return data;
  } catch (err: any) {
    console.error('API analyzeText failed:', err);
    throw err;
  }
}

export async function fetchPdfReportBlob(analysisData: AnalysisResponse | Record<string, unknown>): Promise<Blob> {
  const urls = ['/analyze/pdf', 'http://127.0.0.1:5000/analyze/pdf'];
  let lastErr: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) {
        let errMsg = `Server error: ${response.status}`;
        try {
          const j = await response.json();
          if (j.error) errMsg = j.error;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        return new Blob([arrayBuffer], { type: 'application/pdf' });
      }
    } catch (err: any) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('Generated PDF report is empty (0 bytes)');
}

export async function downloadPdfReport(analysisData: AnalysisResponse): Promise<void> {
  try {
    const blob = await fetchPdfReportBlob(analysisData);
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const pdfUrl = window.URL.createObjectURL(pdfBlob);

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `MindPulse_Analysis_Report.pdf`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(pdfUrl);
    }, 2000);
  } catch (err: any) {
    console.error('downloadPdfReport failed:', err);
    throw err;
  }
}








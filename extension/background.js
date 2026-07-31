/**
 * MindPulse Chrome Extension — Service Worker (background.js)
 * Manifest V3 background script.
 * Handles API communication with Flask backend (http://127.0.0.1:5000/analyze).
 */

const API_ENDPOINTS = [
  "http://127.0.0.1:5000/analyze",
  "http://localhost:5000/analyze"
];

// Transient session cache (cleared when extension reloads/restarts)
let latestAnalysis = null;

async function postToFlask(url, text) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server HTTP Error ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ANALYZE_POST") {
    const { text, imageUrl, authorHandle } = request.payload || {};

    if (!text) {
      sendResponse({ success: false, error: "No text content provided." });
      return true;
    }

    // Try primary 127.0.0.1 endpoint, then localhost fallback
    (async () => {
      let lastErr = null;
      for (const endpoint of API_ENDPOINTS) {
        try {
          const data = await postToFlask(endpoint, text);
          
          latestAnalysis = {
            ...data,
            extracted_text: text,
            image_url: imageUrl,
            author_handle: authorHandle,
            analyzed_at: new Date().toISOString()
          };

          sendResponse({ success: true, data: latestAnalysis });
          return;
        } catch (err) {
          lastErr = err;
        }
      }

      sendResponse({
        success: false,
        error: lastErr ? lastErr.message : "Flask backend unreachable. Please ensure 'python backend/src/app.py' is running on port 5000."
      });
    })();

    return true; // Keep message channel open for async sendResponse
  }

  if (request.action === "GET_LATEST_ANALYSIS") {
    sendResponse({ success: true, data: latestAnalysis });
    return true;
  }
});

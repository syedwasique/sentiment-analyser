document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("resultsContainer");

  // Query background service worker for latest transient analysis result
  chrome.runtime.sendMessage({ action: "GET_LATEST_ANALYSIS" }, (response) => {
    if (response && response.success && response.data) {
      renderResults(response.data);
    }
  });

  function renderResults(data) {
    const {
      text = "",
      sentiment = "Neutral",
      sentiment_score = 0,
      predicted_label = "Neutral",
      psychological_states = {},
      risk_level = "None",
      is_sarcastic = false,
      image_url = null,
      author_handle = "@user"
    } = data;

    const confPct = Math.round((sentiment_score || 0) * 100);
    const psych = psychological_states || {
      depression: "Low",
      anxiety: "Low",
      stress: "Low",
      anger: "Low",
      happiness: "Low"
    };

    const getLevelPct = (level) => {
      if (level === "High") return "88%";
      if (level === "Medium") return "55%";
      return "22%";
    };

    let html = "";

    // Image context if available
    if (image_url) {
      html += `
        <div class="image-context-box">
          <img src="${escapeHtml(image_url)}" class="image-preview" alt="Attached content" />
        </div>
      `;
    }

    // Top KPI Grid
    html += `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Sentiment</div>
          <div class="kpi-value">
            <span class="sent-pill sent-${escapeHtml(sentiment)}">${escapeHtml(sentiment)} ${confPct}%</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Risk Level</div>
          <div class="kpi-value">
            <span class="risk-pill risk-${escapeHtml(risk_level)}">${escapeHtml(risk_level)}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Sarcasm</div>
          <div class="kpi-value" style="color:${is_sarcastic ? '#fbbf24' : '#94a3b8'};">
            ${is_sarcastic ? '⚡ Flagged' : '✓ None'}
          </div>
        </div>
      </div>

      <!-- 5 Psychological State Indicators -->
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin: 4px 0 6px 0;">
        5 Psychological Indicators
      </div>

      <div class="psych-list">
        <div class="psych-item">
          <div class="psych-header">
            <span class="psych-name">Depression</span>
            <span class="psych-level" style="color: ${psych.depression === 'High' ? '#f87171' : (psych.depression === 'Medium' ? '#fbbf24' : '#34d399')};">${escapeHtml(psych.depression)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill bar-${escapeHtml(psych.depression)}" style="width: ${getLevelPct(psych.depression)};"></div>
          </div>
        </div>

        <div class="psych-item">
          <div class="psych-header">
            <span class="psych-name">Anxiety</span>
            <span class="psych-level" style="color: ${psych.anxiety === 'High' ? '#f87171' : (psych.anxiety === 'Medium' ? '#fbbf24' : '#34d399')};">${escapeHtml(psych.anxiety)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill bar-${escapeHtml(psych.anxiety)}" style="width: ${getLevelPct(psych.anxiety)};"></div>
          </div>
        </div>

        <div class="psych-item">
          <div class="psych-header">
            <span class="psych-name">Stress</span>
            <span class="psych-level" style="color: ${psych.stress === 'High' ? '#f87171' : (psych.stress === 'Medium' ? '#fbbf24' : '#34d399')};">${escapeHtml(psych.stress)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill bar-${escapeHtml(psych.stress)}" style="width: ${getLevelPct(psych.stress)};"></div>
          </div>
        </div>

        <div class="psych-item">
          <div class="psych-header">
            <span class="psych-name">Anger</span>
            <span class="psych-level" style="color: ${psych.anger === 'High' ? '#f87171' : (psych.anger === 'Medium' ? '#fbbf24' : '#34d399')};">${escapeHtml(psych.anger)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill bar-${escapeHtml(psych.anger)}" style="width: ${getLevelPct(psych.anger)};"></div>
          </div>
        </div>

        <div class="psych-item">
          <div class="psych-header">
            <span class="psych-name">Happiness</span>
            <span class="psych-level" style="color: ${psych.happiness === 'High' ? '#34d399' : (psych.happiness === 'Medium' ? '#fbbf24' : '#94a3b8')};">${escapeHtml(psych.happiness)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${getLevelPct(psych.happiness)}; background: linear-gradient(90deg, #10b981, #34d399);"></div>
          </div>
        </div>
      </div>

      <!-- Quoted snippet -->
      <div class="quote-card" style="margin-top: 8px;">
        "${escapeHtml(text.length > 130 ? text.substring(0, 130) + "..." : text)}"
      </div>
    `;

    container.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});


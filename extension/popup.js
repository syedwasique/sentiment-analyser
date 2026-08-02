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
      if (level === "High") return "90%";
      if (level === "Medium") return "55%";
      return "20%";
    };

    const PSYCH_EXPLANATIONS = {
      depression: {
        title: 'Depression & Mood',
        desc: { High: 'Severe low mood, hopelessness or apathy detected.', Medium: 'Moderate sadness or low emotional energy present.', Low: 'Minimal depressive markers detected.' }
      },
      anxiety: {
        title: 'Anxiety & Panic',
        desc: { High: 'High panic, dread or physical tension signals.', Medium: 'Noticeable worry or nervousness detected.', Low: 'Calm baseline state.' }
      },
      stress: {
        title: 'Stress & Burnout',
        desc: { High: 'Critical burnout markers & feeling overwhelmed.', Medium: 'Elevated workload stress or pressure.', Low: 'Optimal coping capacity.' }
      },
      anger: {
        title: 'Anger & Hostility',
        desc: { High: 'Strong outrage, agitation or hostility phrasing.', Medium: 'Mild irritation or annoyance expressed.', Low: 'No anger or hostility signals.' }
      },
      happiness: {
        title: 'Positivity & Wellness',
        desc: { High: 'Strong positive emotional state & joy.', Medium: 'Mild pleasant sentiment present.', Low: 'Low expression of positivity.' }
      }
    };

    let html = "";

    // 1. Author Details & Snippet Card
    html += `
      <div class="author-card">
        <div class="author-header">
          <div class="author-avatar">👤</div>
          <div>
            <div class="author-name">${escapeHtml(author_handle)}</div>
            <div class="author-meta">Post Target • Single-Post Diagnostics</div>
          </div>
        </div>
        <div class="author-quote">
          "${escapeHtml(text.length > 160 ? text.substring(0, 160) + '...' : text)}"
        </div>
        ${image_url ? `<img src="${escapeHtml(image_url)}" class="image-preview" alt="Attached media" />` : ''}
      </div>
    `;

    // 2. SECTION 1: SENTIMENT ANALYSIS
    html += `
      <div class="section-container">
        <div class="section-header border-sentiment">
          <span class="section-title">1. 🎭 Sentiment Analysis & Tone</span>
          <span class="section-badge">${confPct}% Confidence</span>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Sentiment Category</div>
            <div class="kpi-value">
              <span class="sent-pill sent-${escapeHtml(sentiment)}">${escapeHtml(sentiment)}</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Predicted Class</div>
            <div class="kpi-value" style="color:#38bdf8;">${escapeHtml(predicted_label)}</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Sarcasm Status</div>
            <div class="kpi-value" style="color:${is_sarcastic ? '#fbbf24' : '#94a3b8'};">
              ${is_sarcastic ? '⚡ Sarcasm Flag' : '✓ Literal'}
            </div>
          </div>
        </div>
      </div>
    `;

    // 3. SECTION 2: PSYCHOLOGICAL ASSESSMENT
    html += `
      <div class="section-container">
        <div class="section-header border-psych">
          <span class="section-title">2. 🧠 Psychological State Assessment</span>
          <span class="risk-pill risk-${escapeHtml(risk_level)}">${escapeHtml(risk_level)} Risk</span>
        </div>

        <div class="psych-list">
    `;

    Object.entries(psych).forEach(([key, lvl]) => {
      const info = PSYCH_EXPLANATIONS[key] || { title: key, desc: { High: '', Medium: '', Low: '' } };
      const exp = info.desc[lvl] || info.desc['Low'];

      html += `
        <div class="psych-item">
          <div class="psych-header">
            <span class="psych-name">${info.title}</span>
            <span class="psych-level level-${escapeHtml(lvl)}">${escapeHtml(lvl)} LEVEL</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill bar-${escapeHtml(lvl)}" style="width: ${getLevelPct(lvl)};"></div>
          </div>
          <div class="psych-explanation">${escapeHtml(exp)}</div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    // 4. PDF Export Button Bar
    html += `
      <div class="action-bar">
        <button id="extPdfDownloadBtn" class="pdf-export-btn">
          <span>📄 Export PDF Report</span>
        </button>
      </div>
    `;

    container.innerHTML = html;

    // Attach PDF Download Handler
    const pdfBtn = document.getElementById("extPdfDownloadBtn");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", () => downloadPdfReportFromExtension(data));
    }
  }

  async function downloadPdfReportFromExtension(data) {
    const pdfBtn = document.getElementById("extPdfDownloadBtn");
    if (pdfBtn) {
      pdfBtn.disabled = true;
      pdfBtn.innerHTML = "<span>⏳ Generating PDF...</span>";
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/analyze/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error("Backend server error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `MindPulse_${(data.author_handle || 'Tweet').replace('@', '')}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
    } catch (err) {
      alert("Failed to download PDF report: " + err.message);
    } finally {
      if (pdfBtn) {
        pdfBtn.disabled = false;
        pdfBtn.innerHTML = "<span>📄 Export PDF Report</span>";
      }
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});

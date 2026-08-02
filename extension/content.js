/**
 * MindPulse Chrome Extension — Content Script (Manifest V3)
 * Scoped strictly to Twitter/X (twitter.com / x.com).
 * Enables manual single-post selection for sentiment & psychological analysis.
 */

// Rate Limiter: Max 10 manual analyses per 60 seconds
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const requestTimestamps = [];

let isExtensionEnabled = true;

// Load extension enable/disable setting safely
if (typeof chrome !== "undefined" && chrome?.storage?.sync) {
  chrome.storage.sync.get({ extensionEnabled: true }, (items) => {
    isExtensionEnabled = items ? items.extensionEnabled : true;
    if (isExtensionEnabled) {
      initTweetObserver();
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.extensionEnabled) {
      isExtensionEnabled = changes.extensionEnabled.newValue;
      if (isExtensionEnabled) {
        injectButtonsToExistingTweets();
        initTweetObserver();
      } else {
        removeAllInjectedButtons();
      }
    }
  });
} else {
  initTweetObserver();
}

function checkRateLimit() {
  const now = Date.now();
  // Filter out timestamps older than window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  requestTimestamps.push(now);
  return true;
}

/**
 * Text Extraction Strategy with Robust Fallbacks (includes image alt-text fallback)
 */
function extractTweetText(tweetElement) {
  // Primary Strategy: Twitter's data-testid attribute
  const primaryNode = tweetElement.querySelector('[data-testid="tweetText"]');
  if (primaryNode && primaryNode.innerText.trim()) {
    return primaryNode.innerText.trim();
  }

  // Fallback Strategy 1: div with lang attribute
  const langNode = tweetElement.querySelector('div[lang]');
  if (langNode && langNode.innerText.trim()) {
    return langNode.innerText.trim();
  }

  // Fallback Strategy 2: Image alt text (for photo-only posts with embedded text)
  const photoImg = tweetElement.querySelector('[data-testid="tweetPhoto"] img');
  if (photoImg && photoImg.alt && photoImg.alt.trim()) {
    return photoImg.alt.trim();
  }

  // Fallback Strategy 3: Media image alt text
  const mediaImgs = tweetElement.querySelectorAll('img[src*="pbs.twimg.com/media"]');
  for (const img of mediaImgs) {
    if (img.alt && img.alt.trim()) {
      return img.alt.trim();
    }
  }

  // Fallback Strategy 4: Conversational text span
  const spanNode = tweetElement.querySelector('span.css-901oao');
  if (spanNode && spanNode.innerText.trim()) {
    return spanNode.innerText.trim();
  }

  return "";
}

/**
 * Image Extraction Strategy (Attached Content Images ONLY)
 * Ignores profile pictures (profile_images)
 */
function extractAttachedImageUrl(tweetElement) {
  // Primary Strategy: data-testid="tweetPhoto"
  const photoContainer = tweetElement.querySelector('[data-testid="tweetPhoto"]');
  if (photoContainer) {
    const img = photoContainer.querySelector('img');
    if (img && img.src && !img.src.includes('profile_images')) {
      return img.src;
    }
  }

  // Fallback Strategy: twimg media URLs
  const mediaImgs = tweetElement.querySelectorAll('img[src*="pbs.twimg.com/media"]');
  for (const img of mediaImgs) {
    if (img.src && !img.src.includes('profile_images')) {
      return img.src;
    }
  }

  return null;
}

/**
 * Handle Extraction (For popup reference only)
 */
function extractAuthorHandle(tweetElement) {
  const userNameNode = tweetElement.querySelector('[data-testid="User-Name"]');
  if (userNameNode) {
    const text = userNameNode.innerText || "";
    const match = text.match(/@\w+/);
    if (match) return match[0];
  }
  return "@user";
}

/**
 * Inject Analyze Button into Tweet Action Bar
 */
function injectAnalyzeButton(tweetElement) {
  if (!isExtensionEnabled) return;
  if (tweetElement.getAttribute('data-mindpulse-injected') === 'true') return;

  // Locate tweet action bar
  const actionBar = tweetElement.querySelector('[role="group"]');
  if (!actionBar) return;

  tweetElement.setAttribute('data-mindpulse-injected', 'true');

  // Create MindPulse Button
  const btn = document.createElement('button');
  btn.className = 'mindpulse-analyze-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Analyze post with MindPulse AI');

  // Brain Icon SVG
  btn.innerHTML = `
    <svg class="mindpulse-btn-icon" viewBox="0 0 24 24">
      <path d="M12 2a9 9 0 0 0-9 9c0 3.87 2.45 7.17 5.88 8.42.5.09.68-.22.68-.48 0-.24-.01-.88-.01-1.73-2.4.52-2.91-1.16-2.91-1.16-.39-.99-.96-1.26-.96-1.26-.78-.54.06-.53.06-.53.86.06 1.32.89 1.32.89.77 1.32 2.02.94 2.51.72.08-.56.3-.94.55-1.16-1.92-.22-3.94-.96-3.94-4.28 0-.95.34-1.72.89-2.33-.09-.22-.39-1.1.08-2.3 0 0 .73-.23 2.39.89a8.3 8.3 0 0 1 4.36 0c1.66-1.12 2.39-.89 2.39-.89.47 1.2.17 2.08.08 2.3.56.61.89 1.38.89 2.33 0 3.33-2.03 4.05-3.96 4.27.31.27.59.8.59 1.62 0 1.17-.01 2.12-.01 2.41 0 .27.18.58.69.48A9.003 9.003 0 0 0 21 11a9 9 0 0 0-9-9z"/>
    </svg>
    <span>Analyze</span>
    <div class="mindpulse-tooltip">Analyze this post's sentiment (research tool, not a diagnosis)</div>
  `;

  // Manual Trigger Click Event
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Enforce Rate Limit
    if (!checkRateLimit()) {
      alert("MindPulse Rate Limit: Maximum 10 single-post manual analyses allowed per minute to discourage rapid bulk use.");
      return;
    }

    const text = extractTweetText(tweetElement);
    if (!text) {
      alert("No readable text or alt-text found in this post to analyze.");
      return;
    }

    const imageUrl = extractAttachedImageUrl(tweetElement);
    const authorHandle = extractAuthorHandle(tweetElement);

    // UI Loading state
    const originalContent = btn.innerHTML;
    btn.classList.add('mindpulse-btn-loading');
    btn.innerHTML = `<span class="mindpulse-spinner"></span> <span>Analyzing...</span>`;

    let isReset = false;
    const resetBtn = () => {
      if (!isReset) {
        isReset = true;
        btn.classList.remove('mindpulse-btn-loading');
        btn.innerHTML = originalContent;
      }
    };

    // 8-second safety timeout to prevent hanging UI
    const timeoutId = setTimeout(() => {
      if (!isReset) {
        resetBtn();
        alert("Analysis Timeout: The Flask backend did not respond in time. Please verify that 'python backend/src/app.py' is running on port 5000.");
      }
    }, 8000);

    // Check if extension context is valid (prevents TypeError when extension is reloaded in chrome://extensions)
    if (typeof chrome === "undefined" || !chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== "function") {
      clearTimeout(timeoutId);
      resetBtn();
      alert("Extension Context Reconnected: The extension was reloaded or updated. Please REFRESH this webpage (press F5 or Ctrl+R) to reconnect.");
      return;
    }

    // Send payload to service worker
    try {
      chrome.runtime.sendMessage(
        {
          action: "ANALYZE_POST",
          payload: { text, imageUrl, authorHandle }
        },
        (response) => {
          clearTimeout(timeoutId);

          if (chrome && chrome.runtime && chrome.runtime.lastError) {
            resetBtn();
            alert(`Extension Error: ${chrome.runtime.lastError.message}`);
            return;
          }

          resetBtn();

          if (response && response.success) {
            btn.innerHTML = `<span>✓ Analyzed</span>`;
            renderDashboardModal(response.data);
            setTimeout(() => {
              btn.innerHTML = originalContent;
            }, 3000);
          } else {
            alert(`Analysis Error: ${response ? response.error : 'Flask backend unavailable. Please verify python src/app.py is running on port 5000.'}`);
          }
        }
      );
    } catch (err) {
      clearTimeout(timeoutId);
      resetBtn();
      alert(`Extension Error: The extension context was updated. Please refresh this page (F5) to re-sync.`);
    }
  });

  actionBar.appendChild(btn);
}

function injectButtonsToExistingTweets() {
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  tweets.forEach(injectAnalyzeButton);
}

function removeAllInjectedButtons() {
  const buttons = document.querySelectorAll('.mindpulse-analyze-btn');
  buttons.forEach(btn => btn.remove());
  const tweets = document.querySelectorAll('[data-mindpulse-injected="true"]');
  tweets.forEach(t => t.removeAttribute('data-mindpulse-injected'));
}

/**
 * MutationObserver for Twitter/X Infinite Scroll DOM
 */
let observer = null;

function initTweetObserver() {
  if (observer) return;

  injectButtonsToExistingTweets();

  observer = new MutationObserver((mutations) => {
    if (!isExtensionEnabled) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.getAttribute && node.getAttribute('data-testid') === 'tweet') {
            injectAnalyzeButton(node);
          } else {
            const nestedTweets = node.querySelectorAll ? node.querySelectorAll('[data-testid="tweet"]') : [];
            nestedTweets.forEach(injectAnalyzeButton);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Injected Premium Draggable Dashboard Modal
 */
let activeDashboardModal = null;

function renderDashboardModal(data) {
  // Remove existing modal if present
  if (activeDashboardModal && activeDashboardModal.parentNode) {
    activeDashboardModal.remove();
    activeDashboardModal = null;
  }

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
  } = data || {};

  const confPct = Math.round((sentiment_score || 0) * 100);
  const psych = {
    depression: psychological_states.depression || "Low",
    anxiety: psychological_states.anxiety || "Low",
    stress: psychological_states.stress || "Low",
    anger: psychological_states.anger || "Low",
    happiness: psychological_states.happiness || "Low"
  };

  const getLevelPct = (level) => {
    if (level === "High") return "90%";
    if (level === "Medium") return "55%";
    return "20%";
  };

  const PSYCH_EXPLANATIONS = {
    depression: { title: 'Depression & Mood', desc: { High: 'Severe low mood or emotional weight detected.', Medium: 'Moderate sadness or fatigue present.', Low: 'Minimal depressive markers detected.' } },
    anxiety: { title: 'Anxiety & Panic', desc: { High: 'High panic, dread or racing thoughts signals.', Medium: 'Noticeable worry or nervousness detected.', Low: 'Calm baseline state.' } },
    stress: { title: 'Stress & Burnout', desc: { High: 'Critical burnout markers & overwhelmed.', Medium: 'Elevated workload stress or pressure.', Low: 'Optimal coping capacity.' } },
    anger: { title: 'Anger & Hostility', desc: { High: 'Strong outrage or hostile phrasing.', Medium: 'Mild irritation or annoyance expressed.', Low: 'No anger or hostility signals.' } },
    happiness: { title: 'Positivity & Wellness', desc: { High: 'Strong positive emotional state & joy.', Medium: 'Mild pleasant sentiment present.', Low: 'Low expression of positivity.' } }
  };

  const modal = document.createElement("div");
  modal.className = "mindpulse-dashboard-modal";
  modal.id = "mindpulseDashboardModal";

  modal.innerHTML = `
    <div class="mindpulse-modal-header" id="mindpulseModalHeader">
      <div class="mindpulse-header-brand">
        <svg class="mindpulse-brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 2a9 9 0 0 0-9 9c0 3.87 2.45 7.17 5.88 8.42.5.09.68-.22.68-.48 0-.24-.01-.88-.01-1.73-2.4.52-2.91-1.16-2.91-1.16-.39-.99-.96-1.26-.96-1.26-.78-.54.06-.53.06-.53.86.06 1.32.89 1.32.89.77 1.32 2.02.94 2.51.72.08-.56.3-.94.55-1.16-1.92-.22-3.94-.96-3.94-4.28 0-.95.34-1.72.89-2.33-.09-.22-.39-1.1.08-2.3 0 0 .73-.23 2.39.89a8.3 8.3 0 0 1 4.36 0c1.66-1.12 2.39-.89 2.39-.89.47 1.2.17 2.08.08 2.3.56.61.89 1.38.89 2.33 0 3.33-2.03 4.05-3.96 4.27.31.27.59.8.59 1.62 0 1.17-.01 2.12-.01 2.41 0 .27.18.58.69.48A9.003 9.003 0 0 0 21 11a9 9 0 0 0-9-9z"/>
        </svg>
        <span class="mindpulse-brand-title">MindPulse AI</span>
        <span class="mindpulse-brand-badge">Diagnostics Dashboard</span>
      </div>

      <div class="mindpulse-modal-actions">
        <span class="mindpulse-drag-hint">Drag</span>
        <button class="mindpulse-btn-icon-only close-btn" id="mindpulseCloseBtn" title="Close Window">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <div class="mindpulse-modal-body">
      <!-- Author Details Card -->
      <div class="mindpulse-author-card">
        <div class="mindpulse-author-header">
          <div class="mindpulse-author-avatar">👤</div>
          <div>
            <div class="mindpulse-author-name">${escapeHtml(author_handle)}</div>
            <div class="mindpulse-author-meta">Post Target • Live Extraction</div>
          </div>
        </div>
        <div class="mindpulse-author-quote">
          "${escapeHtml(text.length > 180 ? text.substring(0, 180) + "..." : text)}"
        </div>
        ${image_url ? `<img src="${escapeHtml(image_url)}" class="mindpulse-image-preview" alt="Attached media" />` : ''}
      </div>

      <!-- SECTION 1: SENTIMENT ANALYSIS -->
      <div class="mindpulse-section">
        <div class="mindpulse-section-header border-sent">
          <span class="mindpulse-section-title">1. 🎭 Sentiment Analysis & Tone</span>
          <span class="mindpulse-section-badge">${confPct}% Confidence</span>
        </div>

        <div class="mindpulse-kpi-grid">
          <div class="mindpulse-kpi-card">
            <div class="mindpulse-kpi-label">Sentiment Category</div>
            <div class="mindpulse-kpi-value">
              <span class="sent-pill sent-${escapeHtml(sentiment)}">
                ${escapeHtml(sentiment)}
              </span>
            </div>
          </div>

          <div class="mindpulse-kpi-card">
            <div class="mindpulse-kpi-label">Predicted Class</div>
            <div class="mindpulse-kpi-value" style="color: #38bdf8;">
              ${escapeHtml(predicted_label)}
            </div>
          </div>

          <div class="mindpulse-kpi-card">
            <div class="mindpulse-kpi-label">Sarcasm Status</div>
            <div class="mindpulse-kpi-value" style="font-size: 11px; color: ${is_sarcastic ? '#fbbf24' : '#94a3b8'};">
              ${is_sarcastic ? '⚡ Sarcasm Flagged' : '✓ Literal Text'}
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: PSYCHOLOGICAL ANALYSIS -->
      <div class="mindpulse-section">
        <div class="mindpulse-section-header border-psych">
          <span class="mindpulse-section-title">2. 🧠 Psychological State Assessment</span>
          <span class="risk-pill risk-${escapeHtml(risk_level)}">${escapeHtml(risk_level)} Risk</span>
        </div>

        <div class="mindpulse-psych-list">
          ${Object.entries(psych).map(([key, lvl]) => {
            const info = PSYCH_EXPLANATIONS[key] || { title: key, desc: { High: '', Medium: '', Low: '' } };
            const exp = info.desc[lvl] || info.desc['Low'];
            return `
              <div class="mindpulse-psych-item">
                <div class="mindpulse-psych-header">
                  <span class="mindpulse-psych-name">${info.title}</span>
                  <span class="mindpulse-psych-level level-${escapeHtml(lvl)}">${escapeHtml(lvl)} LEVEL</span>
                </div>
                <div class="mindpulse-bar-track">
                  <div class="mindpulse-bar-fill bar-${escapeHtml(lvl)}" style="width: ${getLevelPct(lvl)};"></div>
                </div>
                <div class="mindpulse-psych-explanation">${escapeHtml(exp)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="mindpulse-disclaimer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span><strong>Automated Research Tool</strong>: This FYP analysis is for awareness & education. It is not a clinical mental health diagnosis.</span>
      </div>

      <div class="mindpulse-modal-footer">
        <button class="mindpulse-action-btn btn-pdf" id="mindpulsePdfBtn">
          📄 Export PDF Report
        </button>

        <button class="mindpulse-action-btn btn-secondary" id="mindpulseCopyBtn">
          <span id="mindpulseCopyText">Copy Summary</span>
        </button>

        <button class="mindpulse-action-btn btn-primary" id="mindpulseFooterCloseBtn">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  activeDashboardModal = modal;

  const closeBtn = modal.querySelector('#mindpulseCloseBtn');
  const footerCloseBtn = modal.querySelector('#mindpulseFooterCloseBtn');
  const closeHandler = () => {
    modal.style.animation = 'mindpulse-modal-pop 0.2s reverse forwards';
    setTimeout(() => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      if (activeDashboardModal === modal) activeDashboardModal = null;
    }, 200);
  };

  if (closeBtn) closeBtn.addEventListener('click', closeHandler);
  if (footerCloseBtn) footerCloseBtn.addEventListener('click', closeHandler);

  const pdfBtn = modal.querySelector('#mindpulsePdfBtn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', async () => {
      pdfBtn.disabled = true;
      pdfBtn.innerHTML = `<span>⏳ Generating PDF...</span>`;
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
        a.download = `MindPulse_${(author_handle || 'Tweet').replace('@', '')}_Report.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
      } catch (err) {
        alert("PDF Generation Error: " + err.message);
      } finally {
        pdfBtn.disabled = false;
        pdfBtn.innerHTML = `<span>📄 Export PDF Report</span>`;
      }
    });
  }

  const copyBtn = modal.querySelector('#mindpulseCopyBtn');
  const copyTextSpan = modal.querySelector('#mindpulseCopyText');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const summaryText = `[MindPulse AI Analysis]\nAuthor: ${author_handle}\nSentiment: ${sentiment} (${confPct}%)\nRisk Level: ${risk_level}\nDepression: ${psych.depression} | Anxiety: ${psych.anxiety} | Stress: ${psych.stress}\nText: "${text}"`;
      navigator.clipboard.writeText(summaryText).then(() => {
        copyTextSpan.textContent = "Copied!";
        setTimeout(() => {
          copyTextSpan.textContent = "Copy Summary";
        }, 2000);
      });
    });
  }

  setupModalDrag(modal);
}

function setupModalDrag(modal) {
  const header = modal.querySelector('#mindpulseModalHeader');
  if (!header) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('#mindpulseCloseBtn')) return;

    isDragging = true;
    modal.classList.add('is-dragging');

    const rect = modal.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    modal.style.right = 'auto';
    modal.style.left = `${initialLeft}px`;
    modal.style.top = `${initialTop}px`;

    startX = e.clientX;
    startY = e.clientY;

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      moveEvent.preventDefault();

      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      const maxLeft = window.innerWidth - modal.offsetWidth - 10;
      const maxTop = window.innerHeight - modal.offsetHeight - 10;

      newLeft = Math.max(10, Math.min(newLeft, maxLeft));
      newTop = Math.max(10, Math.min(newTop, maxTop));

      modal.style.left = `${newLeft}px`;
      modal.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      modal.classList.remove('is-dragging');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
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


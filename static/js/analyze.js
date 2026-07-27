document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('analyze-form');
    const textInput = document.getElementById('text-input');
    const charCount = document.querySelector('.char-count');
    const loadSampleBtn = document.getElementById('load-sample-btn');
    const submitBtn = document.getElementById('submit-btn');
    
    const resultCard = document.getElementById('result-display-card');
    const emptyView = document.getElementById('empty-results-view');
    const resultsView = document.getElementById('results-view');
    const loadingView = document.getElementById('loading-view');
    
    // Result elements
    const sentimentVal = document.getElementById('sentiment-val');
    const sentimentBarFill = document.getElementById('sentiment-bar-fill');
    const sentimentScoreNum = document.getElementById('sentiment-score-num');
    
    const stateDepFill = document.getElementById('state-dep-fill');
    const stateDepVal = document.getElementById('state-dep-val');
    const stateAnxFill = document.getElementById('state-anx-fill');
    const stateAnxVal = document.getElementById('state-anx-val');
    const stateStrFill = document.getElementById('state-str-fill');
    const stateStrVal = document.getElementById('state-str-val');
    const stateAngFill = document.getElementById('state-ang-fill');
    const stateAngVal = document.getElementById('state-ang-val');
    const stateHapFill = document.getElementById('state-hap-fill');
    const stateHapVal = document.getElementById('state-hap-val');
    
    const flaggedBanner = document.getElementById('flagged-banner');
    const riskBadge = document.getElementById('risk-badge');
    const sarcasmBadge = document.getElementById('sarcasm-badge');
    const sarcasmNote = document.getElementById('sarcasm-note');
    const ragContextContent = document.getElementById('rag-context-content');

    // Samples array
    const samples = [
        "Honestly, lately I feel completely detached from everything. I spend hours staring at walls. I can't find energy to do the basic chores, and sleep doesn't help. I just feel incredibly hopeless about the future, like nothing will ever get better.",
        "Just received my promotion today! Hard work really pays off. Excited to start this new journey with the team, thanks everyone for the support!",
        "My heart has been racing all day. I have this constant knot in my stomach and I keep expecting something terrible to happen, even though nothing is wrong. I can't focus on work and my hands won't stop shaking.",
        "Oh fantastic, another panic attack right before my presentation! /s",
        "Living the dream with 2 hours of sleep and non-stop anxiety",
        "Completely exhausted. Working 14-hour days for the last 3 weeks. I feel like my brain is fried and I have zero patience left. I can't even remember the last time I relaxed or slept a full 8 hours."
    ];

    // Character counter
    textInput.addEventListener('input', () => {
        const count = textInput.value.length;
        charCount.textContent = `${count} / 500`;
        if (count > 500) {
            charCount.style.color = '#ef4444';
        } else {
            charCount.style.color = '#6b7280';
        }
    });

    // Load sample post
    loadSampleBtn.addEventListener('click', () => {
        const randomIndex = Math.floor(Math.random() * samples.length);
        textInput.value = samples[randomIndex];
        textInput.dispatchEvent(new Event('input'));
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        if (!text) return;

        // Show loading state
        resultCard.classList.remove('empty-state');
        emptyView.classList.add('hidden');
        resultsView.classList.add('hidden');
        loadingView.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) {
                throw new Error('Analysis pipeline failed.');
            }

            const data = await response.json();
            renderResults(data);
            
        } catch (error) {
            console.error(error);
            alert('An error occurred while analyzing the text. Please ensure the backend is running.');
            // Revert to empty state
            resultCard.classList.add('empty-state');
            emptyView.classList.remove('hidden');
            resultsView.classList.add('hidden');
        } finally {
            loadingView.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    function renderResults(data) {
        // Hide loading, show results
        resultsView.classList.remove('hidden');
        
        // Populate sentiment
        sentimentVal.textContent = data.sentiment;
        const score = data.sentiment_score;
        sentimentScoreNum.textContent = score.toFixed(2);
        sentimentBarFill.style.width = `${score * 100}%`;

        // Style sentiment value color
        if (data.sentiment === 'Positive') {
            sentimentVal.style.color = 'var(--accent-success)';
        } else if (data.sentiment === 'Negative') {
            sentimentVal.style.color = 'var(--accent-danger)';
        } else {
            sentimentVal.style.color = 'var(--text-primary)';
        }

        // Populate psychological states
        const states = data.psychological_states;
        
        // Helper to update progress bars
        const updateProgressBar = (fillEl, valEl, level) => {
            valEl.textContent = level;
            let width = '10%';
            let color = 'var(--accent-success)';
            
            if (level === 'Medium') {
                width = '50%';
                color = 'var(--accent-warning)';
            } else if (level === 'High') {
                width = '90%';
                color = 'var(--accent-danger)';
            }
            
            fillEl.style.width = width;
            fillEl.style.backgroundColor = color;
            valEl.style.color = color;
        };

        updateProgressBar(stateDepFill, stateDepVal, states.depression || 'Low');
        updateProgressBar(stateAnxFill, stateAnxVal, states.anxiety || 'Low');
        updateProgressBar(stateStrFill, stateStrVal, states.stress || 'Low');
        if (stateAngFill && stateAngVal) {
            updateProgressBar(stateAngFill, stateAngVal, states.anger || 'Low');
        }
        if (stateHapFill && stateHapVal) {
            updateProgressBar(stateHapFill, stateHapVal, states.happiness || 'Low');
        }

        // Risk Badge & Flagged Banner
        riskBadge.textContent = `Risk Level: ${data.risk_level}`;

        // Toggle Sarcasm Badges
        if (data.is_sarcastic) {
            if (sarcasmBadge) sarcasmBadge.classList.remove('hidden');
            if (sarcasmNote) sarcasmNote.classList.remove('hidden');
        } else {
            if (sarcasmBadge) sarcasmBadge.classList.add('hidden');
            if (sarcasmNote) sarcasmNote.classList.add('hidden');
        }
        
        if (data.flagged) {
            flaggedBanner.classList.remove('hidden');
            riskBadge.className = 'badge';
            riskBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            riskBadge.style.borderColor = 'var(--accent-danger)';
            riskBadge.style.color = '#fca5a5';
        } else {
            flaggedBanner.classList.add('hidden');
            riskBadge.className = 'badge';
            riskBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            riskBadge.style.borderColor = 'var(--accent-success)';
            riskBadge.style.color = '#a7f3d0';
        }

        // RAG Context
        if (data.rag_context) {
            ragContextContent.innerHTML = data.rag_context;
        } else {
            ragContextContent.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">No expert guidelines triggered for this level of risk.</span>`;
        }
    }
});

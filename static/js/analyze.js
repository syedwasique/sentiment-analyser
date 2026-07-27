/* =========================================================
   Google Cloud Natural Language & Diagnostics Console Controller
   ========================================================= */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // Preset Samples
    const SAMPLES = [
        "Honestly, lately I feel completely detached from everything. I spend hours staring at walls. I can't find energy to do basic chores, and sleep doesn't help. I just feel incredibly hopeless about the future, like nothing will ever get better.",
        "Just received my promotion today! Hard work really pays off. Excited to start this new journey with the team, thanks everyone for the support!",
        "My heart has been racing all day. I have this constant knot in my stomach and I keep expecting something terrible to happen, even though nothing is wrong. I can't focus on work and my hands won't stop shaking.",
        "I am absolutely furious right now. I want to punch something. Nobody listens and everything is just falling apart. I have zero patience left for this nonsense.",
        "Oh fantastic, another panic attack right before my presentation! /s Just what I needed. Living the dream with 2 hours of sleep and non-stop anxiety. Sounded much better in my head.",
        "Completely exhausted. Working 14-hour days for the last 3 weeks. I feel like my brain is fried and I have zero patience left. I can't even remember the last time I relaxed or slept a full 8 hours."
    ];

    const LABEL_ORDER = ['Happy/Positive', 'Neutral', 'Anxious/Stress', 'Depressed/Sad'];

    // DOM Elements
    const form          = document.getElementById('analyze-form');
    const textInput     = document.getElementById('text-input');
    const charCount     = document.getElementById('charCount');
    const clearBtn      = document.getElementById('clearBtn');
    const submitBtn     = document.getElementById('submit-btn');
    const samplePreset  = document.getElementById('samplePreset');
    const sampleChips   = document.querySelectorAll('.g-chip');
    const randBtn       = document.getElementById('load-sample-btn');
    const themeToggleBtn= document.getElementById('themeToggleBtn');
    const themeIcon     = document.getElementById('themeIcon');

    // Tab buttons & panes
    const tabBtns  = document.querySelectorAll('.g-tab-btn');
    const tabPanes = document.querySelectorAll('.g-tab-pane');

    // States
    const emptyState   = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const resultsState = document.getElementById('resultsState');

    // Result Output Elements
    const meterPointer  = document.getElementById('meterPointer');
    const peClassLabel  = document.getElementById('peClassLabel');
    const peSentimentTag= document.getElementById('peSentimentTag');
    const peConfidenceNum=document.getElementById('peConfidenceNum');
    const riskBadge     = document.getElementById('riskBadge');
    const sarcasmBadge  = document.getElementById('sarcasmBadge');
    const flaggedBanner = document.getElementById('flaggedBanner');
    const analyzedText  = document.getElementById('analyzedTextContent');
    const keywordFlags  = document.getElementById('keywordFlags');
    const jsonBox       = document.getElementById('jsonResponseBox');
    const copyJsonBtn   = document.getElementById('copyJsonBtn');

    // Psych level & bar refs
    const psychBars = {
        dep: document.getElementById('barDep'),
        anx: document.getElementById('barAnx'),
        str: document.getElementById('barStr'),
        ang: document.getElementById('barAng'),
        hap: document.getElementById('barHap')
    };

    const psychLvls = {
        dep: document.getElementById('lvlDep'),
        anx: document.getElementById('lvlAnx'),
        str: document.getElementById('lvlStr'),
        ang: document.getElementById('lvlAng'),
        hap: document.getElementById('lvlHap')
    };

    // Class probability bars
    const scFills = [0,1,2,3].map(i => document.getElementById(`scFill${i}`));
    const scNums  = [0,1,2,3].map(i => document.getElementById(`scNum${i}`));

    // ── Theme Switcher (Dark/Light) ─────────────────────────
    let currentTheme = localStorage.getItem('g-theme') || 'dark';
    applyTheme(currentTheme);

    themeToggleBtn && themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('g-theme', currentTheme);
        applyTheme(currentTheme);
    });

    function applyTheme(theme) {
        document.body.className = `g-theme-${theme}`;
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
    }

    // ── Character Counter ───────────────────────────────────
    function updateCharUI() {
        const len = textInput.value.length;
        charCount.textContent = `${len} / 1000`;
        if (len > 800) {
            charCount.style.color = '#f28b82';
        } else {
            charCount.style.color = 'var(--g-text-muted)';
        }
    }

    textInput.addEventListener('input', updateCharUI);

    clearBtn && clearBtn.addEventListener('click', () => {
        textInput.value = '';
        updateCharUI();
        if (samplePreset) samplePreset.selectedIndex = 0;
        sampleChips.forEach(c => c.classList.remove('active'));
        textInput.focus();
    });

    // ── Sample Select Dropdown & Chips ──────────────────────
    samplePreset && samplePreset.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        if (!isNaN(idx) && SAMPLES[idx]) {
            textInput.value = SAMPLES[idx];
            updateCharUI();
            sampleChips.forEach(c => c.classList.remove('active'));
            if (sampleChips[idx]) sampleChips[idx].classList.add('active');
        }
    });

    sampleChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const idx = parseInt(chip.dataset.sample, 10);
            if (!isNaN(idx) && SAMPLES[idx]) {
                textInput.value = SAMPLES[idx];
                updateCharUI();
                sampleChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                if (samplePreset) samplePreset.value = idx.toString();
            }
        });
    });

    randBtn && randBtn.addEventListener('click', () => {
        const idx = Math.floor(Math.random() * SAMPLES.length);
        textInput.value = SAMPLES[idx];
        updateCharUI();
        sampleChips.forEach(c => c.classList.remove('active'));
        if (sampleChips[idx]) sampleChips[idx].classList.add('active');
        if (samplePreset) samplePreset.value = idx.toString();
    });

    // ── Tab Navigation Logic ────────────────────────────────
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const pane = document.getElementById(targetTab);
            if (pane) pane.classList.add('active');
        });
    });

    // ── Show / Hide Console States ─────────────────────────
    function showState(state) {
        emptyState.classList.add('hidden');
        loadingState.classList.add('hidden');
        resultsState.classList.add('hidden');

        if (state === 'empty')   emptyState.classList.remove('hidden');
        if (state === 'loading') loadingState.classList.remove('hidden');
        if (state === 'results') resultsState.classList.remove('hidden');
    }

    // ── Form Submission ─────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        if (!text) {
            textInput.focus();
            return;
        }

        showState('loading');
        submitBtn.disabled = true;

        try {
            const res = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            renderResults(data);
            showState('results');

        } catch (err) {
            showState('empty');
            alert(`Google Vertex Natural Language Error: ${err.message}`);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ── Render Diagnostic Results ───────────────────────────
    function renderResults(data) {
        // 1. Calculate Document Sentiment Score (-1.0 to +1.0)
        const sentiment = data.sentiment || 'Neutral';
        const confidence = data.sentiment_score || 0;
        let score = 0;

        if (sentiment === 'Positive') {
            score = Math.min(1.0, confidence);
        } else if (sentiment === 'Negative') {
            score = Math.max(-1.0, -confidence);
        } else {
            score = 0.0;
        }

        // Pointer Position on -1.0 to +1.0 scale
        // Score -1.0 -> 0%, Score 0.0 -> 50%, Score +1.0 -> 100%
        const pointerPct = Math.max(2, Math.min(98, ((score + 1.0) / 2.0) * 100));
        meterPointer.style.left = `${pointerPct}%`;

        // Class label & sentiment tag
        const label = data.predicted_label || 'Unknown';
        peClassLabel.textContent = label;
        peSentimentTag.textContent = sentiment.toUpperCase();
        peSentimentTag.className = `g-tag-pill tag-${sentiment.toLowerCase()}`;
        peConfidenceNum.textContent = confidence.toFixed(4);

        // Risk Level Badge
        const risk = (data.risk_level || 'None').toLowerCase();
        riskBadge.className = `g-risk-pill risk-${risk}`;
        riskBadge.textContent = `Risk: ${data.risk_level || 'None'}`;

        // Sarcasm Badge
        if (data.is_sarcastic) {
            sarcasmBadge.classList.remove('hidden');
        } else {
            sarcasmBadge.classList.add('hidden');
        }

        // Flagged Banner
        if (data.flagged) {
            flaggedBanner.classList.remove('hidden');
        } else {
            flaggedBanner.classList.add('hidden');
        }

        // 2. Psychological Diagnostics Progress Bars
        const ps = data.psychological_states || {};
        updatePsychRow('dep', ps.depression || 'Low');
        updatePsychRow('anx', ps.anxiety || 'Low');
        updatePsychRow('str', ps.stress || 'Low');
        updatePsychRow('ang', ps.anger || 'Low');
        updatePsychRow('hap', ps.happiness || 'Low');

        // 3. Class Probabilities
        const allScores = data.all_scores || {};
        LABEL_ORDER.forEach((lbl, i) => {
            const pct = ((allScores[lbl] || 0) * 100).toFixed(1);
            if (scFills[i]) scFills[i].style.width = `${pct}%`;
            if (scNums[i])  scNums[i].textContent  = `${pct}%`;
        });

        // 4. Feature Markers & Echo Input Text
        renderKeywordFlags(data);
        if (analyzedText) analyzedText.textContent = data.text || '';

        // 5. Render Syntax Highlighted JSON Response
        renderJson(data);
    }

    function updatePsychRow(key, level) {
        let width = '15%';
        let color = '#81c995';

        if (level === 'Medium') {
            width = '55%';
            color = '#fde293';
        } else if (level === 'High') {
            width = '92%';
            color = '#f28b82';
        }

        if (psychBars[key]) psychBars[key].style.width = width;
        if (psychLvls[key]) {
            psychLvls[key].textContent = level;
            psychLvls[key].style.color = color;
        }
    }

    function renderKeywordFlags(data) {
        if (!keywordFlags) return;
        const flags = data.keyword_flags || {};
        const isSarc = data.is_sarcastic || false;

        const flagDefs = [
            { key: 'has_burnout_term',         label: 'Burnout Indicator' },
            { key: 'has_anger_term',           label: 'Hostility Indicator' },
            { key: 'has_distress_term',        label: 'Distress Marker' },
            { key: 'has_negation_of_positive', label: 'Negation Trigger' },
            { key: 'has_ru_dep',               label: 'Roman Urdu Depression' },
            { key: 'has_ru_anx',               label: 'Roman Urdu Anxiety' },
            { key: 'has_explicit_anxiety',     label: 'Panic Keywords' }
        ];

        keywordFlags.innerHTML = '';
        flagDefs.forEach(def => {
            const active = !!(flags[def.key]);
            const chip = document.createElement('span');
            chip.className = `g-kf-chip ${active ? 'g-kf-active' : 'g-kf-inactive'}`;
            chip.textContent = `${active ? '✓ ' : ''}${def.label}`;
            keywordFlags.appendChild(chip);
        });

        if (isSarc) {
            const sarcChip = document.createElement('span');
            sarcChip.className = 'g-kf-chip g-kf-active';
            sarcChip.textContent = '✓ Sarcasm & Rhetoric';
            keywordFlags.appendChild(sarcChip);
        }
    }

    // ── Syntax Highlighted JSON Output ──────────────────────
    function renderJson(data) {
        if (!jsonBox) return;
        const str = JSON.stringify(data, null, 2);
        const highlighted = syntaxHighlight(str);
        jsonBox.innerHTML = highlighted;
    }

    function syntaxHighlight(jsonStr) {
        jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'j-num';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'j-key';
                } else {
                    cls = 'j-str';
                }
            } else if (/true|false/.test(match)) {
                cls = 'j-bool';
            } else if (/null/.test(match)) {
                cls = 'j-bool';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    // Copy JSON Button
    copyJsonBtn && copyJsonBtn.addEventListener('click', () => {
        const jsonText = jsonBox.innerText || jsonBox.textContent;
        navigator.clipboard.writeText(jsonText).then(() => {
            copyJsonBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => {
                copyJsonBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy JSON';
            }, 2000);
        });
    });

});

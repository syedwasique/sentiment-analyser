/* =========================================================
   MindPulse — Premium Analyze Script
   Connects to /analyze API and renders results with
   Chart.js donut + gauge charts, animated bars, and
   keyword flag chips.
   ========================================================= */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // ── Sample posts ────────────────────────────────────────
    const SAMPLES = [
        // 0: Depressed
        "Honestly, lately I feel completely detached from everything. I spend hours staring at walls. I can't find energy to do the basic chores, and sleep doesn't help. I just feel incredibly hopeless about the future, like nothing will ever get better.",
        // 1: Happy
        "Just received my promotion today! Hard work really pays off. Excited to start this new journey with the team, thanks everyone for the support!",
        // 2: Anxious
        "My heart has been racing all day. I have this constant knot in my stomach and I keep expecting something terrible to happen, even though nothing is wrong. I can't focus on work and my hands won't stop shaking.",
        // 3: Angry
        "I am absolutely furious right now. I want to punch something. Nobody listens and everything is just falling apart. I have zero patience left for this nonsense.",
        // 4: Sarcastic
        "Oh fantastic, another panic attack right before my presentation! /s Just what I needed. Living the dream with 2 hours of sleep and non-stop anxiety. Sounded much better in my head.",
        // 5: Burnout
        "Completely exhausted. Working 14-hour days for the last 3 weeks. I feel like my brain is fried and I have zero patience left. I can't even remember the last time I relaxed or slept a full 8 hours.",
    ];

    // Label order from the backend all_scores dict
    const LABEL_ORDER = ['Happy/Positive', 'Neutral', 'Anxious/Stress', 'Depressed/Sad'];

    // ── DOM refs ─────────────────────────────────────────────
    const form        = document.getElementById('analyze-form');
    const textInput   = document.getElementById('text-input');
    const charCount   = document.getElementById('charCount');
    const clearBtn    = document.getElementById('clearBtn');
    const submitBtn   = document.getElementById('submit-btn');
    const sampleBtns  = document.querySelectorAll('.sample-chip');
    const randBtn     = document.getElementById('load-sample-btn');

    const emptyState   = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const resultsState = document.getElementById('resultsState');

    // Result els
    const sarcasmBadge  = document.getElementById('sarcasmBadge');
    const riskBadge     = document.getElementById('riskBadge');
    const riskLabel     = document.getElementById('riskLabel');
    const flaggedBanner = document.getElementById('flaggedBanner');
    const peClassLabel  = document.getElementById('peClassLabel');
    const peSentimentTag= document.getElementById('peSentimentTag');
    const peConfFill    = document.getElementById('peConfidenceFill');
    const peConfNum     = document.getElementById('peConfidenceNum');
    const resultTs      = document.getElementById('resultTimestamp');
    const analyzedText  = document.getElementById('analyzedTextContent');
    const keywordFlags  = document.getElementById('keywordFlags');
    const scFills       = [0,1,2,3].map(i => document.getElementById(`scFill${i}`));
    const scNums        = [0,1,2,3].map(i => document.getElementById(`scNum${i}`));

    // Psych level labels
    const psychLvls = {
        dep: document.getElementById('lvlDep'),
        anx: document.getElementById('lvlAnx'),
        str: document.getElementById('lvlStr'),
        ang: document.getElementById('lvlAng'),
        hap: document.getElementById('lvlHap'),
    };

    // ── Chart instances ──────────────────────────────────────
    let donutChart = null;
    const gaugeCharts = {};

    // ── Header scroll effect ──────────────────────────────────
    const header = document.getElementById('appHeader');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 10);
        }, { passive: true });
    }

    // ── Char counter + clear button visibility ───────────────
    function updateCharUI() {
        const len = textInput.value.length;
        charCount.textContent = `${len} / 1000`;
        charCount.classList.toggle('warn', len > 800 && len <= 1000);
        charCount.classList.toggle('over', len > 1000);
        clearBtn.classList.toggle('visible', len > 0);
    }

    textInput.addEventListener('input', updateCharUI);
    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        updateCharUI();
        textInput.focus();
        // remove active chips
        sampleBtns.forEach(b => b.classList.remove('active'));
    });

    // ── Sample chips ─────────────────────────────────────────
    sampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.sample, 10);
            textInput.value = SAMPLES[idx] || '';
            updateCharUI();
            sampleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            textInput.focus();
        });
    });

    randBtn && randBtn.addEventListener('click', () => {
        const idx = Math.floor(Math.random() * SAMPLES.length);
        textInput.value = SAMPLES[idx];
        updateCharUI();
        sampleBtns.forEach(b => b.classList.remove('active'));
        sampleBtns[idx] && sampleBtns[idx].classList.add('active');
    });

    // ── Loading step animator ────────────────────────────────
    let loaderTimer = null;
    function startLoader() {
        const steps = document.querySelectorAll('.loader-step');
        let current = 0;
        steps.forEach(s => {
            s.classList.remove('active', 'done');
            s.querySelector('i').className = 'fa-regular fa-circle';
        });
        steps[0].classList.add('active');
        steps[0].querySelector('i').className = 'fa-solid fa-spinner fa-spin';

        loaderTimer = setInterval(() => {
            if (current < steps.length) {
                steps[current].classList.remove('active');
                steps[current].classList.add('done');
                steps[current].querySelector('i').className = 'fa-solid fa-check';
                current++;
                if (current < steps.length) {
                    steps[current].classList.add('active');
                    steps[current].querySelector('i').className = 'fa-solid fa-spinner fa-spin';
                }
            } else {
                clearInterval(loaderTimer);
            }
        }, 650);
    }

    function stopLoader() {
        clearInterval(loaderTimer);
    }

    // ── Show / hide states ───────────────────────────────────
    function showState(state) {
        emptyState.classList.add('hidden');
        loadingState.classList.add('hidden');
        resultsState.classList.add('hidden');
        if (state === 'empty')   emptyState.classList.remove('hidden');
        if (state === 'loading') loadingState.classList.remove('hidden');
        if (state === 'results') resultsState.classList.remove('hidden');
    }

    // ── Form submit ──────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        if (!text) {
            textInput.focus();
            return;
        }

        showState('loading');
        startLoader();
        submitBtn.disabled = true;

        try {
            const res = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            stopLoader();
            renderResults(data);
            showState('results');

        } catch (err) {
            stopLoader();
            showState('empty');
            console.error('[MindPulse] Analysis error:', err);
            showToast(`Analysis failed: ${err.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ── Render results ───────────────────────────────────────
    function renderResults(data) {
        // Timestamp
        resultTs.textContent = `Analyzed at ${new Date().toLocaleTimeString()}`;

        // ── Risk badge
        const risk = (data.risk_level || 'None').toLowerCase();
        riskBadge.className = `risk-badge risk-${risk}`;
        riskLabel.textContent = `Risk: ${data.risk_level || 'None'}`;

        // ── Sarcasm
        if (data.is_sarcastic) {
            sarcasmBadge.classList.remove('hidden');
        } else {
            sarcasmBadge.classList.add('hidden');
        }

        // ── Flagged banner
        if (data.flagged) {
            flaggedBanner.classList.remove('hidden');
        } else {
            flaggedBanner.classList.add('hidden');
        }

        // ── Primary emotion card
        const label = data.predicted_label || 'Unknown';
        const sentiment = data.sentiment || 'Neutral';
        const conf = data.sentiment_score || 0;

        peClassLabel.textContent = label;
        peClassLabel.style.color = emotionColor(label);

        peSentimentTag.textContent = sentiment;
        peSentimentTag.className = 'pe-sentiment-tag tag-' + sentiment.toLowerCase();

        // Animate confidence bar
        setTimeout(() => {
            peConfFill.style.width = `${(conf * 100).toFixed(1)}%`;
            peConfNum.textContent  = `${(conf * 100).toFixed(1)}%`;
        }, 80);

        // Donut chart — shows all 4 class scores
        renderDonut(data.all_scores || {});

        // ── Psychological states gauges
        const ps = data.psychological_states || {};
        renderGauge('gaugeDep', 'dep', ps.depression  || 'Low', '#8b5cf6');
        renderGauge('gaugeAnx', 'anx', ps.anxiety     || 'Low', '#22d3ee');
        renderGauge('gaugeStr', 'str', ps.stress       || 'Low', '#f59e0b');
        renderGauge('gaugeAng', 'ang', ps.anger        || 'Low', '#f43f5e');
        renderGauge('gaugeHap', 'hap', ps.happiness    || 'Low', '#10b981');

        // ── Class probability bars
        const allScores = data.all_scores || {};
        LABEL_ORDER.forEach((lbl, i) => {
            const pct = ((allScores[lbl] || 0) * 100).toFixed(1);
            setTimeout(() => {
                scFills[i].style.width = `${pct}%`;
                scNums[i].textContent  = `${pct}%`;
            }, 120 + i * 60);
        });

        // ── Analyzed text echo
        analyzedText.textContent = data.text || '';

        // ── Keyword flags
        renderKeywordFlags(data);
    }

    // ── Donut chart ──────────────────────────────────────────
    function renderDonut(allScores) {
        const ctx = document.getElementById('sentimentDonut');
        if (!ctx) return;

        const values = LABEL_ORDER.map(l => (allScores[l] || 0) * 100);
        const colors = ['#10b981', '#38bdf8', '#f59e0b', '#8b5cf6'];
        const borderColors = colors.map(c => c + '80');

        if (donutChart) {
            donutChart.data.datasets[0].data = values;
            donutChart.update('active');
            return;
        }

        donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: LABEL_ORDER.map(l => l.split('/')[0]),
                datasets: [{
                    data: values,
                    backgroundColor: colors.map(c => c + '40'),
                    borderColor: colors,
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                }]
            },
            options: {
                responsive: false,
                cutout: '72%',
                animation: { duration: 1000, easing: 'easeInOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.raw.toFixed(1)}%`
                        },
                        backgroundColor: 'rgba(10,13,22,0.95)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        titleColor: '#f1f5fd',
                        bodyColor: '#94a3b8',
                        padding: 10,
                        cornerRadius: 8,
                    }
                }
            }
        });
    }

    // ── Gauge (doughnut) per psych dimension ─────────────────
    function levelToPercent(level) {
        if (level === 'High')   return 90;
        if (level === 'Medium') return 52;
        return 12; // Low
    }

    function renderGauge(canvasId, key, level, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const pct   = levelToPercent(level);
        const rest  = 100 - pct;

        // Update level label
        if (psychLvls[key]) {
            psychLvls[key].textContent = level;
            psychLvls[key].style.color = levelColor(level);
        }

        if (gaugeCharts[key]) {
            gaugeCharts[key].data.datasets[0].data = [pct, rest];
            gaugeCharts[key].data.datasets[0].backgroundColor = [color + 'cc', 'rgba(255,255,255,0.04)'];
            gaugeCharts[key].data.datasets[0].borderColor = [color, 'transparent'];
            gaugeCharts[key].update('active');
            return;
        }

        gaugeCharts[key] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [pct, rest],
                    backgroundColor: [color + 'cc', 'rgba(255,255,255,0.04)'],
                    borderColor: [color, 'transparent'],
                    borderWidth: 2,
                    circumference: 240,
                    rotation: -120,
                    hoverOffset: 0,
                }]
            },
            options: {
                responsive: false,
                cutout: '78%',
                animation: { duration: 900, easing: 'easeInOutQuart' },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                events: [],
            }
        });
    }

    // ── Keyword flag chips ───────────────────────────────────
    function renderKeywordFlags(data) {
        const flags = data.keyword_flags || {};
        const isSarc = data.is_sarcastic || false;

        const flagDefs = [
            { key: 'has_burnout_term',       label: '🔥 Burnout' },
            { key: 'has_anger_term',         label: '😤 Anger' },
            { key: 'has_distress_term',      label: '😰 Distress' },
            { key: 'has_negation_of_positive', label: '🚫 Negation' },
            { key: 'has_ru_dep',             label: '🌙 RU Depression' },
            { key: 'has_ru_anx',             label: '🌙 RU Anxiety' },
            { key: 'has_explicit_anxiety',   label: '💔 Anxiety Keywords' },
        ];

        const sarcDef = { key: '_sarcasm', label: '😏 Sarcasm', active: isSarc };

        keywordFlags.innerHTML = '';

        const allDefs = [...flagDefs, sarcDef];
        allDefs.forEach(def => {
            const active = def.key === '_sarcasm' ? def.active : !!(flags[def.key]);
            const chip = document.createElement('span');
            chip.className = `kf-chip ${active ? 'kf-active' : 'kf-inactive'}`;
            chip.textContent = def.label;
            if (active) chip.title = 'Detected';
            keywordFlags.appendChild(chip);
        });
    }

    // ── Helpers ──────────────────────────────────────────────
    function emotionColor(label) {
        if (label === 'Happy/Positive') return '#10b981';
        if (label === 'Neutral')        return '#38bdf8';
        if (label === 'Anxious/Stress') return '#f59e0b';
        if (label === 'Depressed/Sad')  return '#c084fc';
        return '#f1f5fd';
    }

    function levelColor(level) {
        if (level === 'High')   return '#f43f5e';
        if (level === 'Medium') return '#f59e0b';
        return '#10b981';
    }

    // ── Toast notification ───────────────────────────────────
    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
            background: rgba(10,13,22,0.95); border: 1px solid;
            border-color: ${type === 'error' ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.1)'};
            color: ${type === 'error' ? '#fda4af' : '#f1f5fd'};
            padding: 0.85rem 1.25rem; border-radius: 12px;
            font-size: 0.875rem; font-weight: 500; font-family: 'Inter', sans-serif;
            backdrop-filter: blur(16px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            display: flex; align-items: center; gap: 0.6rem;
            animation: fadeInUp 0.3s ease-out;
            max-width: 340px;
        `;
        const icon = type === 'error' ? '⚠️' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

});

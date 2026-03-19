// Codex Stats — chart rendering for /codex-stats page.

const DATA_URL = 'https://api.gusarich.com/api/codex-stats';
const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';

// Colorblind-safe palette (Paul Tol's muted qualitative).
// Every model gets a unique color — no duplicates.
const MODEL_COLORS = {
    'gpt-5':               { bg: 'rgba(136,204,238,0.75)', border: 'rgb(136,204,238)' },  // cyan
    'gpt-5-codex':         { bg: 'rgba(51,34,136,0.75)',   border: 'rgb(51,34,136)' },    // indigo
    'gpt-5.1':             { bg: 'rgba(221,204,119,0.75)', border: 'rgb(221,204,119)' },  // sand
    'gpt-5.1-codex':       { bg: 'rgba(17,119,51,0.75)',   border: 'rgb(17,119,51)' },    // green
    'gpt-5.1-codex-max':   { bg: 'rgba(68,170,153,0.75)',  border: 'rgb(68,170,153)' },   // teal
    'gpt-5.1-codex-mini':  { bg: 'rgba(153,153,51,0.75)',  border: 'rgb(153,153,51)' },   // olive
    'gpt-5.2':             { bg: 'rgba(204,102,119,0.75)', border: 'rgb(204,102,119)' },  // rose
    'gpt-5.2-codex':       { bg: 'rgba(136,34,85,0.75)',   border: 'rgb(136,34,85)' },    // wine
    'gpt-5.3-codex':       { bg: 'rgba(170,68,153,0.75)',  border: 'rgb(170,68,153)' },   // purple
    'gpt-5.3-codex-spark': { bg: 'rgba(238,119,51,0.75)',  border: 'rgb(238,119,51)' },   // orange
};

const FALLBACK_COLORS = [
    { bg: 'rgba(102,153,204,0.75)', border: 'rgb(102,153,204)' },  // steel blue
    { bg: 'rgba(204,170,51,0.75)',  border: 'rgb(204,170,51)' },   // gold
    { bg: 'rgba(51,153,102,0.75)',  border: 'rgb(51,153,102)' },   // emerald
    { bg: 'rgba(187,85,102,0.75)',  border: 'rgb(187,85,102)' },   // brick
    { bg: 'rgba(85,119,170,0.75)',  border: 'rgb(85,119,170)' },   // slate
    { bg: 'rgba(170,136,51,0.75)',  border: 'rgb(170,136,51)' },   // bronze
];

const colorCache = {};
let fallbackIdx = 0;
function colorFor(model) {
    if (colorCache[model]) return colorCache[model];
    if (MODEL_COLORS[model]) {
        colorCache[model] = MODEL_COLORS[model];
    } else {
        colorCache[model] = FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
        fallbackIdx++;
    }
    return colorCache[model];
}

function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.classList.contains('dark-mode');
    return {
        text: style.getPropertyValue('--n-text-900').trim() || (isDark ? '#E5E3E0' : '#2A2826'),
        muted: style.getPropertyValue('--n-text-400').trim() || (isDark ? '#9A9590' : '#7A756D'),
        grid: style.getPropertyValue('--n-border-200').trim() || (isDark ? '#3A3632' : '#E5E2DC'),
        surface: style.getPropertyValue('--n-surface-50').trim() || (isDark ? '#1C1917' : '#F7F6F3'),
        tokenColor: isDark ? 'rgba(86,180,233,0.8)' : 'rgba(86,180,233,0.7)',
        tokenBorder: 'rgb(86,180,233)',
    };
}

function fmtTokens(v) {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return String(v);
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d) {
    const parts = d.split('-');
    return `${MONTHS[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
}

function fmtFullDate(d) {
    const parts = d.split('-');
    return `${MONTHS[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
}

function localISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Aggregation ---

function isoWeekStart(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday = start of week
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
}

function bucketKey(dayStr, mode) {
    if (mode === 'daily') return dayStr;
    if (mode === 'weekly') return isoWeekStart(dayStr);
    // monthly
    return dayStr.slice(0, 7);
}

function bucketLabel(key, mode) {
    if (mode === 'daily') return fmtDate(key);
    if (mode === 'weekly') {
        // Show "Mon DD" of week start
        return fmtDate(key);
    }
    // monthly — "Jan 2026"
    const parts = key.split('-');
    return `${MONTHS[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

function aggregateBuckets(days, mode) {
    if (mode === 'daily') return days;

    const map = new Map();
    for (const d of days) {
        const key = bucketKey(d.day, mode);
        if (!map.has(key)) {
            map.set(key, { day: key, tokens: 0, models: {} });
        }
        const b = map.get(key);
        b.tokens += d.tokens;
        for (const [m, v] of Object.entries(d.models)) {
            b.models[m] = (b.models[m] || 0) + v;
        }
    }

    const result = [];
    for (const b of map.values()) {
        b.tokens = Math.round(b.tokens);
        for (const m of Object.keys(b.models)) {
            b.models[m] = Math.round(b.models[m]);
        }
        result.push(b);
    }
    return result;
}

// --- Chart.js loading ---

async function loadChartJs() {
    if (window.Chart) return;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = CHART_JS_URL;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

function buildChartDefaults(theme) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: theme.surface,
                titleColor: theme.text,
                bodyColor: theme.text,
                borderColor: theme.grid,
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                titleFont: { family: "'IBM Plex Sans', sans-serif", weight: '600' },
                bodyFont: { family: "'IBM Plex Sans', sans-serif" },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: theme.muted,
                    font: { family: "'IBM Plex Sans', sans-serif", size: 11 },
                    maxRotation: 45,
                    autoSkip: true,
                    maxTicksLimit: 20,
                },
                grid: { display: false },
                border: { color: theme.grid },
            },
            y: {
                ticks: {
                    color: theme.muted,
                    font: { family: "'IBM Plex Sans', sans-serif", size: 11 },
                },
                grid: { color: theme.grid, lineWidth: 0.5 },
                border: { display: false },
            },
        },
    };
}

// --- Toggle UI ---

function renderToggle(container, activeMode, onChange) {
    let toggle = container.querySelector('.codex-stats-toggle');
    if (!toggle) {
        toggle = document.createElement('div');
        toggle.className = 'codex-stats-toggle';
        container.prepend(toggle);
    }

    const modes = ['daily', 'weekly', 'monthly'];
    toggle.innerHTML = modes.map(m =>
        `<button class="codex-stats-toggle-btn${m === activeMode ? ' active' : ''}" data-mode="${m}">${m.charAt(0).toUpperCase() + m.slice(1)}</button>`
    ).join('');

    toggle.onclick = (e) => {
        const btn = e.target.closest('[data-mode]');
        if (!btn || btn.dataset.mode === activeMode) return;
        onChange(btn.dataset.mode);
    };
}

// --- Activity graph (GitHub-style heatmap) ---

let activityTooltip = null;

function getActivityTooltip() {
    if (!activityTooltip) {
        activityTooltip = document.createElement('div');
        activityTooltip.className = 'activity-tooltip';
        activityTooltip.style.display = 'none';
        document.body.appendChild(activityTooltip);
    }
    return activityTooltip;
}

function renderActivityGraph(days, generatedAt) {
    const container = document.getElementById('activity-graph');
    if (!container) return;

    const dayMap = {};
    for (const d of days) dayMap[d.day] = d.tokens;

    const today = new Date((generatedAt || days[days.length - 1].day) + 'T00:00:00');
    const years = [...new Set(days.map(d => d.day.slice(0, 4)))].sort();
    let activeYear = years[years.length - 1];

    function buildYear(year) {
        const y = parseInt(year);
        const jan1 = new Date(y, 0, 1);
        const endDate = new Date(y, 11, 31);

        // Extend to week boundaries (Mon–Sun)
        const start = new Date(jan1);
        while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
        const end = new Date(endDate);
        if (end.getDay() !== 0) {
            while (end.getDay() !== 0) end.setDate(end.getDate() + 1);
        }

        const allDays = [];
        const cur = new Date(start);
        while (cur <= end) {
            const iso = localISODate(cur);
            allDays.push({ date: iso, tokens: dayMap[iso] || 0 });
            cur.setDate(cur.getDate() + 1);
        }
        return allDays;
    }

    function render() {
        container.innerHTML = '';

        const allDays = buildYear(activeYear);

        // Intensity levels via quartiles of non-zero values
        const nonZero = allDays.filter(d => d.tokens > 0).map(d => d.tokens).sort((a, b) => a - b);
        const q = (f) => nonZero[Math.floor(nonZero.length * f)] || 0;
        const thresholds = [q(0.25), q(0.5), q(0.75)];
        const level = (t) => {
            if (t === 0) return 0;
            if (t <= thresholds[0]) return 1;
            if (t <= thresholds[1]) return 2;
            if (t <= thresholds[2]) return 3;
            return 4;
        };

        const numWeeks = allDays.length / 7;

        // Month labels
        const monthLabels = [];
        let prevMonth = '';
        for (let w = 0; w < numWeeks; w++) {
            const m = allDays[w * 7].date.slice(0, 7);
            if (m !== prevMonth) {
                monthLabels.push({ label: MONTHS[parseInt(m.slice(5, 7), 10) - 1], col: w });
                prevMonth = m;
            }
        }

        // Graph wrapper
        const graph = document.createElement('div');
        graph.className = 'activity-graph';
        container.appendChild(graph);

        // Compute cell size to fit container without overflow
        const cs = getComputedStyle(graph);
        const contentW = graph.clientWidth
            - parseFloat(cs.paddingLeft)
            - parseFloat(cs.paddingRight);
        const labelW = parseFloat(cs.getPropertyValue('--ag-label-w')) || 28;
        const bodyGap = parseFloat(cs.getPropertyValue('--ag-body-gap')) || 6;
        const gapSize = parseFloat(cs.getPropertyValue('--ag-gap')) || 2;
        const gridW = contentW - labelW - bodyGap;
        const cell = Math.max(4, Math.floor((gridW - (numWeeks - 1) * gapSize) / numWeeks));
        graph.style.setProperty('--ag-cell', cell + 'px');

        const monthsEl = document.createElement('div');
        monthsEl.className = 'activity-months';
        monthsEl.style.gridTemplateColumns = `repeat(${numWeeks}, var(--ag-cell))`;
        for (const ml of monthLabels) {
            const span = document.createElement('span');
            span.className = 'activity-month-label';
            span.textContent = ml.label;
            span.style.gridColumnStart = ml.col + 1;
            monthsEl.appendChild(span);
        }
        graph.appendChild(monthsEl);

        const body = document.createElement('div');
        body.className = 'activity-body';

        const dayLabelsEl = document.createElement('div');
        dayLabelsEl.className = 'activity-day-labels';
        for (const text of ['Mon', '', 'Wed', '', 'Fri', '', '']) {
            const span = document.createElement('span');
            span.textContent = text;
            dayLabelsEl.appendChild(span);
        }
        body.appendChild(dayLabelsEl);

        const grid = document.createElement('div');
        grid.className = 'activity-grid';
        for (const day of allDays) {
            const c = document.createElement('div');
            c.className = 'activity-cell';
            c.dataset.level = level(day.tokens);
            c.dataset.date = day.date;
            c.dataset.tokens = day.tokens;
            grid.appendChild(c);
        }
        body.appendChild(grid);
        graph.appendChild(body);

        // Tooltip
        const tooltip = getActivityTooltip();
        grid.addEventListener('mouseover', (e) => {
            const el = e.target.closest('.activity-cell');
            if (!el) return;
            const tokens = parseInt(el.dataset.tokens);
            const dateStr = fmtFullDate(el.dataset.date);
            tooltip.innerHTML = tokens > 0
                ? `<strong>${fmtTokens(tokens)} tokens</strong> on ${dateStr}`
                : `No tokens on ${dateStr}`;
            tooltip.style.display = '';
            const r = el.getBoundingClientRect();
            tooltip.style.left = `${r.left + r.width / 2}px`;
            tooltip.style.top = `${r.top - 8}px`;
        });
        graph.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        // Footer: year toggle (left) + legend (right)
        const footer = document.createElement('div');
        footer.className = 'activity-footer';

        const toggle = document.createElement('div');
        toggle.className = 'codex-stats-toggle';
        for (const y of years) {
            const btn = document.createElement('button');
            btn.className = 'codex-stats-toggle-btn' + (y === activeYear ? ' active' : '');
            btn.textContent = y;
            btn.addEventListener('click', () => {
                if (y === activeYear) return;
                activeYear = y;
                render();
            });
            toggle.appendChild(btn);
        }
        footer.appendChild(toggle);

        const legend = document.createElement('div');
        legend.className = 'activity-legend';
        const lessSpan = document.createElement('span');
        lessSpan.textContent = 'Less';
        legend.appendChild(lessSpan);
        for (let i = 0; i <= 4; i++) {
            const box = document.createElement('div');
            box.className = 'activity-cell activity-legend-cell';
            box.dataset.level = i;
            legend.appendChild(box);
        }
        const moreSpan = document.createElement('span');
        moreSpan.textContent = 'More';
        legend.appendChild(moreSpan);
        footer.appendChild(legend);

        container.appendChild(footer);
    }

    render();
}

// --- Chart rendering ---

const charts = [];

function destroyCharts() {
    for (const c of charts) c.destroy();
    charts.length = 0;
}

function renderCharts(buckets, mode) {
    destroyCharts();
    fallbackIdx = 0;
    const theme = getThemeColors();
    const labels = buckets.map(d => bucketLabel(d.day, mode));
    const defaults = buildChartDefaults(theme);

    const tooltipTitle = (items) => {
        const b = buckets[items[0].dataIndex];
        if (mode === 'daily') return b.day;
        if (mode === 'weekly') return `Week of ${b.day}`;
        // monthly
        const parts = b.day.split('-');
        return `${MONTHS[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
    };

    // 1) Tokens bar chart
    const tokCtx = document.getElementById('chart-daily-tokens');
    if (tokCtx) {
        charts.push(new Chart(tokCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: buckets.map(d => d.tokens),
                    backgroundColor: theme.tokenColor,
                    borderColor: theme.tokenBorder,
                    borderWidth: 1,
                    borderRadius: 2,
                }],
            },
            options: {
                ...defaults,
                scales: {
                    ...defaults.scales,
                    y: {
                        ...defaults.scales.y,
                        ticks: {
                            ...defaults.scales.y.ticks,
                            callback: v => fmtTokens(v),
                        },
                    },
                },
                plugins: {
                    ...defaults.plugins,
                    tooltip: {
                        ...defaults.plugins.tooltip,
                        callbacks: {
                            title: tooltipTitle,
                            label: item => `Tokens: ${fmtTokens(item.raw)}`,
                        },
                    },
                },
            },
        }));
    }

    // Shared: collect all models sorted by total tokens descending
    const modelTotals = {};
    for (const d of buckets) {
        for (const [m, v] of Object.entries(d.models)) {
            modelTotals[m] = (modelTotals[m] || 0) + v;
        }
    }
    const sortedModels = Object.entries(modelTotals)
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);

    const modelLegend = {
        display: true,
        position: 'bottom',
        labels: {
            color: theme.text,
            font: { family: "'IBM Plex Sans', sans-serif", size: 11 },
            boxWidth: 12,
            boxHeight: 12,
            padding: 12,
            usePointStyle: true,
            pointStyle: 'rectRounded',
        },
    };

    // 2) Stacked tokens-by-model bar chart
    const modelCtx = document.getElementById('chart-model-tokens');
    if (modelCtx) {
        const datasets = sortedModels.map(model => {
            const c = colorFor(model);
            return {
                label: model,
                data: buckets.map(d => d.models[model] || 0),
                backgroundColor: c.bg,
                borderColor: c.border,
                borderWidth: 0.5,
                borderRadius: 1,
            };
        });

        charts.push(new Chart(modelCtx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                ...defaults,
                plugins: {
                    ...defaults.plugins,
                    legend: modelLegend,
                    tooltip: {
                        ...defaults.plugins.tooltip,
                        mode: 'index',
                        callbacks: {
                            title: tooltipTitle,
                            label: item => item.raw > 0 ? `${item.dataset.label}: ${fmtTokens(item.raw)}` : null,
                            footer: items => {
                                const total = items.reduce((s, i) => s + i.raw, 0);
                                return `Total: ${fmtTokens(total)}`;
                            },
                        },
                    },
                },
                scales: {
                    ...defaults.scales,
                    x: { ...defaults.scales.x, stacked: true },
                    y: {
                        ...defaults.scales.y,
                        stacked: true,
                        ticks: {
                            ...defaults.scales.y.ticks,
                            callback: v => fmtTokens(v),
                        },
                    },
                },
            },
        }));
    }

    // 3) 100% stacked distribution chart
    const distCtx = document.getElementById('chart-model-distribution');
    if (distCtx) {
        // Pre-compute per-bucket totals for percentage calculation
        const bucketTotals = buckets.map(d =>
            Object.values(d.models).reduce((s, v) => s + v, 0)
        );

        const datasets = sortedModels.map(model => {
            const c = colorFor(model);
            return {
                label: model,
                data: buckets.map((d, i) => {
                    const total = bucketTotals[i];
                    return total > 0 ? ((d.models[model] || 0) / total) * 100 : 0;
                }),
                backgroundColor: c.bg,
                borderColor: c.border,
                borderWidth: 0.5,
            };
        });

        charts.push(new Chart(distCtx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                ...defaults,
                plugins: {
                    ...defaults.plugins,
                    legend: modelLegend,
                    tooltip: {
                        ...defaults.plugins.tooltip,
                        mode: 'index',
                        callbacks: {
                            title: tooltipTitle,
                            label: item => {
                                if (item.raw <= 0) return null;
                                const bucket = buckets[item.dataIndex];
                                const absTokens = bucket.models[item.dataset.label] || 0;
                                return `${item.dataset.label}: ${item.raw.toFixed(1)}% (${fmtTokens(absTokens)})`;
                            },
                        },
                    },
                },
                scales: {
                    ...defaults.scales,
                    x: { ...defaults.scales.x, stacked: true },
                    y: {
                        ...defaults.scales.y,
                        stacked: true,
                        min: 0,
                        max: 100,
                        ticks: {
                            ...defaults.scales.y.ticks,
                            callback: v => `${v}%`,
                        },
                    },
                },
            },
        }));
    }
}

export const CodexStats = {
    async init() {
        await loadChartJs();
        const resp = await fetch(DATA_URL);
        const data = await resp.json();

        renderActivityGraph(data.days, data.generatedAt);

        let mode = 'daily';
        const root = document.getElementById('codex-stats-root');

        const update = () => {
            const buckets = aggregateBuckets(data.days, mode);
            renderToggle(root, mode, (newMode) => {
                mode = newMode;
                update();
            });
            renderCharts(buckets, mode);
        };

        update();
        document.addEventListener('theme-change', () => {
            const buckets = aggregateBuckets(data.days, mode);
            renderCharts(buckets, mode);
        });
    },
};

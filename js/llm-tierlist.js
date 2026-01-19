import { ModalManager } from './modals.js';

const DATA_URL = '/assets/llm-tierlist.json';
const DATE_FORMAT_LONG = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
});
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES_EN = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

function clampNumber(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function parseYmdToUtcMs(dateStr) {
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return Number.NaN;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return Date.UTC(year, month - 1, day);
}

function utcMsToYmd(ms) {
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function diffDaysUtc(startMs, endMs) {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
    return Math.floor((endMs - startMs) / DAY_MS);
}

function formatUtcMsForBubble(ms) {
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return '';
    const day = date.getUTCDate();
    const month = MONTH_NAMES_EN[date.getUTCMonth()] || '';
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';

    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        return DATE_FORMAT_LONG.format(utcDate);
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    return DATE_FORMAT_LONG.format(date);
}

function slugify(text) {
    return String(text || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function createEl(tag, { className, text, attrs } = {}) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    if (attrs) {
        Object.entries(attrs).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            el.setAttribute(key, String(value));
        });
    }
    return el;
}

function normalizeReasoningToMarkdown(reasoning) {
    if (typeof reasoning === 'string') return reasoning;
    if (Array.isArray(reasoning)) {
        const items = reasoning.map((item) => String(item).trim()).filter(Boolean);
        if (!items.length) return '';
        return items.map((item) => `- ${item}`).join('\n');
    }
    return '';
}

function safeLinkHref(rawHref) {
    const href = String(rawHref || '').trim();
    if (!href) return null;

    try {
        const url = new URL(href, window.location.href);
        if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
            return url.href;
        }
    } catch {
        return null;
    }

    return null;
}

function renderInlineMarkdown(text) {
    const frag = document.createDocumentFragment();
    const input = String(text || '');
    if (!input) return frag;

    const tokenRe =
        /(`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;

    let lastIndex = 0;

    for (const match of input.matchAll(tokenRe)) {
        const start = match.index ?? 0;
        if (start > lastIndex) {
            frag.appendChild(
                document.createTextNode(input.slice(lastIndex, start))
            );
        }

        if (match[2]) {
            const code = createEl('code', { className: 'inline-code', text: match[2] });
            frag.appendChild(code);
        } else if (match[3]) {
            const strong = createEl('strong');
            strong.textContent = match[3];
            frag.appendChild(strong);
        } else if (match[4]) {
            const em = createEl('em');
            em.textContent = match[4];
            frag.appendChild(em);
        } else if (match[5] && match[6]) {
            const href = safeLinkHref(match[6]);
            if (href) {
                const link = createEl('a', {
                    text: match[5],
                    attrs: { href, target: '_blank', rel: 'noreferrer' }
                });
                frag.appendChild(link);
            } else {
                frag.appendChild(document.createTextNode(match[0]));
            }
        } else {
            frag.appendChild(document.createTextNode(match[0]));
        }

        lastIndex = start + match[0].length;
    }

    if (lastIndex < input.length) {
        frag.appendChild(document.createTextNode(input.slice(lastIndex)));
    }

    return frag;
}

function renderMarkdown(markdown) {
    const frag = document.createDocumentFragment();
    const input = String(markdown || '').replace(/\r\n?/g, '\n').trim();
    if (!input) return frag;

    const lines = input.split('\n');
    let paragraphLines = [];
    let listItems = [];
    let codeLines = null;

    const flushParagraph = () => {
        const text = paragraphLines.join(' ').trim();
        if (!text) {
            paragraphLines = [];
            return;
        }

        const p = createEl('p');
        p.appendChild(renderInlineMarkdown(text));
        frag.appendChild(p);
        paragraphLines = [];
    };

    const flushList = () => {
        if (!listItems.length) return;

        const ul = createEl('ul');
        listItems.forEach((item) => {
            const li = createEl('li');
            li.appendChild(renderInlineMarkdown(item));
            ul.appendChild(li);
        });

        frag.appendChild(ul);
        listItems = [];
    };

    const flushCode = () => {
        if (!codeLines) return;
        const pre = createEl('pre');
        const code = createEl('code', { text: codeLines.join('\n') });
        pre.appendChild(code);
        frag.appendChild(pre);
        codeLines = null;
    };

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (codeLines) {
            if (trimmed.startsWith('```')) {
                flushCode();
                return;
            }
            codeLines.push(line);
            return;
        }

        if (trimmed.startsWith('```')) {
            flushParagraph();
            flushList();
            codeLines = [];
            return;
        }

        if (!trimmed) {
            flushParagraph();
            flushList();
            return;
        }

        const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
        if (headingMatch) {
            flushParagraph();
            flushList();
            const level = headingMatch[1].length;
            const headingText = headingMatch[2].trim();
            const tag =
                level <= 2 ? 'h4' : level === 3 ? 'h5' : 'h6';
            const heading = createEl(tag, { className: 'tierlist-markdown-heading' });
            heading.appendChild(renderInlineMarkdown(headingText));
            frag.appendChild(heading);
            return;
        }

        const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
        if (listMatch) {
            flushParagraph();
            listItems.push(listMatch[1].trim());
            return;
        }

        flushList();
        paragraphLines.push(trimmed);
    });

    flushParagraph();
    flushList();
    flushCode();

    return frag;
}

function resolveAccentVar(accent) {
    switch (accent) {
        case 'sunflower':
            return 'var(--sunflower)';
        case 'deep-sea':
            return 'var(--deep-sea)';
        case 'rust':
            return 'var(--rust)';
        case 'neutral':
            return 'var(--vibe-neutral)';
        default:
            return 'var(--vibe-neutral)';
    }
}

function buildTierIndex(tiers) {
    const index = new Map();
    (tiers || []).forEach((tier, i) => {
        if (!tier?.id) return;
        index.set(String(tier.id), i);
    });
    return index;
}

function buildSnapshotLocationMap(snapshot, tiers, tierIndex) {
    const map = new Map();
    (tiers || []).forEach((tier) => {
        const tierId = String(tier.id);
        const models = snapshot?.tiers?.[tierId] || [];
        models.forEach((model, position) => {
            const modelId = model?.id ? String(model.id) : slugify(model?.name);
            map.set(modelId, {
                tierId,
                tierIndex: tierIndex.get(tierId) ?? 0,
                position
            });
        });
    });
    return map;
}

function computeDeltas(snapshots, tiers) {
    const tierIndex = buildTierIndex(tiers);
    const locationMaps = snapshots.map((snapshot) =>
        buildSnapshotLocationMap(snapshot, tiers, tierIndex)
    );

    const deltaMaps = snapshots.map(() => new Map());

    for (let i = 1; i < snapshots.length; i++) {
        const prev = locationMaps[i - 1];
        const curr = locationMaps[i];
        const out = deltaMaps[i];

        curr.forEach((currLoc, modelId) => {
            const prevLoc = prev.get(modelId);
            if (!prevLoc) {
                out.set(modelId, { kind: 'new' });
                return;
            }

            if (currLoc.tierIndex !== prevLoc.tierIndex) {
                const delta = prevLoc.tierIndex - currLoc.tierIndex;
                if (delta !== 0) out.set(modelId, { kind: 'tier', delta });
                return;
            }

            if (currLoc.position !== prevLoc.position) {
                const delta = prevLoc.position - currLoc.position;
                if (delta !== 0) out.set(modelId, { kind: 'spot', delta });
            }
        });
    }

    return deltaMaps;
}

function formatDelta(delta) {
    if (delta?.kind === 'new') {
        return {
            text: 'new',
            className: 'tierlist-delta tierlist-delta-new',
            aria: 'New in this snapshot'
        };
    }

    if (!delta || typeof delta.delta !== 'number' || Number.isNaN(delta.delta) || delta.delta === 0) {
        return null;
    }

    const abs = Math.abs(delta.delta);
    const direction = delta.delta > 0 ? 'up' : 'down';
    const arrow = delta.delta > 0 ? '▲' : '▼';
    const verb = delta.delta > 0 ? 'Moved up' : 'Moved down';
    const unit = delta.kind === 'spot' ? 'spot' : 'tier';

    return {
        text: `${arrow}${abs}`,
        className: `tierlist-delta tierlist-delta-${direction}`,
        aria: `${verb} ${abs} ${unit}${abs === 1 ? '' : 's'} since last snapshot`
    };
}

function openModelModal({ snapshot, tier, model, delta, triggerEl }) {
    const modal = createEl('div', {
        className: 'tierlist-modal',
        attrs: {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': `${model.name} details`
        }
    });

    const content = createEl('div', { className: 'tierlist-modal-content' });
    const header = createEl('div', { className: 'tierlist-modal-header' });
    const title = createEl('h3', { text: model.name });
    const closeBtn = createEl('button', {
        className: 'tierlist-modal-close',
        text: '✕',
        attrs: { type: 'button', 'aria-label': 'Close' }
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = createEl('div', { className: 'tierlist-modal-body' });

    const meta = createEl('div', { className: 'tierlist-modal-meta' });
    const metaLeft = createEl('div', { className: 'tierlist-modal-meta-left' });
    const vendor = model.vendor
        ? createEl('div', { className: 'tierlist-modal-vendor text-muted', text: model.vendor })
        : null;
    const when = createEl('div', {
        className: 'tierlist-modal-when text-muted',
        text: `${formatDate(snapshot.date)} · Tier ${tier.label}`
    });
    if (vendor) metaLeft.appendChild(vendor);
    metaLeft.appendChild(when);

    meta.appendChild(metaLeft);

    const deltaInfo = formatDelta(delta);
    if (deltaInfo) {
        const deltaEl = createEl('div', {
            className: `${deltaInfo.className} tierlist-delta-large`,
            text: deltaInfo.text,
            attrs: { 'aria-label': deltaInfo.aria }
        });
        meta.appendChild(deltaEl);
    }

    body.appendChild(meta);

    if (model.summary) {
        body.appendChild(
            createEl('p', { className: 'tierlist-modal-summary', text: model.summary })
        );
    }

    const reasoningMarkdown = normalizeReasoningToMarkdown(model.reasoning).trim();

    if (reasoningMarkdown) {
        body.appendChild(createEl('h4', { className: 'tierlist-modal-section-title', text: 'Reasoning' }));
        const reasoning = createEl('div', { className: 'tierlist-markdown' });
        reasoning.appendChild(renderMarkdown(reasoningMarkdown));
        body.appendChild(reasoning);
    }

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);

    const close = () => {
        ModalManager.close(modal);
        if (triggerEl && typeof triggerEl.focus === 'function') triggerEl.focus();
    };

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    ModalManager.open(modal);
    closeBtn.focus();
}

function buildSnapshotsFromChanges(changesRaw, tiers) {
    const tierIds = (tiers || []).map((tier) => tier.id);
    const modelsById = new Map();
    const tierContents = new Map();
    tierIds.forEach((tierId) => {
        tierContents.set(tierId, []);
    });

    const removeFromAllTiers = (modelId) => {
        tierContents.forEach((arr) => {
            const idx = arr.indexOf(modelId);
            if (idx !== -1) arr.splice(idx, 1);
        });
    };

    const upsertModel = (model) => {
        if (!model) return;
        const modelId = model?.id ? String(model.id) : '';
        if (!modelId) return;

        const prev = modelsById.get(modelId) || { id: modelId };

        const reasoning =
            model.reasoning !== undefined
                ? normalizeReasoningToMarkdown(model.reasoning)
                : normalizeReasoningToMarkdown(prev.reasoning);

        modelsById.set(modelId, {
            id: modelId,
            name: model.name !== undefined ? String(model.name) : prev.name,
            vendor: model.vendor !== undefined ? String(model.vendor) : prev.vendor,
            summary: model.summary !== undefined ? String(model.summary) : prev.summary,
            reasoning
        });
    };

    const placeModel = (action) => {
        const modelId = action?.id ? String(action.id) : '';
        const tierId = action?.tier ? String(action.tier) : '';
        if (!modelId || !tierContents.has(tierId)) return;

        removeFromAllTiers(modelId);

        const target = tierContents.get(tierId);
        if (!target) return;

        const position = action?.position;
        const before = action?.before ? String(action.before) : '';
        const after = action?.after ? String(action.after) : '';

        if (position === 'top') {
            target.unshift(modelId);
            return;
        }

        if (position === 'bottom' || position === undefined || position === null) {
            target.push(modelId);
            return;
        }

        if (typeof position === 'number' && Number.isFinite(position)) {
            const index = Math.max(0, Math.min(target.length, Math.trunc(position)));
            target.splice(index, 0, modelId);
            return;
        }

        if (before) {
            const idx = target.indexOf(before);
            if (idx !== -1) {
                target.splice(idx, 0, modelId);
                return;
            }
        }

        if (after) {
            const idx = target.indexOf(after);
            if (idx !== -1) {
                target.splice(idx + 1, 0, modelId);
                return;
            }
        }

        target.push(modelId);
    };

    const applyAction = (action) => {
        const type = action?.type ? String(action.type) : '';

        switch (type) {
            case 'upsert_model':
                upsertModel(action?.model);
                return;
            case 'place':
                placeModel(action);
                return;
            case 'remove': {
                const modelId = action?.id ? String(action.id) : '';
                if (!modelId) return;
                removeFromAllTiers(modelId);
                if (action?.purge === true) modelsById.delete(modelId);
                return;
            }
            default:
                return;
        }
    };

    const changes = (Array.isArray(changesRaw) ? changesRaw : [])
        .map((change, i) => ({
            at: change?.at ? String(change.at) : '',
            label: change?.label ? String(change.label) : '',
            note: change?.note ? String(change.note) : '',
            actions: Array.isArray(change?.actions) ? change.actions : [],
            index: i
        }))
        .filter((change) => change.at)
        .sort((a, b) => {
            const cmp = a.at.localeCompare(b.at);
            return cmp !== 0 ? cmp : a.index - b.index;
        });

    const snapshots = [];

    // One snapshot per day: merge multiple change entries with the same `at`.
    const mergedByDay = [];
    let currentDay = null;

    changes.forEach((change) => {
        if (!currentDay || currentDay.at !== change.at) {
            if (currentDay) mergedByDay.push(currentDay);
            currentDay = {
                at: change.at,
                label: change.label || '',
                note: change.note || '',
                actions: [...change.actions]
            };
            return;
        }

        if (change.label) currentDay.label = change.label;
        if (change.note) currentDay.note = change.note;
        currentDay.actions.push(...change.actions);
    });

    if (currentDay) mergedByDay.push(currentDay);

    mergedByDay.forEach((change, dayIndex) => {
        change.actions.forEach(applyAction);

        const tiersOut = {};
        tierIds.forEach((tierId) => {
            const ids = tierContents.get(tierId) || [];
            tiersOut[tierId] = ids.map((modelId) => {
                const meta = modelsById.get(modelId) || { id: modelId };
                return {
                    id: modelId,
                    name: meta.name ? String(meta.name) : modelId,
                    vendor: meta.vendor ? String(meta.vendor) : '',
                    summary: meta.summary ? String(meta.summary) : '',
                    reasoning: meta.reasoning ? String(meta.reasoning) : ''
                };
            });
        });

        snapshots.push({
            id: `${change.at}-${dayIndex}`,
            date: change.at,
            label: change.label || change.at,
            note: change.note,
            tiers: tiersOut
        });
    });

    return snapshots;
}

function normalizeTierlistData(raw) {
    const tiersRaw = Array.isArray(raw?.tiers) ? raw.tiers : [];
    const normalizedTiers = tiersRaw
        .map((tier) => ({
            id: String(tier?.id || ''),
            label: String(tier?.label || tier?.id || ''),
            description: String(tier?.description || ''),
            accent: String(tier?.accent || 'neutral')
        }))
        .filter((tier) => tier.id);

    const schemaVersion = raw?.schemaVersion ?? 1;
    const snapshotsRaw = Array.isArray(raw?.snapshots) ? raw.snapshots : [];
    const changesRaw = Array.isArray(raw?.changes) ? raw.changes : [];

    const normalizedSnapshots = schemaVersion >= 2 || changesRaw.length
        ? buildSnapshotsFromChanges(changesRaw, normalizedTiers)
        : snapshotsRaw
              .map((snapshot) => ({
                  id: snapshot?.id || snapshot?.date || '',
                  date: snapshot?.date || '',
                  label: snapshot?.label || snapshot?.date || '',
                  note: snapshot?.note || '',
                  tiers: snapshot?.tiers || {}
              }))
              .filter((snapshot) => snapshot.date)
              .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    return {
        schemaVersion,
        title: raw?.title || 'LLM tier list',
        subtitle: raw?.subtitle || '',
        updatedAt: raw?.updatedAt || '',
        tiers: normalizedTiers,
        snapshots: normalizedSnapshots
    };
}

export const LLMTierlist = {
    async init() {
        const root = document.getElementById('llm-tierlist-root');
        if (!root) return;

        root.replaceChildren(
            createEl('div', { className: 'tierlist-loading text-muted', text: 'Loading…' })
        );

        try {
            const response = await fetch(DATA_URL, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status}`);
            }

            const raw = await response.json();
            const data = normalizeTierlistData(raw);
            this.render(root, data);
        } catch (error) {
            console.error('Failed to render /llm-tierlist:', error);
            root.replaceChildren(
                createEl('div', {
                    className: 'tierlist-error text-muted',
                    text: 'Failed to load the tier list.'
                })
            );
        }
    },

    render(root, data) {
        root.replaceChildren();

        if (!data.snapshots.length || !data.tiers.length) {
            root.appendChild(
                createEl('div', {
                    className: 'tierlist-empty text-muted',
                    text: 'No tier list snapshots found.'
                })
            );
            return;
        }

        const snapshots = data.snapshots;
        const maxIndex = Math.max(0, snapshots.length - 1);

        const deltaMaps = computeDeltas(snapshots, data.tiers);

        const stage = createEl('div', {
            className: 'tierlist-snapshot tierlist-stage',
            attrs: { role: 'region', 'aria-label': 'Tier list' }
        });

        const timebarRow = createEl('div', { className: 'tierlist-timebar-row' });

        const timebar = createEl('div', {
            className: 'tierlist-timebar',
            attrs: { role: 'group', 'aria-label': 'Timeline' }
        });
        const bubble = createEl('div', { className: 'tierlist-timebar-bubble' });
        const yearsRow = createEl('div', {
            className: 'tierlist-timebar-years',
            attrs: { 'aria-hidden': 'true' }
        });
        const track = createEl('div', { className: 'tierlist-timebar-track' });
        const rail = createEl('div', {
            className: 'tierlist-timebar-rail',
            attrs: { 'aria-hidden': 'true' }
        });
        const yearLines = createEl('div', {
            className: 'tierlist-timebar-year-lines',
            attrs: { 'aria-hidden': 'true' }
        });
        const thumb = createEl('div', {
            className: 'tierlist-timebar-thumb',
            attrs: {
                role: 'scrollbar',
                tabindex: '0',
                'aria-orientation': 'horizontal',
                'aria-label': 'Timeline'
            }
        });
        const dotsRow = createEl('div', {
            className: 'tierlist-timebar-dots',
            attrs: { 'aria-hidden': 'true' }
        });

        track.appendChild(rail);
        track.appendChild(yearLines);
        track.appendChild(thumb);
        timebar.appendChild(bubble);
        timebar.appendChild(track);
        timebar.appendChild(dotsRow);
        timebar.appendChild(yearsRow);

        timebarRow.appendChild(timebar);

        root.appendChild(stage);
        root.appendChild(timebarRow);

        const startMs = parseYmdToUtcMs(snapshots[0]?.date);
        const lastSnapshotMs = parseYmdToUtcMs(snapshots[maxIndex]?.date);
        const now = new Date();
        const todayMs = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        );
        const endMs = todayMs;

        const daySpan = Math.max(0, diffDaysUtc(startMs, endMs));
        const snapshotDays = snapshots.map((snapshot) => {
            const snapMs = parseYmdToUtcMs(snapshot?.date);
            return Math.max(0, diffDaysUtc(startMs, snapMs));
        });

        const dotEls = [];
        snapshots.forEach((snapshot, index) => {
            const dot = createEl('button', {
                className: 'tierlist-timebar-dot',
                text: '',
                attrs: {
                    type: 'button',
                    tabindex: '-1'
                }
            });

            dot.addEventListener('click', () => {
                setDay(snapshotDays[index]);
            });

            dotsRow.appendChild(dot);
            dotEls.push(dot);
        });

        const yearMarkers = [];

        const startDate = new Date(startMs);
        const startYear = startDate.getUTCFullYear();

        const endDate = new Date(endMs);
        const endYear = endDate.getUTCFullYear();

        // Year marker at the start of the timeline.
        yearMarkers.push({
            day: 0,
            el: createEl('div', { className: 'tierlist-timebar-year', text: String(startYear) }),
            line: createEl('div', { className: 'tierlist-timebar-year-line' })
        });

        for (let year = startYear + 1; year <= endYear; year++) {
            const yearStart = Date.UTC(year, 0, 1);
            const day = diffDaysUtc(startMs, yearStart);
            if (day < 0 || day > daySpan) continue;
            yearMarkers.push({
                day,
                el: createEl('div', { className: 'tierlist-timebar-year', text: String(year) }),
                line: createEl('div', { className: 'tierlist-timebar-year-line' })
            });
        }

        yearMarkers.forEach((marker) => {
            yearsRow.appendChild(marker.el);
            yearLines.appendChild(marker.line);
        });

        const buildStageFragment = (snapshotIndex, { interactive }) => {
            const snapshot = snapshots[snapshotIndex];
            if (!snapshot) return document.createDocumentFragment();

            const isLatest = snapshotIndex === maxIndex;

            const frag = document.createDocumentFragment();

            const snapHeader = createEl('div', {
                className: 'tierlist-snapshot-header',
                attrs: { 'data-snapshot-id': snapshot.id }
            });

            const titleWrap = createEl('div', { className: 'tierlist-snapshot-title-wrap' });
            const snapTitle = createEl('h3', {
                className: 'tierlist-snapshot-title',
                text: snapshot.label || formatDate(snapshot.date)
            });
            const snapDate = createEl('div', {
                className: 'tierlist-snapshot-date text-muted',
                text: formatDate(snapshot.date)
            });

            titleWrap.appendChild(snapTitle);
            titleWrap.appendChild(snapDate);
            snapHeader.appendChild(titleWrap);

            if (isLatest) {
                snapHeader.appendChild(
                    createEl('div', { className: 'tierlist-latest-badge', text: 'Latest' })
                );
            }

            frag.appendChild(snapHeader);

            const noteEl = createEl('p', {
                className: 'tierlist-snapshot-note text-muted',
                text: snapshot.note ? String(snapshot.note) : ''
            });
            if (!snapshot.note) noteEl.classList.add('is-empty');
            frag.appendChild(noteEl);

            const board = createEl('div', { className: 'tierlist-board' });

            data.tiers.forEach((tier) => {
                const tierEl = createEl('div', {
                    className: 'tierlist-tier',
                    attrs: { 'data-tier-id': tier.id }
                });
                tierEl.style.setProperty('--tier-accent', resolveAccentVar(tier.accent));

                const tierLabel = createEl('div', {
                    className: 'tierlist-tier-label',
                    text: tier.label
                });

                const tierContent = createEl('div', { className: 'tierlist-tier-content' });

                const modelsRaw = Array.isArray(snapshot.tiers?.[tier.id])
                    ? snapshot.tiers[tier.id]
                    : [];
                if (modelsRaw.length > 2) {
                    console.warn(
                        `Tier "${tier.id}" has ${modelsRaw.length} models on ${snapshot.date}; only the first 2 will be shown.`
                    );
                }

                const models = modelsRaw.slice(0, 2);
                const renderedCards = [];

                models.forEach((modelRaw) => {
                        const model = {
                            id: modelRaw?.id ? String(modelRaw.id) : slugify(modelRaw?.name),
                            name: String(modelRaw?.name || 'Unnamed model'),
                            vendor: modelRaw?.vendor ? String(modelRaw.vendor) : '',
                            summary: modelRaw?.summary ? String(modelRaw.summary) : '',
                            reasoning: normalizeReasoningToMarkdown(modelRaw?.reasoning)
                        };

                        const modelDelta = deltaMaps[snapshotIndex]?.get(model.id);
                        const deltaInfo = formatDelta(modelDelta);

                        const card = createEl('button', {
                            className: 'tierlist-model',
                            attrs: {
                                type: 'button',
                                'aria-haspopup': 'dialog'
                            }
                        });

                        const cardTop = createEl('div', { className: 'tierlist-model-top' });
                        const name = createEl('div', { className: 'tierlist-model-name', text: model.name });
                        const vendor = createEl('div', {
                            className: 'tierlist-model-vendor text-muted',
                            text: model.vendor || '—'
                        });
                        if (!model.vendor) vendor.classList.add('is-empty');

                        cardTop.appendChild(name);
                        cardTop.appendChild(vendor);
                        card.appendChild(cardTop);

                        const summary = createEl('div', {
                            className: 'tierlist-model-summary',
                            text: model.summary || '—'
                        });
                        if (!model.summary) summary.classList.add('is-empty');
                        card.appendChild(summary);

                        if (deltaInfo) {
                            card.appendChild(
                                createEl('span', {
                                    className: deltaInfo.className,
                                    text: deltaInfo.text,
                                    attrs: { 'aria-label': deltaInfo.aria }
                                })
                            );
                            card.classList.add('tierlist-model-changed');
                        }

                        if (interactive) {
                            card.addEventListener('click', () => {
                                openModelModal({
                                    snapshot,
                                    tier,
                                    model,
                                    delta: modelDelta,
                                    triggerEl: card
                                });
                            });
                        }

                        tierContent.appendChild(card);
                        renderedCards.push(card);
                    });

                const buildPlaceholder = () => {
                    const placeholder = createEl('div', {
                        className: 'tierlist-model tierlist-model-placeholder',
                        attrs: { 'aria-hidden': 'true' }
                    });

                    const placeholderTop = createEl('div', { className: 'tierlist-model-top' });
                    placeholderTop.appendChild(
                        createEl('div', {
                            className: 'tierlist-model-name text-muted',
                            text: '—'
                        })
                    );
                    placeholderTop.appendChild(
                        createEl('div', {
                            className: 'tierlist-model-vendor text-muted is-empty',
                            text: '—'
                        })
                    );
                    placeholder.appendChild(placeholderTop);
                    placeholder.appendChild(
                        createEl('div', {
                            className: 'tierlist-model-summary is-empty',
                            text: '—'
                        })
                    );

                    return placeholder;
                };

                if (models.length === 0) {
                    const placeholder = buildPlaceholder();
                    placeholder.style.gridColumn = '1 / -1';
                    tierContent.appendChild(placeholder);
                } else if (models.length === 1 && renderedCards[0]) {
                    renderedCards[0].style.gridColumn = '1 / -1';
                }

                tierEl.appendChild(tierLabel);
                tierEl.appendChild(tierContent);
                board.appendChild(tierEl);
            });

            frag.appendChild(board);
            return frag;
        };

        const renderStage = (snapshotIndex) => {
            stage.replaceChildren(buildStageFragment(snapshotIndex, { interactive: true }));
        };

        const findActiveIndexForDay = (day) => {
            const clamped = clampNumber(day, 0, daySpan);
            let lo = 0;
            let hi = snapshotDays.length - 1;
            let best = 0;

            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (snapshotDays[mid] <= clamped) {
                    best = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }

            return best;
        };

        let activeIndex = findActiveIndexForDay(daySpan);
        let currentDay = clampNumber(daySpan, 0, daySpan);
        let bubbleDay = null;

        renderStage(activeIndex);

        let geometry = null;

        const layout = () => {
            const timebarRect = timebar.getBoundingClientRect();
            const trackRect = track.getBoundingClientRect();
            const railRect = rail.getBoundingClientRect();
            const dotsRect = dotsRow.getBoundingClientRect();
            const yearsRect = yearsRow.getBoundingClientRect();

            const thumbWidth = thumb.getBoundingClientRect().width || 32;
            const borderLeft = Number.parseFloat(getComputedStyle(timebar).borderLeftWidth) || 0;

            const bubbleOffset = trackRect.left - timebarRect.left - borderLeft;
            const railLeft = railRect.left - trackRect.left;
            const railWidth = railRect.width;
            const dotsOffset = trackRect.left - dotsRect.left;
            const yearsOffset = trackRect.left - yearsRect.left;

            geometry = {
                bubbleOffset,
                railLeft,
                railWidth,
                thumbWidth,
                trackLeft: trackRect.left,
                railClientLeft: railRect.left,
                railClientWidth: railRect.width,
                dotsOffset,
                yearsOffset
            };

            const dayToX = (day) => {
                if (daySpan <= 0 || railWidth <= 0) return railLeft;
                const t = clampNumber(day / daySpan, 0, 1);
                return railLeft + t * railWidth;
            };

            dotEls.forEach((dot, index) => {
                const x = dayToX(snapshotDays[index]) + dotsOffset;
                dot.style.left = `${x}px`;
            });

            yearMarkers.forEach((marker) => {
                const x = dayToX(marker.day);
                marker.el.style.left = `${x + yearsOffset}px`;
                marker.line.style.left = `${x}px`;
            });
        };

        const updateUI = () => {
            if (!geometry) layout();
            if (!geometry) return;

            const { railLeft, railWidth, thumbWidth, bubbleOffset } = geometry;

            const t = daySpan > 0 ? clampNumber(currentDay / daySpan, 0, 1) : 0;
            const x = railLeft + t * railWidth;
            const thumbLeft = x - thumbWidth / 2;

            thumb.style.left = `${thumbLeft}px`;
            bubble.style.left = `${bubbleOffset + x}px`;

            const roundedDay = Math.round(currentDay);
            if (roundedDay !== bubbleDay) {
                bubbleDay = roundedDay;
                const dateMs = startMs + roundedDay * DAY_MS;
                const dateYmd = utcMsToYmd(dateMs);
                bubble.textContent = formatUtcMsForBubble(dateMs);
            }

            const pct = Math.round(t * 100);
            thumb.setAttribute('aria-valuemin', '0');
            thumb.setAttribute('aria-valuemax', '100');
            thumb.setAttribute('aria-valuenow', String(pct));
        };

        const setDay = (nextDay) => {
            currentDay = clampNumber(nextDay, 0, daySpan);

            const nextIndex = findActiveIndexForDay(currentDay);
            if (nextIndex !== activeIndex) {
                dotEls[activeIndex]?.classList.remove('active');
                activeIndex = nextIndex;
                dotEls[activeIndex]?.classList.add('active');
                renderStage(activeIndex);
            }

            updateUI();
        };

        const dayFromCenterClientX = (centerClientX) => {
            if (!geometry) return 0;
            const { railClientLeft, railClientWidth } = geometry;
            if (railClientWidth <= 0 || daySpan <= 0) return 0;

            const rawT = clampNumber(
                (centerClientX - railClientLeft) / railClientWidth,
                0,
                1
            );
            const edgeEpsilon = 0.5 / railClientWidth;
            const t =
                rawT <= edgeEpsilon ? 0 : rawT >= 1 - edgeEpsilon ? 1 : rawT;
            return t * daySpan;
        };

        const getThumbCenterClientX = () => {
            if (!geometry) return 0;
            const { trackLeft, railLeft, railWidth } = geometry;
            const t = daySpan > 0 ? clampNumber(currentDay / daySpan, 0, 1) : 0;
            return trackLeft + railLeft + t * railWidth;
        };

        dotEls[activeIndex]?.classList.add('active');

        layout();
        setDay(currentDay);

        let relayoutRaf = null;
        const scheduleRelayout = () => {
            if (relayoutRaf) return;
            relayoutRaf = window.requestAnimationFrame(() => {
                relayoutRaf = null;
                layout();
                setDay(currentDay);
            });
        };

        window.addEventListener('resize', () => {
            scheduleRelayout();
        });

        if ('ResizeObserver' in window) {
            const observer = new ResizeObserver(() => {
                scheduleRelayout();
            });
            observer.observe(timebar);
        }

        window.addEventListener('load', () => {
            scheduleRelayout();
        });

        // One extra pass after initial paint to catch late style/layout changes.
        scheduleRelayout();

        const stepTo = (step) => {
            const next = Math.min(maxIndex, Math.max(0, activeIndex + step));
            setDay(snapshotDays[next]);
        };

        const onKeyDown = (e) => {
            if (e.target?.matches('input, textarea, select')) return;
            if (ModalManager.hasOpen()) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepTo(-1);
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                stepTo(1);
            }
        };

        document.addEventListener('keydown', onKeyDown);

        track.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (!geometry) layout();
            setDay(dayFromCenterClientX(e.clientX));
        });

        let drag = null;

        thumb.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (!geometry) layout();
            e.stopPropagation();

            drag = {
                pointerId: e.pointerId,
                offsetX: e.clientX - getThumbCenterClientX()
            };

            thumb.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        thumb.addEventListener('pointermove', (e) => {
            if (!drag || drag.pointerId !== e.pointerId) return;
            setDay(dayFromCenterClientX(e.clientX - drag.offsetX));
        });

        const endDrag = (e) => {
            if (!drag || drag.pointerId !== e.pointerId) return;
            drag = null;
        };

        thumb.addEventListener('pointerup', endDrag);
        thumb.addEventListener('pointercancel', endDrag);

        timebar.addEventListener(
            'wheel',
            (e) => {
                if (ModalManager.hasOpen()) return;
                if (!daySpan) return;

                const delta =
                    Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

                if (!Number.isFinite(delta) || delta === 0) return;

                e.preventDefault();
                const effectiveWidth = geometry?.railClientWidth || track.clientWidth || 1;
                const scale = daySpan / Math.max(120, effectiveWidth);
                setDay(currentDay + delta * scale);
            },
            { passive: false }
        );
    }
};

import { money, visibleModels, sortedModels, chartLayout, axisMoney, labelPositions, tooltipPosition } from './mc-pvp-bench-data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const integerFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const number = value => integerFormat.format(Math.round(value));
const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const svgElement = (tag, attrs = {}, text = '') => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
};

export function initBenchmark(root = document) {
  const dataNode = root.querySelector('#bench-data');
  const chart = root.querySelector('#bench-chart');
  if (!dataNode || !chart) return;
  const data = JSON.parse(dataNode.textContent);
  if (data.schemaVersion !== 1 || !data.models.length) return;
  const models = data.models;
  const byId = new Map(models.map(m => [m.id, m]));
  const rows = new Map([...root.querySelectorAll('#bench-rows tr')].map(row => [row.dataset.model, row]));
  const rowButtons = new Map([...rows].map(([id, row]) => [id, row.querySelector('[data-select]')]));
  const tbody = root.querySelector('#bench-rows');
  const search = root.querySelector('#bench-search');
  const frontierOnly = root.querySelector('#bench-frontier-only');
  const ciToggle = root.querySelector('#bench-ci');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { selected: null, hovered: null, inspected: null, scale: 'log', sort: 'rating', direction: 'desc' };
  let visible = models;
  let layout;
  let pointNodes = new Map();
  let points = [];
  let resizeFrame;
  let pointerFrame = null;
  let pointerPosition;
  let chartRect;
  let tooltipKey = '';
  let tooltipLayout;
  let highlighted = { selected: null, hovered: null, described: null };
  const svg = svgElement('svg', { role: 'group', 'aria-label': 'Minecraft PvP Elo versus cost', 'aria-describedby': 'bench-chart-desc' });
  const tooltip = document.createElement('div');
  tooltip.id = 'bench-tooltip';
  tooltip.className = 'bench-tooltip';
  tooltip.hidden = true;
  tooltip.setAttribute('aria-atomic', 'true');
  chart.replaceChildren(svg, tooltip);

  function setAttribute(node, name, value) {
    if (!node || node.getAttribute(name) === value) return;
    if (value === null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  }

  function setClass(node, name, active) {
    if (node && node.classList.contains(name) !== active) node.classList.toggle(name, active);
  }

  function syncHighlights(force = false) {
    const next = { selected: state.selected, hovered: state.hovered, described: tooltip.hidden ? null : tooltip.dataset.model };
    // A hover changes at most the previous/current models, not all chart points and rows.
    const changed = new Set();
    if (force) for (const id of rows.keys()) changed.add(id);
    for (const key of Object.keys(next)) {
      if (next[key] !== highlighted[key]) {
        changed.add(next[key]);
        changed.add(highlighted[key]);
      }
    }
    for (const id of changed) {
      if (!id) continue;
      const node = pointNodes.get(id), row = rows.get(id);
      const selected = id === next.selected, hovered = id === next.hovered;
      setClass(node, 'is-selected', selected);
      setClass(node, 'is-hovered', hovered);
      setClass(row, 'is-selected', selected);
      setClass(row, 'is-hovered', hovered);
      setAttribute(node, 'aria-pressed', String(selected));
      setAttribute(node, 'aria-describedby', id === next.described ? tooltip.id : null);
      setAttribute(rowButtons.get(id), 'aria-pressed', String(selected));
    }
    highlighted = next;
  }

  function renderTooltip() {
    const id = state.selected || state.inspected;
    const pinned = Boolean(state.selected);
    const model = byId.get(id);
    if (!model || !layout) {
      if (!tooltip.hidden) {
        tooltip.hidden = true;
        tooltipKey = '';
        delete tooltip.dataset.model;
      }
      syncHighlights();
      return;
    }
    const key = `${id}:${pinned}`;
    const changed = key !== tooltipKey;
    if (changed) {
      tooltip.hidden = false;
      setClass(tooltip, 'is-pinned', pinned);
      setAttribute(tooltip, 'role', pinned ? 'group' : 'tooltip');
      setAttribute(tooltip, 'aria-live', pinned ? 'polite' : 'off');
      tooltip.dataset.model = id;
      const ci = model.anchor ? 'Fixed anchor · no estimated interval' : `95% interval: ${number(model.ciLow)}–${number(model.ciHigh)}`;
      tooltip.innerHTML = `<div class="bench-tooltip-heading"><strong>${safe(model.name)}</strong><button type="button" class="bench-tooltip-close" data-close-tooltip aria-label="Close model details"${pinned ? '' : ' hidden'}>×</button></div>
        <p class="bench-tooltip-meta">${safe(model.provider)} · Rank ${model.rank}${model.frontier ? ' · Frontier' : ''}</p>
        <dl><div><dt>Elo</dt><dd>${number(model.rating)}</dd></div><div><dt>API cost / min</dt><dd>${money(model.cost)}</dd></div><div><dt>Median action</dt><dd>${model.actionSeconds == null ? '—' : `${model.actionSeconds.toFixed(2)}s`}</dd></div><div><dt>${model.games} duels · W / L / D</dt><dd>${model.wins} / ${model.losses} / ${model.draws}</dd></div></dl>
        <p class="bench-tooltip-interval">${ci}</p>`;
      tooltipKey = key;
    }
    // Measure only new content or a resized/re-scaled chart, never every pointer event.
    if (changed || tooltipLayout !== layout) {
      const point = points.find(p => p.id === id) || { x: layout.width / 2, y: layout.height / 2 };
      const { left, top } = tooltipPosition(point, layout, { width: tooltip.offsetWidth, height: tooltip.offsetHeight });
      tooltip.style.transform = `translate(${left}px, ${top}px)`;
      tooltipLayout = layout;
    }
    syncHighlights();
  }

  function inspect(id, showTooltip = true) {
    state.hovered = id;
    state.inspected = showTooltip ? id : null;
    renderTooltip();
  }

  function cancelPointerFrame() {
    if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
  }

  function dismissTooltip(restoreFocus = false) {
    cancelPointerFrame();
    if (restoreFocus && state.selected) {
      // Restore focus before clearing; the focus handler must not reopen it.
      pointNodes.get(state.selected)?.focus({ preventScroll: true });
    }
    state.selected = null;
    state.hovered = null;
    state.inspected = null;
    renderTooltip();
  }

  function select(id) {
    cancelPointerFrame();
    state.selected = state.selected === id ? null : id;
    state.hovered = null;
    state.inspected = null;
    renderTooltip();
  }

  function drawChart() {
    layout = chartLayout(models, chart.clientWidth || 900, state.scale);
    const focused = document.activeElement?.closest('[data-point]')?.dataset.point;
    cancelPointerFrame();
    chartRect = null;
    state.hovered = null;
    state.inspected = null;
    pointNodes = new Map();
    points = [];
    if (!layout) {
      svg.replaceChildren(svgElement('text', { x: 20, y: 50 }, 'No recorded cost data available. See the leaderboard below.'));
      renderTooltip();
      return;
    }
    const { width, height, box, x, y, xTicks, yTicks } = layout;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('height', height);
    const fragment = document.createDocumentFragment();
    fragment.append(svgElement('desc', { id: 'bench-chart-desc' }, `Higher is stronger; left is cheaper. The cost axis is ${state.scale === 'log' ? 'logarithmic' : 'linear'}. Blue points form the full-field Pareto frontier. Tab to a point, use arrow keys to move between models, and Enter to pin its details. Escape closes the tooltip. The leaderboard below has the same data.`));
    for (const value of yTicks) {
      fragment.append(svgElement('line', { class: 'bench-gridline', x1: box.left, x2: box.right, y1: y(value), y2: y(value) }));
      fragment.append(svgElement('text', { class: 'bench-tick', x: box.left - 10, y: y(value) + 4, 'text-anchor': 'end' }, String(value)));
    }
    for (const value of xTicks) {
      fragment.append(svgElement('line', { class: 'bench-gridline', x1: x(value), x2: x(value), y1: box.top, y2: box.bottom }));
      fragment.append(svgElement('text', { class: 'bench-tick', x: x(value), y: box.bottom + 23, 'text-anchor': 'middle' }, axisMoney(value)));
    }
    fragment.append(svgElement('text', { class: 'bench-axis-label', x: box.left, y: 18 }, 'Elo ↑'));
    fragment.append(svgElement('text', { class: 'bench-axis-label', x: (box.left + box.right) / 2, y: height - 12, 'text-anchor': 'middle' }, 'Recorded $ / active real-time min →'));
    const frontier = models.filter(m => m.frontier && m.cost > 0).sort((a, b) => a.cost - b.cost || a.elo - b.elo);
    const path = frontier.map((m, index) => `${index ? 'L' : 'M'}${x(m.cost)},${y(m.elo)}`).join(' ');
    fragment.append(svgElement('path', { class: 'bench-frontier-line', d: path, 'aria-hidden': 'true' }));
    for (const model of visible.filter(m => m.cost > 0 && Number.isFinite(m.cost))) {
      const px = x(model.cost), py = y(model.elo);
      points.push({ ...model, x: px, y: py });
      const group = svgElement('g', { class: `bench-dot${model.frontier ? ' is-frontier' : ''}`, transform: `translate(${px},${py})`, tabindex: '0', role: 'button', 'data-point': model.id, 'aria-pressed': String(model.id === state.selected), 'aria-label': `${model.name}, ${model.rating} Elo, ${money(model.cost)} per minute${model.frontier ? ', Pareto frontier' : ''}` });
      if (!model.anchor) {
        const low = y(model.ciLow) - py, high = y(model.ciHigh) - py;
        group.append(svgElement('path', { class: 'bench-ci', d: `M-3,${low}H3 M0,${low}V${high} M-3,${high}H3`, visibility: ciToggle.checked ? 'visible' : 'hidden' }));
      }
      group.append(svgElement('circle', { class: 'bench-dot-hit', r: 22 }));
      group.append(svgElement('circle', { class: 'bench-focus-ring', r: 11 }));
      group.append(svgElement('circle', { class: 'bench-dot-mark', r: model.frontier ? 5.5 : 4.5 }));
      fragment.append(group);
      pointNodes.set(model.id, group);
    }
    for (const label of labelPositions(points.filter(p => p.frontier), layout)) {
      fragment.append(svgElement('text', { class: 'bench-point-label', x: label.labelX, y: label.labelY, 'aria-hidden': 'true' }, label.name));
    }
    if (!points.length) fragment.append(svgElement('text', { class: 'bench-axis-label', x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2, 'text-anchor': 'middle' }, 'No matching models with recorded cost.'));
    svg.replaceChildren(fragment);
    if (focused && pointNodes.has(focused)) pointNodes.get(focused).focus({ preventScroll: true });
    renderTooltip();
    syncHighlights(true);
  }

  function updateTable(animate = false) {
    const previousVisible = visible;
    visible = visibleModels(models, search.value, frontierOnly.checked);
    const ids = new Set(visible.map(m => m.id));
    const ordered = sortedModels(models, state.sort, state.direction);
    const positions = new Map();
    if (animate && !reducedMotion.matches) {
      for (const [id, row] of rows) {
        row.getAnimations?.().forEach(animation => animation.cancel());
        if (!row.hidden) positions.set(id, row.getBoundingClientRect().top);
      }
    }
    const focused = document.activeElement;
    for (const model of ordered) {
      const row = rows.get(model.id);
      row.hidden = !ids.has(model.id);
      tbody.append(row);
    }
    if (focused && tbody.contains(focused)) focused.focus({ preventScroll: true });
    if (positions.size) {
      for (const model of visible) {
        const row = rows.get(model.id);
        const delta = positions.has(model.id) ? positions.get(model.id) - row.getBoundingClientRect().top : 0;
        if (delta && row.animate) row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    }
    for (const button of root.querySelectorAll('[data-sort]')) {
      const active = button.dataset.sort === state.sort;
      button.closest('th').setAttribute('aria-sort', active ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none');
      button.querySelector('span').textContent = active ? (state.direction === 'asc' ? '↑' : '↓') : '↕';
    }
    root.querySelector('#bench-filter-count').textContent = `${visible.length} of ${models.length} models`;
    root.querySelector('#bench-empty').hidden = visible.length > 0;
    if (state.selected && !ids.has(state.selected)) state.selected = null;
    const chartChanged = !layout || visible.length !== previousVisible.length
      || visible.some((model, i) => model.id !== previousVisible[i].id);
    if (chartChanged) drawChart();
    else renderTooltip();
  }

  function nearest(event) {
    if (!layout) return null;
    const rect = chartRect || (chartRect = svg.getBoundingClientRect());
    const px = (event.clientX - rect.left) * layout.width / rect.width;
    const py = (event.clientY - rect.top) * layout.height / rect.height;
    let closest = null, distance = 24 ** 2;
    for (const point of points) {
      const d = (point.x - px) ** 2 + (point.y - py) ** 2;
      if (d < distance) { closest = point.id; distance = d; }
    }
    return closest;
  }

  svg.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointerPosition = { clientX: event.clientX, clientY: event.clientY };
    if (pointerFrame !== null) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = null;
      const id = nearest(pointerPosition);
      if (id !== state.hovered) inspect(id);
      const cursor = id ? 'pointer' : '';
      if (svg.style.cursor !== cursor) svg.style.cursor = cursor;
    });
  });
  svg.addEventListener('pointerenter', () => { chartRect = null; });
  svg.addEventListener('pointerleave', cancelPointerFrame);
  chart.addEventListener('pointerleave', () => { cancelPointerFrame(); inspect(null); });
  svg.addEventListener('click', event => {
    // Read fresh geometry for clicks, including after a layout change outside the chart.
    chartRect = null;
    // Zero-detail clicks are keyboard/assistive-technology activations.
    const id = event.detail === 0 ? event.target.closest('[data-point]')?.dataset.point : nearest(event);
    if (id) select(id);
    else dismissTooltip();
  });
  svg.addEventListener('focusin', event => {
    const id = event.target.closest('[data-point]')?.dataset.point;
    if (id) { cancelPointerFrame(); inspect(id); }
  });
  svg.addEventListener('focusout', () => inspect(null));
  svg.addEventListener('keydown', event => {
    const id = event.target.closest('[data-point]')?.dataset.point;
    if (!id) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(id); }
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const ids = [...pointNodes.keys()];
      const index = ids.indexOf(id);
      const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : (index + delta + ids.length) % ids.length;
      pointNodes.get(ids[next]).focus({ preventScroll: true });
    }
  });
  tbody.addEventListener('click', event => {
    const id = event.target.closest('[data-select]')?.dataset.select;
    if (id) select(id);
  });
  tbody.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const id = event.target.closest('[data-model]')?.dataset.model;
    if (id !== state.hovered) inspect(id, false);
  });
  tbody.addEventListener('pointerleave', () => inspect(null));
  tooltip.addEventListener('click', event => {
    if (event.target.closest('[data-close-tooltip]')) dismissTooltip(true);
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !tooltip.hidden) {
      event.preventDefault();
      dismissTooltip(tooltip.contains(document.activeElement));
    }
  });
  root.addEventListener('click', event => {
    if (!tooltip.hidden && !event.target.closest('.bench-chart-panel, [data-select]')) dismissTooltip();
  });
  for (const button of root.querySelectorAll('[data-sort]')) {
    button.addEventListener('click', event => {
      const key = button.dataset.sort;
      state.direction = state.sort === key ? (state.direction === 'desc' ? 'asc' : 'desc') : ['name', 'cost', 'actionSeconds'].includes(key) ? 'asc' : 'desc';
      state.sort = key;
      updateTable(event.detail > 0);
    });
  }
  for (const button of root.querySelectorAll('[data-scale]')) {
    button.addEventListener('click', () => {
      if (state.scale === button.dataset.scale) return;
      state.scale = button.dataset.scale;
      for (const item of root.querySelectorAll('[data-scale]')) item.setAttribute('aria-pressed', String(item === button));
      drawChart();
    });
  }
  ciToggle.addEventListener('change', () => {
    for (const path of svg.querySelectorAll('.bench-ci')) path.setAttribute('visibility', ciToggle.checked ? 'visible' : 'hidden');
  });
  search.addEventListener('input', () => updateTable());
  frontierOnly.addEventListener('change', () => updateTable());
  root.querySelector('#bench-reset').addEventListener('click', event => {
    search.value = '';
    frontierOnly.checked = false;
    state.sort = 'rating';
    state.direction = 'desc';
    updateTable(event.detail > 0);
  });
  for (const element of root.querySelectorAll('[data-enhanced]')) element.hidden = false;
  updateTable();
  // Cache chart bounds between frames; scrolling and resizing invalidate them.
  window.addEventListener('scroll', () => { chartRect = null; }, { capture: true, passive: true });
  window.addEventListener('resize', () => { chartRect = null; }, { passive: true });
  document.fonts?.ready.then(() => { chartRect = null; });
  let previousWidth = chart.clientWidth;
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (Math.abs(chart.clientWidth - previousWidth) < 1) return;
      previousWidth = chart.clientWidth;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(drawChart);
    }).observe(chart);
  } else {
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(drawChart);
    });
  }
  return { data, state, drawChart, updateTable };
}

if (typeof document !== 'undefined') initBenchmark();

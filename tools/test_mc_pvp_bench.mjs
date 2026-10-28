import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { money, visibleModels, sortedModels, paretoModels, chartLayout, labelPositions, tooltipPosition } from '../js/mc-pvp-bench-data.js';

const data = JSON.parse(readFileSync(new URL('../assets/mc-pvp-bench.json', import.meta.url)));
const html = readFileSync(new URL('../mc-pvp-bench.html', import.meta.url), 'utf8');
const models = data.models;

test('public snapshot has consistent counts, records, ranks and intervals', () => {
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.counts.models, models.length);
  assert.equal(new Set(models.map(m => m.id)).size, models.length);
  assert.equal(models.reduce((n, m) => n + m.games, 0), data.counts.games * 2);
  assert.equal(models.reduce((n, m) => n + m.wins, 0), data.counts.decisive);
  assert.equal(models.reduce((n, m) => n + m.losses, 0), data.counts.decisive);
  assert.equal(models.reduce((n, m) => n + m.draws, 0), data.counts.draws * 2);
  assert.equal(data.counts.games, data.counts.decisive + data.counts.draws);
  for (const m of models) {
    assert.equal(m.games, m.wins + m.losses + m.draws);
    assert.equal(m.rank, 1 + models.filter(other => other.rating > m.rating).length);
    assert.ok(m.ciLow <= m.elo && m.elo <= m.ciHigh);
    assert.ok(m.cost === null || m.cost > 0);
    assert.ok(m.actionSeconds === null || m.actionSeconds > 0);
    assert.ok(m.costDuels >= 0 && m.actionSamples >= 0);
  }
  const anchor = models.filter(m => m.anchor);
  assert.equal(anchor.length, 1);
  assert.equal(anchor[0].id, 'deepseek');
  assert.equal(anchor[0].elo, 1000);
  assert.equal(anchor[0].ciLow, 1000);
  assert.equal(anchor[0].ciHigh, 1000);
});

test('head-to-head aggregates reconcile independently with every model', () => {
  assert.equal(data.headToHead.reduce((n, p) => n + p.aWins + p.bWins + p.draws, 0), data.counts.games);
  assert.equal(new Set(data.headToHead.map(p => `${p.a}:${p.b}`)).size, data.headToHead.length);
  for (const m of models) {
    const results = data.headToHead.reduce((r, p) => {
      if (![p.a, p.b].includes(m.id)) return r;
      r.wins += p.a === m.id ? p.aWins : p.bWins;
      r.losses += p.a === m.id ? p.bWins : p.aWins;
      r.draws += p.draws;
      return r;
    }, { wins: 0, losses: 0, draws: 0 });
    for (const key of ['wins', 'losses', 'draws']) assert.equal(results[key], m[key]);
  }
});

test('snapshot has only allowlisted public fields and no local paths', () => {
  const publicFields = ['schemaVersion', 'asOf', 'generatedAt', 'conditions', 'counts', 'method', 'anchor', 'costMethod', 'actionMethod', 'models', 'headToHead'];
  assert.deepEqual(Object.keys(data).sort(), publicFields.sort());
  assert.deepEqual(Object.keys(data.counts).sort(), ['decisive', 'draws', 'games', 'models']);
  const allowed = new Set(['id', 'name', 'provider', 'elo', 'rating', 'ciLow', 'ciHigh', 'wins', 'losses', 'draws', 'games', 'cost', 'actionSeconds', 'costDuels', 'actionSamples', 'frontier', 'anchor', 'rank']);
  for (const model of models) for (const key of Object.keys(model)) assert.ok(allowed.has(key), key);
  const encoded = JSON.stringify(data);
  assert.doesNotMatch(encoded, /\/Users\/|\/home\/|\/private\/|\/var\/folders\/|localhost|Bearer |sk-or-|(?:[a-zA-Z]:\\\\)|(?:\d{1,3}\.){3}\d{1,3}/);
});

test('exported Pareto frontier agrees with an independent JS calculation', () => {
  assert.deepEqual(paretoModels(models).map(m => m.id).sort(), models.filter(m => m.frontier).map(m => m.id).sort());
});

test('frontier preserves exact ties and uses exported whole-point ratings', () => {
  const candidates = [
    { id: 'a', cost: 1, elo: 999.9, rating: 1000 },
    { id: 'b', cost: 1, elo: 1000.1, rating: 1000 },
    { id: 'c', cost: 2, elo: 1000.2, rating: 1000 },
    { id: 'd', cost: 3, elo: 1001, rating: 1001 },
    { id: 'missing', cost: null, elo: 2000, rating: 2000 },
  ];
  assert.deepEqual(paretoModels(candidates).map(m => m.id), ['a', 'b', 'd']);
});

test('filters search both model and provider, compose, and never mutate the frontier', () => {
  assert.equal(visibleModels(models, '  ').length, models.length);
  assert.ok(visibleModels(models, 'OPENAI').every(m => m.provider === 'OpenAI'));
  assert.ok(visibleModels(models, 'gpt sol').every(m => /gpt/i.test(m.name) && /sol/i.test(m.name)));
  assert.equal(visibleModels(models, 'definitely not a model').length, 0);
  const frontier = models.filter(m => m.frontier).map(m => m.id);
  assert.deepEqual(visibleModels(models, '', true).map(m => m.id), frontier);
  assert.ok(visibleModels(models, 'OpenAI', true).every(m => m.frontier && m.provider === 'OpenAI'));
  assert.deepEqual(models.filter(m => m.frontier).map(m => m.id), frontier);
});

test('numeric and name sorts work in both directions, keep missing metrics last', () => {
  for (const key of ['rating', 'games', 'cost', 'actionSeconds']) {
    for (const direction of ['asc', 'desc']) {
      const values = sortedModels(models, key, direction).map(m => m[key]).filter(n => n != null);
      assert.ok(values.every((value, i) => !i || (direction === 'asc' ? value >= values[i - 1] : value <= values[i - 1])));
    }
  }
  const missing = { ...models[0], id: 'missing', cost: null };
  assert.equal(sortedModels([...models, missing], 'cost', 'asc').at(-1).id, 'missing');
  assert.equal(sortedModels([...models, missing], 'cost', 'desc').at(-1).id, 'missing');
  const alphabetic = sortedModels(models, 'name', 'asc').map(m => m.name);
  assert.deepEqual(alphabetic, [...alphabetic].sort((a, b) => a.localeCompare(b)));
});

test('money formatting distinguishes missing data and cheap-model costs', () => {
  assert.equal(money(null), '—');
  assert.equal(money(undefined), '—');
  assert.equal(money(0), '$0.0000');
  assert.equal(money(0.00096), '$0.0010');
  assert.equal(money(0.1628), '$0.163');
});

test('chart maps every model and interval within bounds at phone and desktop widths', () => {
  for (const width of [280, 312, 375, 640, 960]) {
    for (const scale of ['log', 'linear']) {
      const l = chartLayout(models, width, scale);
      for (const m of models) {
        if (!m.cost) continue;
        assert.ok(l.x(m.cost) >= l.box.left && l.x(m.cost) <= l.box.right);
        assert.ok(l.y(m.ciLow) <= l.box.bottom && l.y(m.ciHigh) >= l.box.top);
      }
      assert.ok(l.xTicks.every(x => Number.isFinite(l.x(x))));
      assert.ok(l.yTicks.every(y => Number.isFinite(l.y(y))));
      assert.ok(l.xTicks.length >= 2 && l.yTicks.length >= 2);
      const labels = labelPositions(models.filter(m => m.frontier).map(m => ({ ...m, x: l.x(m.cost), y: l.y(m.elo) })), l);
      for (const p of labels) {
        assert.ok(p.rect.left >= l.box.left && p.rect.right <= l.box.right);
        assert.ok(p.rect.top >= l.box.top && p.rect.bottom <= l.box.bottom);
      }
    }
  }
  assert.equal(chartLayout([{ cost: null }], 320), null);
  const anchorOnly = chartLayout([models.find(m => m.anchor)], 320);
  assert.ok(Number.isFinite(anchorOnly.y(1000)));
});

test('static page contains all rows, one h1, matching JSON, and valid local assets', () => {
  assert.equal([...html.matchAll(/<tr data-model=/g)].length, models.length);
  assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1);
  assert.doesNotMatch(html, /\{\{\w+\}\}/);
  const embedded = html.match(/<script id="bench-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(embedded), data);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]*)"/g)) {
    if (match[1] === '/') continue;
    assert.doesNotThrow(() => readFileSync(new URL(`..${match[1]}`, import.meta.url)));
  }
});

test('tooltip placement stays inside phone and desktop charts', () => {
  for (const width of [280, 312, 375, 640, 960]) {
    const layout = chartLayout(models, width);
    const size = { width: Math.min(320, width - 12), height: 224 };
    for (const model of models.filter(m => m.cost)) {
      const point = { x: layout.x(model.cost), y: layout.y(model.elo) };
      const p = tooltipPosition(point, layout, size);
      assert.ok(p.left >= 6 && p.left + size.width <= layout.width - 6);
      assert.ok(p.top >= 6 && p.top + size.height <= layout.height - 6);
      const roomBesidePoint = point.x >= size.width + 20 || width - point.x >= size.width + 20;
      if (roomBesidePoint) assert.ok(p.left > point.x || p.left + size.width < point.x);
    }
  }
});

test('page copy has no summary strip, selection panel, history notes or footer branding', () => {
  const content = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.doesNotMatch(content, /bench-facts|bench-selection|Low reasoning|Results through|Select a model|Ranks use rounded|post-fix|archived|older results|first runs|MC PvP Bench · Daniil Sedov|Leaderboard ↓|How it works ↓|Methodology ↓/);
  assert.match(content, /<h2 id="pareto-heading">Elo vs\. cost<\/h2>/);
  assert.match(content, /Last updated <time/);
  assert.ok(content.includes(`datetime="${data.generatedAt.slice(0, 10)}"`));
});

// Optional DOM integration: install jsdom outside the repo, then point this at its
// absolute module entry. No browser is launched or controlled by these tests.
test('interactive DOM: pinned tooltips, keyboard, sort, search, axes, intervals, reset', { skip: !process.env.MC_BENCH_DOM_MODULE }, async () => {
  const { JSDOM } = await import(pathToFileURL(process.env.MC_BENCH_DOM_MODULE).href);
  const dom = new JSDOM(html, { url: 'http://localhost:8000/mc-pvp-bench', pretendToBeVisual: true });
  const { window } = dom;
  const styles = window.document.createElement('style');
  styles.textContent = readFileSync(new URL('../css/mc-pvp-bench.css', import.meta.url), 'utf8');
  window.document.head.append(styles);
  window.matchMedia = () => ({ matches: true });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
  const { initBenchmark } = await import('../js/mc-pvp-bench.js');
  const doc = window.document;
  const click = selector => doc.querySelector(selector).click();
  const event = (selector, type) => doc.querySelector(selector).dispatchEvent(new window.Event(type, { bubbles: true }));
  const tooltip = doc.querySelector('#bench-tooltip');
  const chartSvg = doc.querySelector('#bench-chart svg');
  const activatePoint = id => doc.querySelector(`[data-point="${id}"]`).dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
  const settleHover = () => new Promise(resolve => setTimeout(resolve, 150));
  const assertTooltip = id => {
    assert.equal(tooltip.hidden, false);
    assert.equal(tooltip.dataset.model, id);
    assert.equal(tooltip.querySelector('strong').textContent, models.find(m => m.id === id).name);
    assert.doesNotMatch(tooltip.textContent, /Timing:|archived|successful calls/);
  };
  assert.equal(doc.querySelectorAll('[data-point]').length, models.filter(m => m.cost).length);
  assert.equal(doc.querySelector('#bench-selection'), null);
  assert.equal(tooltip.hidden, true);
  assert.equal(chartSvg.querySelector('title, [title]'), null);
  assert.equal(chartSvg.hasAttribute('title'), false);
  assert.ok(chartSvg.getAttribute('aria-label'));

  // Hover/focus details have all model metrics and no interactive close control.
  doc.querySelector('[data-point]').focus();
  assertTooltip(models[0].id);
  assert.equal(tooltip.getAttribute('role'), 'tooltip');
  assert.equal(window.getComputedStyle(tooltip).pointerEvents, 'none');
  assert.equal(tooltip.querySelector('[data-close-tooltip]').hidden, true);
  assert.equal(tooltip.querySelectorAll('dl > div').length, 4);
  doc.activeElement.blur();
  await settleHover();
  assert.equal(tooltip.hidden, true);

  // Selecting a row uses the same tooltip and keeps the chart highlight linked.
  click(`[data-select="${models[2].id}"]`);
  assertTooltip(models[2].id);
  assert.equal(doc.querySelector(`[data-point="${models[2].id}"]`).getAttribute('aria-pressed'), 'true');
  event('#bench-chart', 'pointerleave');
  await settleHover();
  assertTooltip(models[2].id);
  click('[data-sort="cost"]');
  assert.equal(doc.querySelector('#bench-rows tr').dataset.model, sortedModels(models, 'cost', 'asc')[0].id);
  click('[data-sort="cost"]');
  assert.equal(doc.querySelector('#bench-rows tr').dataset.model, sortedModels(models, 'cost', 'desc')[0].id);
  doc.querySelector('#bench-search').value = 'OpenAI';
  event('#bench-search', 'input');
  assert.equal([...doc.querySelectorAll('#bench-rows tr')].filter(row => !row.hidden).length, visibleModels(models, 'OpenAI').length);
  assert.equal(doc.querySelectorAll('[data-point]').length, visibleModels(models, 'OpenAI').length);
  doc.querySelector('#bench-frontier-only').checked = true;
  event('#bench-frontier-only', 'change');
  assert.equal(doc.querySelectorAll('[data-point]').length, visibleModels(models, 'OpenAI', true).length);
  const firstPoint = doc.querySelector('[data-point]');
  firstPoint.focus();
  firstPoint.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.notEqual(doc.activeElement.dataset.point, firstPoint.dataset.point);
  doc.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const keyboardSelection = doc.activeElement.dataset.point;
  assertTooltip(keyboardSelection);
  event('#bench-chart', 'pointerleave');
  assertTooltip(keyboardSelection);
  click('[data-scale="linear"]');
  assert.equal(doc.querySelector('[data-scale="linear"]').getAttribute('aria-pressed'), 'true');
  assert.match(doc.querySelector('#bench-chart-desc').textContent, /linear/);
  assertTooltip(keyboardSelection);
  doc.querySelector('#bench-ci').checked = true;
  event('#bench-ci', 'change');
  assert.ok([...doc.querySelectorAll('.bench-ci')].every(ci => ci.getAttribute('visibility') === 'visible'));
  doc.querySelector('#bench-search').value = 'nothing matches';
  event('#bench-search', 'input');
  assert.equal(doc.querySelectorAll('[data-point]').length, 0);
  assert.equal(doc.querySelector('#bench-empty').hidden, false);
  assert.equal(tooltip.hidden, true);
  click('#bench-reset');
  assert.equal(doc.querySelectorAll('[data-point]').length, models.length);
  assert.equal(doc.querySelector('#bench-empty').hidden, true);
  assert.equal(doc.querySelector('#bench-rows tr').dataset.model, models[0].id);
  assert.equal(doc.querySelector('[data-sort="rating"]').closest('th').getAttribute('aria-sort'), 'descending');
  // An assistive-tech click on the SVG and a touch/pointer click use distinct paths.
  const second = models[1];
  activatePoint(second.id);
  assertTooltip(second.id);
  assert.equal(tooltip.getAttribute('role'), 'group');
  assert.equal(window.getComputedStyle(tooltip).pointerEvents, 'auto');
  assert.equal(tooltip.querySelector('[data-close-tooltip]').hidden, false);
  const layout = chartLayout(models, 900, 'linear');
  chartSvg.getBoundingClientRect = () => ({ left: 0, top: 0, width: layout.width, height: layout.height });
  chartSvg.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1, clientX: layout.x(models[0].cost), clientY: layout.y(models[0].elo) }));
  assertTooltip(models[0].id);
  // Leaving the chart or passing another point does not replace a pinned tooltip.
  event('#bench-chart', 'pointerleave');
  chartSvg.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: layout.x(second.cost), clientY: layout.y(second.elo) }));
  await settleHover();
  assertTooltip(models[0].id);
  click('[data-close-tooltip]');
  assert.equal(tooltip.hidden, true);
  assert.equal(doc.activeElement.dataset.point, models[0].id);
  assert.equal(doc.activeElement.getAttribute('aria-pressed'), 'false');

  // Click the same point again to unpin; Escape, empty space, and outside clicks dismiss.
  activatePoint(second.id);
  activatePoint(second.id);
  assert.equal(tooltip.hidden, true);
  activatePoint(second.id);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(tooltip.hidden, true);
  activatePoint(second.id);
  chartSvg.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1, clientX: 0, clientY: 0 }));
  assert.equal(tooltip.hidden, true);
  activatePoint(second.id);
  click('#methodology');
  assert.equal(tooltip.hidden, true);

  // Unpinned previews never capture the pointer or hold a previous model open.
  chartSvg.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: layout.x(second.cost), clientY: layout.y(second.elo) }));
  await settleHover();
  assertTooltip(second.id);
  assert.equal(window.getComputedStyle(tooltip).pointerEvents, 'none');
  for (const model of models.slice(2, 7)) {
    chartSvg.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: layout.x(model.cost), clientY: layout.y(model.elo) }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assertTooltip(model.id);
    assert.equal(window.getComputedStyle(tooltip).pointerEvents, 'none');
  }
  chartSvg.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 0, clientY: 0 }));
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(tooltip.hidden, true);

  // A touch hover does nothing; tapping still pins the full details.
  const touchMove = new window.MouseEvent('pointermove', { bubbles: true, clientX: layout.x(second.cost), clientY: layout.y(second.elo) });
  Object.defineProperty(touchMove, 'pointerType', { value: 'touch' });
  chartSvg.dispatchEvent(touchMove);
  await settleHover();
  assert.equal(tooltip.hidden, true);
  chartSvg.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1, clientX: layout.x(second.cost), clientY: layout.y(second.elo) }));
  event('#bench-chart', 'pointerleave');
  assertTooltip(second.id);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  // The pin survives resize, and the anchored tooltip stays inside the mobile chart.
  activatePoint(second.id);
  Object.defineProperty(doc.querySelector('#bench-chart'), 'clientWidth', { configurable: true, value: 312 });
  window.dispatchEvent(new window.Event('resize'));
  await new Promise(resolve => setTimeout(resolve, 40));
  assertTooltip(second.id);
  assert.equal(chartSvg.getAttribute('viewBox'), '0 0 312 340');
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(typeof initBenchmark, 'function');
  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
});

test('hover work is frame-batched, immediate and limited to changed models', { skip: !process.env.MC_BENCH_DOM_MODULE }, async t => {
  const { JSDOM } = await import(pathToFileURL(process.env.MC_BENCH_DOM_MODULE).href);
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = () => ({ matches: true });
  globalThis.window = window;
  globalThis.document = window.document;
  const frames = new Map();
  let nextFrame = 0;
  globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const flushFrame = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(0));
  };
  const { initBenchmark } = await import('../js/mc-pvp-bench.js');
  initBenchmark();
  const doc = window.document;
  const chartSvg = doc.querySelector('#bench-chart svg');
  const tooltip = doc.querySelector('#bench-tooltip');
  const layout = chartLayout(models, 900, 'log');
  let rectReads = 0, dimensionReads = 0, chartTop = 0;
  chartSvg.getBoundingClientRect = () => {
    rectReads++;
    return { left: 0, top: chartTop, width: 900, height: 420 };
  };
  Object.defineProperty(tooltip, 'offsetWidth', { get: () => { dimensionReads++; return 320; } });
  Object.defineProperty(tooltip, 'offsetHeight', { get: () => { dimensionReads++; return 224; } });
  const move = model => chartSvg.dispatchEvent(new window.MouseEvent('pointermove', {
    bubbles: true, clientX: layout.x(model.cost), clientY: layout.y(model.elo) + chartTop,
  }));
  const observer = new window.MutationObserver(() => {});
  observer.observe(doc.querySelector('#bench'), { subtree: true, attributes: true, childList: true, characterData: true });
  for (let i = 0; i < 200; i++) move(models[0]);
  assert.equal(frames.size, 1);
  assert.equal(rectReads, 0);
  flushFrame();
  assert.equal(rectReads, 1);
  assert.equal(tooltip.hidden, false, 'first animation frame must show the tooltip without a hover timer');
  assert.equal(tooltip.dataset.model, models[0].id);
  observer.takeRecords();
  rectReads = 0;
  dimensionReads = 0;
  for (let i = 0; i < 200; i++) move(models[0]);
  assert.equal(frames.size, 1);
  flushFrame();
  const unchangedMutations = observer.takeRecords();
  assert.equal(rectReads, 0);
  assert.equal(dimensionReads, 0);
  assert.equal(unchangedMutations.length, 0);
  move(models[1]);
  flushFrame();
  const changedMutations = observer.takeRecords();
  assert.equal(tooltip.dataset.model, models[1].id);
  assert.ok(changedMutations.length <= 20, `${changedMutations.length} mutations for one model change`);
  assert.ok(changedMutations.every(mutation => {
    const row = mutation.target.closest?.('[data-model]:not(#bench-tooltip)');
    const point = mutation.target.closest?.('[data-point]');
    return (!row || [models[0].id, models[1].id].includes(row.dataset.model))
      && (!point || [models[0].id, models[1].id].includes(point.dataset.point));
  }), 'unrelated models must not be touched');

  // Moving around a pinned model must not remeasure or rebuild its tooltip.
  doc.querySelector(`[data-point="${models[1].id}"]`).dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
  dimensionReads = 0;
  move(models[0]);
  flushFrame();
  assert.equal(tooltip.dataset.model, models[1].id);
  assert.equal(dimensionReads, 0);

  // Sorting the table must not recreate the SVG, and scroll must invalidate geometry.
  const originalPoint = doc.querySelector('[data-point]');
  doc.querySelector('[data-sort="cost"]').click();
  assert.equal(doc.querySelector('[data-point]'), originalPoint);
  chartTop = -100;
  window.dispatchEvent(new window.Event('scroll'));
  rectReads = 0;
  move(models[0]);
  flushFrame();
  assert.equal(rectReads, 1);
  assert.equal(tooltip.dataset.model, models[0].id);
  t.diagnostic(`200 same-point events: 0 repeated bounds/size reads, 0 DOM mutations; changing models: ${changedMutations.length} mutations.`);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  observer.disconnect();
  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
});

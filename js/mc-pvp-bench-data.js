// Pure helpers shared by the interactive page and its tests.
export function money(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
}

export function visibleModels(models, query = '', frontierOnly = false) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return models.filter(model => (!frontierOnly || model.frontier)
    && words.every(word => `${model.name} ${model.provider}`.toLocaleLowerCase().includes(word)));
}

export function sortedModels(models, key = 'rating', direction = 'desc') {
  const sign = direction === 'asc' ? 1 : -1;
  return [...models].sort((a, b) => {
    if (a[key] == null && b[key] != null) return 1;
    if (b[key] == null && a[key] != null) return -1;
    const delta = typeof a[key] === 'string'
      ? a[key].localeCompare(b[key]) : (a[key] ?? 0) - (b[key] ?? 0);
    return sign * delta || a.rank - b.rank || a.name.localeCompare(b.name);
  });
}

export function paretoModels(models) {
  const priced = models.filter(m => Number.isFinite(m.cost) && m.cost > 0);
  return priced.filter(p => !priced.some(q => q.cost <= p.cost && q.rating >= p.rating
    && (q.cost < p.cost || q.rating > p.rating))).sort((a, b) => a.cost - b.cost || a.elo - b.elo);
}

function niceStep(span, count) {
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].find(n => n * power >= raw) * power;
}

export function chartLayout(models, width, scale = 'log') {
  width = Math.max(280, width);
  const height = width < 640 ? 340 : 420;
  const box = { left: 53, right: width - 24, top: 35, bottom: height - 65 };
  const priced = models.filter(m => Number.isFinite(m.cost) && m.cost > 0);
  if (!priced.length) return null;
  // Domains always use the whole field, not the current filter or CI toggle.
  const low = Math.min(...priced.map(m => m.ciLow));
  const high = Math.max(...priced.map(m => m.ciHigh));
  const yStep = niceStep(Math.max(high - low, 100), height < 400 ? 4 : 6);
  const yMin = Math.floor((low - 20) / yStep) * yStep;
  const yMax = Math.ceil((high + 20) / yStep) * yStep;
  const y = value => box.bottom - (value - yMin) / (yMax - yMin) * (box.bottom - box.top);
  const yTicks = [];
  for (let value = yMin; value <= yMax + yStep / 2; value += yStep) yTicks.push(value);
  const cheapest = Math.min(...priced.map(m => m.cost));
  const dearest = Math.max(...priced.map(m => m.cost));
  let x, xTicks;
  if (scale === 'log') {
    const lo = Math.log10(cheapest) - 0.13;
    const hi = Math.max(Math.log10(dearest) + 0.13, lo + 0.5);
    x = value => box.left + (Math.log10(value) - lo) / (hi - lo) * (box.right - box.left);
    xTicks = [];
    for (let power = Math.floor(lo); power <= Math.ceil(hi); power += 1) {
      for (const factor of width < 580 ? [1] : [1, 3]) {
        const value = factor * 10 ** power;
        if (Math.log10(value) >= lo && Math.log10(value) <= hi) xTicks.push(value);
      }
    }
  } else {
    const step = niceStep(dearest * 1.08, width < 580 ? 3 : 6);
    const hi = Math.ceil(dearest * 1.08 / step) * step;
    x = value => box.left + value / hi * (box.right - box.left);
    xTicks = [];
    for (let value = 0; value <= hi + step / 2; value += step) xTicks.push(value);
  }
  return { width, height, box, x, y, xTicks, yTicks, priced };
}

export function axisMoney(value) {
  if (value === 0) return '$0';
  return `$${Number(value.toPrecision(2))}`;
}

export function tooltipPosition(point, chart, tooltip) {
  const padding = 6, gap = 14;
  const maxLeft = Math.max(padding, chart.width - tooltip.width - padding);
  const maxTop = Math.max(padding, chart.height - tooltip.height - padding);
  const clampX = value => Math.max(padding, Math.min(value, maxLeft));
  const clampY = value => Math.max(padding, Math.min(value, maxTop));
  if (point.x + gap + tooltip.width <= chart.width - padding) {
    return { left: point.x + gap, top: clampY(point.y - tooltip.height / 2) };
  }
  if (point.x - gap - tooltip.width >= padding) {
    return { left: point.x - gap - tooltip.width, top: clampY(point.y - tooltip.height / 2) };
  }
  const above = point.y - gap - tooltip.height;
  return {
    left: clampX(point.x - tooltip.width / 2),
    top: clampY(above >= padding ? above : point.y + gap),
  };
}

export function labelPositions(points, layout) {
  const placed = [];
  const { box } = layout;
  for (const point of points) {
    const width = point.name.length * 6.2;
    const height = 14;
    for (const [dx, dy] of [[12, -12], [-width - 12, -12], [12, 22], [-width - 12, 22], [-width / 2, -20]]) {
      const x = point.x + dx;
      const y = point.y + dy;
      const rect = { left: x - 3, right: x + width + 3, top: y - height, bottom: y + 4 };
      if (rect.left < box.left || rect.right > box.right || rect.top < box.top || rect.bottom > box.bottom) continue;
      if (placed.some(p => rect.left < p.rect.right && rect.right > p.rect.left && rect.top < p.rect.bottom && rect.bottom > p.rect.top)) continue;
      if (points.some(p => p.id !== point.id && p.x > rect.left - 6 && p.x < rect.right + 6 && p.y > rect.top - 6 && p.y < rect.bottom + 6)) continue;
      placed.push({ ...point, labelX: x, labelY: y, rect });
      break;
    }
  }
  return placed;
}

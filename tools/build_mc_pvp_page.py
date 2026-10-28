"""Static MC PvP Bench table and downloads; no benchmark dependencies at build time."""

import csv
from datetime import datetime
from html import escape
from io import StringIO
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def money(value):
    if value is None:
        return "—"
    return f"${value:.4f}" if value < 0.01 else f"${value:.3f}"


def render_row(model):
    m = model
    name = escape(m["name"])
    interval = "Fixed anchor" if m["anchor"] else f'{round(m["ciLow"]):,}–{round(m["ciHigh"]):,}'
    badge = '<span class="bench-frontier-badge">Frontier</span>' if m["frontier"] else ""
    action = "—" if m["actionSeconds"] is None else f'{m["actionSeconds"]:.2f}s'
    return f'''<tr data-model="{escape(m['id'], quote=True)}">
  <td class="bench-rank">{m['rank']}</td>
  <th scope="row"><button class="bench-model-button" type="button" data-select="{escape(m['id'], quote=True)}" aria-pressed="false">{name}</button><span class="bench-provider">{escape(m['provider'])} {badge}</span></th>
  <td class="bench-elo">{m['rating']:,}<span class="bench-interval">{interval}</span></td>
  <td>{money(m['cost'])}</td>
  <td>{action}</td>
  <td>{m['games']}</td>
  <td class="bench-record"><span aria-label="{m['wins']} wins, {m['losses']} losses, {m['draws']} draws">{m['wins']} / {m['losses']} / {m['draws']}</span></td>
</tr>'''


def render(apply_template, common_partials):
    data = json.loads((ROOT / "assets/mc-pvp-bench.json").read_text())
    assert data["schemaVersion"] == 1
    assert len(data["models"]) == data["counts"]["models"]
    updated = datetime.fromisoformat(data["generatedAt"].replace("Z", "+00:00"))
    date = updated.strftime("%B %d, %Y").replace(" 0", " ")
    replacements = {
        **common_partials,
        "bench_rows": "\n".join(render_row(m) for m in data["models"]),
        "bench_data": json.dumps(data, separators=(",", ":"), allow_nan=False).replace("<", "\\u003c"),
        "bench_models": str(len(data["models"])),
        "bench_date": date,
        "bench_date_iso": updated.date().isoformat(),
    }
    html = apply_template((ROOT / "templates/mc-pvp-bench.html").read_text(), replacements)
    output = StringIO(newline="")
    fields = ["rank", "name", "provider", "elo", "ciLow", "ciHigh", "games", "wins", "losses", "draws", "cost", "actionSeconds", "costDuels", "actionSamples", "frontier", "anchor"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    writer.writerows(data["models"])
    return {ROOT / "mc-pvp-bench.html": html, ROOT / "assets/mc-pvp-bench.csv": output.getvalue()}

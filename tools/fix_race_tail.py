from pathlib import Path

path = Path(__file__).resolve().parents[1] / "race.html"
lines = path.read_text(encoding="utf-8").splitlines()

replacements = {
    419: '      <div class="bt-circuit" id="btCircuit">—</div>',
    420: '      <div class="bt-sub" id="btSub">En attente du départ</div>',
    423: '    <div class="bt-chip" id="btGrip">GRIP —</div>',
    431: '    <button class="btn btn-sec"  id="btnPause" onclick="togglePause()"        disabled>⏸ Pause</button>',
    432: '    <button class="btn btn-sec"  id="btnSkip"  onclick="skipEnd()"        disabled>⏩ Fin de course</button>',
    502: "      <button class=\"tab-btn\" onclick=\"showTab('tab-pace')\">⏱ Rythme</button>",
}

for num, text in replacements.items():
    lines[num - 1] = text

specific = {
    634: "    /* Init 3D en parallèle */",
    822: "  if (tLap) tLap.innerHTML = `Tour <b>${lap}</b>/<span>${total || '—'}</span>`;",
    1460: "    const last   = lastLap != null ? fmtLap(lastLap) : '—';",
}
for num, text in specific.items():
    lines[num - 1] = text

for i, line in enumerate(lines):
    if "btnPause').textContent" in line:
        lines[i] = line.replace("? Reprendre", "▶ Reprendre").replace("? Pause", "⏸ Pause")

path.write_text("\n".join(lines) + "\n", encoding="utf-8")
remaining = path.read_bytes().count(b"\xef\xbf\xbd")
print("remaining replacement bytes:", remaining)

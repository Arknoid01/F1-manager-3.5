#!/usr/bin/env python3
"""Restore UTF-8 French text and emojis in race.html from git history."""
import difflib
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def needs_fix(s: str) -> bool:
    return (
        "\ufffd" in s
        or "??" in s
        or re.search(
            r"\b(stratgie|Mto|dpart|Dpart|Ingnieur|Rsultats|estime|prvu|sche|humidit|Slectionne)\b",
            s,
        )
    )


def main() -> None:
    ref = subprocess.check_output(
        ["git", "show", "a118f45:race.html"], cwd=ROOT
    ).decode("utf-8").splitlines()
    bad = subprocess.check_output(
        ["git", "show", "9ad7927:race.html"], cwd=ROOT
    ).decode("utf-8").splitlines()

    out: list[str] = []
    fixes = 0
    matcher = difflib.SequenceMatcher(None, ref, bad, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            out.extend(bad[j1:j2])
        elif tag == "replace":
            ref_chunk = ref[i1:i2]
            bad_chunk = bad[j1:j2]
            if len(ref_chunk) == len(bad_chunk):
                for r, b in zip(ref_chunk, bad_chunk):
                    if needs_fix(b) and r != b:
                        out.append(r)
                        fixes += 1
                    else:
                        out.append(b)
            else:
                out.extend(bad_chunk)
        elif tag == "insert":
            for b in bad[j1:j2]:
                line = b
                if needs_fix(line):
                    sk = re.sub(r"[^\x00-\x7F]+", "", line.replace("??", ""))
                    candidates = [
                        r
                        for r in ref
                        if re.sub(r"[^\x00-\x7F]+", "", r.replace("??", "")) == sk
                    ]
                    if len(candidates) == 1:
                        line = candidates[0]
                        fixes += 1
                out.append(line)

    text = "\n".join(out) + "\n"

    subs = {
        "En attente du dpart": "En attente du départ",
        "'Piste sche'": "'Piste sèche'",
        "?? SEC": "☀️ SEC",
        "??? PLUIE": "🌧️ PLUIE",
        "?? FORT": "⛈️ FORT",
        "?? Lent": "🐢 Lent",
        "?? SC": "🟡 SC",
        "??? Mto & Piste": "🌦️ Météo & Piste",
        "?? Dure estime": "🛞 Durée estimée",
        "?? Ordres": "🎧 Ordres",
        "?? Pneus": "🔴 Pneus",
        "?? Gaps": "📊 Gaps",
        "?? Stratgie": "🗺 Stratégie",
        "?? Rsultats": "🏁 Résultats",
        "?? Plan prvu vs situation relle": "🛞 Plan prévu vs situation réelle",
        "?? Donnes issues des essais libres": "📊 Données issues des essais libres",
        "?? Estimation circuit": "📊 Estimation circuit",
        "??? Bienvenue": "🎙️ Bienvenue",
        "?? Pole position": "🏁 Pole position",
        "?? Slick (Soft/Med/Hard)": "☀️ Slick (Soft/Med/Hard)",
        "?? Intermdiaire": "🌧️ Intermédiaire",
        "?? Full Wet": "⛈️ Full Wet",
        "stratgie": "stratégie",
        "Stratgie": "Stratégie",
        "stratgies": "stratégies",
        "Mto": "Météo",
        "dpart": "départ",
        "Dpart": "Départ",
        "dpassement": "dépassement",
        "Dpass": "Dépassé",
        "dbord": "débord",
        "dvore": "dévore",
        "Ingnieur": "Ingénieur",
        "quipe": "équipe",
        "rtrograde": "rétrograde",
        "Dure": "Durée",
        "estime": "estimée",
        "Rsultats": "Résultats",
        "prvu": "prévu",
        "relle": "réelle",
        "Donnes": "Données",
        "dgradation": "dégradation",
        "prcdent": "précédent",
        "Dfend": "Défend",
        "Dfense": "Défense",
        "cder": "céder",
        "humidit": "humidité",
        "Intermdiaire": "Intermédiaire",
        "intermdiaire": "intermédiaire",
        "Slectionne": "Sélectionne",
        " sche": " sèche",
        " fentres": " fenêtres",
        " surveilles": " surveillées",
        " ds le ": " dès le ",
        " se dessiner": " à se dessiner",
        " opportunit": " opportunité",
        " Bien jou": " Bien joué",
        " valide le dpassement": " valide le dépassement",
        " est l,": " est là,",
        " est l ": " est là ",
        " acclre": " accélère",
        " prs": " près",
        " trs": " très",
        " cl ": " clé ",
        " rythme est l,": " rythme est là,",
        " continue comme a.": " continue comme ça.",
        "Belle opportunit saisie.": "Belle opportunité saisie.",
        "Bien jou.": "Bien joué.",
        "Bonne opportunit.": "Bonne opportunité.",
        "Timing de pit  revoir.": "Timing de pit — revoir.",
        "La gestion pneus est cl maintenant.": "La gestion pneus est clé maintenant.",
        "Moment difficile mais pas insurmontable.": "Moment difficile mais pas insurmontable.",
        "Les stratgies commencent  se dessiner.": "Les stratégies commencent à se dessiner.",
        "tte ds le dpart": "tête dès le départ",
        "s'impose en tte ds le dpart": "s'impose en tête dès le départ",
        "recalcul de stratgie": "recalcul de stratégie",
        "Mto changeante": "Météo changeante",
        "Passer en Intermdiaires": "Passer en Intermédiaires",
        "fenetres de pit surveilles": "fenêtres de pit surveillées",
        "Objectif : course propre et fenetres de pit surveilles.": "Objectif : course propre et fenêtres de pit surveillées.",
    }
    for old, new in subs.items():
        if old in text:
            text = text.replace(old, new)

    # Final targeted fixes (arrow / pause icons / remaining mojibake)
    line_fixes = {
        396: '  <a href="index.html" class="nav-back">← Accueil</a>',
        837: "      const wTxt = w === 'heavy_rain' ? 'Pluie forte' : w === 'light_rain' ? 'Piste humide' : 'Piste sèche';",
        838: "      btSub.textContent = wTxt + (Race.state.safetyCar?.active ? ' · SC' : '');",
    }
    lines = text.splitlines()
    for idx, fixed in line_fixes.items():
        if idx - 1 < len(lines):
            lines[idx - 1] = fixed
    for i, line in enumerate(lines):
        if 'detail:' in line and ' ? ${' in line:
            lines[i] = line.replace(' ? ', ' → ')
        if "btnPause').textContent" in line:
            lines[i] = line.replace('? Reprendre', '▶ Reprendre').replace('? Pause', '⏸ Pause')
    text = "\n".join(lines) + "\n"

    # Prefix emojis in narrative lines still broken
    text = re.sub(
        r"`(\?\?+) ",
        lambda m: "`🎙️ " if len(m.group(1)) >= 2 else m.group(0),
        text,
    )

    remaining = text.count("\ufffd") + len(re.findall(r"\?\?", text))
    target = ROOT / "race.html"
    target.write_text(text, encoding="utf-8", newline="\n")
    print(f"fixed lines via diff: {fixes}")
    print(f"remaining bad markers: {remaining}")
    print(f"written: {target}")


if __name__ == "__main__":
    main()

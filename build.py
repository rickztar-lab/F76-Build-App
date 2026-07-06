#!/usr/bin/env python3
"""Ensambla index.html desde src/index.template.html + los data_*.json.

Uso:  python3 build.py

Este script ES el paso de build del proyecto (el único). Reemplaza la vieja
regla de "editar el JSON y reinyectarlo a mano en el <script>":

  - Los datos se editan SOLO en los data_*.json de la raíz.
  - El código/UI se edita SOLO en src/index.template.html.
  - index.html es un artefacto generado: NO editarlo a mano (cualquier
    edición directa se pierde en el siguiente build).

Tras generar, corre las validaciones del QA checklist (sintaxis JS con
`node --check` y chequeo de getElementById huérfanos) y termina con código
de error si algo falla.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent
TEMPLATE = ROOT / 'src' / 'index.template.html'
OUTPUT = ROOT / 'index.html'

# (nombre de constante JS, archivo fuente, subclave opcional dentro del JSON)
# La subclave permite que archivos como data_legendary_weapon_effects.json
# guarden también sus notas de confianza (trust_note_*) sin inyectarlas.
DATA_MANIFEST = [
    ('PERKS', 'data_perks.json', None),
    ('WEAPONS', 'data_weapons_base.json', None),
    ('WIKI_WEAPONS', 'data_weapons_wiki.json', None),
    ('PERK_CATEGORIES', 'data_perk_categories.json', None),
    ('LEGENDARY_PERKS', 'data_legendary_perks.json', None),
    ('MUTATIONS', 'data_mutations.json', None),
    ('ARMOR_DATA', 'data_armor.json', None),
    ('RAID_CONTENT', 'data_raid_gleaming_depths.json', None),
    ('LEGENDARY_WEAPON_EFFECTS', 'data_legendary_weapon_effects.json', None),
    ('LEGENDARY_ARMOR_EFFECTS', 'data_legendary_armor_effects.json', 'effects'),
    ('WEAPON_DAMAGE_DATA', 'data_weapon_damage.json', None),
    ('INGESTIBLES', 'data_ingestibles.json', None),
    ('LEVELING_CURVE', 'data_leveling_curve.json', None),
]


def js_safe_json(value) -> str:
    """JSON válido que también es literal JS seguro dentro de <script>."""
    s = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    # U+2028/U+2029 son saltos de línea para JS pero no para JSON.
    s = s.replace(' ', '\\u2028').replace(' ', '\\u2029')
    # Evita que un "</script>" dentro de un string corte el tag HTML
    # ("<\/" es un escape válido en JSON/JS equivalente a "</").
    s = s.replace('</', '<\\/')
    return s


def build() -> str:
    html = TEMPLATE.read_text(encoding='utf-8')
    for const_name, filename, subkey in DATA_MANIFEST:
        marker = f'/*__DATA:{const_name}__*/'
        if marker not in html:
            sys.exit(f'ERROR: falta el marcador {marker} en {TEMPLATE}')
        data = json.loads((ROOT / filename).read_text(encoding='utf-8'))
        if subkey:
            data = data[subkey]
        html = html.replace(marker, f'const {const_name} = {js_safe_json(data)};')

    leftover = re.findall(r'/\*__DATA:\w+__\*/', html)
    if leftover:
        sys.exit(f'ERROR: marcadores sin entrada en DATA_MANIFEST: {leftover}')
    return html


def validate(html: str) -> None:
    errors = []

    m = re.search(r'<script>(.*)</script>', html, re.S)
    if not m:
        sys.exit('ERROR: el HTML generado no tiene bloque <script>')
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
        f.write(m.group(1))
        js_path = f.name
    try:
        subprocess.run(['node', '--check', js_path], check=True, capture_output=True, text=True)
    except FileNotFoundError:
        print('AVISO: node no disponible, se omite el chequeo de sintaxis JS')
    except subprocess.CalledProcessError as e:
        errors.append(f'Sintaxis JS inválida:\n{e.stderr}')

    ids = set(re.findall(r"getElementById\('([^']+)'\)", html))
    missing = [i for i in ids if not re.search(f'id="{i}"', html)]
    if missing:
        errors.append(f'getElementById huérfanos (sin elemento en el HTML): {missing}')

    if errors:
        sys.exit('BUILD FALLÓ:\n' + '\n'.join(errors))


def main() -> None:
    html = build()
    validate(html)
    OUTPUT.write_text(html, encoding='utf-8')
    print(f'OK: {OUTPUT} generado ({len(html):,} bytes) y validado.')


if __name__ == '__main__':
    main()

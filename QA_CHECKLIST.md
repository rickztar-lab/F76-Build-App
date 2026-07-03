# QA Checklist — Fallout 76 Build Planner

Checklist manual/semi-automático para correr **después de cualquier cambio**
a `index.html`, antes de dar por cerrado un ítem del roadmap. No reemplaza
tests automatizados (no hay framework de testing en este proyecto — single
file, sin build step), pero acota qué romper por accidente.

## 1. Checks automáticos (correr siempre, tardan segundos)

**Sintaxis del JS embebido:**
```bash
python3 -c "
import re
content = open('index.html').read()
m = re.search(r'<script>(.*)</script>', content, re.S)
open('/tmp/extracted.js','w').write(m.group(1))
"
node --check /tmp/extracted.js
```

**IDs huérfanos** (un `getElementById('x')` sin `id="x"` en el HTML tumbó la
app entera en silencio una vez — ver CLAUDE.md):
```bash
python3 -c "
import re
content = open('index.html').read()
ids = set(re.findall(r\"getElementById\('([^']+)'\)\", content))
missing = [i for i in ids if not re.search(f'id=\"{i}\"', content)]
print('MISSING:', missing)
"
```
Ambos deben salir limpios (sin error / `MISSING: []`) antes de seguir.

## 2. Matriz de regresión manual (clickear en navegador)

No hace falta correr las 16 combinaciones cada vez — pero si el cambio toca
`state.special`, mutaciones, Ghoul, o idioma, correr al menos las filas
marcadas (*) relacionadas al área tocada.

| # | Humano/Ghoul | Idioma | Mutación activa | Power Armor | Qué revisar |
|---|---|---|---|---|---|
| 1 | Humano | ES | Ninguna | No | Baseline: SPECIAL, derivados, perks se ven bien |
| 2 | Humano | EN | Ninguna | No | Mismo baseline en inglés — nombres de cartas SIGUEN en inglés en ambos idiomas |
| 3 | Ghoul | ES | Ninguna | No | Badge GHOUL visible, cartas exclusivas (`GHOUL_ONLY_PERKS`) aparecen/filtran bien |
| 4 (*) | Humano | ES | Marsupial (sin Class Freak) | No | Intelligence efectiva baja correctamente, Carry Weight sube +20 |
| 5 (*) | Humano | ES | Marsupial + Class Freak rango 2 | No | Penalización de Intelligence reducida ~50%, tag "reduced"/"reducida" visible |
| 6 | Humano | ES | Ninguna | Sí (marco completo, 5 piezas) | DR/ER del marco = 60 base + bonos por pieza, nota de PA visible |
| 7 | — | ES | — | — | Build guardado con estructura previa (build viejo en localStorage) carga sin romper la UI |

(*) Ver el caso numérico exacto en la sección 3.

## 3. Caso fijo para `getEffectiveSpecial()` — no tocar sin volver a validar esto

`getEffectiveSpecial()` está marcado en CLAUDE.md como protegido. Cualquier
cambio en su entorno (mutaciones, legendarias SPECIAL, Class Freak) debe
reproducir este cálculo a mano y comparar contra la función:

**Setup:**
- Intelligence base = 5
- Legendary Intelligence equipada, rango 3 → bono `LEGENDARY_SPECIAL_BONUS_BY_RANK[3] = 3`
- Mutación Marsupial activa → `Intelligence: -4` (negativo), `+20 carryWeight` (positivo)

**Caso A — sin Class Freak** (`classFreakRank = 0`, `reduction = 0`):
- `raw = 5 + 3 + (-4 * 1) = 4`
- `capped = 4`

**Caso B — con Class Freak equipado, rango 2** (`reduction = 0.5`):
- `raw = 5 + 3 + (-4 * (1 - 0.5)) = 5 + 3 - 2 = 6`
- `capped = 6`

Si algún cambio futuro produce un número distinto para este setup exacto sin
que se haya modificado intencionalmente la fórmula (ej. el % de Class Freak,
el bono por rango de legendarias, o el efecto de Marsupial en
`data_mutations.js`), es una regresión.

## 4. Guardado/carga de builds

1. Crear un build nuevo, nombrarlo, guardar.
2. Cargarlo y confirmar que SPECIAL, perks equipadas, legendarias, mutaciones
   y armadura coinciden exactamente con lo guardado.
3. Duplicar el build, confirmar que el duplicado es independiente (editar el
   duplicado no debe afectar al original).
4. Borrar el duplicado, confirmar que el original sigue intacto.
5. **Compatibilidad hacia atrás**: si el cambio actual modifica la forma del
   objeto de build guardado (por ejemplo al agregar multi-arma o sets de
   armadura múltiples), cargar un build guardado con la forma *anterior* y
   confirmar que no rompe la UI — debe aplicar un default seguro a los campos
   nuevos que falten, no lanzar una excepción ni dejar la pantalla en blanco.

## 5. Antes de cerrar el ítem del roadmap

- [ ] Checks automáticos (sección 1) limpios
- [ ] Filas de la matriz relacionadas al cambio (sección 2) revisadas
- [ ] Si se tocó `getEffectiveSpecial()`/mutaciones/legendarias SPECIAL: casos A y B (sección 3) siguen dando los mismos números
- [ ] Si se tocó el shape del build guardado: paso 5 de la sección 4 revisado
- [ ] Roadmap (`STRINGS.es`/`STRINGS.en` en `index.html`, y CLAUDE.md si aplica) actualizado a `"done"`

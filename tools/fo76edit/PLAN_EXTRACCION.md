# Plan de extracción del ESM — tandas futuras

Qué falta sacar de `SeventySix.esm`, en orden de valor, para seguir subiendo
datos a nivel GAME FILES. **La extracción SIEMPRE corre en la máquina Windows
del usuario con FO76Edit** — no se puede delegar a agentes ni subir el ESM a
GitHub (pesa demasiado y es material con copyright).

## Herramienta única: `ExportGroup.pas`

Exportador genérico que funciona sobre CUALQUIER grupo (no hay que adivinar
nombres de campo: camina todos los elementos). Salida: `group_export.txt`.

**Flujo por cada grupo:**
1. (Grupos grandes) filtrar por nombre o seleccionar pocos registros primero.
2. Seleccionar el grupo/registros → Apply Script → `ExportGroup`.
3. Renombrar `group_export.txt` a algo claro (ej. `ench_export.txt`) y pasarlo.
4. Claude lo parsea y, si hace falta, escribe un exportador CSV dedicado y
   limpio para la extracción final de ese grupo (patrón probado: explorar
   con el genérico → exportador dedicado).

## Tandas por prioridad

### Tanda 1 — HECHA ✅

| Grupo | Signatura | Resultado |
|---|---|---|
| Damage Type | DMGT | `data_damage_types.json` — 7 tipos jugables mapeados a su resistencia (físico→DamageResist, fuego→FireResist, etc.). Confirma el modelo de resistencias de la app. |
| Object Effect | ENCH | 175 efectos legendarios de jugador extraídos (`data_source/legendary_enchantments.json`). Hallazgo: la mecánica de nuestros efectos estrella (Bloodied, Anti-Armor, Vampire, Aristócrata, Junkie) quedó CONFIRMADA contra el ESM, pero el % exacto vive en Curve Tables externas (.ba2). Notas de confianza subidas de "IA-no verificado" a "mecánica GAME FILES-confirmada, número en curva pendiente". Efectos simples (ej. Bleed 5/5s) sí tienen magnitud plana verificada (48 de 175). |

### Tanda 2 — HECHA ✅

| Grupo | Signatura | Resultado |
|---|---|---|
| Ingestible | ALCH | `data_ingestibles.json`: 28 chems clave (Stimpak, RadAway, Rad-X, Med-X, Psycho/Psychobuff/Psychotats, Buffout/Bufftats, Mentats + 3 variantes, Overdrive, Calmex, Fury, X-Cell, Day Tripper, Addictol, Blood Pack ×3, Herbal Medicine, Antibiotics) con magnitud/duración/adicción reales del ESM (flag "No Auto-Calc" confirma que el número es literal, no recalculado). Dump completo de 982 registros ALCH preservado en `data_source/ingestible_dump.txt`. Se filtraron: comida trivial (444 registros, sin buff real), efectos de hambre/sed de Modo Supervivencia (no modelado), y el efecto de sangre condicionado a Blood Sucker (mutación no cubierta). Hallazgo sobre Herbivore/Carnivore: NO hay condición (CTDA) por-ítem en la comida — el 2x es un multiplicador global por keyword de ingrediente (Vegetable/Meat), documentado en `mutation_interaction_note_es/en` del JSON. Listo para usar, aún NO inyectado en la app (mismo estado que `data_damage_types.json`). |
| Actor Value Information | AVIF | `data_avif_glossary.json`: el grupo completo trae 3203 registros (casi todos variables internas del motor, sin relevancia); se extrajeron los 18 que importan — los 7 S.P.E.C.I.A.L. con su descripción real del juego y rango 1-100 a nivel de Actor Value, las 7 resistencias de daño de `data_damage_types.json`, y Salud/Puntos de Acción/Capacidad de Carga. Hallazgo clave: el AVIF confirma que el rango de un SPECIAL es 1-100 (el tope de 15 al crear personaje es una regla de UI/gameplay, no del Actor Value) y que las resistencias no tienen techo fijo — ambos hechos validan el diseño ya existente de `getEffectiveSpecial()` y del cálculo de resistencias. Dump completo (3203 registros) preservado en `data_source/avif_dump.txt`. |

### Tanda 4 — HECHA ✅

| Grupo | Signatura | Resultado |
|---|---|---|
| Object Modification (filtrado, `ExportLegendaryWeaponMods`) | OMOD | `data_legendary_weapon_effects.json` extendido a las 4 estrellas: 117 efectos legendarios de arma únicos (33/17/24/43 por estrella 1-4), cada uno con su estrella confirmada (Attach Point `ap_LegendaryN` + editor_id), nombre real y, cuando el campo `DESC` traía el número en texto humano, la magnitud EXACTA (ej. Bleed 4★ = 25 de daño en 5s, Vampire's 1★ = regenera 2% de salud en 2s — este último resuelve un número que en la Tanda 1 estaba "pendiente de curva"). Para los que no traían `DESC`, se cruzó el enlace `Enchantments`→ENCH contra el dump crudo de la Tanda 1 (`data_source/legendary_enchantments.json`): 8 efectos más recuperaron un valor crudo del ESM. El resto queda como mecánica confirmada, número pendiente (probable Curve Table sin extraer) — mismo criterio de honestidad que siempre. Se excluyeron ~40 registros del export (plantillas `_PARENT_`/`TEMPLATE_`, pruebas `TEST_`/`WIP`/`DEL_`, colecciones de mod de arma única de misión `modcol_`, variantes `_LEGACY` superadas, 1 registro marcado "Objeto no válido") y se fusionaron ~10 pares melee/distancia que son el mismo efecto. Dump crudo completo (164 registros, antes de filtrar) preservado en `data_source/legendary_weapon_mods_dump.txt`. Desbloquea la Fase 3 del roadmap (UI de 4 slots de estrella distinguibles), ya implementada. |

### Tanda 4 (histórico) — Mapeo estrella→efecto de los mods legendarios (para las 4★ de arma)

**Por qué:** ya tenemos los 75 efectos legendarios de arma extraídos del grupo
Object Effect (ENCH) en `data_source/legendary_enchantments.json`, PERO el ENCH
no dice a qué estrella (1★/2★/3★/4★) va cada efecto — eso lo define el **Object
Modification (OMOD)** legendario que referencia al ENCH y ocupa una ranura de
estrella concreta. Falta solo ese mapeo tier→efecto para armar la UI de 4 slots.

| Grupo | Signatura | Para qué | Filtro | Tamaño |
|---|---|---|---|---|
| Object Modification | OMOD | Los mods legendarios de arma, que referencian un ENCH y llevan la ranura de estrella (1/2/3/4) | script dedicado (filtra solo) | Medio |

**Discriminador confirmado (registro de muestra `zzz_mod_Legendary_Weapon4_Bleed`):**
- `Record Flags\Legendary Mod = 1` marca los legendarios.
- El **editor_id** siempre contiene `Legendary_Weapon<N>` (N = estrella 1/2/3/4).
- `DATA\Attach Point = ap_Legendary<N>` confirma la estrella.
- **`DESC` trae el número real** del efecto (ej. "25 de daño durante 5 segundos")
  — para muchos efectos esto da el valor exacto SIN necesitar la Curve Table.
- La propiedad `Enchantments\Value 1` enlaza al `ench_LegendaryWeapon_*` ya
  extraído en la Tanda 1 (cruce directo).

**Flujo (no hace falta filtrar a mano):**
1. En FO76Edit, seleccionar el grupo **Object Modification** entero (o el
   `SeventySix.esm` → Object Modification) → Apply Script →
   **`ExportLegendaryWeaponMods`** (nuevo script: descarta todo lo que no
   contenga `Legendary_Weapon` en el editor_id, así el archivo sale chico).
2. Renombrar `group_export.txt` a `legendary_weapon_mods.txt` y pasarlo.

Con eso mapeo cada efecto a su estrella (por el `<N>` del editor_id / attach
point) y extraigo el número real del `DESC` cuando existe, extendiendo
`data_legendary_weapon_effects.json` a las 4 estrellas — nivel GAME FILES. La UI
de 4 slots distinguibles se hace cuando llegue este dato (Fase 3 del roadmap).

### Tanda 3 — La feature "daño vs enemigo" (fase compleja)

| Grupo | Signatura | Para qué | Muestra | Tamaño |
|---|---|---|---|---|
| Race | RACE | Stats base de tipos de enemigo (vida, resistencias base) | buscar "Scorched" o "SuperMutant" | Grande (filtrar) |
| Non-Player Character (Actor) | NPC_ | Enemigos concretos que referencian una Race + nivel | buscar un jefe conocido | Enorme (filtrar sí o sí) |

**Advertencia sobre enemigos**: en FO76 los enemigos **escalan con el nivel
del jugador**. Su resistencia/vida no suele ser un número fijo en el registro:
puede venir de una curva o calcularse en runtime. El primer dump de una Race
sirve para confirmar si el dato es leíble directo o si está enterrado en el
escalado (lo que definiría cuánto trabajo real implica la feature). Por eso es
Tanda 3 y está marcada como fase propia en el roadmap.

## Grupos que NO vale la pena extraer (por ahora)

- **Curve Table (CURV)**: los datos reales no están en el ESM, apuntan a un
  JSON externo empaquetado en los `.ba2` (haría falta un extractor de BA2).
  CONFIRMADO en Tanda 1: los % exactos de los efectos legendarios estrella
  (Bloodied/Aristócrata/Junkie) y de varios daños elementales viven aquí. Si
  algún día se extrae un BA2, se podrían completar esos números.
- **Perk (PERK)**: los efectos numéricos viven en Spell/Magic Effect
  encadenados; mucha indirección para poco retorno vs. lo que ya tenemos.
- **Weapon/Object Modification**: ya extraídos (armas + plantillas de mods).

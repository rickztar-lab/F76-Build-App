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

### Tanda 4 — Mapeo estrella→efecto de los mods legendarios (para las 4★ de arma)

**Por qué:** ya tenemos los 75 efectos legendarios de arma extraídos del grupo
Object Effect (ENCH) en `data_source/legendary_enchantments.json`, PERO el ENCH
no dice a qué estrella (1★/2★/3★/4★) va cada efecto — eso lo define el **Object
Modification (OMOD)** legendario que referencia al ENCH y ocupa una ranura de
estrella concreta. Falta solo ese mapeo tier→efecto para armar la UI de 4 slots.

| Grupo | Signatura | Para qué | Muestra | Tamaño |
|---|---|---|---|---|
| Object Modification | OMOD | Los mods legendarios de arma, que referencian un ENCH y llevan la ranura de estrella (1/2/3/4) | buscar "mod_Legendary" o "Legendary_Mod" | Medio (filtrar por "Legendary") |

**Flujo:** en FO76Edit, expandir el grupo Object Modification, filtrar por
`Legendary` en el nombre, seleccionar esos registros → Apply Script →
`ExportGroup`. Renombrar `group_export.txt` a `legendary_omod.txt` y pasarlo.
Con eso mapeo cada `ench_LegendaryWeapon_*` a su estrella (probablemente por un
keyword de ranura, un property "Slot Index", o el editor_id del OMOD numerado
por tier) y extiendo `data_legendary_weapon_effects.json` a las 4 estrellas —
mismo nivel de confianza GAME FILES que el resto. La UI de 4 slots
distinguibles se hace cuando llegue este dato (Fase 3 del roadmap interno).

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

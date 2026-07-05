# Fallout 76 Build Planner — Contexto del proyecto

## Qué es esto
App web de un solo archivo (`index.html`) para planear builds de Fallout 76.
Todo corre en el navegador (vanilla JS, sin build step, sin backend).
Persistencia con `localStorage`. Estética terminal Pip-Boy (verde/ámbar sobre
negro, VT323 + JetBrains Mono, scanlines CSS). Bilingüe ES/EN.

## Navegación (estilo Pip-Boy real, pestañas superiores)
- **STAT**: Estado del personaje (Humano/Ghoul, HP%, etc.) → Resumen de solo
  lectura → S.P.E.C.I.A.L. editable → Stats Derivados → Mutaciones
- **INV**: Filtro de arma (incluye armas personalizadas) → Armadura/Power Armor
- **DATA**: Builds guardadas → Roadmap
- **PERKS**: Resumen de cartas equipadas (normales + legendarias), con botón
  para desequipar cada una
- **RAID**: Recomendador de build para Gleaming Depths (5 encuentros)

La columna derecha (Perks Legendarias + grid de Perk Cards) es fija y se ve
siempre sin importar la pestaña activa.

## Archivos de este paquete (flujo de build desde julio 2026)
- `index.html` — **ARTEFACTO GENERADO, NO EDITARLO A MANO.** Lo produce
  `python3 build.py` a partir de la plantilla + los JSON. Cualquier edición
  directa se pierde en el siguiente build.
- `src/index.template.html` — el código real de la app (HTML/CSS/JS/STRINGS).
  Aquí se edita todo lo que no sea datos. Las constantes de datos aparecen
  como marcadores `/*__DATA:NOMBRE__*/`.
- `data_*.json` — **única fuente de verdad de los datos** (`PERKS`,
  `WEAPONS`, `WIKI_WEAPONS`, `PERK_CATEGORIES`, `LEGENDARY_PERKS`,
  `MUTATIONS`, `ARMOR_DATA`, `RAID_CONTENT` en
  `data_raid_gleaming_depths.json`, `LEGENDARY_WEAPON_EFFECTS`,
  `LEGENDARY_ARMOR_EFFECTS`). El mapeo constante→archivo vive en el
  `DATA_MANIFEST` de `build.py`. Ya NO existe la reinyección manual.
- `build.py` — ensambla `index.html` y corre las validaciones (sintaxis JS +
  IDs huérfanos) automáticamente; falla con error si algo está mal.
- `tests/` — suite Playwright (`bash tests/run_all.sh`). Correrla después de
  cualquier cambio; cubre las zonas protegidas y todos los features grandes.
- `GHOUL_ONLY_PERKS` se deriva en runtime de `PERKS` (no es un archivo).

## Fuentes de datos y nivel de confianza
- `data_perks.json` (243), `data_weapons_base.json` (151),
  `data_perk_categories.json`, `data_legendary_perks.json` (26): extraídos de
  archivos reales del juego o verificados contra fallout.fandom.com —
  confiables.
- `data_weapons_wiki.json` (45: pesadas/escopetas faltantes + únicas de
  misión/evento como Pepper Shaker con doble categoría, Elder's Mark, etc.):
  extraído del wiki por Claude — confiable pero marcado "WIKI" en la UI para
  diferenciarlo.
- `data_mutations.json` (19): 7 tienen efecto numérico real conectado al motor
  (Marsupial, Herd Mentality, Egg Head, Eagle Eyes, Adrenal Reaction, Talons,
  Bird Bones); las otras 12 son texto informativo porque no hay curva
  numérica verificada (Scaly Skin, Grounded, Empath, etc. — están marcadas
  "no modelado aún" explícitamente en su descripción).
- `data_armor.json`: 3 sets con números 100% verificados a nivel 50 (Arctic
  Marine, Botsmith, Brotherhood Recon) + 14 sets con solo comparación
  cualitativa (sin número inventado) + mecánica de marco de Power Armor
  verificada (60 DR/ER plano + 7%/pieza daño + 15%/pieza radiación).
- `data_raid_gleaming_depths.json`: 5 encuentros verificados contra
  fallout.fandom.com/wiki/Raid:_Gleaming_Depths. Solo 2 de 5 tienen
  recomendación de perk legendaria **verificada textualmente en la wiki**
  (EN06 Guardian, Ultracite Terror); el resto son tips comunitarios marcados
  como tal, no verificados.
- `data_weapon_damage.json` (90 armas): daño base + cadencia + tiers de
  receptor, extraído del ESM con FO76Edit — **nivel GAME FILES, el más alto**.
  Cruzado por editor_id. Las de daño-base-0 (energía/explosivo) van en
  `base_not_representative` con mensaje honesto, no como "0". Alimenta el
  panel de daño/DPS del arma seleccionada.
- `data_damage_types.json` (7 tipos jugables): mapea cada tipo de daño a su
  resistencia (físico→DamageResist, fuego→FireResist, etc.), extraído del
  grupo Damage Type (DMGT) del ESM — GAME FILES. Confirma el modelo de
  resistencias. Aún NO se inyecta en la app (base para futuras features de
  daño elemental / daño-vs-enemigo); vive como dato listo para usar.
- `data_ingestibles.json` (28 chems clave: Stimpak, RadAway, Rad-X, Med-X,
  Psycho/Psychobuff/Psychotats, Buffout/Bufftats, Mentats + 3 variantes,
  Overdrive, Calmex, Fury, X-Cell, Day Tripper, Addictol, Blood Pack ×3,
  Herbal Medicine, Antibiotics): extraído del grupo Ingestible (ALCH) del
  ESM — GAME FILES. Magnitud/duración/probabilidad de adicción son valores
  literales del registro (flag "No Auto-Calc"). Se excluyeron a propósito:
  comida trivial sin buff (444 de 982 registros), efectos de hambre/sed de
  Modo Supervivencia (no modelado), y el efecto de sangre condicionado a la
  mutación Blood Sucker (no modelado). El bono de Barter de Grape Mentats
  queda en 0 con nota explícita porque su magnitud vive en el Magic Effect
  base, no extraído. Hallazgo importante: el 2x de Herbivore/Carnivore sobre
  comida vegetal/carne NO es una condición por-ítem en el ESM — es un
  multiplicador global por keyword de ingrediente; documentado en el propio
  JSON (`mutation_interaction_note_es/en`). Dump crudo completo (982
  registros) preservado en `data_source/ingestible_dump.txt`. Aún NO se
  inyecta en la app; vive como dato listo para usar (mismo estado que
  `data_damage_types.json`).
- `data_avif_glossary.json`: glosario de Actor Value Information (AVIF) del
  ESM — GAME FILES. El grupo completo tiene 3203 registros, casi todos
  variables internas del motor sin relevancia; se extrajeron solo los 18
  que importan: los 7 S.P.E.C.I.A.L. (con su descripción real del juego en
  español + traducción de Claude marcada como no-oficial, y rango 1-100
  confirmado a nivel de Actor Value), las 7 resistencias de daño de
  `data_damage_types.json`, y Salud/Puntos de Acción/Capacidad de Carga.
  Hallazgo clave: el AVIF confirma que el SPECIAL es 1-100 a nivel de Actor
  Value (el tope de 15 al crear personaje es una regla de UI/gameplay, no
  del AVIF) y que las resistencias no tienen techo fijo — ambos hechos
  validan el diseño ya existente de `getEffectiveSpecial()` y del cálculo
  de resistencias. Dump completo (3203 registros) preservado en
  `data_source/avif_dump.txt`. Aún NO se inyecta en la app.
- `data_legendary_weapon_effects.json` (12, solo 1ra estrella/prefijo):
  **mecánica VERIFICADA contra el ESM** (grupo Object Effect / ENCH): el
  comportamiento coincide con los registros reales del juego. Lo que NO se
  pudo extraer es el % exacto — para los efectos estrella vive en una Curve
  Table (CURV) externa en los `.ba2`. Antes era "IA-no verificado"; ahora es
  "mecánica GAME FILES-confirmada, número exacto pendiente (curva)". La
  extracción cruda completa de los 175 efectos legendarios está preservada en
  `data_source/legendary_enchantments.json`.
- `data_legendary_armor_effects.json` (10): mismo nivel de confianza y mismo
  bloqueo de wiki que el archivo de arriba. Se usa para el efecto legendario
  opcional de cada una de las 5 piezas nombradas de Power Armor (Casco,
  Torso, Brazo izq., Brazo der., Piernas) — es puramente informativo, NO
  alimenta `computeArmorResistances()` porque no hay datos verificados de
  resistencia por pieza/modelo de PA. Los mods por pieza de PA no se
  modelaron (ni siquiera como referencia liviana) por no tener ninguna
  fuente para una lista razonable.

## Decisiones de diseño ya tomadas (no revertir sin preguntar)
1. **Sin imágenes de cartas del juego** (copyright) — 7 iconos SVG originales
   por SPECIAL, reutilizados también en el switchboard de estado.
2. **Filtro arma→carta aproximado**, basado en categoría, con tooltip para
   verificar. 4 cartas SÍ dependen de mods reales y verificados (Scoped-up,
   Smart Shot, Sniper → mira; Mister Sandman → silenciador) — ver
   `MOD_DEPENDENT_PERKS`.
3. **Armas personalizadas**: si el usuario busca un arma no listada, la
   clasifica manualmente y se guarda en `localStorage`
   (`fo76_custom_weapons_v1`), persistente.
4. **Sin conexión en vivo a wikis** — los datos se extraen una vez y se
   hornean como JSON/constantes estáticas (offline-friendly, no se rompe si
   el wiki cambia de formato).
5. **`getEffectiveSpecial()` es la función central** — combina SPECIAL base +
   bono de legendarias SPECIAL (+1/+2/+3/+5 por rango, uncapped para stats
   derivados, capped a 15 para el límite de gasto en cartas) + penalización
   de mutaciones (reducida 25/50/75% si Class Freak está equipado, detectado
   vía `state.perkRanks['Class Freak']`). **Esta función y el sistema de
   guardado/carga de builds se han tratado como "no tocar sin razón" en
   varias iteraciones — cualquier cambio ahí debe ser muy intencional.**
6. **Ghoul**: 25 cartas identificadas por `min_level > 50` (ninguna carta
   humana normal pasa de 50) — dato verificado contra `perks.json` mismo, no
   adivinado. Ver `GHOUL_ONLY_PERKS`.

## Roadmap pendiente (ver también el array `roadmap` dentro de `STRINGS.es`
y `STRINGS.en` en el HTML — esa es la fuente de verdad más actualizada)
1. Motor de reglas dinámico (elegir arma/armadura → build automática).
2. Comparador de 2 builds lado a lado.
3. Inspirado en nukesdragons.com (competencia): switchboard de estado más
   completo (ya empezado — falta conectar HP%/Fed/Hidratado/Equipo/Día-Noche
   a stats reales, hoy solo se guardan), multi-arma (hasta 5, con mods +
   legendario configurables), sets de armadura múltiples guardables, Power
   Armor con mods+legendario por pieza (hoy solo el % del marco), daño de
   salida (DPS) calculado (solo componentes con
   curva verificada, marcado de confianza en la UI, sin inventar números —
   mismo criterio que `armorQualNote`), build compartible vía URL (estado
   codificado en query params, sin backend).
4. **Fuera de alcance por diseño**: explorar/descubrir builds de otros
   usuarios (un feed o buscador de builds comunitarios) — eso sí requeriría
   backend con base de datos. Compartir un build propio vía link (arriba)
   no cuenta: es solo serializar el estado en la URL, la app sigue siendo
   100% local/offline.

## Convenciones de código a seguir
- Todo texto de interfaz pasa por `STRINGS` (es/en) + función `T()` — nunca
  hardcodear texto visible nuevo.
- Nombres/descripciones de perk cards SIEMPRE en inglés (texto oficial del
  juego), en ambos idiomas de interfaz.
- Antes de agregar HTML/CSS/JS nuevo, revisar el patrón de las secciones
  existentes (`.panel`, `.perk-card`, tokens de color en `:root`,
  `tab-panel-group` para contenido por pestaña).
- Después de cualquier cambio: correr `python3 build.py` (regenera
  `index.html` Y valida automáticamente sintaxis JS + IDs huérfanos de
  `getElementById` — hubo un bug real por un ID borrado del HTML que tumbó
  toda la app en silencio) y después `bash tests/run_all.sh` (suite completa
  de navegador). Ambos deben terminar sin error antes de commitear.

## Cómo seguir trabajando
Dile a Claude Code: "Lee CLAUDE.md y luego [tarea]" — con esto no hace falta
re-explicar el proyecto desde cero. Si vas a tocar `getEffectiveSpecial()`,
las mutaciones, o guardar/cargar builds, dilo explícitamente porque el patrón
establecido en este proyecto es tratarlos como protegidos por defecto.

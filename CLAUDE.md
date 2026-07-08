# Fallout 76 Build Planner — Contexto del proyecto

## Qué es esto
App web de un solo archivo (`index.html`) para planear builds de Fallout 76.
Todo corre en el navegador (vanilla JS, sin build step, sin backend).
Persistencia con `localStorage`. Estética terminal Pip-Boy (verde/ámbar sobre
negro, VT323 + JetBrains Mono, scanlines CSS). Bilingüe ES/EN.

## Navegación (sidebar Pip-Boy, 9 secciones — rediseño julio 2026)
Nada queda fijo/siempre-visible: cada sección de la sidebar (`data-tab` /
`data-tabgroup`) muestra solo su propio contenido. Orden real de la nav:
- **STAT**: SPECIAL grid (7 columnas) → Estado del personaje → Efectos
  activos → picker de Perks Legendarias (elegir/rankear las 6) →
  Resistencias → planificador de orden por nivel
- **MUTACIONES**: panel propio (antes vivía dentro de STAT)
- **CHEMS**: referencia de los 28 consumibles extraídos del ESM (solo lectura)
- **ARMAS**: búsqueda/filtro de arma (incluye personalizadas), mods, 4
  estrellas legendarias, loadout de hasta 5 armas, daño/DPS, motor de reglas
- **ARMADURA**: armadura normal + Power Armor (marco + piezas + legendario
  por pieza), sets guardables/comparables
- **PERK CARDS**: el grid completo de las 243 cartas normales (antes era la
  columna fija de la derecha)
- **PERKS**: resumen de cartas equipadas (normales + legendarias) con botón
  para desequipar cada una, + calculadora de Perk Coins
- **DATA**: builds guardadas, comparador, progreso de nivel, roadmap
- **RAID**: recomendador de build para Gleaming Depths (5 encuentros)

## Archivos de este paquete (flujo de build desde julio 2026)
- `index.html` — **ARTEFACTO GENERADO, NO EDITARLO A MANO.** Lo produce
  `python3 build.py` a partir de la plantilla + los JSON. Cualquier edición
  directa se pierde en el siguiente build.
- `src/index.template.html` — el "shell": `<head>`, todo el CSS (`<style>`,
  ~1250 líneas, no partido — el orden de las reglas importa para la cascada
  y partirlo es más riesgo que beneficio) y el HTML del `<body>`. El
  `<script>` real NO vive acá: solo queda el marcador `/*__JS_MODULES__*/`.
- `src/js/NN-nombre.js` — el JS de la app, partido en 10 módulos por
  archivo/función en vez de un solo bloque de ~2800 líneas (así tocar una
  sola pantalla no obliga a leer/cargar el resto). Se concatenan en el
  orden exacto de `JS_MANIFEST` (`build.py`) — es un solo `<script>` de
  siempre, no ES modules, así que el orden importa y todo cae en el mismo
  scope global. Mapa rápido: `01-constants-strings` (marcadores DATA +
  `STRINGS` es/en), `02-state-engine` (`state`, `migrateBuild`,
  `getEffectiveSpecial` — **protegido, ver abajo**), `03-stat-panel`,
  `04-weapons`, `05-rules-perks`, `06-armor`, `07-mutations-chems-legendary`,
  `08-stat-summary-panels`, `09-raid-charstate-nav`,
  `10-builds-and-bootstrap` (guardar/cargar + arranque de la app). Las
  constantes de datos siguen apareciendo como marcadores
  `/*__DATA:NOMBRE__*/` dentro de `01-constants-strings.js`.
- `data_*.json` — **única fuente de verdad de los datos** (`PERKS`,
  `WEAPONS`, `WIKI_WEAPONS`, `PERK_CATEGORIES`, `LEGENDARY_PERKS`,
  `MUTATIONS`, `ARMOR_DATA`, `RAID_CONTENT` en
  `data_raid_gleaming_depths.json`, `LEGENDARY_WEAPON_EFFECTS`,
  `LEGENDARY_ARMOR_EFFECTS`). El mapeo constante→archivo vive en el
  `DATA_MANIFEST` de `build.py`. Ya NO existe la reinyección manual.
- `build.py` — ensambla `index.html` (JS de `src/js/` + datos de
  `data_*.json` inyectados en ese JS ya ensamblado, en ese orden) y corre
  las validaciones (sintaxis JS + IDs huérfanos) automáticamente; falla con
  error si algo está mal o si hay un archivo en `src/js/` sin entrada en
  `JS_MANIFEST`.
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
- `data_leveling_curve.json`: curva de nivel/SPECIAL/cartas — nivel WIKI (no
  viene del ESM, es regla de juego estable cruzada en fallout.wiki y
  fallout.fandom.com). Confirma: 7 SPECIAL al empezar (1 c/u), +1 punto
  libre por nivel del 2 al 50 (49 puntos → 56 total), tope base de 15 por
  stat (coincide con `getEffectiveSpecial()`), 1 carta a elección por nivel
  + Perk Packs de 4 cartas en niveles 4/6/8/10 y cada 5 niveles después,
  fórmula de Perk Coins al escrapear (2×rango, ya modelada). Preparado para
  la futura funcionalidad de "orden óptimo de gasto por nivel" (estilo
  nukesdragons.com); aún NO se inyecta en la app.
- `data_legendary_weapon_effects.json` (117 efectos, las 4 estrellas —
  `tier1_effects`/`tier2_effects`/`tier3_effects`/`tier4_effects`, 33/17/24/43
  respectivamente): extraído del grupo **Object Modification (OMOD)** del ESM
  filtrando por editor_id (`tools/fo76edit/ExportLegendaryWeaponMods.pas`,
  Tanda 4). La estrella de cada efecto es GAME FILES-confirmada (Attach Point
  `ap_LegendaryN` + editor_id). Cuando el propio OMOD trae el número en texto
  humano (`DESC`, ej. "25 de daño durante 5 segundos") el efecto queda
  `verifiedNumber:true` con la magnitud real — esto resolvió varios números
  que en la Tanda 1 estaban "pendientes de curva" (ej. Vampire's 1★ = 2% de
  salud en 2s). Para el resto se cruzó el enlace `Enchantments`→ENCH contra
  el dump crudo de la Tanda 1 (`data_source/legendary_enchantments.json`):
  si esa magnitud no depende de una Curve Table externa se expone como
  "valor crudo del ESM" (`verifiedNumber:false`, unidad interna no
  confirmada). El resto queda como mecánica confirmada, número pendiente
  (Curve Table `.ba2` sin extraer) — mismo criterio de siempre, sin inventar
  el dato. Los 12 efectos ya conocidos (Anti-Armor, Bloodied, etc.) conservan
  su nombre en inglés ya validado; el resto usa un nombre en inglés traducido
  por Claude del texto real en español del ESM, sin cruce contra wiki esta
  sesión (`name`) — el texto real del juego vive en `textEs` cuando no hay
  descripción separada. Se excluyeron ~40 registros del export (plantillas,
  pruebas/WIP, colecciones de mod de arma única de misión, variantes
  `_LEGACY` superadas, 1 "Objeto no válido") y se fusionaron ~10 pares
  melee/distancia que son el mismo efecto. Dump crudo completo (164
  registros) preservado en `data_source/legendary_weapon_mods_dump.txt`; el
  de los 175 ENCH de la Tanda 1 sigue en
  `data_source/legendary_enchantments.json`. Ya inyectado en la app: 4 slots
  de estrella distinguibles en `renderWeaponLegendaryBox()` (arma rápida) y
  `renderWeaponLoadout()` (hasta 5 armas), con persistencia en builds
  guardadas (`weaponLegendaryEffects`, array de 4, migrado automáticamente
  desde el campo singular viejo).
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

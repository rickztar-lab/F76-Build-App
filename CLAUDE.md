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

## Archivos de este paquete
- `index.html` — la app completa. Los datos están embebidos como constantes
  JS dentro del `<script>` (`PERKS`, `WEAPONS`, `WIKI_WEAPONS`,
  `PERK_CATEGORIES`, `LEGENDARY_PERKS`, `MUTATIONS`, `ARMOR_DATA`,
  `RAID_CONTENT`, `GHOUL_ONLY_PERKS`).
- `data_*.json` / `data_mutations.js` — fuentes originales de esos datos, por
  si hay que auditar o regenerar. **Si edito estos archivos, hay que volver a
  inyectarlos manualmente en el `<script>` de `index.html`** (no hay build
  step automático).

## Fuentes de datos y nivel de confianza
- `data_perks.json` (243), `data_weapons_base.json` (151),
  `data_perk_categories.json`, `data_legendary_perks.json` (26): extraídos de
  archivos reales del juego o verificados contra fallout.fandom.com —
  confiables.
- `data_weapons_wiki.json` (45: pesadas/escopetas faltantes + únicas de
  misión/evento como Pepper Shaker con doble categoría, Elder's Mark, etc.):
  extraído del wiki por Claude — confiable pero marcado "WIKI" en la UI para
  diferenciarlo.
- `data_mutations.js` (19): 7 tienen efecto numérico real conectado al motor
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
   Armor con mods+legendario por pieza (hoy solo el % del marco), fila
   completa de resistencias (+Veneno/Fuego/Cryo, Evasion Chance), panel de
   efectos activos en vivo, calculadora de costo en Perk Coins, gráfica de
   progreso de nivel.
4. **Fuera de alcance por diseño**: compartir/explorar builds en comunidad —
   requeriría backend con base de datos, la app es 100% local/offline.

## Convenciones de código a seguir
- Todo texto de interfaz pasa por `STRINGS` (es/en) + función `T()` — nunca
  hardcodear texto visible nuevo.
- Nombres/descripciones de perk cards SIEMPRE en inglés (texto oficial del
  juego), en ambos idiomas de interfaz.
- Antes de agregar HTML/CSS/JS nuevo, revisar el patrón de las secciones
  existentes (`.panel`, `.perk-card`, tokens de color en `:root`,
  `tab-panel-group` para contenido por pestaña).
- Después de cualquier cambio: validar sintaxis (`node --check`) Y validar
  que cada `document.getElementById(...)` referenciado en el JS tenga su
  elemento correspondiente en el HTML (hubo un bug real por esto — un ID
  borrado del HTML pero no de la función que lo referenciaba tumbó toda la
  app en silencio). Grep rápido:
  ```
  python3 -c "
  import re
  content = open('index.html').read()
  ids = set(re.findall(r\"getElementById\('([^']+)'\)\", content))
  missing = [i for i in ids if not re.search(f'id=\"{i}\"', content)]
  print('MISSING:', missing)
  "
  ```

## Cómo seguir trabajando
Dile a Claude Code: "Lee CLAUDE.md y luego [tarea]" — con esto no hace falta
re-explicar el proyecto desde cero. Si vas a tocar `getEffectiveSpecial()`,
las mutaciones, o guardar/cargar builds, dilo explícitamente porque el patrón
establecido en este proyecto es tratarlos como protegidos por defecto.

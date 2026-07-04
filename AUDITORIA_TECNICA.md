# Nota Técnica — Auditoría de Arquitectura y Rumbo del Proyecto
**Fallout 76 Build Planner · Julio 2026**

> Auditoría solicitada por el dueño del proyecto antes de integrar los datos
> extraídos del ESM. Alcance: arquitectura actual, calidad de datos, proceso
> de desarrollo con Claude, comparación con la competencia (nukesdragons.com)
> y con las builds reales de la comunidad, y decisión web vs. app nativa.

---

## 1. Qué es lo que estamos construyendo (resumen ejecutivo)

Un planificador de builds de Fallout 76: el usuario arma su personaje
(S.P.E.C.I.A.L., cartas de perks, legendarias, mutaciones, armas, armadura,
Power Armor) y la app le calcula stats derivados y resistencias, le permite
guardar/comparar builds, y le recomienda cartas según su arma. Todo corre en
el navegador, sin servidor, con persistencia local.

**Estado real medido hoy:**

| Métrica | Valor |
|---|---|
| Tamaño total de `index.html` | 248 KB / 3,737 líneas |
| — Datos incrustados (11 constantes JS) | 129 KB (52%) |
| — Lógica JS | 84 KB (34%) |
| — CSS | 25 KB (10%) |
| — HTML | ~10 KB (4%) |
| Funciones top-level | 47 |
| Ítems del roadmap completados | 10 de 12 |
| Armas con daño base verificado del ESM (pipeline nuevo) | 103+ de 196 |

---

## 2. Veredicto general

**La arquitectura inicial fue la correcta para lo que era el proyecto, y la
disciplina de datos es su mayor activo — mejor que la de la mayoría de
herramientas comunitarias.** Pero el proyecto acaba de cruzar un umbral: con
el pipeline de extracción del ESM dejó de ser "una página con datos copiados"
y se convirtió en una herramienta con fuente de datos primaria (los mismos
archivos del juego que usa nukesdragons). La arquitectura de archivo único
con datos incrustados a mano fue perfecta para la fase 1, y empieza a ser el
freno para la fase que viene. No hay que tirar nada: hay que separar datos de
código **antes** de integrar el daño de armas, no después.

---

## 3. Lo que está bien (y no hay que tocar)

1. **El sistema de niveles de confianza de datos.** Marcar en la UI qué es
   dato de archivos del juego, qué es wiki, qué es conocimiento de IA sin
   verificar, y qué directamente "no está modelado" — es una decisión de
   diseño excepcional. nukesdragons no le dice al usuario de dónde salen sus
   números; esta app sí. Es el diferenciador honesto del proyecto. Con el
   pipeline del ESM ahora corresponde agregar el nivel más alto:
   **"GAME FILES (ESM)"**, por encima de "verificado contra wiki".
2. **Cero dependencias, cero build, offline-first.** Para un proyecto de
   aprendizaje esto elimina el 80% de las cosas que suelen salir mal
   (toolchains rotos, dependencias desactualizadas, hosting caído). Abres el
   archivo y funciona. No cambiar esta propiedad *del producto final* — la
   propuesta de abajo la conserva.
3. **CLAUDE.md + QA_CHECKLIST.md como memoria del proyecto.** La práctica de
   documentar decisiones, zonas protegidas (`getEffectiveSpecial()`,
   guardado de builds) y checklist de regresión es exactamente cómo se
   trabaja bien con Claude en sesiones largas. Mantener y seguir alimentando.
4. **El pipeline FO76Edit.** Fue la decisión estratégica más importante del
   proyecto: en vez de depender de wikis bloqueadas o inventar números, ahora
   los datos salen de `SeventySix.esm` directamente. Ya produjo: daño base de
   103+ armas, bonos reales de receptores (Tier 1 +25%, Tier 2 +35%), daño
   crítico (+50%), penetración de armadura (+25), conversiones elementales, y
   cadencia (`Attack Delay Seconds`). Esto pone al proyecto en igualdad de
   fuente de datos con la competencia.

---

## 4. Hallazgos (de mayor a menor severidad)

### H1 — Los datos viven copiados a mano dentro del código *(el hallazgo principal)*
El 52% del archivo son constantes JS que duplican los `data_*.json`, con la
regla de "si edito el JSON tengo que reinyectarlo a mano en el `<script>`".
Con 3 archivos de datos era tolerable; hoy hay 10, más un pipeline de CSVs
del ESM que va a producir más. Cada reinyección manual es una oportunidad de
desincronizar el JSON del HTML sin que nadie lo note (no hay ningún chequeo
que los compare). **Es el punto de falla silenciosa más probable del
proyecto y el freno directo para integrar las 103+ armas nuevas.**

### H2 — Riesgo de inyección de HTML antes de construir "build vía URL" (#9)
Los nombres de builds, sets de armadura y armas personalizadas que escribe el
usuario se insertan en el DOM vía `innerHTML` sin escapar (ej. `${b.name}` en
`renderBuildsList`). Hoy el riesgo es bajo (solo te afectas a ti mismo, todo
es local). **Pero el ítem pendiente #9 (build compartible vía URL) lo
convierte en riesgo real**: un link malicioso podría inyectar HTML/JS en el
navegador de quien lo abra. Regla: **antes** de implementar #9, agregar una
función `escapeHtml()` y usarla en todo string controlado por el usuario.

### H3 — Las pruebas de navegador se escribieron y se tiraron
Durante el desarrollo se escribieron pruebas Playwright reales (guardar/
cargar builds, loadout, PA por pieza, comparador, motor de reglas) que
encontraron al menos un bug real (paneles sin refrescar). Viven en `/tmp` y
se pierden con cada sesión. Son un activo del proyecto: deben vivir en el
repo (`tests/`) para poder re-ejecutarlas después de cada cambio.

### H4 — El pipeline de extracción no está en el repo
Los scripts `.pas` de FO76Edit y los CSVs extraídos están en carpetas
temporales y subidas de chat. Si se pierde esta conversación, se pierde el
"cómo" de la extracción. Deben commitearse (`tools/fo76edit/` + los CSVs
crudos + un README con el procedimiento paso a paso que ya validamos).

### H5 — Builds guardadas sin número de versión de esquema
Ya hicimos una migración ad-hoc (`migratePAPieceSlots` para el formato viejo
de Power Armor). Cada cambio futuro al formato repetirá el patrón. Formalizar:
campo `schemaVersion` en cada build guardada + una única función `migrate()`
que aplique migraciones en orden. Barato hoy, caro después.

### H6 — Todo el trabajo vive en una rama lateral
`main` sigue en el commit inicial ("Add files via upload"); los 18 commits de
trabajo están en `claude/lee-claude-md-1n7b0z`. Conviene consolidar a `main`
en cada hito estable (vía Pull Request), y que `main` sea siempre "la última
versión que funciona".

### H7 — Menores
- CSVs del ESM llegan en codificación Windows (Latin-1): los acentos se ven
  como `�`. Se resuelve decodificando en el pipeline (ya identificado).
- Clave duplicada `eqUnequip` en `STRINGS.en` (resto inofensivo de una
  edición vieja).
- `renderAll()` reconstruye toda la UI con `innerHTML` en cada clic. A la
  escala actual es correcto y simple (así funciona bien); solo documentarlo
  como decisión consciente. **No** migrar a un framework por esto.

---

## 5. Lo que las builds reales de la comunidad nos enseñan

Referencias revisadas: los dos videos compartidos —
["The Ultimate Raid Build For 2026"](https://www.youtube.com/watch?v=VTEwmw_08QA)
y ["Infinite VATS / High DPS Pepper Shaker Build"](https://youtu.be/LL5zvgGbyL4)
— y el [planner de nukesdragons](https://nukesdragons.com/fallout-76/character).

Las builds serias de la comunidad giran alrededor de **tres economías**:
1. **Economía de VATS/AP** — costo de acción por disparo, regeneración de AP.
2. **Economía de crítico** — llenado del medidor, daño crítico multiplicado.
3. **Multiplicadores de daño apilados** — efecto legendario (Bloodied, etc.)
   × receptor × perks × mutaciones × consumibles.

Nuestra app ya modela perks, legendarias, mutaciones y (ahora) tiene los
datos crudos de las tres economías: el ESM nos dio `AttackActionPointCost`,
`CriticalDamageMult` y `DamageBonusMult` con números reales. **La
convergencia es exacta: lo que falta para que la app sirva para planear las
builds que la gente realmente hace es justamente integrar lo que acabamos de
extraer.** El rumbo es correcto; no hay que pivotar de producto, solo de
cimientos técnicos (H1).

Lo que queda explícitamente fuera y está bien que así sea: feed de builds
comunitarias (falloutbuilds.com ya existe; requeriría backend). El ítem #9
(compartir por URL) cubre el caso personal sin servidor.

---

## 6. ¿Web o app nativa (Android/iOS)?

**Recomendación clara: seguir en web, y convertirla en PWA. No migrar a
nativo.** Razones:

1. **La app no necesita nada del teléfono.** No usa cámara, GPS, push,
   sensores ni archivos del sistema. Es una calculadora con datos estáticos:
   el caso ideal de la web.
2. **PWA te da el 90% de "app instalada" gratis.** Con un `manifest.json` y
   un service worker (~30 líneas), la página se instala en el home screen de
   Android/iOS, abre a pantalla completa sin barra de navegador y funciona
   100% offline. Para el usuario se siente app; para ti sigue siendo el mismo
   HTML.
3. **Nativo duplicaría el costo de todo sin dar nada a cambio.** Otro
   lenguaje, otro toolchain, cuenta de Apple Developer (99 USD/año), revisión
   de tiendas por cada update. Para un proyecto de aprendizaje de una
   persona, es la forma más rápida de matarlo.
4. **No cierra ninguna puerta.** Si algún día el proyecto explota y de verdad
   quieres estar en las tiendas, herramientas como **Capacitor** empaquetan
   la web app existente como app de tienda casi sin cambios. La decisión
   "web ahora" preserva la opción "nativo después"; la inversa no.
5. **La prueba de mercado ya existe:** nukesdragons — el líder del nicho — es
   solo web, y le funciona.

Complemento recomendado: **publicar en GitHub Pages** (hosting gratuito
directo desde el repo). Le da al proyecto una URL real que puedes abrir desde
el teléfono y compartir con tu equipo de juego — y es requisito práctico para
que compartir builds por URL (#9) tenga sentido.

---

## 7. Propuestas

### Propuesta A — "Fuente modular, producto de un solo archivo" ★ Recomendada
Conserva el producto (un `index.html` autocontenido y offline) pero arregla
la fuente. En orden:

1. **Separar datos del código.** Los `data_*.json` pasan a ser la única
   fuente de verdad. Un script de build de ~40 líneas (Python o Node, sin
   dependencias) toma una plantilla `src/index.template.html` + los JSON y
   genera el `index.html` final. Se acabó la reinyección manual (H1).
2. **Commitear el pipeline del ESM** (H4): `tools/fo76edit/*.pas`, CSVs
   crudos en `data_source/`, y un `EXTRACCION.md` con el procedimiento.
3. **Commitear las pruebas Playwright** (H3) en `tests/` con un script para
   correrlas todas.
4. **`escapeHtml()` en todo string de usuario** (H2) — bloqueante antes de #9.
5. **`schemaVersion` + `migrate()` en builds guardadas** (H5).
6. **PWA + GitHub Pages** (§6).
7. Recién entonces, **integrar el daño de armas del ESM** (el siguiente
   feature real): nueva constante generada desde el CSV curado, cálculo
   `daño = base × (1 + ΣDamageBonusMult)`, etiqueta "GAME FILES" en la UI,
   y de ahí el DPS con marcado de confianza (destrabando el ítem #11).

*Esfuerzo estimado: 2–3 sesiones de trabajo con Claude. Riesgo: bajo (cada
paso es reversible y verificable con las pruebas del paso 3).*

### Propuesta B — A + modularizar también la lógica JS
Partir los 84 KB de lógica en módulos (`src/js/*.js`) que el mismo script de
build concatena. Hacerlo **solo si** después de la Propuesta A el archivo
sigue creciendo hasta volverse incómodo (~500 KB+ o cuando las sesiones de
Claude gasten demasiado contexto navegándolo). No antes: cada partición
agrega fricción de navegación para ti.

### Propuesta C — Migrar a framework (React/Svelte/Vue + TypeScript) ✗ No recomendada ahora
Sería la respuesta "de libro" de un equipo profesional, y sería un error
aquí: meses de reescritura sin ninguna feature nueva, un toolchain entre tú y
el código justo cuando estás aprendiendo, y la interactividad de la app
(clics → recálculo → re-render) no exige nada que vanilla JS no esté haciendo
bien. Reevaluar únicamente si el proyecto gana usuarios reales y colaboradores.

---

## 8. Orden de ejecución sugerido (si apruebas la Propuesta A)

| # | Acción | Por qué en este orden |
|---|---|---|
| 1 | Pruebas Playwright al repo | Red de seguridad para todo lo demás |
| 2 | Separación datos/código + script de build | El cimiento; todo lo que sigue lo usa |
| 3 | Pipeline ESM al repo + re-export en inglés | Congela el trabajo de extracción ya hecho |
| 4 | escapeHtml + schemaVersion | Deuda barata de pagar ya |
| 5 | Integrar daño de armas (feature) | Sobre cimientos nuevos, no sobre los viejos |
| 6 | PWA + GitHub Pages | Producto usable desde el teléfono |
| 7 | Build vía URL (#9) | Ya con escapeHtml resuelto |
| 8 | DPS calculado (#11) | La cima: ya con datos y cimientos |

---

## 9. Referencias

- [nukesdragons — Character Build Planner](https://nukesdragons.com/fallout-76/character)
- [The Ultimate Raid Build For 2026 — Fallout 76 (YouTube)](https://www.youtube.com/watch?v=VTEwmw_08QA)
- [Infinite VATS & High DPS Pepper Shaker Build (YouTube)](https://youtu.be/LL5zvgGbyL4)
- [FalloutBuilds.com](https://www.falloutbuilds.com/fo76/builds) — referencia
  de lo que queda fuera de alcance (feed comunitario con backend)

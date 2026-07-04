# Fallout 76 Build Planner

Planificador de builds de Fallout 76 que corre 100% en el navegador (vanilla
JS, sin backend). Estética terminal Pip-Boy, bilingüe ES/EN, persistencia en
`localStorage`. Instalable como PWA y usable offline.

**Datos de armas/armadura extraídos directamente de los archivos del juego**
(`SeventySix.esm` vía FO76Edit), con niveles de confianza marcados en la UI:
GAME FILES > WIKI > IA-no-verificado > no-modelado. Nunca se inventa un
número: si no hay dato verificado, se dice explícitamente.

## Uso

Abrir `index.html` en cualquier navegador. No requiere servidor ni conexión.

## Desarrollo

`index.html` es un **artefacto generado**. No editarlo a mano.

| Qué querés cambiar | Dónde |
|---|---|
| Código / UI / textos (STRINGS) | `src/index.template.html` |
| Datos (perks, armas, armadura, etc.) | los `data_*.json` de la raíz |

Después de cualquier cambio:

```bash
python3 build.py        # regenera index.html + valida sintaxis JS e IDs huérfanos
bash tests/run_all.sh   # suite de navegador (requiere Playwright + Chromium)
```

Ambos deben terminar sin error antes de commitear. Ver `CLAUDE.md` (contexto
del proyecto y decisiones de diseño) y `QA_CHECKLIST.md` (checklist de QA).

## Extracción de datos del juego

El pipeline validado (scripts de FO76Edit + procedimiento) está en
`tools/fo76edit/`. Ver `tools/fo76edit/EXTRACCION.md`. Los CSVs crudos
exportados viven en `data_source/`.

## Deploy en GitHub Pages

La app es estática: se sirve tal cual desde la raíz del repo.

1. En GitHub: **Settings → Pages → Build and deployment**.
2. **Source**: *Deploy from a branch*.
3. **Branch**: la rama a publicar (ej. `main`), carpeta `/ (root)`. Guardar.
4. A los minutos queda en `https://<usuario>.github.io/<repo>/`.

El service worker (`sw.js`) cachea el shell para funcionamiento offline una
vez visitada. `.github/workflows/build-check.yml` verifica en cada push que
`index.html` esté sincronizado con la plantilla y los datos.

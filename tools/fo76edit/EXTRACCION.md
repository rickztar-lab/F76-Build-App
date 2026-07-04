# Extracción de datos desde SeventySix.esm con FO76Edit

Procedimiento validado en julio 2026 para extraer datos reales del juego
(daño base de armas, bonos de mods, etc.) directamente del archivo maestro,
sin depender de wikis (bloqueadas por anti-bot) ni de JSON de terceros.

**Regla de oro: solo LECTURA.** Nunca guardar cambios en el ESM desde
FO76Edit, y nunca correr estas herramientas con el juego abierto.

## Herramientas

- **FO76Edit** (familia xEdit, versión usada: 4.1.5f x64) — de Nexus Mods.
  Instalar fuera de `Program Files` (ej. `C:\Modding\FO76Edit\`).
- Juego instalado por Steam. Ruta típica del ESM:
  `C:\Program Files (x86)\Steam\steamapps\common\Fallout76\Data\SeventySix.esm`
- **Idioma**: cambiar el juego a inglés en Steam (Propiedades → General →
  Idioma) antes de exportar, para que los nombres (`FULL`) salgan en inglés
  y crucen directo contra nuestros `data_*.json`. El primer export
  (`weapons_export_es.csv`) se hizo en español; el re-export en inglés está
  pendiente.

## Procedimiento

1. Abrir `FO76Edit.exe` → tildar solo `SeventySix.esm` → esperar a que
   termine el "background loading" completo antes de tocar nada.
2. Copiar los scripts `.pas` de esta carpeta a la carpeta `Edit Scripts`
   de FO76Edit.
3. En el árbol izquierdo, clic en el **grupo** a exportar (no en un registro
   individual, salvo para pruebas) → clic derecho → **Apply Script...** →
   elegir el script.
4. El CSV/TXT de salida queda junto al `.exe` de FO76Edit.
5. **Siempre probar primero sobre 1 registro conocido** (ej. `10mmSMG`,
   FormID `0010DB0F`) antes de correr sobre un grupo completo.

## Scripts

| Script | Grupo objetivo | Salida | Qué extrae |
|---|---|---|---|
| `ExportWeaponsToCSV.pas` | Weapon | `weapons_export.csv` | editor_id, nombre, Base Damage, Secondary Damage, Capacity, Ammo/shot, Attack Delay, peso, valor, flag de Object Template |
| `ExportGenericMods.pas` | Object Modification | `generic_mods_export.csv` | Las ~37 plantillas `_PARENT_mod_WEAPON_GENERIC_*` con todas sus Properties (target, función, valores, curve table) |
| `DumpRecordStructure.pas` | cualquier registro | `record_structure_dump.txt` | Volcado recursivo de la estructura completa de un registro — para explorar tipos de registro nuevos antes de escribir un exportador |

## Trampas del intérprete de scripts (JvInterpreter) — aprendidas a golpes

- **No existe** `AssignFile`/`Rewrite`/`WriteLn`/`CloseFile` → usar
  `TStringList` + `.SaveToFile()`.
- `IntToHex(FormID(e), 8)` da **Type mismatch** → evitar FormID; el
  `editor_id` alcanza como clave.
- `EditorID(e)` devuelve **vacío** en este build → usar
  `GetElementEditValues(e, 'EDID')`.
- Las Properties de un OMOD están en **`DATA\Properties`**, no en
  `Properties` a secas.
- Para leer el valor de un elemento hoja: **`GetEditValue(e)`**, no
  `GetElementEditValues(e, '')`.
- La salida de texto sale en **Windows-1252**; convertir a UTF-8 al
  incorporarla al repo (los CSVs de `data_source/` ya están convertidos).

## Hallazgos estructurales clave (para no re-descubrirlos)

- El **daño base** de un arma SÍ está en el WEAP: `DNAM\Base Damage`
  (aparece al final del DNAM — al principio creímos que no existía por no
  scrollear). La cadencia se deriva de `Attack Delay Seconds`
  (disparos/seg ≈ 1/valor; 0 en armas melee).
- Los **receptores de daño** por arma (`mod_XXX_Receiver_Damage`) NO llevan
  el número: agregan una keyword de nomenclatura (`dn_HasReceiver_*`, solo
  para el nombre del ítem) y **heredan** de plantillas genéricas
  compartidas vía `Includes`.
- Las plantillas genéricas (`_PARENT_mod_WEAPON_GENERIC_*`) tienen los
  números reales, iguales para todas las armas: `Damage_Tier1` =
  DamageBonusMult **+0.25**, `Damage_Tier2` = **+0.35**, crítico
  (`CritDMG_*`) = CriticalDamageMult **+0.50**, perforación = ArmorPenetration
  **+25**, conversiones elementales con splits fijos (ej. Energy_Split2:
  −40% físico / +60% energía).
- Fórmula: `daño_final = BaseDamage × (1 + Σ DamageBonusMult de mods)`.
  Verificación de cordura: 10mm SMG = 7 base; con receptor Tier 1 → 8.75.
- Las **Curve Tables** (registros CURV) NO contienen los datos: apuntan a un
  JSON externo (`JASF - JSON File Path`) empaquetado en los `.ba2`. Solo las
  usan los mods elementales "Split3" (veneno/fuego). Extraerlas requeriría
  un extractor de BA2 (ej. Bethesda Archive Extractor) — pendiente, no
  bloquea el cálculo principal.
- El registro AMMO tiene `Damage = 0` (no aporta) y el PROJ es solo
  físico/visual: el daño vive en WEAP + OMODs, punto.

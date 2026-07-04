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

### Tanda 1 — Alto valor, bajo riesgo (empezar aquí)

| Grupo (nombre en el árbol) | Signatura | Para qué | Muestra para probar | Tamaño |
|---|---|---|---|---|
| Object Effect | ENCH | Verificar efectos legendarios de arma/armadura (hoy "IA-no verificado") → subir a GAME FILES | FormID `001F4425` (enchModArmorPenetration) | Medio |
| Damage Type | DMGT | Definiciones de tipos de daño (físico/energía/fuego/cryo/veneno) — base del sistema de daño y del daño elemental | FormID `00060A82` (dtFire) | Chico |

### Tanda 2 — Alto valor, complejidad media

| Grupo | Signatura | Para qué | Muestra | Tamaño |
|---|---|---|---|---|
| Ingestible | ALCH | Comida/chems/consumibles y sus buffs — la "economía de consumibles" de las builds serias | buscar "Nuka" o "Stimpak" | Grande (filtrar) |
| Actor Value Information | AVIF | Definiciones de stats (DamageResist, EnergyResist, etc.) — glosario para interpretar resistencias | buscar "DamageResist" | Medio |

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
- **Perk (PERK)**: los efectos numéricos viven en Spell/Magic Effect
  encadenados; mucha indirección para poco retorno vs. lo que ya tenemos.
- **Weapon/Object Modification**: ya extraídos (armas + plantillas de mods).

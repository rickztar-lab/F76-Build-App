// Cubre los dos cambios del ítem A4 de la auditoría:
//  1) esc() neutraliza HTML en nombres controlados por el usuario (defensa
//     para "build compartible vía URL").
//  2) migrateBuild() carga una build con esquema VIEJO (formato paPieces
//     plano, sin schemaVersion, sin campos nuevos) sin romper la UI.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    // 1) Inyección de HTML en nombre de build ---------------------------
    await page.evaluate(() => {
      const builds = loadBuilds();
      builds.push({ schemaVersion: 1, name: '<img src=x onerror="window.__pwned=1">',
        special: {Strength:1,Perception:1,Endurance:1,Charisma:1,Intelligence:1,Agility:1,Luck:1} });
      saveBuilds(builds);
      renderBuildsList();
    });
    await page.waitForTimeout(200);
    const pwned = await page.evaluate(() => window.__pwned === 1);
    assert(!pwned, 'el nombre malicioso NO ejecuta JS (esc lo neutraliza)');
    const noImg = await page.evaluate(() => document.querySelector('#buildsList img') === null);
    assert(noImg, 'no se creó un elemento <img> a partir del nombre');
    const shownEscaped = await page.$eval('#buildsList .bname', el => el.textContent);
    assert(shownEscaped.includes('<img'), 'el nombre se muestra como texto literal, escapado');

    // 2) Carga de build con esquema viejo -------------------------------
    await page.evaluate(() => {
      // Formato pre-refactor: paPieces numérico (no paPieceSlots), sin
      // schemaVersion, sin weaponLoadout/weaponLegendaryEffect.
      const builds = loadBuilds();
      builds.push({
        name: 'LegacyBuild',
        pool: 56,
        special: {Strength:5,Perception:3,Endurance:7,Charisma:1,Intelligence:2,Agility:4,Luck:6},
        perkRanks: {},
        charLevel: 40,
        usingPA: true,
        paPieces: 3
      });
      saveBuilds(builds);
      renderBuildsList();
    });
    await page.waitForTimeout(200);

    await clickTab(page, 'DATA');
    const loadButtons = await page.$$('#buildsList button[data-act="load"]');
    // La legacy es la última que agregamos.
    await loadButtons[loadButtons.length - 1].click();
    await page.waitForTimeout(300);

    const migrated = await page.evaluate(() => ({
      end: state.special.Endurance,
      level: state.charLevel,
      paCount: Object.values(state.paPieceSlots || {}).filter(Boolean).length,
      loadoutIsArray: Array.isArray(state.weaponLoadout),
      loadoutLen: (state.weaponLoadout || []).length,
      hasOldField: 'paPieces' in state
    }));
    assert(migrated.end === 7 && migrated.level === 40, 'la build vieja carga sus valores base');
    assert(migrated.paCount === 3, 'paPieces:3 (formato viejo) migra a 3 piezas instaladas');
    assert(migrated.loadoutIsArray && migrated.loadoutLen === 5, 'weaponLoadout faltante recibe default de 5 slots');
    assert(!migrated.hasOldField, 'el estado vivo no arrastra el campo viejo paPieces');

    const jsOkAfter = await page.evaluate(() => !!document.getElementById('statSummaryBox'));
    assert(jsOkAfter, 'la UI sigue viva tras cargar una build de esquema viejo');
  });
  finish('test_security_migration');
})();

// Selector de efecto legendario de arma (1ra estrella): elegir arma,
// asignar efecto, guardar build, recargar página, cargar build y verificar
// que el efecto persiste.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await clickTab(page, 'ARMAS');

    await page.fill('#weaponSearchInput', '10mm Pistol');
    await page.waitForTimeout(200);
    const results = await page.$$('.weapon-result-item');
    assert(results.length > 0, 'la búsqueda de arma devuelve resultados');
    await results[0].click();
    await page.waitForTimeout(200);

    const legBoxHTML = await page.$eval('#weaponLegendaryBox', el => el.innerHTML);
    assert(legBoxHTML.includes('weaponLegendarySelect'), 'aparece el selector de efecto legendario');

    await page.selectOption('#weaponLegendarySelect', 'anti_armor');
    await page.waitForTimeout(200);
    const noteText = await page.$eval('#weaponLegendaryBox', el => el.textContent);
    // La nota ahora refleja: mecánica verificada contra el ESM, % exacto en curva.
    assert(/curve table|curve|curva/i.test(noteText) && /mec|mech/i.test(noteText),
      'la nota de confianza (mecánica verificada, número en curva) es visible');

    await clickTab(page, 'DATA');
    await page.fill('#buildNameInput', 'SmokeTestBuild');
    await page.click('#saveBuildBtn');
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForTimeout(300);
    await clickTab(page, 'DATA');
    const loadBtn = await page.$('button[data-act="load"]');
    assert(!!loadBtn, 'la build guardada aparece tras recargar');
    await loadBtn.click();
    await page.waitForTimeout(300);

    await clickTab(page, 'ARMAS');
    const restored = await page.$eval('#weaponLegendarySelect', el => el.value);
    assert(restored === 'anti_armor', 'el efecto legendario persiste tras guardar/recargar/cargar');
  });
  finish('test_weapon_legendary');
})();

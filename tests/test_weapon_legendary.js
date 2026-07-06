// Selector de efectos legendarios de arma (4 estrellas, Tanda 4): elegir
// arma, asignar un efecto por estrella, guardar build, recargar página,
// cargar build y verificar que las 4 estrellas persisten.
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
    const starSelects = await page.$$('#weaponLegendaryBox select[data-star]');
    assert(starSelects.length === 4, `aparecen los 4 selectores de estrella (${starSelects.length})`);
    assert(/1★/.test(legBoxHTML) && /4★/.test(legBoxHTML), 'las 4 insignias de estrella (1★..4★) están presentes');

    // 1★: efecto ya conocido (headline, número pendiente de curva).
    await page.selectOption('select[data-star="0"]', 'anti_armor');
    await page.waitForTimeout(200);
    const tier1Text = await page.$eval('#weaponLegendaryBox', el => el.textContent);
    assert(/pendiente|pending/i.test(tier1Text), 'Anti-Armor (1★) se muestra como número pendiente (curva)');

    // 4★: al menos un efecto de la Tanda 4 debe traer número YA verificado.
    const tier4Value = await page.$eval('select[data-star="3"] option:nth-child(2)', el => el.value);
    await page.selectOption('select[data-star="3"]', tier4Value);
    await page.waitForTimeout(200);

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
    const restored1 = await page.$eval('select[data-star="0"]', el => el.value);
    const restored4 = await page.$eval('select[data-star="3"]', el => el.value);
    assert(restored1 === 'anti_armor', 'el efecto de 1★ persiste tras guardar/recargar/cargar');
    assert(restored4 === tier4Value, 'el efecto de 4★ persiste tras guardar/recargar/cargar');

    // Las estrellas intermedias sin elegir deben seguir vacías (no se
    // arrastra el valor de otra estrella por error).
    const mid2 = await page.$eval('select[data-star="1"]', el => el.value);
    const mid3 = await page.$eval('select[data-star="2"]', el => el.value);
    assert(mid2 === '' && mid3 === '', '2★/3★ sin elegir quedan vacías tras la recarga');
  });
  finish('test_weapon_legendary');
})();

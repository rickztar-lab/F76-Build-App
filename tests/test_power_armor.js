// Power Armor por pieza: instalar 3 piezas nombradas (7%/pieza daño,
// 15%/pieza radiación verificados => 21%/45%), asignar legendario al torso,
// verificar que la pestaña STAT refleja los totales (bug real corregido en
// su momento), y persistencia completa vía guardar/recargar/cargar.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await clickTab(page, 'INV');
    await page.click('#usePowerArmorToggle');
    await page.waitForTimeout(200);

    const boxes = await page.$$('input[data-pa-piece]');
    assert(boxes.length === 5, 'hay 5 piezas nombradas de PA');

    await page.click('input[data-pa-piece="helmet"]');
    await page.waitForTimeout(100);
    await page.click('input[data-pa-piece="torso"]');
    await page.waitForTimeout(100);
    await page.click('input[data-pa-piece="legs"]');
    await page.waitForTimeout(150);

    const totals = await page.$eval('#armorTotalsBox', el => el.textContent);
    assert(totals.includes('21%'), '3 piezas => 21% reducción de daño (7%/pieza verificado)');
    assert(totals.includes('45%'), '3 piezas => 45% reducción de radiación (15%/pieza verificado)');
    assert(totals.includes('60'), 'marco = 60 DR/ER planos (verificado)');

    const torsoSel = await page.$('select[data-pa-leg="torso"]');
    assert(!!torsoSel, 'la pieza instalada muestra selector de legendario');
    await torsoSel.selectOption('bolstering');
    await page.waitForTimeout(150);

    await clickTab(page, 'STAT');
    const stat = await page.$eval('#statSummaryBox', el => el.textContent);
    assert(stat.includes('21%'), 'la pestaña STAT refleja los totales de PA (regresión del bug de refresco)');

    await clickTab(page, 'DATA');
    await page.fill('#buildNameInput', 'PATestBuild');
    await page.click('#saveBuildBtn');
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForTimeout(300);
    await clickTab(page, 'DATA');
    await (await page.$('button[data-act="load"]')).click();
    await page.waitForTimeout(300);

    await clickTab(page, 'INV');
    assert(await page.$eval('input[data-pa-piece="helmet"]', el => el.checked), 'casco persiste instalado');
    assert(await page.$eval('input[data-pa-piece="torso"]', el => el.checked), 'torso persiste instalado');
    assert(!(await page.$eval('input[data-pa-piece="rightArm"]', el => el.checked)), 'brazo derecho persiste NO instalado');
    assert((await page.$eval('select[data-pa-leg="torso"]', el => el.value)) === 'bolstering',
      'legendario del torso persiste');
  });
  finish('test_power_armor');
})();

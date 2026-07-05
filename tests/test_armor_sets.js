// Sets de armadura guardados: guardar 2 sets, comparar (números verificados
// reales: Arctic Marine chest DR 67, Botsmith chest DR 75), cargar,
// duplicar y borrar.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await clickTab(page, 'ARMADURA');

    await page.selectOption('select[data-armor-slot="chest"]', 'arctic_marine');
    await page.waitForTimeout(150);
    await page.fill('#armorSetNameInput', 'Set A - Arctic');
    await page.click('#saveArmorSetBtn');
    await page.waitForTimeout(200);

    await page.selectOption('select[data-armor-slot="chest"]', 'botsmith');
    await page.waitForTimeout(150);
    await page.fill('#armorSetNameInput', 'Set B - Botsmith');
    await page.click('#saveArmorSetBtn');
    await page.waitForTimeout(200);

    const list = await page.$eval('#armorSetsList', el => el.innerHTML);
    assert(list.includes('Set A - Arctic') && list.includes('Set B - Botsmith'), 'ambos sets listados');

    const cmp = await page.$eval('#armorSetsCompareBox', el => el.innerHTML);
    assert(cmp.includes('armorSetCompareA'), 'el comparador aparece con 2+ sets');

    await page.selectOption('#armorSetCompareA', '0');
    await page.selectOption('#armorSetCompareB', '1');
    await page.waitForTimeout(150);
    const result = await page.$eval('#armorSetCompareResult', el => el.textContent);
    assert(result.includes('67'), 'comparación muestra DR 67 (Arctic Marine, verificado)');
    assert(result.includes('75'), 'comparación muestra DR 75 (Botsmith, verificado)');

    const loadButtons = await page.$$('#armorSetsList button[data-act="load"]');
    await loadButtons[1].click();
    await page.waitForTimeout(200);
    assert((await page.$eval('select[data-armor-slot="chest"]', el => el.value)) === 'botsmith',
      'cargar Set B aplica botsmith al torso');

    await (await page.$$('#armorSetsList button[data-act="dup"]'))[0].click();
    await page.waitForTimeout(200);
    assert((await page.$$('#armorSetsList .build-item')).length === 3, 'duplicar deja 3 sets');

    await (await page.$$('#armorSetsList button[data-act="del"]'))[2].click();
    await page.waitForTimeout(200);
    assert((await page.$$('#armorSetsList .build-item')).length === 2, 'borrar vuelve a 2 sets');
  });
  finish('test_armor_sets');
})();

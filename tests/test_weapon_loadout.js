// Loadout de armas (5 slots): agregar 2 armas, configurar mod + legendario
// por slot, guardar build, recargar, cargar, verificar persistencia, y
// quitar un slot vuelve al buscador vacío.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await clickTab(page, 'ARMAS');

    assert(!!(await page.$('#weaponLoadoutBox')), 'el panel de loadout existe');

    const slot0 = await page.$('.loadout-search-input[data-slot="0"]');
    await slot0.fill('Fat Man');
    await page.waitForTimeout(200);
    let r0 = await page.$$('[data-slot-results="0"] .weapon-result-item');
    assert(r0.length > 0, 'slot 0 encuentra "Fat Man"');
    await r0[0].click();
    await page.waitForTimeout(200);

    const slot1 = await page.$('.loadout-search-input[data-slot="1"]');
    await slot1.fill('10mm Pistol');
    await page.waitForTimeout(200);
    let r1 = await page.$$('[data-slot-results="1"] .weapon-result-item');
    assert(r1.length > 0, 'slot 1 encuentra "10mm Pistol"');
    await r1[0].click();
    await page.waitForTimeout(200);

    // The checkbox itself is visually hidden (chip pattern styles the label,
    // not the native input) — click the label, like a real user would.
    const mod0Label = await page.$('label.mod-chip:has(input[data-mod="scope"][data-slot="0"])');
    await mod0Label.click();
    await (await page.$('select[data-slot-leg="0"]')).selectOption('bloodied');
    await page.waitForTimeout(200);

    await clickTab(page, 'DATA');
    await page.fill('#buildNameInput', 'LoadoutTestBuild');
    await page.click('#saveBuildBtn');
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForTimeout(300);
    await clickTab(page, 'DATA');
    await (await page.$('button[data-act="load"]')).click();
    await page.waitForTimeout(300);

    await clickTab(page, 'ARMAS');
    const html = await page.$eval('#weaponLoadoutBox', el => el.innerHTML);
    assert(html.includes('Fat Man'), 'slot 0 (Fat Man) persiste tras recargar/cargar');
    assert(html.includes('10mm Pistol'), 'slot 1 (10mm Pistol) persiste tras recargar/cargar');
    assert(await page.$eval('input[data-mod="scope"][data-slot="0"]', el => el.checked),
      'el mod (mira) del slot 0 persiste');
    assert((await page.$eval('select[data-slot-leg="0"]', el => el.value)) === 'bloodied',
      'el legendario (Bloodied) del slot 0 persiste');

    await page.click('[data-remove-slot="0"]');
    await page.waitForTimeout(200);
    const after = await page.$eval('#weaponLoadoutBox', el => el.innerHTML);
    assert(after.includes('loadout-search-input') && after.includes('data-slot="0"'),
      'quitar el slot 0 lo devuelve a buscador vacío');
  });
  finish('test_weapon_loadout');
})();

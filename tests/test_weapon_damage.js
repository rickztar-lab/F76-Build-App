// Daño de arma verificado del ESM (ítem A5): un arma con daño verificado
// muestra el número real, la fórmula del receptor aplica el +25%/+35%
// correcto, un arma sin dato muestra el fallback honesto, y la selección de
// receptor persiste vía guardar/recargar/cargar.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await clickTab(page, 'INV');

    // --- Verificación matemática directa de la fórmula ---
    const math = await page.evaluate(() => {
      const gauss = computeWeaponDamage('Gauss Pistol', null);
      const gaussT1 = computeWeaponDamage('Gauss Pistol', 'tier1');
      const gaussT2 = computeWeaponDamage('Gauss Pistol', 'tier2');
      const missing = computeWeaponDamage('10mm Pistol', null);
      return { base: gauss && gauss.base, t1: gaussT1 && gaussT1.final, t2: gaussT2 && gaussT2.final, missing };
    });
    // Gauss Pistol base = 48 (verificado en el CSV). +25% = 60, +35% = 64.8
    assert(math.base === 48, 'Gauss Pistol daño base = 48 (verificado del ESM)');
    assert(Math.abs(math.t1 - 60) < 0.01, 'receptor Tier 1: 48 × 1.25 = 60');
    assert(Math.abs(math.t2 - 64.8) < 0.01, 'receptor Tier 2: 48 × 1.35 = 64.8');
    assert(math.missing === null, 'arma sin dato verificado devuelve null (no inventa)');

    // --- UI: arma con daño ---
    await page.fill('#weaponSearchInput', 'Gauss Pistol');
    await page.waitForTimeout(200);
    await (await page.$$('.weapon-result-item'))[0].click();
    await page.waitForTimeout(200);
    let dbox = await page.$eval('#weaponDamageBox', el => el.textContent);
    assert(dbox.includes('GAME FILES'), 'muestra la etiqueta de confianza GAME FILES');
    assert(dbox.includes('48'), 'muestra el daño base 48 en la UI');

    await page.selectOption('#weaponReceiverSelect', 'tier2');
    await page.waitForTimeout(150);
    dbox = await page.$eval('#weaponDamageBox', el => el.textContent);
    assert(dbox.includes('64.8'), 'al elegir Tier 2 la UI muestra 64.8');

    // --- Persistencia del receptor ---
    await clickTab(page, 'DATA');
    await page.fill('#buildNameInput', 'DamageTestBuild');
    await page.click('#saveBuildBtn');
    await page.waitForTimeout(200);
    await page.reload();
    await page.waitForTimeout(300);
    await clickTab(page, 'DATA');
    await (await page.$('button[data-act="load"]')).click();
    await page.waitForTimeout(300);
    await clickTab(page, 'INV');
    assert((await page.$eval('#weaponReceiverSelect', el => el.value)) === 'tier2',
      'el receptor Tier 2 persiste tras guardar/recargar/cargar');

    // --- UI: arma sin dato ---
    await page.click('#clearWeaponBtn');
    await page.waitForTimeout(150);
    await page.fill('#weaponSearchInput', '10mm Pistol');
    await page.waitForTimeout(200);
    await (await page.$$('.weapon-result-item'))[0].click();
    await page.waitForTimeout(200);
    const noneBox = await page.$eval('#weaponDamageBox', el => el.textContent);
    assert(noneBox.toLowerCase().includes('sin daño') || noneBox.toLowerCase().includes('no game'),
      'arma sin dato muestra el mensaje de fallback honesto');
  });
  finish('test_weapon_damage');
})();

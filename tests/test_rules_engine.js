// Motor de reglas: con un arma elegida y SPECIAL amplio, generar build
// automática. Invariantes duras: ninguna carta equipada excede el
// presupuesto SPECIAL (specialSpent <= capped), toda carta equipada es
// compatible con el arma, y la prioridad de armadura elige el set
// matemáticamente correcto entre los verificados (Brotherhood Recon domina
// DR; Arctic Marine es el único con Cryo).
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await clickTab(page, 'ARMAS');

    const before = await page.$eval('#rulesEngineBox', el => el.textContent);
    assert(before.trim().length > 0, 'sin arma: muestra nota de "elige un arma primero"');

    await page.evaluate(() => {
      state.special = { Strength: 8, Perception: 8, Endurance: 8, Charisma: 8, Intelligence: 8, Agility: 8, Luck: 8 };
      state.pool = 56;
    });

    await page.fill('#weaponSearchInput', '10mm Pistol');
    await page.waitForTimeout(200);
    await (await page.$$('.weapon-result-item'))[0].click();
    await page.waitForTimeout(200);

    assert((await page.$eval('#rulesEngineBox', el => el.innerHTML)).includes('rulesEngineGenerateBtn'),
      'con arma elegida aparece el botón de generar');

    await page.click('#rulesEngineGenerateBtn');
    await page.waitForTimeout(200);

    const s1 = await page.evaluate(() => ({
      count: Object.keys(state.perkRanks).length,
      armor: state.armorSlots
    }));
    assert(s1.count > 0, `equipa cartas compatibles (${s1.count})`);
    assert(s1.armor.chest === 'brotherhood_recon', 'prioridad física elige Brotherhood Recon (mayor DR verificada)');

    const budgetOk = await page.evaluate(() => {
      const eff = getEffectiveSpecial();
      return SPECIAL_LIST.every(s => specialSpent(s.key) <= eff[s.key].capped);
    });
    assert(budgetOk, 'ningún atributo SPECIAL excede su presupuesto');

    const allCompatible = await page.evaluate(() =>
      Object.keys(state.perkRanks).every(name => perkMatchesWeapon(name, state.selectedWeapon)));
    assert(allCompatible, 'toda carta equipada es compatible con el arma');

    await page.selectOption('#rulesEngineArmorPrioritySelect', 'cryo');
    await page.click('#rulesEngineGenerateBtn');
    await page.waitForTimeout(200);
    const s2 = await page.evaluate(() => state.armorSlots);
    assert(s2.chest === 'arctic_marine', 'prioridad Cryo elige Arctic Marine (único set con Cryo verificado)');
  });
  finish('test_rules_engine');
})();

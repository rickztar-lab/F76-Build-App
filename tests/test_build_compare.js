// Comparador de 2 builds: guardar 2 builds con Endurance/nivel distintos,
// comparar, verificar HP calculados exactos (250 + 5*END) y que comparar
// NO muta el estado vivo.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await page.evaluate(() => { state.special.Endurance = 7; state.charLevel = 25; renderAll(); });
    await page.waitForTimeout(150);
    await clickTab(page, 'DATA');
    await page.fill('#buildNameInput', 'CompareBuildA');
    await page.click('#saveBuildBtn');
    await page.waitForTimeout(150);

    await page.evaluate(() => { state.special.Endurance = 3; state.charLevel = 80; });
    await page.fill('#buildNameInput', 'CompareBuildB');
    await page.click('#saveBuildBtn');
    await page.waitForTimeout(200);

    const cmp = await page.$eval('#buildCompareBox', el => el.innerHTML);
    assert(cmp.includes('buildCompareASelect'), 'el comparador aparece con 2+ builds');

    await page.selectOption('#buildCompareASelect', '0');
    await page.selectOption('#buildCompareBSelect', '1');
    await page.waitForTimeout(150);

    const t = await page.$eval('#buildCompareResult', el => el.textContent);
    assert(t.includes('CompareBuildA') && t.includes('CompareBuildB'), 'ambas builds nombradas');
    assert(t.includes('285'), 'HP 285 exacto para Build A (END 7: 250+35)');
    assert(t.includes('265'), 'HP 265 exacto para Build B (END 3: 250+15)');

    const liveEnd = await page.evaluate(() => state.special.Endurance);
    assert(liveEnd === 3, 'comparar no muta el estado vivo (Endurance sigue en 3)');
  });
  finish('test_build_compare');
})();

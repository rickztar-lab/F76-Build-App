// Panel de Chems (referencia de consumibles del ESM): la sección existe, agrupa
// los 28 chems en "buffs de SPECIAL" vs "curación/utilidad", y muestra la
// magnitud REAL del dato extraído (Psychobuff +3 FUERZA, Stimpak restablece
// salud). Es solo lectura: no debe tocar el estado del build.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await clickTab(page, 'CHEMS');

    const box = await page.$('#chemsBox');
    assert(!!box, 'el panel de chems existe');

    const txt = await page.$eval('#chemsBox', el => el.textContent);
    assert(txt.includes('Psychobuff'), 'lista un chem conocido (Psychobuff)');
    assert(/\+3\s+(FUERZA|STRENGTH)/.test(txt),
      'muestra el buff de SPECIAL real (Psychobuff +3 FUE)');
    assert(txt.includes('Stimpak'), 'lista un chem de curación (Stimpak)');

    // Los 28 chems deben renderizarse (12 con SPECIAL + 16 sin).
    const cardCount = await page.$$eval('#chemsBox .chem-card', els => els.length);
    assert(cardCount === 28, `renderiza los 28 chems (${cardCount})`);

    const spCards = await page.$$eval('#chemsBox .chem-sp-chip', els => els.length);
    assert(spCards > 0, 'hay chips de buff de SPECIAL en ámbar');

    // Solo lectura: no debe haber tocado el SPECIAL vivo.
    const strBefore = await page.evaluate(() => state.special.Strength);
    assert(strBefore === 1, 'el panel de chems no muta el SPECIAL vivo');
  });
  finish('test_chems');
})();

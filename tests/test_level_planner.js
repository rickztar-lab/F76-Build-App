// Planificador de orden por nivel: dado un build objetivo, el cronograma debe
// (1) equipar cada carta en un nivel >= su min_level, (2) nunca subir un SPECIAL
// por encima de su objetivo, (3) colocar TODAS las cartas objetivo, (4) alcanzar
// el SPECIAL objetivo, y (5) respetar el presupuesto de puntos por atributo en
// cada paso. Es una verificación de las invariantes del algoritmo + del render.
const { assert, withPage, finish, clickTab } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    await page.evaluate(() => {
      state.special.Strength = 6;   // objetivo FUE 6
      state.special.Luck = 5;       // objetivo SUE 5
      // Arms Keeper (FUE, min 28, R2 cost 2), Blocker (FUE, min 21, R1 cost 1)
      state.perkRanks = { "Arms Keeper": 2, "Blocker": 1 };
      renderAll();
    });
    await page.waitForTimeout(150);

    const check = await page.evaluate(() => {
      const res = computeLevelPlan();
      const target = { Strength: 6, Luck: 5 };
      const minLevels = { "Arms Keeper": 28, "Blocker": 21 };

      // Reconstruir cur y equippedCost paso a paso para validar invariantes.
      const cur = {}; SPECIAL_LIST.forEach(s => cur[s.key] = 1);
      const spent = {}; SPECIAL_LIST.forEach(s => spent[s.key] = 0);
      let budgetOk = true, minLevelOk = true, overTargetOk = true;
      const equipped = new Set();

      for(const e of res.plan){
        if(e.raiseStat){
          cur[e.raiseStat]++;
          if(cur[e.raiseStat] > (state.special[e.raiseStat])) overTargetOk = false;
        }
        if(e.card){
          if(e.level < minLevels[e.card.name]) minLevelOk = false;
          spent[e.card.special] += e.card.cost;
          if(spent[e.card.special] > cur[e.card.special]) budgetOk = false;
          equipped.add(e.card.name);
        }
      }
      const allCardsPlaced = equipped.has("Arms Keeper") && equipped.has("Blocker");
      const strReached = cur.Strength === 6;
      const lckReached = cur.Luck === 5;
      return { rows: res.plan.length, budgetOk, minLevelOk, overTargetOk,
               allCardsPlaced, strReached, lckReached, stranded: res.stranded.length };
    });

    assert(check.rows > 0, 'el planificador produce un cronograma');
    assert(check.minLevelOk, 'cada carta se equipa en un nivel >= su min_level');
    assert(check.overTargetOk, 'ningún SPECIAL supera su objetivo');
    assert(check.budgetOk, 'en cada paso los puntos del atributo alcanzan las cartas');
    assert(check.allCardsPlaced, 'todas las cartas objetivo quedan colocadas');
    assert(check.stranded === 0, 'ninguna carta queda sin colocar');
    assert(check.strReached && check.lckReached, 'el cronograma alcanza el SPECIAL objetivo');

    // El render en el DOM muestra la tabla.
    await clickTab(page, 'DATA');
    const html = await page.$eval('#levelPlanBox', el => el.innerHTML);
    assert(html.includes('lvp-table'), 'la tabla del planificador se renderiza');
    assert(html.includes('Arms Keeper'), 'la carta objetivo aparece en la tabla');

    // Build vacío → mensaje de ayuda, no tabla.
    await page.evaluate(() => {
      SPECIAL_LIST.forEach(s => state.special[s.key] = 1);
      state.perkRanks = {};
      renderAll();
    });
    await page.waitForTimeout(150);
    const emptyHtml = await page.$eval('#levelPlanBox', el => el.innerHTML);
    assert(!emptyHtml.includes('lvp-table'), 'build vacío no muestra tabla (muestra ayuda)');
  });
  finish('test_level_planner');
})();

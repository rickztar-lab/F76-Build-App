// Caso fijo de QA_CHECKLIST.md sección 3 para getEffectiveSpecial():
// Intelligence base 5 + Legendary Intelligence rango 3 (+3) + Marsupial
// (-4 INT). Caso A sin Class Freak (raw=4), Caso B con Class Freak rango 2
// (raw=6). Valida ambas rutas de invocación: sin argumentos (estado vivo)
// y con `src` explícito (la que usa el comparador de builds).
const { assert, withPage, finish } = require('./helpers');

(async () => {
  await withPage(async (page) => {
    const r = await page.evaluate(() => {
      state.special.Intelligence = 5;
      state.legendaryPerks = [{ name: 'Legendary Intelligence', rank: 3 }, null, null, null, null, null];
      state.activeMutations = ['marsupial'];
      state.perkRanks['Class Freak'] = 0;

      const effA = getEffectiveSpecial();
      const caseA = { raw: effA.Intelligence.raw, capped: effA.Intelligence.capped };

      state.perkRanks['Class Freak'] = 2;
      const effB = getEffectiveSpecial();
      const caseB = { raw: effB.Intelligence.raw, capped: effB.Intelligence.capped };

      const effASrc = getEffectiveSpecial({
        special: { Intelligence: 5, Strength: 1, Perception: 1, Endurance: 1, Charisma: 1, Agility: 1, Luck: 1 },
        perkRanks: { 'Class Freak': 0 },
        legendaryPerks: [{ name: 'Legendary Intelligence', rank: 3 }, null, null, null, null, null],
        activeMutations: ['marsupial']
      });
      const caseASrc = { raw: effASrc.Intelligence.raw, capped: effASrc.Intelligence.capped };

      return { caseA, caseB, caseASrc };
    });

    assert(r.caseA.raw === 4 && r.caseA.capped === 4, 'Caso A (sin Class Freak): raw=4 capped=4');
    assert(r.caseB.raw === 6 && r.caseB.capped === 6, 'Caso B (Class Freak rango 2): raw=6 capped=6');
    assert(r.caseASrc.raw === 4 && r.caseASrc.capped === 4, 'Caso A vía src explícito coincide con el estado vivo');
  });
  finish('test_effective_special');
})();

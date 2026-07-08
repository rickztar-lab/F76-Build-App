function renderStatSummary(){
  const t = T();
  document.getElementById('txt-h-summary').textContent = t.hSummary;
  const box = document.getElementById('statSummaryBox');

  // Resistances (DEF): real numbers from the shared computeArmorResistances()
  // (same source of truth the ARMOR tab uses — see renderArmorPanel). The
  // SPECIAL list, status bar and derived-stat duplication that used to live
  // here were removed: those now live in the build bar + the 7-column grid.
  const armorRes = computeArmorResistances();
  const defStatsHtml = armorRes.usingPA ? `
    <div class="pb-def-row">
      <div class="pb-def-stat"><div class="ss-lbl">DR/ER</div><div class="ss-val">${armorRes.flatDrEr}</div></div>
      <div class="pb-def-stat"><div class="ss-lbl">${state.lang==='es'?'REDUCC. DAÑO':'DMG REDUCTION'}</div><div class="ss-val">${armorRes.dmgPct}%</div></div>
      <div class="pb-def-stat"><div class="ss-lbl">${state.lang==='es'?'REDUCC. RAD.':'RAD REDUCTION'}</div><div class="ss-val">${armorRes.radPct}%</div></div>
    </div>
    <div class="summary-empty">${t.defPaCryoNote}</div>
  ` : `
    <div class="pb-def-row">
      <div class="pb-def-stat"><div class="ss-lbl">${t.defDR}</div><div class="ss-val">${armorRes.dr}</div></div>
      <div class="pb-def-stat"><div class="ss-lbl">${t.defER}</div><div class="ss-val">${armorRes.er}</div></div>
      <div class="pb-def-stat"><div class="ss-lbl">${t.defRR}</div><div class="ss-val">${armorRes.rr}</div></div>
      <div class="pb-def-stat"><div class="ss-lbl">${t.defCryo}</div><div class="ss-val">${armorRes.cryo}</div></div>
    </div>
    <div class="summary-empty">${t.defCryoNote}</div>
  `;
  box.innerHTML = `
    ${defStatsHtml}
    <div class="summary-empty">${t.defNote}</div>
    <div class="summary-sub">${t.defUnmodeledTitle}</div>
    <div class="summary-empty">${t.defUnmodeledNote}</div>
  `;

  // Feed the build bar's DMG RESIST tile (physical DR: flat DR/ER under PA,
  // else the summed armor DR). Same source, one place.
  const drTile = document.getElementById('statDR');
  if(drTile){ drTile.textContent = armorRes.usingPA ? armorRes.flatDrEr : armorRes.dr; }
}

function renderEquippedSummary(){
  const t = T();
  document.getElementById('txt-h-equipped').textContent = t.hEquipped;
  const box = document.getElementById('equippedSummaryBox');

  // Group equipped normal perk cards by SPECIAL (reads state.perkRanks,
  // same source of truth the main perk grid uses — no separate state).
  const groups = {};
  for(const key of SPECIAL_LIST.map(s=>s.key)) groups[key] = [];
  for(const p of PERKS){
    const rank = state.perkRanks[p.name] || 0;
    if(rank > 0) groups[p.special].push({name: p.name, rank, maxRank: p.ranks.length});
  }

  let html = '';
  const anyEquipped = Object.values(groups).some(g => g.length > 0);
  if(!anyEquipped){
    html += `<div class="summary-empty">${t.eqNoneNormal}</div>`;
  } else {
    for(const s of SPECIAL_LIST){
      const cards = groups[s.key];
      if(cards.length === 0) continue;
      html += `
        <div class="eq-special-group">
          <div class="eq-special-header">
            <div class="pc-icon"><svg><use href="#ic-${s.key}"></use></svg></div>
            <div class="eq-title">${t.special[s.key]}</div>
            <div class="eq-count">${t.eqCardsCount(cards.length)}</div>
          </div>
          <div class="eq-card-list">
            ${cards.map(c => `
              <div class="eq-card-item">
                <span class="eq-name">${c.name}</span>
                <span class="eq-rank">${t.rank} ${c.rank}/${c.maxRank}</span>
                <button class="eq-unequip" data-unequip-perk="${c.name.replace(/"/g,'&quot;')}">${t.eqUnequip}</button>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  // Legendary perks section
  html += `<div class="eq-special-group"><div class="eq-special-header"><div class="eq-title">${t.eqLegendaryTitle}</div></div><div class="eq-card-list">`;
  const equippedLegendary = state.legendaryPerks
    .map((lp, idx) => lp ? {...lp, slotIdx: idx} : null)
    .filter(Boolean);
  if(equippedLegendary.length === 0){
    html += `<div class="summary-empty">${t.eqNoneLegendary}</div>`;
  } else {
    html += equippedLegendary.map(lp => `
      <div class="eq-card-item eq-legendary-item">
        <span class="eq-name">${lp.name}</span>
        <span class="eq-rank">${t.rank} ${lp.rank}/4</span>
        <button class="eq-unequip" data-unequip-legendary="${lp.slotIdx}">${t.eqUnequip}</button>
      </div>`).join('');
  }
  html += `</div></div>`;

  box.innerHTML = html;

  box.querySelectorAll('[data-unequip-perk]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      delete state.perkRanks[btn.dataset.unequipPerk];
      renderAll();
    });
  });
  box.querySelectorAll('[data-unequip-legendary]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.unequipLegendary);
      state.legendaryPerks[idx] = null;
      renderAll();
    });
  });
}

// Perk Coins cost calculator: for each equipped legendary perk, sums the
// remaining LEGENDARY_RANKUP_COSTS tiers between its current rank and rank 4
// (e.g. rank 2 needs costs[1]+costs[2] = 100+150 = 250 to max out). Only
// covers the coins-cost half of the roadmap item — no XP/levels-needed
// calculator here, since there's no verified XP-per-level curve in this
// app's data to compute that from.
function renderPerkCoinsCalculator(){
  const t = T();
  document.getElementById('txt-h-perkcoins').textContent = t.hPerkCoins;
  document.getElementById('txt-perkcoins-note').textContent = t.perkCoinsNote;
  const box = document.getElementById('perkCoinsBox');

  const equippedLegendary = state.legendaryPerks
    .map((lp, idx) => lp ? {...lp, slotIdx: idx} : null)
    .filter(Boolean);

  if(equippedLegendary.length === 0){
    box.innerHTML = `<div class="summary-empty">${t.eqNoneLegendary}</div>`;
    return;
  }

  let total = 0;
  const rows = equippedLegendary.map(lp => {
    const remaining = LEGENDARY_RANKUP_COSTS.slice(lp.rank - 1).reduce((a,b)=>a+b, 0);
    total += remaining;
    const costLabel = remaining > 0 ? t.pcToMax(remaining) : t.pcMaxed;
    return `
      <div class="eq-card-item">
        <span class="eq-name">${lp.name}</span>
        <span class="eq-rank">${t.rank} ${lp.rank}/4</span>
        <span class="eq-rank" style="color:var(--green);">${costLabel}</span>
      </div>`;
  }).join('');

  box.innerHTML = `
    <div class="eq-card-list">${rows}</div>
    <div class="eq-card-item" style="margin-top:8px;border-top:1px solid var(--line);padding-top:8px;">
      <span class="eq-name" style="font-weight:bold;color:var(--amber);">${t.pcTotal}</span>
      <span class="eq-rank" style="color:var(--amber);font-weight:bold;">${total}</span>
    </div>`;
}

// Live active-effects panel: pure read/aggregation of existing state, no new
// state fields. Pulls together active mutations (same source + Class Freak
// reduction tag as the mutations block in renderStatSummary), equipped
// normal perk cards (state.perkRanks cross-referenced against PERKS for
// name/rank/description), and equipped legendary perks (state.legendaryPerks)
// into one glanceable list. Card names/descriptions stay in English
// (official game text) regardless of UI language, same as everywhere else.
function renderLiveEffectsPanel(){
  const t = T();
  document.getElementById('txt-h-liveeffects').textContent = t.hLiveEffects;
  const box = document.getElementById('liveEffectsBox');
  const eff = getEffectiveSpecial();

  // Active mutations
  let html = `<div class="summary-sub">${t.summaryMutationsActive}</div>`;
  if(state.activeMutations.length === 0){
    html += `<div class="summary-empty">${t.summaryNoneActive}</div>`;
  } else {
    html += '<div class="summary-list">';
    for(const key of state.activeMutations){
      const mut = MUTATIONS.find(m=>m.key===key);
      if(!mut) continue;
      const posText = state.lang==='es' ? mut.positive.textEs : mut.positive.textEn;
      const negText = state.lang==='es' ? mut.negative.textEs : mut.negative.textEn;
      const reducedTag = eff._extra.classFreakRank > 0 ? `<span class="sl-tag">(${t.summaryReducedTag} ${Math.round(eff._extra.reduction*100)}%)</span>` : '';
      html += `<div class="sl-item">${mut.name}${reducedTag}<span class="sl-desc">▲ ${posText} / ▼ ${negText}</span></div>`;
    }
    html += '</div>';
  }

  // Equipped normal perk cards, cross-referenced against PERKS for
  // name/rank/description (same source of truth as the perk grid and
  // renderEquippedSummary — no separate state).
  html += `<div class="summary-sub">${t.leNormalTitle}</div>`;
  const equippedNormal = PERKS.reduce((acc, p) => {
    const rank = state.perkRanks[p.name] || 0;
    if(rank > 0){
      const rankData = p.ranks.find(r => r.rank === rank) || p.ranks[p.ranks.length - 1];
      acc.push({ name: p.name, rank, maxRank: p.ranks.length, desc: rankData ? rankData.desc : '' });
    }
    return acc;
  }, []);
  if(equippedNormal.length === 0){
    html += `<div class="summary-empty">${t.eqNoneNormal}</div>`;
  } else {
    html += '<div class="summary-list">';
    for(const c of equippedNormal){
      html += `<div class="sl-item">${c.name} <span class="sl-tag">${t.rank} ${c.rank}/${c.maxRank}</span><span class="sl-desc">${c.desc}</span></div>`;
    }
    html += '</div>';
  }

  // Equipped legendary perks
  html += `<div class="summary-sub">${t.summaryLegendaryEquipped}</div>`;
  const equippedLegendary = state.legendaryPerks.filter(Boolean);
  if(equippedLegendary.length === 0){
    html += `<div class="summary-empty">${t.summaryNoneEquipped}</div>`;
  } else {
    html += '<div class="summary-list">';
    for(const lp of equippedLegendary){
      html += `<div class="sl-item">${lp.name} — ${t.rank} ${lp.rank}/4</div>`;
    }
    html += '</div>';
  }

  box.innerHTML = html;
}


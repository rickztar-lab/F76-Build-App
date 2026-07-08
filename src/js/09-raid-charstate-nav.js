function renderRaidPanel(){
  const t = T();
  document.getElementById('txt-h-raid').textContent = t.hRaid;
  document.getElementById('txt-raid-note').textContent = t.raidNote;
  const box = document.getElementById('raidEncountersBox');

  box.innerHTML = RAID_CONTENT.map(enc => {
    const mechanic = state.lang === 'es' ? enc.mechanicEs : enc.mechanicEn;
    const source = state.lang === 'es' ? enc.legendaryPerksSourceEs : enc.legendaryPerksSourceEn;
    const community = state.lang === 'es' ? enc.communityTipEs : enc.communityTipEn;
    const perksHtml = enc.legendaryPerks.length
      ? enc.legendaryPerks.map(p => `<span class="rc-perk-chip">${p}</span>`).join('')
      : `<span class="summary-empty">${t.raidNoLegendary}</span>`;
    const weaponLabel = t.weaponTipLabels[enc.weaponTip] || enc.weaponTip;
    const enemyLabel = t.enemyTypeLabels[enc.enemyType] || enc.enemyType;
    return `
      <div class="raid-card">
        <div class="rc-head">
          <span class="rc-order">${enc.order}</span>
          <span class="rc-name">${enc.name}</span>
          <span class="rc-enemy-badge">${enemyLabel}</span>
        </div>
        <div class="rc-mechanic">${mechanic}</div>
        <div class="rc-mechanic"><strong>${t.raidWeaponTip}</strong> ${weaponLabel}</div>
        <div class="rc-perks">${perksHtml}</div>
        <div class="rc-source">${enc.legendaryPerks.length ? '✓ ' + source : ''}</div>
        <div class="rc-community">${community}</div>
        <button class="rc-apply-btn" data-raid-apply="${enc.key}" ${enc.legendaryPerks.length===0?'disabled':''}>${t.raidApply}</button>
      </div>`;
  }).join('');

  box.querySelectorAll('[data-raid-apply]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const enc = RAID_CONTENT.find(e=>e.key===btn.dataset.raidApply);
      if(!enc) return;
      // Fill legendary slots with the recommended perks, only into slots
      // that are currently unlocked at the player's level; doesn't touch
      // SPECIAL, normal perks, mutations, weapon, or armor selections.
      const unlockedCount = LEGENDARY_SLOT_LEVELS.filter(lvl => state.charLevel >= lvl).length;
      let slotIdx = 0;
      for(const perkName of enc.legendaryPerks){
        while(slotIdx < 6 && state.legendaryPerks[slotIdx] !== null) slotIdx++;
        if(slotIdx >= unlockedCount || slotIdx >= 6) break;
        state.legendaryPerks[slotIdx] = {name: perkName, rank: 1};
        slotIdx++;
      }
      btn.textContent = t.raidApplied;
      renderAll();
    });
  });
}

function renderCharStatePanel(){
  const t = T();
  document.getElementById('txt-h-charstate').textContent = t.hCharState;
  const box = document.getElementById('charStateBox');
  const cs = state.charState;

  box.innerHTML = `
    <div class="cs-grid">
      <button class="cs-toggle-btn ${!cs.isGhoul?'on':''}" data-cs-toggle="isGhoul" data-cs-value="false">${t.csHuman}</button>
      <button class="cs-toggle-btn ${cs.isGhoul?'on':''}" data-cs-toggle="isGhoul" data-cs-value="true">${t.csGhoul}</button>
      <button class="cs-toggle-btn ${!cs.inTeam?'on':''}" data-cs-toggle="inTeam" data-cs-value="false">${t.csSolo}</button>
      <button class="cs-toggle-btn ${cs.inTeam?'on':''}" data-cs-toggle="inTeam" data-cs-value="true">${t.csInTeam}</button>
      <button class="cs-toggle-btn ${!cs.isNight?'on':''}" data-cs-toggle="isNight" data-cs-value="false">${t.csDay}</button>
      <button class="cs-toggle-btn ${cs.isNight?'on':''}" data-cs-toggle="isNight" data-cs-value="true">${t.csNight}</button>
      <button class="cs-toggle-btn ${cs.wellFed?'on':''}" data-cs-bool="wellFed">${t.csWellFed}</button>
      <button class="cs-toggle-btn ${cs.wellHydrated?'on':''}" data-cs-bool="wellHydrated">${t.csWellHydrated}</button>
    </div>
    <div class="cs-slider-row">
      <div class="cs-label"><span>${t.csHpPercent}</span><span class="cs-val">${cs.hpPercent}%</span></div>
      <input type="range" id="csHpSlider" min="1" max="100" value="${cs.hpPercent}">
    </div>
    <div class="cs-number-row">
      <span class="cs-label">${t.csAddictions}</span>
      <input type="number" id="csAddictionsInput" min="0" value="${cs.addictions}">
    </div>
    <div class="cs-number-row">
      <span class="cs-label">${t.csCaps}</span>
      <input type="number" id="csCapsInput" min="0" step="50" value="${cs.caps}">
    </div>
    <div class="mut-note">${t.csPendingNote}</div>
  `;

  box.querySelectorAll('[data-cs-toggle]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.charState[btn.dataset.csToggle] = btn.dataset.csValue === 'true';
      renderAll();
    });
  });
  box.querySelectorAll('[data-cs-bool]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.csBool;
      state.charState[key] = !state.charState[key];
      renderAll();
    });
  });
  const hpSlider = document.getElementById('csHpSlider');
  // While dragging: only state + label + derived stats (do NOT rebuild the
  // panel, which would recreate the slider mid-drag and reset the thumb).
  hpSlider.addEventListener('input', (e)=>{
    state.charState.hpPercent = parseInt(e.target.value, 10);
    const lbl = hpSlider.closest('.cs-slider-row').querySelector('.cs-val');
    if(lbl) lbl.textContent = state.charState.hpPercent + '%';
    if(typeof renderDerived === 'function') renderDerived();
  });
  // On release: full render once (persistence, resistances, etc.).
  hpSlider.addEventListener('change', ()=>{ renderAll(); });
  document.getElementById('csAddictionsInput').addEventListener('change', (e)=>{
    state.charState.addictions = Math.max(0, parseInt(e.target.value) || 0);
    renderAll();
  });
  document.getElementById('csCapsInput').addEventListener('change', (e)=>{
    state.charState.caps = Math.max(0, parseInt(e.target.value) || 0);
    renderAll();
  });
}

function renderMainTabs(){
  const t = T();
  const tabLabels = {
    stat: t.tabStat, mutations: t.tabMutations, chems: t.tabChems, weapon: t.tabWeapon, armor: t.tabArmor,
    perkcards: t.tabPerkCards, perks: t.tabPerks, data: t.tabData, raid: t.tabRaid
  };
  document.querySelectorAll('.sidebar-nav-item').forEach(btn=>{
    const tabKey = btn.dataset.tab;
    const label = tabLabels[tabKey] || tabKey;
    const labelEl = btn.querySelector('.nav-label');
    if(labelEl) labelEl.textContent = label; else btn.textContent = label;
    btn.classList.toggle('active', state.activeMainTab === tabKey);
  });
  document.querySelectorAll('.tab-panel-group').forEach(group=>{
    group.classList.toggle('active', group.dataset.tabgroup === state.activeMainTab);
  });
}
document.querySelectorAll('.sidebar-nav-item').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    state.activeMainTab = btn.dataset.tab;
    renderMainTabs();
  });
});


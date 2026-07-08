function generateAutoBuild(){
  const weapon = state.selectedWeapon;
  if(!weapon) return;
  const priority = state.rulesEngineArmorPriority || 'physical';

  state.perkRanks = {};
  const eff = getEffectiveSpecial();
  const budgetUsed = {};
  SPECIAL_LIST.forEach(s => budgetUsed[s.key] = 0);
  const compatible = PERKS
    .filter(p => perkMatchesWeapon(p.name, weapon))
    .slice()
    .sort((a,b) => a.ranks[0].cost - b.ranks[0].cost);
  let equippedCount = 0;
  for(const p of compatible){
    const capped = eff[p.special] ? eff[p.special].capped : 0;
    for(let i = p.ranks.length - 1; i >= 0; i--){
      const rankObj = p.ranks[i];
      if(budgetUsed[p.special] + rankObj.cost <= capped){
        state.perkRanks[p.name] = rankObj.rank;
        budgetUsed[p.special] += rankObj.cost;
        equippedCount++;
        break;
      }
    }
  }

  const statKey = {physical:'dr', energy:'er', radiation:'rr', cryo:'cryo'}[priority] || 'dr';
  let bestSet = null, bestVal = -1;
  for(const set of ARMOR_DATA.verified_sets){
    const val = (set.chest[statKey] || 0) + (set.limb[statKey] || 0);
    if(val > bestVal){ bestVal = val; bestSet = set; }
  }
  if(bestSet){
    state.armorSlots = {head: bestSet.key, chest: bestSet.key, arms: bestSet.key, legs: bestSet.key};
    document.getElementById('usePowerArmorToggle').checked = false;
  }

  state._lastAutoBuildResult = { weaponName: weapon.name, cardCount: equippedCount, armorName: bestSet ? bestSet.name : '' };
  renderAll();
}

function renderRulesEngine(){
  const t = T();
  const box = document.getElementById('rulesEngineBox');
  if(!state.selectedWeapon){
    box.innerHTML = `<div class="summary-empty">${t.rulesEngineNeedWeapon}</div>`;
    return;
  }
  const priority = state.rulesEngineArmorPriority || 'physical';
  const priorityOptions = [
    {key:'physical', label:t.rulesEngineArmorPhysical},
    {key:'energy', label:t.rulesEngineArmorEnergy},
    {key:'radiation', label:t.rulesEngineArmorRadiation},
    {key:'cryo', label:t.rulesEngineArmorCryo}
  ];
  const optsHtml = priorityOptions.map(o => `<option value="${o.key}" ${priority===o.key?'selected':''}>${o.label}</option>`).join('');
  const result = state._lastAutoBuildResult;
  const resultHtml = result ? `<div class="summary-empty">${t.rulesEngineResult(esc(result.weaponName), result.cardCount, result.armorName)}</div>` : '';
  box.innerHTML = `
    <div class="mods-box">
      <label>${t.rulesEngineArmorPriority}
        <select id="rulesEngineArmorPrioritySelect">${optsHtml}</select>
      </label>
      <div class="mb-note">${t.rulesEngineOverwriteWarning}</div>
      <button class="btn" id="rulesEngineGenerateBtn" style="margin-top:8px;">${t.rulesEngineGenerate}</button>
    </div>
    ${resultHtml}
  `;
  document.getElementById('rulesEngineArmorPrioritySelect').addEventListener('change', (e)=>{
    state.rulesEngineArmorPriority = e.target.value;
  });
  document.getElementById('rulesEngineGenerateBtn').addEventListener('click', generateAutoBuild);
}

function renderGrid(){
  const t = T();
  const grid = document.getElementById('perkGrid');
  grid.innerHTML = "";
  const q = state.search.trim().toLowerCase();
  let list = PERKS.filter(p=>{
    if(state.activeTab !== "All" && p.special !== state.activeTab) return false;
    if(q){
      const hay = (p.name + " " + p.ranks.map(r=>r.desc).join(" ")).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    if(state.selectedWeapon && state.onlyCompatible){
      if(!perkMatchesWeapon(p.name, state.selectedWeapon)) return false;
    }
    return true;
  });
  document.getElementById('perkCountLine').textContent = t.cardsShown(list.length);

  for(const p of list){
    const equipped = state.perkRanks[p.name] || 0;
    const rankObj = p.ranks.find(r=>r.rank === (equipped||1)) || p.ranks[0];
    const matches = state.selectedWeapon ? perkMatchesWeapon(p.name, state.selectedWeapon) : false;
    const isGhoulOnly = GHOUL_ONLY_PERKS.includes(p.name);
    const ghoulLocked = isGhoulOnly && !state.charState.isGhoul;
    const card = document.createElement('div');
    card.className = "perk-card" + (equipped>0 ? " equipped":"") + (matches ? " weapon-match":"") + (ghoulLocked ? " ghoul-locked":"");
    let pipsHtml = "";
    for(let i=1;i<=p.ranks.length;i++){
      pipsHtml += `<div class="pip ${i<=equipped?'on':''}" data-perk="${p.name}" data-rank="${i}"></div>`;
    }
    const currentCost = equipped>0 ? (p.ranks.find(r=>r.rank===equipped)||{}).cost : p.ranks[0].cost;
    const cats = PERK_CATEGORIES[p.name] || [];
    const catsHtml = cats.length ? cats.map(c=>{
      const isWeapon = WEAPON_CATEGORY_KEYS.includes(c);
      return `<span class="tt-cat ${isWeapon?'weapon':''}">${t.categories[c]||c}</span>`;
    }).join("") : `<span class="tt-cat">${t.noCategory}</span>`;

    const modReqKey = MOD_DEPENDENT_PERKS[p.name];
    let modBadgeHtml = "";
    if(modReqKey){
      const modName = t.modNames[modReqKey] || modReqKey;
      if(state.selectedWeapon && (state.weaponMods||{})[modReqKey]){
        modBadgeHtml = `<span class="mod-req-badge ok">${t.modOk}: ${modName}</span>`;
      } else if(state.selectedWeapon){
        modBadgeHtml = `<span class="mod-req-badge missing">${t.modMissing}: ${modName}</span>`;
      } else {
        modBadgeHtml = `<span class="mod-req-badge">${t.modReq} ${modName}</span>`;
      }
    }

    card.innerHTML = `
      <div class="pc-thumb-row">
        <div class="pc-icon"><svg><use href="#ic-${p.special}"></use></svg></div>
        <div class="pc-head">
          <div>
            <div class="pc-name">${p.name}</div>
            ${matches ? `<span class="weapon-badge">${t.compatible}</span>` : ''}
            ${isGhoulOnly ? `<span class="ghoul-badge">${t.ghoulBadge}</span>` : ''}
            ${modBadgeHtml}
          </div>
        </div>
      </div>
      ${ghoulLocked ? `<div class="mut-note">${t.ghoulRequiresNote}</div>` : ''}
      <div class="tooltip-wrap">
        <div class="pc-special">${t.special[p.special]} · ${t.minLevel} ${p.min_level}</div>
        <div class="pc-desc">${rankObj.desc}</div>
        <div class="tooltip-box">
          <div class="tt-title">${p.name} ${t.appliesTo}</div>
          <div class="tt-cats">${catsHtml}</div>
        </div>
      </div>
      <div class="pc-foot">
        <div class="pc-level">${t.rank} ${equipped}/${p.ranks.length}</div>
        <div class="pips">${pipsHtml}</div>
        <div class="pc-cost">${currentCost} pt${currentCost>1?'s':''}</div>
      </div>
    `;
    card.querySelectorAll('.pip').forEach(pip=>{
      pip.addEventListener('click', ()=>{
        const rank = parseInt(pip.dataset.rank);
        const current = state.perkRanks[p.name] || 0;
        state.perkRanks[p.name] = (current === rank) ? rank - 1 : rank;
        if(state.perkRanks[p.name] <= 0) delete state.perkRanks[p.name];
        renderAll();
      });
    });
    grid.appendChild(card);
  }
}


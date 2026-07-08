function renderStaticText(){
  const t = T();
  document.getElementById('txt-subtitle').textContent = t.subtitle;
  document.getElementById('txt-status').textContent = t.status;
  document.getElementById('txt-h-armor').textContent = t.hArmor;
  document.getElementById('txt-total').textContent = t.total;
  document.getElementById('txt-alloc').textContent = t.alloc;
  document.getElementById('txt-free').textContent = t.free;
  document.getElementById('txt-hp').textContent = t.hp;
  document.getElementById('txt-ap').textContent = t.ap;
  document.getElementById('txt-cw').textContent = t.cw;
  document.getElementById('txt-dr').textContent = t.dmgResist;
  document.getElementById('txt-xp').textContent = t.xp;
  document.getElementById('txt-h-weapon').textContent = t.hWeapon;
  document.getElementById('weaponSearchInput').placeholder = t.weaponPlaceholder;
  document.getElementById('txt-onlycompat').textContent = t.onlyCompat;
  document.getElementById('txt-h-builds').textContent = t.hBuilds;
  document.getElementById('buildNameInput').placeholder = t.buildPlaceholder;
  document.getElementById('saveBuildBtn').textContent = t.save;
  document.getElementById('buildsEmptyNote').textContent = t.noBuilds;
  document.getElementById('txt-h-rulesengine').textContent = t.hRulesEngine;
  document.getElementById('txt-rulesengine-note').textContent = t.rulesEngineNote;
  document.getElementById('txt-h-buildcompare').textContent = t.hBuildCompare;
  document.getElementById('txt-buildcompare-note').textContent = t.buildCompareNote;
  document.getElementById('txt-h-armorsets').textContent = t.hArmorSets;
  document.getElementById('armorSetNameInput').placeholder = t.armorSetNamePlaceholder;
  document.getElementById('saveArmorSetBtn').textContent = t.save;
  document.getElementById('armorSetsEmptyNote').textContent = t.noArmorSets;
  document.getElementById('txt-h-roadmap').textContent = t.hRoadmap;
  document.getElementById('searchInput').placeholder = t.searchPlaceholder;
  document.getElementById('txt-footer').textContent = t.footer;
  document.getElementById('btnLangEs').classList.toggle('active', state.lang==='es');
  document.getElementById('btnLangEn').classList.toggle('active', state.lang==='en');

  const roadmapBox = document.getElementById('roadmapBox');
  roadmapBox.innerHTML = t.roadmap.map(([status,label])=>
    `<span>[${status==='done'?'X':' '}]</span> ${label}<br>`
  ).join("");
}

// Milestone progress view for state.charLevel. NOT an XP/leveling curve —
// there is no verified per-level XP table anywhere in this app's data (see
// CLAUDE.md). Instead this plots state.charLevel against two sets of
// already-verified level milestones:
//   1. LEGENDARY_SLOT_LEVELS (legendary perk slot unlocks: 50/75/100/150/200/300)
//   2. Distinct min_level values > 50 in PERKS (Ghoul-only card unlocks,
//      same verified min_level>50 rule used to build GHOUL_ONLY_PERKS)
function renderLevelProgressChart(){
  const t = T();
  document.getElementById('txt-h-levelprogress').textContent = t.hLevelProgress;
  document.getElementById('txt-levelprogress-note').textContent = t.levelProgressNote;

  const level = state.charLevel;
  const scaleMax = Math.max(300, level);
  const pct = (lvl)=> Math.min(lvl / scaleMax, 1) * 100;
  const curPct = pct(level);

  const legMarks = LEGENDARY_SLOT_LEVELS.map(lvl=>{
    const reached = level >= lvl;
    const tip = reached ? t.levelProgressReached(lvl) : t.legSlotLocked(lvl);
    return `<div class="lp-mark ${reached?'reached':''}" style="left:${pct(lvl)}%" title="${tip}"><span class="lp-mark-label">${lvl}</span></div>`;
  }).join("");

  const ghoulLevelCounts = {};
  PERKS.filter(p=>p.min_level>50).forEach(p=>{
    ghoulLevelCounts[p.min_level] = (ghoulLevelCounts[p.min_level]||0) + 1;
  });
  const ghoulLevels = Object.keys(ghoulLevelCounts).map(Number).sort((a,b)=>a-b);
  const ghoulMarks = ghoulLevels.map(lvl=>{
    const reached = level >= lvl;
    const tip = t.levelProgressGhoulTooltip(lvl, ghoulLevelCounts[lvl]);
    return `<div class="lp-mark lp-mark-ghoul ${reached?'reached':''}" style="left:${pct(lvl)}%" title="${tip}"></div>`;
  }).join("");

  const box = document.getElementById('levelProgressBox');
  box.innerHTML = `
    <div class="lp-current">${t.levelProgressCurrent(level)}</div>
    <div class="lp-track-wrap">
      <div class="lp-track-label">${t.levelProgressLegendaryLabel}</div>
      <div class="lp-track">
        <div class="lp-fill" style="width:${curPct}%"></div>
        <div class="lp-cursor" style="left:${curPct}%" title="${t.levelProgressCurrent(level)}"></div>
        ${legMarks}
      </div>
    </div>
    <div class="lp-track-wrap">
      <div class="lp-track-label">${t.levelProgressGhoulLabel}</div>
      <div class="lp-track">
        <div class="lp-fill" style="width:${curPct}%"></div>
        <div class="lp-cursor" style="left:${curPct}%" title="${t.levelProgressCurrent(level)}"></div>
        ${ghoulMarks}
      </div>
    </div>
  `;
}

// Planificador de orden por nivel: toma el build actual (state.special +
// state.perkRanks) como objetivo y simula la progresión 1→50 (curva validada:
// +1 punto SPECIAL por nivel, 1 carta a elección por nivel), sugiriendo en qué
// nivel subir cada punto y equipar cada carta. Greedy (no solver óptimo), solo
// lectura — NO toca getEffectiveSpecial ni el estado. Prioriza subir el
// atributo que destraba la carta pendiente de menor min_level; si ninguna
// espera puntos, rellena el atributo más lejos de su objetivo.
function computeLevelPlan(){
  const SP = LEVELING_CURVE.special_points;
  const pointsUntil = SP.gain_until_level;              // 50
  const target = {};
  SPECIAL_LIST.forEach(s => target[s.key] = state.special[s.key]);
  const cur = {};
  SPECIAL_LIST.forEach(s => cur[s.key] = SP.starting_total ? 1 : 1); // 1 c/u al empezar

  // Cartas objetivo (rango equipado) con su costo de puntos en ese rango.
  const pending = [];
  for(const p of PERKS){
    const rank = state.perkRanks[p.name] || 0;
    if(rank > 0){
      const rk = p.ranks.find(r => r.rank === rank) || p.ranks[p.ranks.length-1];
      pending.push({name: p.name, special: p.special, cost: rk.cost, min_level: p.min_level, rank, maxRank: p.ranks.length});
    }
  }
  pending.sort((a,b) => a.min_level - b.min_level || a.cost - b.cost);

  // Feasibilidad: en cada atributo, la suma de costos de sus cartas no puede
  // exceder el objetivo de ese atributo.
  const perAttrCost = {};
  SPECIAL_LIST.forEach(s => perAttrCost[s.key] = 0);
  pending.forEach(c => perAttrCost[c.special] += c.cost);
  const infeasible = SPECIAL_LIST.some(s => perAttrCost[s.key] > target[s.key]);

  const notYet = pending.slice();
  const equippedCost = {};
  SPECIAL_LIST.forEach(s => equippedCost[s.key] = 0);
  const targetsReached = () => SPECIAL_LIST.every(s => cur[s.key] >= target[s.key]);

  function pickStat(){
    const cands = SPECIAL_LIST.map(s=>s.key).filter(k => cur[k] < target[k]);
    if(cands.length === 0) return null;
    // Atributo que destraba la carta pendiente de menor min_level y que aún no
    // tiene puntos suficientes.
    const gating = notYet
      .filter(c => cands.includes(c.special) && cur[c.special] < equippedCost[c.special] + c.cost)
      .sort((a,b) => a.min_level - b.min_level)[0];
    if(gating) return gating.special;
    // Si nada espera puntos, el más lejos de su objetivo.
    cands.sort((a,b) => (target[b]-cur[b]) - (target[a]-cur[a]));
    return cands[0];
  }

  const plan = [];
  let level = 1;
  const MAX_LEVEL = 300; // margen para cartas Ghoul (min_level > 50)
  while((!targetsReached() || notYet.length > 0) && level < MAX_LEVEL){
    level++;
    const entry = {level, raiseStat: null, raiseTo: null, card: null};

    if(level <= pointsUntil && !targetsReached()){
      const pick = pickStat();
      if(pick){ cur[pick]++; entry.raiseStat = pick; entry.raiseTo = cur[pick]; }
    }
    // Una carta a elección por nivel: la primera pendiente cuyo min_level ya se
    // alcanzó y cuyo atributo tiene los puntos.
    for(let i=0;i<notYet.length;i++){
      const c = notYet[i];
      if(level >= c.min_level && equippedCost[c.special] + c.cost <= cur[c.special]){
        equippedCost[c.special] += c.cost;
        entry.card = c;
        notYet.splice(i,1);
        break;
      }
    }
    if(entry.raiseStat || entry.card) plan.push(entry);
  }

  return { plan, infeasible, doneLevel: plan.length ? plan[plan.length-1].level : 1,
           hasContent: pending.length > 0 || SPECIAL_LIST.some(s=>target[s.key] > 1),
           stranded: notYet };
}

function renderLevelPlanner(){
  const t = T();
  document.getElementById('txt-h-levelplan').textContent = t.hLevelPlan;
  document.getElementById('txt-levelplan-note').textContent = t.levelPlanNote;
  const box = document.getElementById('levelPlanBox');

  const res = computeLevelPlan();
  if(!res.hasContent){
    box.innerHTML = `<div class="summary-empty">${t.levelPlanEmpty}</div>`;
    return;
  }

  const rows = res.plan.map(e => {
    const spCell = e.raiseStat
      ? `<span class="lvp-raise">${t.levelPlanRaise(t.special[e.raiseStat], e.raiseTo)}</span>`
      : '<span class="lvp-dash">—</span>';
    const cardCell = e.card
      ? `<span class="lvp-card">${esc(e.card.name)}${e.card.maxRank>1?` <span class="lvp-rank">R${e.card.rank}</span>`:''}</span>`
      : '<span class="lvp-dash">—</span>';
    return `<tr><td class="lvp-lvl">${e.level}</td><td>${spCell}</td><td>${cardCell}</td></tr>`;
  }).join('');

  box.innerHTML = `
    ${res.infeasible ? `<div class="mut-note" style="color:var(--red)">${t.levelPlanInfeasible}</div>` : ''}
    <div class="lvp-scroll">
      <table class="lvp-table">
        <thead><tr>
          <th>${t.levelPlanColLevel}</th>
          <th>${t.levelPlanColSpecial}</th>
          <th>${t.levelPlanColCard}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="mut-note">${t.levelPlanReachedAt(res.doneLevel)}</div>
  `;
}

function renderSpecialPanel(){
  const t = T();
  const eff = getEffectiveSpecial();
  const container = document.getElementById('specialRows');
  container.innerHTML = "";
  container.className = "special-columns";
  let allocated = 0;

  // Group equipped normal perk cards by SPECIAL (reads state.perkRanks,
  // same source of truth renderEquippedSummary/renderGrid already use).
  const groups = {};
  for(const key of SPECIAL_LIST.map(s=>s.key)) groups[key] = [];
  for(const p of PERKS){
    const rank = state.perkRanks[p.name] || 0;
    if(rank > 0) groups[p.special].push(p);
  }

  for(const s of SPECIAL_LIST){
    allocated += state.special[s.key];
    const capped = eff[s.key].capped;
    const spent = specialSpent(s.key);
    const over = spent > capped;
    const delta = capped - state.special[s.key];
    const deltaBadge = delta !== 0
      ? `<span style="color:${delta>0?'var(--green)':'var(--red)'};"> (${delta>0?'+':''}${delta} ${state.lang==='es'?'efectivo':'effective'})</span>`
      : '';
    const cards = groups[s.key];

    let cardsHtml = '';
    for(const p of cards){
      const equipped = state.perkRanks[p.name] || 0;
      let pipsHtml = "";
      for(let i=1;i<=p.ranks.length;i++){
        pipsHtml += `<div class="pip ${i<=equipped?'on':''}" data-perk="${p.name}" data-rank="${i}"></div>`;
      }
      cardsHtml += `<div class="sc-card"><div class="sc-card-name">${p.name}</div><div class="pips">${pipsHtml}</div></div>`;
    }

    const addOpen = !!(state.specialAddOpen && state.specialAddOpen[s.key]);
    let addListHtml = '';
    if(addOpen){
      const equippedNames = new Set(cards.map(p=>p.name));
      const available = PERKS.filter(p => p.special === s.key && !equippedNames.has(p.name)
        && !(GHOUL_ONLY_PERKS.includes(p.name) && !state.charState.isGhoul));
      addListHtml = available.length === 0
        ? `<div class="sc-add-list"><div class="sc-add-empty">${t.scNoMoreCards}</div></div>`
        : `<div class="sc-add-list">${available.map(p=>`
            <div class="sc-add-item" data-add-perk="${p.name}">
              <span class="aname">${p.name}</span>
              <span class="adesc">${t.minLevel} ${p.min_level}</span>
            </div>`).join('')}</div>`;
    }

    const colOpen = !!(state.specialColOpen && state.specialColOpen[s.key]);
    const col = document.createElement('div');
    col.className = "sc-col" + (colOpen ? " col-open" : "");
    col.innerHTML = `
      <div class="sc-head" data-col-toggle="${s.key}">
        <div class="sc-badge${cards.length>0?' has-cards':''}">${s.letter}</div>
        <div class="sc-head-info">
          <div class="sc-name">${t.special[s.key]}</div>
          <div class="sc-value">${state.special[s.key]}</div>
        </div>
        <span class="sc-chevron">${colOpen ? '▴' : '▾'}</span>
      </div>
      <div class="sc-body">
        <div class="stepper">
          <button data-sp="${s.key}" data-d="-1">-</button>
          <input type="text" readonly value="${state.special[s.key]}">
          <button data-sp="${s.key}" data-d="1">+</button>
        </div>
        <div class="sc-note${over?' over':''}">${spent}/${capped} pts ${over ? t.over : ''}${deltaBadge}</div>
        <div class="sc-cards">${cardsHtml}</div>
        <button class="sc-add-slot" data-add-toggle="${s.key}">${addOpen ? '−' : '+'}</button>
        ${addListHtml}
      </div>
    `;

    const colHead = col.querySelector('[data-col-toggle]');
    colHead.addEventListener('click', ()=>{
      state.specialColOpen = state.specialColOpen || {};
      state.specialColOpen[s.key] = !state.specialColOpen[s.key];
      renderAll();
    });
    col.querySelectorAll('button[data-sp]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.dataset.sp;
        const d = parseInt(btn.dataset.d);
        let v = state.special[key] + d;
        if(v < 1) v = 1;
        if(v > 15) v = 15;
        state.special[key] = v;
        renderAll();
      });
    });
    col.querySelectorAll('.pip').forEach(pip=>{
      pip.addEventListener('click', ()=>{
        const rank = parseInt(pip.dataset.rank);
        const name = pip.dataset.perk;
        const current = state.perkRanks[name] || 0;
        state.perkRanks[name] = (current === rank) ? rank - 1 : rank;
        if(state.perkRanks[name] <= 0) delete state.perkRanks[name];
        renderAll();
      });
    });
    const addToggleBtn = col.querySelector('[data-add-toggle]');
    addToggleBtn.addEventListener('click', ()=>{
      state.specialAddOpen = state.specialAddOpen || {};
      state.specialAddOpen[s.key] = !state.specialAddOpen[s.key];
      renderAll();
    });
    col.querySelectorAll('[data-add-perk]').forEach(item=>{
      item.addEventListener('click', ()=>{
        state.perkRanks[item.dataset.addPerk] = 1;
        renderAll();
      });
    });

    container.appendChild(col);
  }
  document.getElementById('allocatedVal').textContent = allocated;
  const remaining = state.pool - allocated;
  const remEl = document.getElementById('remainingVal');
  remEl.textContent = remaining;
  remEl.className = "val" + (remaining < 0 ? " over":"");
  document.getElementById('poolTag').textContent = state.pool + " " + t.pts;
  document.getElementById('txt-h-special').innerHTML = t.hSpecial + ' <span class="tag" id="poolTag">' + state.pool + ' ' + t.pts + '</span>';

  // Feed the build bar's SPECIAL meter (same allocated/pool numbers, no new
  // calculation).
  const meterFill = document.getElementById('specialMeterFill');
  const meterUsed = document.getElementById('specialMeterUsed');
  const meterMax  = document.getElementById('specialMeterMax');
  if(meterFill){ meterFill.style.width = Math.min(100, (allocated/state.pool)*100) + '%'; }
  if(meterUsed){ meterUsed.textContent = allocated; }
  if(meterMax){ meterMax.textContent = state.pool; }

  renderDerived();
}

// Pure formula, shared by the live STAT tab (renderDerived) and the build
// comparator (which needs these numbers for saved builds without touching
// the DOM). Takes an already-computed getEffectiveSpecial() result.
function computeDerivedStats(eff){
  return {
    hp: Math.round(250 + 5*eff.Endurance.raw + eff._extra.hpDelta),
    ap: Math.round(60 + 10*eff.Agility.raw),
    cw: Math.round(155 + 5*eff.Strength.raw + eff._extra.carryWeightDelta),
    xp: Math.round(3*eff.Intelligence.raw)
  };
}
function renderDerived(){
  const eff = getEffectiveSpecial();
  const {hp, ap, cw, xp} = computeDerivedStats(eff);
  document.getElementById('statHP').textContent = hp;
  document.getElementById('statAP').textContent = ap;
  document.getElementById('statCW').textContent = cw + " lb";
  document.getElementById('statXP').textContent = "+" + xp + "%";
}

function renderTabs(){
  const t = T();
  const row = document.getElementById('tabsRow');
  row.innerHTML = "";
  const tabs = ["All", ...SPECIAL_LIST.map(s=>s.key)];
  for(const tab of tabs){
    const btn = document.createElement('button');
    btn.className = "tab-btn" + (state.activeTab === tab ? " active":"");
    btn.textContent = tab === "All" ? t.tabAll : t.special[tab];
    btn.addEventListener('click', ()=>{ state.activeTab = tab; renderAll(); });
    row.appendChild(btn);
  }
}


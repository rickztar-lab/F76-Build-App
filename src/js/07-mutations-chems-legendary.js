function renderMutationsPanel(){
  const t = T();
  document.getElementById('txt-h-mutations').textContent = t.hMutations;
  const box = document.getElementById('mutationsBox');
  const eff = getEffectiveSpecial();
  const cfRank = eff._extra.classFreakRank;
  const cfPct = eff._extra.reduction * 100;

  box.innerHTML = MUTATIONS.map(m=>{
    const active = state.activeMutations.includes(m.key);
    const posText = state.lang==='es' ? m.positive.textEs : m.positive.textEn;
    const negText = state.lang==='es' ? m.negative.textEs : m.negative.textEn;
    return `
      <div class="mut-card ${active?'active':''}">
        <label class="mc-top">
          <input type="checkbox" data-mut="${m.key}" ${active?'checked':''}>
          <span class="mc-name">${m.name}</span>
        </label>
        <div class="mc-line mc-pos">▲ ${posText}</div>
        <div class="mc-line mc-neg ${cfRank>0?'reduced':''}">▼ ${negText}</div>
      </div>
    `;
  }).join("");

  const note = document.createElement('div');
  note.className = "mut-note";
  note.textContent = cfRank > 0 ? t.classFreakActive(cfPct) : "";
  box.appendChild(note);

  box.querySelectorAll('input[data-mut]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const key = cb.dataset.mut;
      if(cb.checked){
        if(!state.activeMutations.includes(key)) state.activeMutations.push(key);
      } else {
        state.activeMutations = state.activeMutations.filter(k=>k!==key);
      }
      renderAll();
    });
  });
}

// Chems reference panel: lists the 28 ESM-extracted consumables with their
// literal magnitude/duration/addiction. Pure display — reads only from the
// baked INGESTIBLES constant, touches no build state (no getEffectiveSpecial,
// no save/load). Grouped self-descriptively by "has SPECIAL buffs" vs not,
// a split derived from the data itself (no invented categories).
function fmtChemDuration(sec){
  const t = T();
  if(!sec || sec <= 0) return t.chemDurationInstant;
  if(sec < 60) return Math.round(sec) + 's';
  return Math.round(sec/60) + ' min';
}
function renderChemsPanel(){
  const t = T();
  document.getElementById('txt-h-chems').textContent = t.hChems;
  document.getElementById('txt-chems-note').textContent = t.chemsNote;
  const box = document.getElementById('chemsBox');

  const withSpecial = INGESTIBLES.chems.filter(c => c.special_effects.length > 0);
  const withoutSpecial = INGESTIBLES.chems.filter(c => c.special_effects.length === 0);

  function chemCard(c){
    const meta = [];
    meta.push(`${t.chemWeight} ${c.weight}`);
    meta.push(`${c.caps_value} ${t.chemCaps}`);
    if(c.cures_all_addictions){
      meta.push(`<span class="chem-cure">${t.chemCuresAddiction}</span>`);
    } else if(c.addiction_chance > 0){
      meta.push(`${t.chemAddiction} ${Math.round(c.addiction_chance*100)}%`);
    } else {
      meta.push(t.chemNoAddiction);
    }
    let specialHtml = '';
    if(c.special_effects.length){
      specialHtml = '<div class="chem-special">' + c.special_effects.map(se=>{
        const sign = se.magnitude >= 0 ? '+' : '';
        return `<span class="chem-sp-chip">${sign}${se.magnitude} ${t.special[se.stat]||se.stat} · ${fmtChemDuration(se.duration_s)}</span>`;
      }).join('') + '</div>';
    }
    let otherHtml = '';
    if(c.other_effects.length){
      otherHtml = '<div class="chem-others">' + c.other_effects.map(oe=>{
        const label = state.lang==='es' ? oe.label_es : oe.label_en;
        const magPart = oe.magnitude ? `<b>${oe.magnitude}</b> · ` : '';
        return `<div class="chem-oe">${esc(label)}: ${magPart}${fmtChemDuration(oe.duration_s)}</div>`;
      }).join('') + '</div>';
    }
    return `
      <div class="chem-card">
        <div class="chem-head">
          <span class="chem-name">${esc(c.name)}</span>
          <span class="chem-meta">${meta.join(' · ')}</span>
        </div>
        ${specialHtml}
        ${otherHtml}
      </div>`;
  }

  box.innerHTML = `
    <div class="summary-sub">${t.chemsGroupSpecial} (${withSpecial.length})</div>
    <div class="chem-grid">${withSpecial.map(chemCard).join('')}</div>
    <div class="summary-sub">${t.chemsGroupOther} (${withoutSpecial.length})</div>
    <div class="chem-grid">${withoutSpecial.map(chemCard).join('')}</div>
  `;
}

function renderLegendaryPanel(){
  const t = T();
  document.getElementById('txt-h-legendary').textContent = t.hLegendary;
  document.getElementById('txt-charlevel').textContent = t.charLevel;
  document.getElementById('charLevelInput').value = state.charLevel;

  const box = document.getElementById('legendarySlots');
  box.innerHTML = "";
  const usedNames = state.legendaryPerks.filter(Boolean).map(lp=>lp.name);

  for(let i=0;i<6;i++){
    const unlockLevel = LEGENDARY_SLOT_LEVELS[i];
    const locked = state.charLevel < unlockLevel;
    const slotData = state.legendaryPerks[i];
    const wrap = document.createElement('div');
    wrap.className = "leg-slot" + (locked ? " locked":"");

    if(locked){
      wrap.innerHTML = `<div class="ls-top">${t.legSlotLocked(unlockLevel)}</div>`;
      box.appendChild(wrap);
      continue;
    }

    const optionsHtml = LEGENDARY_PERKS.map(lp=>{
      const disabled = usedNames.includes(lp.name) && (!slotData || slotData.name !== lp.name);
      return `<option value="${lp.name}" ${disabled?'disabled':''} ${slotData&&slotData.name===lp.name?'selected':''}>${lp.name}</option>`;
    }).join("");

    const currentPerk = slotData ? LEGENDARY_PERKS.find(lp=>lp.name===slotData.name) : null;
    const currentRank = slotData ? slotData.rank : 0;
    const descText = currentPerk ? (currentPerk.ranks.find(r=>r.rank===(currentRank||1))||{}).desc : "";

    let pipsHtml = "";
    for(let r=1;r<=4;r++){
      pipsHtml += `<div class="ls-pip ${r<=currentRank?'on':''}" data-slot="${i}" data-rank="${r}">${r}</div>`;
    }

    wrap.innerHTML = `
      <div class="ls-top"><span>SLOT ${i+1} (Lv.${unlockLevel})</span></div>
      <select data-slot="${i}">
        <option value="">${t.legSlotEmpty}</option>
        ${optionsHtml}
      </select>
      <div class="ls-desc">${descText}</div>
      <div class="ls-pips">${currentPerk ? pipsHtml : ''}</div>
    `;
    box.appendChild(wrap);
  }

  box.querySelectorAll('select').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const slotIdx = parseInt(sel.dataset.slot);
      if(sel.value === ""){
        state.legendaryPerks[slotIdx] = null;
      } else {
        state.legendaryPerks[slotIdx] = {name: sel.value, rank: 1};
      }
      renderLegendaryPanel();
    });
  });
  box.querySelectorAll('.ls-pip').forEach(pip=>{
    pip.addEventListener('click', ()=>{
      const slotIdx = parseInt(pip.dataset.slot);
      const rank = parseInt(pip.dataset.rank);
      const current = state.legendaryPerks[slotIdx];
      if(!current) return;
      current.rank = (current.rank === rank) ? rank - 1 : rank;
      if(current.rank < 1) current.rank = 1;
      renderLegendaryPanel();
    });
  });
}

document.getElementById('charLevelInput').addEventListener('change', (e)=>{
  state.charLevel = parseInt(e.target.value) || 1;
  renderLegendaryPanel();
  renderLevelProgressChart();
});


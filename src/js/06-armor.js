const ARMOR_SLOTS = ["head","chest","arms","legs"];
function armorOptionsList(){
  return [
    ...ARMOR_DATA.verified_sets.map(s => ({key:s.key, name:s.name, verified:true})),
    ...ARMOR_DATA.qualitative_sets.map(s => ({key:s.key, name:s.name, verified:false}))
  ];
}

// Shared resistance calculation, used by both the ARMOR tab (renderArmorPanel)
// and the STAT tab's DEF summary (renderStatSummary) so the two can never
// drift apart. Mirrors the PA toggle read straight from the DOM, same as the
// rest of the armor code (there's no separate state.usingPA field).
//
// Regular armor: sums DR/ER/RR/Cryo from state.armorSlots against
// ARMOR_DATA.verified_sets only — unverified/qualitative sets don't count
// toward totals, and headwear gives no resistance in FO76 (both preserved
// exactly as renderArmorPanel already did it). Cryo is 0 for any piece that
// doesn't carry a verified "cryo" field (today, only Arctic Marine does).
//
// Power Armor: returns the frame's flat DR/ER plus the %damage/%radiation
// reduction from installed pieces — different units than regular armor's
// flat DR/ER/RR, so callers branch on `usingPA` rather than mixing them.
// Optional params let this be reused for arbitrary saved armor sets (e.g.
// the armor-set comparison view), not just the live equipped state — when
// omitted, it reads the live state/DOM exactly like before.
function computeArmorResistances(armorSlots, paPieceSlots, usingPA){
  if(armorSlots === undefined){
    const paToggle = document.getElementById('usePowerArmorToggle');
    usingPA = paToggle ? paToggle.checked : false;
    armorSlots = state.armorSlots;
    paPieceSlots = state.paPieceSlots;
  }

  if(usingPA){
    // Accepts either the named-slots object (current format) or a plain
    // piece count (older saved builds/armor sets, pre-per-piece slots).
    const pieces = typeof paPieceSlots === 'number' ? paPieceSlots : paPiecesInstalledCount(paPieceSlots);
    return {
      usingPA: true,
      flatDrEr: ARMOR_DATA.power_armor_frame.base_flat_dr_er,
      dmgPct: pieces * ARMOR_DATA.power_armor_frame.per_piece_damage_reduction_pct,
      radPct: pieces * ARMOR_DATA.power_armor_frame.per_piece_radiation_reduction_pct
    };
  }

  let dr=0, er=0, rr=0, cryo=0, verifiedCount=0, totalCount=0;
  for(const slot of ARMOR_SLOTS){
    const key = (armorSlots||{})[slot];
    if(!key) continue;
    totalCount++;
    const set = ARMOR_DATA.verified_sets.find(s=>s.key===key);
    if(!set) continue;
    verifiedCount++;
    if(slot === 'head') continue; // headwear gives no resistance in FO76
    const piece = slot === 'chest' ? set.chest : set.limb;
    dr += piece.dr; er += piece.er; rr += piece.rr;
    cryo += piece.cryo || 0; // only Arctic Marine has a verified cryo value
  }
  return {usingPA:false, dr, er, rr, cryo, verifiedCount, totalCount};
}

function renderArmorPanel(){
  const t = T();
  document.getElementById('txt-h-armor').textContent = t.hArmor;
  document.getElementById('txt-usepa').textContent = t.usePA;

  const slotsBox = document.getElementById('armorSlotsBox');
  const totalsBox = document.getElementById('armorTotalsBox');
  const usingPA = document.getElementById('usePowerArmorToggle').checked;

  if(usingPA){
    if(!state.paPieceSlots) state.paPieceSlots = {helmet:null, torso:null, leftArm:null, rightArm:null, legs:null};
    const legOptsHtml = (current) => LEGENDARY_ARMOR_EFFECTS.map(e =>
      `<option value="${e.key}" ${current===e.key?'selected':''}>${e.name}</option>`
    ).join('');
    const piecesHtml = PA_PIECE_SLOTS.map(p=>{
      const slot = state.paPieceSlots[p.key];
      const label = state.lang==='es' ? p.es : p.en;
      const installed = !!slot;
      const legFilled = installed && slot.legendaryEffect;
      return `
        <div class="gear-slot${installed?' installed':''}">
          <div class="gear-slot-head">
            <label><input type="checkbox" data-pa-piece="${p.key}" ${installed?'checked':''}> ${label}</label>
          </div>
          ${installed ? `
          <div class="gear-slot-body">
            <div class="star-slot-card${legFilled?' filled':''}">
              <span class="star-slot-badge">★</span>
              <div class="star-slot-body">
                <select data-pa-leg="${p.key}" class="star-slot-select">
                  <option value="">${t.weaponLegendaryNone}</option>
                  ${legOptsHtml(slot.legendaryEffect)}
                </select>
              </div>
            </div>
          </div>` : ''}
        </div>`;
    }).join('');
    slotsBox.innerHTML = `
      <div class="summary-sub">${t.paFrameTitle}</div>
      ${piecesHtml}
      <div class="pa-frame-note">${t.paFrameNote}</div>
      <div class="pa-frame-note">${t.paLegendaryNote}</div>
    `;
    slotsBox.querySelectorAll('input[data-pa-piece]').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        const key = cb.dataset.paPiece;
        state.paPieceSlots[key] = cb.checked ? {legendaryEffect:null} : null;
        renderAll();
      });
    });
    slotsBox.querySelectorAll('select[data-pa-leg]').forEach(sel=>{
      sel.addEventListener('change', ()=>{
        const key = sel.dataset.paLeg;
        if(state.paPieceSlots[key]) state.paPieceSlots[key].legendaryEffect = sel.value || null;
        renderAll();
      });
    });

    const res = computeArmorResistances();
    totalsBox.innerHTML = `
      <div class="armor-totals">
        <div class="pb-def-stat"><div class="ss-lbl">DR/ER ${t.defRR==='RADIACIÓN'?'BASE':'BASE'}</div><div class="ss-val">${res.flatDrEr}</div></div>
        <div class="pb-def-stat"><div class="ss-lbl">${state.lang==='es'?'REDUCC. DAÑO':'DMG REDUCTION'}</div><div class="ss-val">${res.dmgPct}%</div></div>
        <div class="pb-def-stat"><div class="ss-lbl">${state.lang==='es'?'REDUCC. RAD.':'RAD REDUCTION'}</div><div class="ss-val">${res.radPct}%</div></div>
      </div>
      <div class="pa-frame-note">${t.defPaCryoNote}</div>
    `;
    return;
  }

  const options = armorOptionsList();
  const slotLabels = {head:t.armorSlotHead, chest:t.armorSlotChest, arms:t.armorSlotArms, legs:t.armorSlotLegs};
  let html = '';
  for(const slot of ARMOR_SLOTS){
    const current = (state.armorSlots||{})[slot] || "";
    const optsHtml = options.map(o =>
      `<option value="${o.key}" ${current===o.key?'selected':''}>${o.name}${o.verified?' ✓':''}</option>`
    ).join('');
    const chosen = current ? options.find(o=>o.key===current) : null;
    html += `
      <div class="gear-slot${current?' installed':''}">
        <div class="gear-slot-head">
          <span class="as-label">${slotLabels[slot]}</span>
          <select data-armor-slot="${slot}">
            <option value="">${t.armorNone}</option>
            ${optsHtml}
          </select>
        </div>
        ${(chosen && !chosen.verified) ? `<div class="gear-slot-body armor-piece-note">${t.armorQualNote}</div>` : ''}
      </div>`;
  }
  slotsBox.innerHTML = html;
  slotsBox.querySelectorAll('select').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      if(!state.armorSlots) state.armorSlots = {};
      state.armorSlots[sel.dataset.armorSlot] = sel.value;
      renderAll();
    });
  });

  // Totals now come from the shared computeArmorResistances() (same rules:
  // only verified sets count, head gives no resistance).
  const res = computeArmorResistances();
  totalsBox.innerHTML = res.totalCount === 0 ? '' : `
    <div class="summary-sub">${t.armorTotalsTitle} (${res.verifiedCount}/${res.totalCount})</div>
    <div class="armor-totals">
      <div class="pb-def-stat"><div class="ss-lbl">${t.defDR}</div><div class="ss-val">${res.dr}</div></div>
      <div class="pb-def-stat"><div class="ss-lbl">${t.defER}</div><div class="ss-val">${res.er}</div></div>
      <div class="pb-def-stat"><div class="ss-lbl">${t.defRR}</div><div class="ss-val">${res.rr}</div></div>
      <div class="pb-def-stat"><div class="ss-lbl">${t.defCryo}</div><div class="ss-val">${res.cryo}</div></div>
    </div>
    <div class="armor-piece-note">${t.defCryoNote}</div>
  `;
}

document.getElementById('usePowerArmorToggle').addEventListener('change', renderAll);


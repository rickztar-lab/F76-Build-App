function renderWeaponSearch(){
  const input = document.getElementById('weaponSearchInput');
  const results = document.getElementById('weaponResults');
  input.addEventListener('input', ()=>{
    const q = input.value.trim().toLowerCase();
    document.getElementById('noMatchBox').innerHTML = "";
    if(q.length < 1){ results.classList.remove('show'); results.innerHTML=""; return; }
    const t = T();
    const pool = allWeapons();
    const matches = pool.filter(w => w.name.toLowerCase().includes(q)).slice(0,20);
    results.innerHTML = matches.map(w =>{
      let catLine, badge = "";
      if(w.custom){
        catLine = (CUSTOM_TYPE_OPTIONS.find(o=>o.key===w.catKey)||{})[state.lang];
        badge = `<span class="custom-badge">${state.lang==='es'?'PERSONAL':'CUSTOM'}</span>`;
      } else if(w.wiki){
        catLine = w.catKeys.map(c=>t.categories[c]||c).join(" + ");
        badge = `<span class="custom-badge" style="color:var(--green);border-color:var(--green-dim);">WIKI</span>`;
      } else {
        catLine = (t.weaponCats[w.category]||w.category) + ' · ' + w.subcategory;
      }
      return `<div class="weapon-result-item" data-name="${esc(w.name)}">${esc(w.name)}${badge}<div class="wcat">${catLine}</div></div>`;
    }).join("");
    results.classList.toggle('show', matches.length>0);
    if(matches.length===0){
      renderNoMatchForm(input.value.trim());
    }
    results.querySelectorAll('.weapon-result-item').forEach(el=>{
      el.addEventListener('click', ()=>{
        const w = pool.find(x=>x.name===el.dataset.name);
        state.selectedWeapon = w;
        state.weaponMods = {};
        state.weaponLegendaryEffects = [null, null, null, null];
        state.weaponReceiverTier = null;
        input.value = "";
        results.classList.remove('show');
        document.getElementById('noMatchBox').innerHTML = "";
        renderAll();
      });
    });
  });
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('.weapon-search-wrap')){ results.classList.remove('show'); }
  });
}

function renderNoMatchForm(typedName){
  const t = T();
  const box = document.getElementById('noMatchBox');
  const optionsHtml = CUSTOM_TYPE_OPTIONS.map((o,i)=>
    `<option value="${i}">${state.lang==='es'?o.es:o.en}</option>`
  ).join("");
  const label1 = state.lang==='es' ? "No está en la base. Agrégala manualmente:" : "Not in the database. Add it manually:";
  const label2 = state.lang==='es' ? "Es de energía" : "Energy weapon";
  const btnLabel = state.lang==='es' ? "GUARDAR ARMA" : "SAVE WEAPON";
  box.innerHTML = `
    <div class="no-match-box">
      <div class="nm-title">${label1}</div>
      <div class="nm-row">
        <select id="nmType">${optionsHtml}</select>
        <label class="energy-check"><input type="checkbox" id="nmEnergy"> ${label2}</label>
      </div>
      <button class="btn" id="nmSaveBtn">${btnLabel}</button>
    </div>
  `;
  document.getElementById('nmSaveBtn').addEventListener('click', ()=>{
    const idx = parseInt(document.getElementById('nmType').value);
    const catKey = CUSTOM_TYPE_OPTIONS[idx].key;
    const energy = document.getElementById('nmEnergy').checked;
    addCustomWeapon(typedName, catKey, energy);
    state.selectedWeapon = {name:typedName, catKey, energy, custom:true};
    state.weaponMods = {};
    state.weaponLegendaryEffects = [null, null, null, null];
        state.weaponReceiverTier = null;
    document.getElementById('weaponSearchInput').value = "";
    document.getElementById('weaponResults').classList.remove('show');
    box.innerHTML = "";
    renderAll();
  });
}

function renderSelectedWeaponBox(){
  const t = T();
  const box = document.getElementById('selectedWeaponBox');
  const modsBox = document.getElementById('modsBox');
  if(!state.selectedWeapon){ box.innerHTML = ""; modsBox.innerHTML = ""; return; }
  const w = state.selectedWeapon;
  let typeLabel;
  if(w.custom){
    typeLabel = (CUSTOM_TYPE_OPTIONS.find(o=>o.key===w.catKey)||{})[state.lang];
  } else if(w.wiki){
    typeLabel = w.catKeys.map(c=>t.categories[c]||c).join(" + ");
  } else {
    typeLabel = t.weaponCats[w.category]||w.category;
  }
  box.innerHTML = `
    <div class="selected-weapon">
      <span class="wname">${esc(w.name)} <span style="color:var(--text-dim);font-weight:400;">(${typeLabel}${w.custom?', '+(state.lang==='es'?'personalizada':'custom'):''}${w.wiki?', wiki':''})</span></span>
      <button id="clearWeaponBtn">${t.remove}</button>
    </div>
    <div id="weaponDamageBox"></div>
  `;
  document.getElementById('clearWeaponBtn').addEventListener('click', ()=>{
    state.selectedWeapon = null;
    state.weaponLegendaryEffects = [null, null, null, null];
        state.weaponReceiverTier = null;
    renderAll();
  });
  renderWeaponDamageBox();
  renderModsBox();
  renderWeaponLegendaryBox();
}

// Muestra el daño verificado del ESM para el arma seleccionada, con un
// selector de receptor de daño (Tier 1/2). Si el arma no tiene daño
// verificado, lo dice explícitamente (mismo criterio de honestidad que el
// resto de la app: no inventar un número). Solo aplica a armas del catálogo
// del juego; las personalizadas no tienen dato.
function renderWeaponDamageBox(){
  const t = T();
  const box = document.getElementById('weaponDamageBox');
  if(!box) return;
  const w = state.selectedWeapon;
  if(!w || w.custom){ box.innerHTML = ""; return; }

  const dmg = computeWeaponDamage(w.name, state.weaponReceiverTier || null);
  if(!dmg){
    box.innerHTML = `<div class="weapon-dmg-box"><div class="wdmg-none">${t.weaponDamageNone}</div></div>`;
    return;
  }
  if(dmg.notRepresentative){
    box.innerHTML = `<div class="weapon-dmg-box"><div class="wdmg-none">${t.weaponDamageNotRepresentative}</div></div>`;
    return;
  }

  const tierOpts = [
    {key:'', label:t.weaponReceiverNone},
    {key:'tier1', label:t.weaponReceiverTier1},
    {key:'tier2', label:t.weaponReceiverTier2}
  ].map(o=>`<option value="${o.key}" ${(state.weaponReceiverTier||'')===o.key?'selected':''}>${o.label}</option>`).join('');

  const dpsLine = dmg.dps !== null
    ? `<span class="wdmg-stat">${t.weaponDamageDps}: <b>${dmg.dps}</b></span> <span class="wdmg-sub">(${dmg.fireRate}/s)</span>`
    : `<span class="wdmg-sub">${t.weaponDamageMelee}</span>`;
  const multLine = dmg.mult > 0 ? ` <span class="wdmg-sub">(${dmg.base} × ${(1+dmg.mult).toFixed(2)})</span>` : '';

  box.innerHTML = `
    <div class="weapon-dmg-box">
      <div class="wdmg-title">${t.weaponDamageTitle} <span class="wdmg-badge">GAME FILES</span></div>
      <div class="wdmg-row">
        <span class="wdmg-stat">${t.weaponDamagePerShot}: <b>${dmg.final}</b>${multLine}</span>
      </div>
      <div class="wdmg-row">${dpsLine}</div>
      <label class="wdmg-receiver">${t.weaponReceiverLabel}
        <select id="weaponReceiverSelect">${tierOpts}</select>
      </label>
      <div class="wdmg-note">${t.weaponDamageNote}</div>
    </div>
  `;
  document.getElementById('weaponReceiverSelect').addEventListener('change', (e)=>{
    state.weaponReceiverTier = e.target.value || null;
    renderWeaponDamageBox();
  });
}

const MOD_SLOTS = [
  {key:"scope", es:"Mira / Mirilla", en:"Sight / Scope"},
  {key:"suppressor", es:"Silenciador", en:"Suppressor"},
  {key:"stock", es:"Culata", en:"Stock"},
  {key:"extmag", es:"Cargador extendido", en:"Extended magazine"},
  {key:"muzzle", es:"Compensador", en:"Compensator"}
];
function renderModsBox(){
  const modsBox = document.getElementById('modsBox');
  if(!state.weaponMods) state.weaponMods = {};
  const title = state.lang==='es' ? "MODS EQUIPADOS (referencia)" : "EQUIPPED MODS (reference)";
  const note = state.lang==='es'
    ? "La mayoría de cartas no dependen de mods, pero algunas sí (ej. Scoped-up, Sniper, Mister Sandman) — esas se marcan en la carta según lo que actives aquí."
    : "Most cards don't depend on mods, but a few do (e.g. Scoped-up, Sniper, Mister Sandman) — those get flagged on the card based on what you check here.";
  const rowsHtml = MOD_SLOTS.map(m=>{
    const checked = state.weaponMods[m.key] ? "checked" : "";
    const active = state.weaponMods[m.key] ? " active" : "";
    const label = state.lang==='es' ? m.es : m.en;
    return `<label class="mod-chip${active}"><input type="checkbox" data-mod="${m.key}" ${checked}><span class="dot"></span>${label}</label>`;
  }).join("");
  modsBox.innerHTML = `
    <div class="mods-box">
      <div class="mb-title">${title}</div>
      <div class="mb-grid">${rowsHtml}</div>
      <div class="mb-note">${note}</div>
    </div>
  `;
  modsBox.querySelectorAll('input[data-mod]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      state.weaponMods[cb.dataset.mod] = cb.checked;
      cb.closest('.mod-chip').classList.toggle('active', cb.checked);
      renderGrid();
    });
  });
}

// Pools por estrella (1-4), en ese orden — ver LEGENDARY_WEAPON_EFFECTS'
// trust note (Tanda 4, 117 efectos GAME FILES).
const LEGENDARY_WEAPON_TIER_POOLS = [
  LEGENDARY_WEAPON_EFFECTS.tier1_effects,
  LEGENDARY_WEAPON_EFFECTS.tier2_effects,
  LEGENDARY_WEAPON_EFFECTS.tier3_effects,
  LEGENDARY_WEAPON_EFFECTS.tier4_effects
];

// Arma un <div class="star-slot-card"> para una estrella dada de un efecto
// legendario de arma. `selectedKey` es el key actualmente elegido para esa
// estrella (o null); `onSelectAttr` es el atributo data-* que el listener de
// afuera usa para identificar qué <select> cambió.
function legendaryStarSlotHtml(starIdx, selectedKey, selectAttrName, selectAttrValue){
  const t = T();
  const pool = LEGENDARY_WEAPON_TIER_POOLS[starIdx];
  const current = pool.find(e => e.key === selectedKey);
  const optsHtml = pool.map(e =>
    `<option value="${e.key}" ${selectedKey===e.key?'selected':''}>${e.name}</option>`
  ).join('');
  const descText = current ? (state.lang==='es' ? current.textEs : current.textEn) : '';
  const badge = current
    ? `<span class="${current.verifiedNumber?'star-slot-verified':'star-slot-pending'}">${current.verifiedNumber?t.legendaryVerifiedBadge:t.legendaryPendingBadge}</span>`
    : '';
  return `
    <div class="star-slot-card${current?' filled':''}">
      <span class="star-slot-badge">${starIdx+1}★</span>
      <div class="star-slot-body">
        <select ${selectAttrName}="${selectAttrValue}" class="star-slot-select">
          <option value="">${t.weaponLegendaryNone}</option>
          ${optsHtml}
        </select>
        ${current ? `<div class="star-slot-desc">${descText} ${badge}</div>` : ''}
      </div>
    </div>`;
}

// Legendary weapon effect picker — 4 estrellas (Tanda 4, ver
// LEGENDARY_WEAPON_EFFECTS' trust note above). Pure display + state, doesn't
// feed any damage calculation yet since that needs Phase "DPS calculado".
function renderWeaponLegendaryBox(){
  const t = T();
  const box = document.getElementById('weaponLegendaryBox');
  if(!state.selectedWeapon){ box.innerHTML = ""; return; }
  if(!Array.isArray(state.weaponLegendaryEffects)) state.weaponLegendaryEffects = [null,null,null,null];
  const slotsHtml = [0,1,2,3].map(i =>
    legendaryStarSlotHtml(i, state.weaponLegendaryEffects[i], 'data-star', i)
  ).join('');
  box.innerHTML = `
    <div class="mods-box">
      <div class="mb-title">${t.hWeaponLegendary}</div>
      ${slotsHtml}
      <div class="mb-note">${t.weaponLegendaryNote}</div>
    </div>
  `;
  box.querySelectorAll('select[data-star]').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const i = parseInt(sel.dataset.star);
      state.weaponLegendaryEffects[i] = sel.value || null;
      renderWeaponLegendaryBox();
    });
  });
}

// Weapon loadout: up to 5 independently-configurable weapons (own mods +
// legendary effect each), separate from the single `state.selectedWeapon`
// used above for the perk-card compatibility filter — that filter behavior
// (perkMatchesWeapon/onlyCompatible) is untouched by this panel on purpose.
function renderWeaponLoadout(){
  const t = T();
  document.getElementById('txt-h-loadout').textContent = t.hWeaponLoadout;
  document.getElementById('txt-loadout-note').textContent = t.loadoutNote;
  const box = document.getElementById('weaponLoadoutBox');
  if(!state.weaponLoadout) state.weaponLoadout = [null,null,null,null,null];
  const pool = allWeapons();

  box.innerHTML = state.weaponLoadout.map((slot, idx) => {
    if(!slot){
      return `
        <div class="gear-slot loadout-card">
          <div class="mb-title">${t.loadoutEmptySlot(idx+1)}</div>
          <div class="weapon-search-wrap">
            <input type="text" class="loadout-search-input" data-slot="${idx}" placeholder="${t.loadoutSearchPlaceholder}">
            <div class="weapon-results" data-slot-results="${idx}"></div>
          </div>
        </div>`;
    }
    const w = slot.weapon;
    let typeLabel;
    if(w.custom){
      typeLabel = (CUSTOM_TYPE_OPTIONS.find(o=>o.key===w.catKey)||{})[state.lang];
    } else if(w.wiki){
      typeLabel = w.catKeys.map(c=>t.categories[c]||c).join(" + ");
    } else {
      typeLabel = t.weaponCats[w.category]||w.category;
    }
    if(!slot.mods) slot.mods = {};
    const modsHtml = MOD_SLOTS.map(m=>{
      const checked = slot.mods[m.key] ? "checked" : "";
      const active = slot.mods[m.key] ? " active" : "";
      const label = state.lang==='es' ? m.es : m.en;
      return `<label class="mod-chip${active}"><input type="checkbox" data-slot="${idx}" data-mod="${m.key}" ${checked}><span class="dot"></span>${label}</label>`;
    }).join("");
    if(!Array.isArray(slot.legendaryEffects)) slot.legendaryEffects = [null,null,null,null];
    const legSlotsHtml = [0,1,2,3].map(i =>
      legendaryStarSlotHtml(i, slot.legendaryEffects[i], 'data-slot-leg', `${idx}:${i}`)
    ).join('');
    return `
      <div class="gear-slot installed loadout-card">
        <div class="selected-weapon">
          <span class="wname">${esc(w.name)} <span style="color:var(--text-dim);font-weight:400;">(${typeLabel})</span></span>
          <button data-remove-slot="${idx}">${t.remove}</button>
        </div>
        <div class="mods-box">
          <div class="mb-grid">${modsHtml}</div>
          ${legSlotsHtml}
        </div>
      </div>`;
  }).join("");

  box.querySelectorAll('.loadout-search-input').forEach(input=>{
    const idx = parseInt(input.dataset.slot);
    const resultsBox = box.querySelector(`[data-slot-results="${idx}"]`);
    input.addEventListener('input', ()=>{
      const q = input.value.trim().toLowerCase();
      if(q.length < 1){ resultsBox.classList.remove('show'); resultsBox.innerHTML=""; return; }
      const matches = pool.filter(w => w.name.toLowerCase().includes(q)).slice(0,20);
      resultsBox.innerHTML = matches.map(w => `<div class="weapon-result-item" data-name="${esc(w.name)}">${esc(w.name)}</div>`).join("");
      resultsBox.classList.toggle('show', matches.length>0);
      resultsBox.querySelectorAll('.weapon-result-item').forEach(el=>{
        el.addEventListener('click', ()=>{
          const w = pool.find(x=>x.name===el.dataset.name);
          state.weaponLoadout[idx] = { weapon: w, mods: {}, legendaryEffects: [null,null,null,null] };
          renderWeaponLoadout();
        });
      });
    });
  });

  box.querySelectorAll('[data-remove-slot]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.removeSlot);
      state.weaponLoadout[idx] = null;
      renderWeaponLoadout();
    });
  });

  box.querySelectorAll('input[data-mod][data-slot]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const idx = parseInt(cb.dataset.slot);
      state.weaponLoadout[idx].mods[cb.dataset.mod] = cb.checked;
      cb.closest('.mod-chip').classList.toggle('active', cb.checked);
    });
  });

  box.querySelectorAll('select[data-slot-leg]').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const [idx, starIdx] = sel.dataset.slotLeg.split(':').map(Number);
      state.weaponLoadout[idx].legendaryEffects[starIdx] = sel.value || null;
      renderWeaponLoadout();
    });
  });
}

// Dynamic rules engine: given the weapon already picked in the filter above,
// greedily equips the highest affordable rank of every compatible normal
// card (reusing perkMatchesWeapon — the same verified category matching the
// manual filter uses) within the current effective SPECIAL budget per
// attribute (same rule specialSpent()/the manual UI already enforces), then
// applies the verified armor set with the best number for the chosen
// priority to all 4 slots. This is a simple greedy rule, not a damage
// optimizer — there's no verified damage data to optimize against (see the
// DPS roadmap entry). Doesn't touch SPECIAL point allocation or legendaries.

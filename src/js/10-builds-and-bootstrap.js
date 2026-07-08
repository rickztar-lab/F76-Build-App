function renderAll(){
  renderStaticText();
  renderMainTabs();
  renderCharStatePanel();
  renderSpecialPanel();
  renderTabs();
  renderSelectedWeaponBox();
  renderMutationsPanel();
  renderChemsPanel();
  renderLegendaryPanel();
  renderArmorPanel();
  renderWeaponLoadout();
  renderRulesEngine();
  renderGrid();
  renderBuildsList();
  renderArmorSetsList();
  renderLevelProgressChart();
  renderLevelPlanner();
  renderStatSummary();
  renderEquippedSummary();
  renderPerkCoinsCalculator();
  renderLiveEffectsPanel();
  renderRaidPanel();
}

document.getElementById('searchInput').addEventListener('input', (e)=>{
  state.search = e.target.value;
  renderGrid();
});
document.getElementById('poolInput').addEventListener('change', (e)=>{
  let v = parseInt(e.target.value) || 56;
  state.pool = v;
  renderAll();
});
document.getElementById('onlyCompatibleToggle').addEventListener('change', (e)=>{
  state.onlyCompatible = e.target.checked;
  renderGrid();
});
document.getElementById('btnLangEs').addEventListener('click', ()=>{ state.lang = 'es'; renderAll(); });
document.getElementById('btnLangEn').addEventListener('click', ()=>{ state.lang = 'en'; renderAll(); });

const STORAGE_KEY = "fo76_builds_v1";

function loadBuilds(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch(e){ return []; }
}
function saveBuilds(builds){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(builds)); }catch(e){} }
function renderBuildsList(){
  const t = T();
  const builds = loadBuilds();
  const list = document.getElementById('buildsList');
  const empty = document.getElementById('buildsEmptyNote');
  list.innerHTML = "";
  empty.style.display = builds.length ? "none" : "block";
  builds.forEach((b, idx)=>{
    const row = document.createElement('div');
    row.className = "build-item";
    row.innerHTML = `
      <span class="bname">${esc(b.name)}</span>
      <span class="bactions">
        <button data-i="${idx}" data-act="load">${t.load}</button>
        <button data-i="${idx}" data-act="dup">${t.dup}</button>
        <button data-i="${idx}" data-act="del" class="del">${t.del}</button>
      </span>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.i);
      const act = btn.dataset.act;
      const builds = loadBuilds();
      if(act === "load"){
        const b = migrateBuild(builds[idx]);
        state.pool = b.pool;
        state.special = b.special;
        state.perkRanks = b.perkRanks;
        state.selectedWeapon = b.selectedWeapon;
        state.weaponMods = b.weaponMods;
        state.weaponLegendaryEffects = b.weaponLegendaryEffects;
        state.weaponReceiverTier = b.weaponReceiverTier;
        state.weaponLoadout = b.weaponLoadout;
        state.charLevel = b.charLevel;
        state.legendaryPerks = b.legendaryPerks;
        state.activeMutations = b.activeMutations;
        state.armorSlots = b.armorSlots;
        state.paPieceSlots = b.paPieceSlots;
        state.charState = b.charState;
        document.getElementById('usePowerArmorToggle').checked = b.usingPA;
        renderAll();
      } else if(act === "dup"){
        const b = JSON.parse(JSON.stringify(builds[idx]));
        b.name = b.name + " (copy)";
        builds.push(b);
        saveBuilds(builds);
        renderBuildsList();
      } else if(act === "del"){
        builds.splice(idx,1);
        saveBuilds(builds);
        renderBuildsList();
      }
    });
  });
  renderBuildCompare();
}
document.getElementById('saveBuildBtn').addEventListener('click', ()=>{
  const nameInput = document.getElementById('buildNameInput');
  const name = nameInput.value.trim() || ("Build " + new Date().toLocaleString());
  const builds = loadBuilds();
  builds.push({
    schemaVersion: BUILD_SCHEMA_VERSION,
    name,
    pool: state.pool,
    special: {...state.special},
    perkRanks: {...state.perkRanks},
    selectedWeapon: state.selectedWeapon,
    weaponMods: {...state.weaponMods},
    weaponLegendaryEffects: JSON.parse(JSON.stringify(state.weaponLegendaryEffects || [null,null,null,null])),
    weaponReceiverTier: state.weaponReceiverTier,
    weaponLoadout: JSON.parse(JSON.stringify(state.weaponLoadout || [null,null,null,null,null])),
    charLevel: state.charLevel,
    legendaryPerks: JSON.parse(JSON.stringify(state.legendaryPerks)),
    activeMutations: [...state.activeMutations],
    armorSlots: {...state.armorSlots},
    paPieceSlots: JSON.parse(JSON.stringify(state.paPieceSlots || {helmet:null,torso:null,leftArm:null,rightArm:null,legs:null})),
    usingPA: document.getElementById('usePowerArmorToggle').checked,
    charState: {...state.charState}
  });
  saveBuilds(builds);
  nameInput.value = "";
  renderBuildsList();
});

// Side-by-side, read-only comparison of two saved builds. Reuses
// getEffectiveSpecial(src) and computeArmorResistances(...) with explicit
// params (both already support that) instead of touching live state, so
// comparing builds never loads/overwrites the character you're editing.
function renderBuildCompare(){
  const t = T();
  const box = document.getElementById('buildCompareBox');
  const builds = loadBuilds();
  if(builds.length < 2){ box.innerHTML = `<div class="summary-empty">${t.buildCompareNeedTwo}</div>`; return; }

  const optsHtml = builds.map((b,i)=>`<option value="${i}">${esc(b.name)}</option>`).join('');
  const prevA = box.dataset.a || "0";
  const prevB = box.dataset.b || "1";

  const statsFor = (b) => {
    const src = {
      special: b.special,
      perkRanks: b.perkRanks,
      legendaryPerks: b.legendaryPerks,
      activeMutations: b.activeMutations
    };
    const eff = getEffectiveSpecial(src);
    const derived = computeDerivedStats(eff);
    const armorRes = computeArmorResistances(b.armorSlots, b.paPieceSlots, b.usingPA);
    return {eff, derived, armorRes};
  };

  const renderBuildBlock = (label, idxVal) => {
    if(idxVal === "" || !builds[parseInt(idxVal)]) return '';
    const b = migrateBuild(builds[parseInt(idxVal)]);
    const {eff, derived, armorRes} = statsFor(b);
    const specialHtml = SPECIAL_LIST.map(s=>{
      const key = s.key;
      const base = eff[key].base, capped = eff[key].capped;
      const diff = capped !== base;
      return `<div class="sl-item">${t.special[key]}: ${base}${diff?` → ${capped}`:''}</div>`;
    }).join('');
    const defHtml = armorRes.usingPA
      ? `<div class="sl-item">DR/ER ${armorRes.flatDrEr} · DMG ${armorRes.dmgPct}% · RAD ${armorRes.radPct}%</div>`
      : `<div class="sl-item">${t.defDR} ${armorRes.dr} · ${t.defER} ${armorRes.er} · ${t.defRR} ${armorRes.rr} · ${t.defCryo} ${armorRes.cryo}</div>`;
    const legNames = (b.legendaryPerks||[]).filter(Boolean).map(lp=>`${lp.name} (${lp.rank}/4)`);
    const mutNames = (b.activeMutations||[]).map(mKey => { const m = MUTATIONS.find(x=>x.key===mKey); return m ? m.name : mKey; });
    return `
      <div class="mods-box">
        <div class="mb-title">${label}: ${esc(b.name)}</div>
        <div class="summary-sub">${t.bcLevel}</div>
        <div class="sl-item">${b.charLevel || 50}</div>
        <div class="summary-sub">${t.bcSpecial}</div>
        <div class="summary-list">${specialHtml}</div>
        <div class="summary-sub">${t.bcDerived}</div>
        <div class="sl-item">HP ${derived.hp} · AP ${derived.ap} · CW ${derived.cw} lb · XP +${derived.xp}%</div>
        <div class="summary-sub">${t.bcDef}</div>
        ${defHtml}
        <div class="summary-sub">${t.bcLegendaries}</div>
        <div class="summary-list">${legNames.length ? legNames.map(n=>`<div class="sl-item">${n}</div>`).join('') : `<div class="summary-empty">${t.summaryNoneEquipped}</div>`}</div>
        <div class="summary-sub">${t.bcMutations}</div>
        <div class="summary-list">${mutNames.length ? mutNames.map(n=>`<div class="sl-item">${n}</div>`).join('') : `<div class="summary-empty">${t.summaryNoneActive}</div>`}</div>
      </div>`;
  };

  box.innerHTML = `
    <div class="mods-box">
      <label>${t.buildCompareA}
        <select id="buildCompareASelect">${optsHtml}</select>
      </label>
      <label style="margin-left:12px;">${t.buildCompareB}
        <select id="buildCompareBSelect">${optsHtml}</select>
      </label>
    </div>
    <div class="build-compare-grid" id="buildCompareResult"></div>
  `;
  const selA = document.getElementById('buildCompareASelect');
  const selB = document.getElementById('buildCompareBSelect');
  selA.value = Math.min(parseInt(prevA), builds.length-1);
  selB.value = Math.min(parseInt(prevB), builds.length-1);
  const renderResult = ()=>{
    box.dataset.a = selA.value;
    box.dataset.b = selB.value;
    document.getElementById('buildCompareResult').innerHTML =
      renderBuildBlock(t.buildCompareA, selA.value) + renderBuildBlock(t.buildCompareB, selB.value);
  };
  selA.addEventListener('change', renderResult);
  selB.addEventListener('change', renderResult);
  renderResult();
}

// Saved armor sets: same save/load/duplicate/delete pattern as builds above,
// scoped to just armorSlots + paPieceSlots + usingPA so a user can keep
// several named armor configurations without overwriting their full build.
const ARMOR_SETS_STORAGE_KEY = "fo76_armor_sets_v1";
function loadArmorSets(){
  try{ return JSON.parse(localStorage.getItem(ARMOR_SETS_STORAGE_KEY)) || []; }catch(e){ return []; }
}
function saveArmorSets(sets){ try{ localStorage.setItem(ARMOR_SETS_STORAGE_KEY, JSON.stringify(sets)); }catch(e){} }

function renderArmorSetsList(){
  const t = T();
  const sets = loadArmorSets();
  const list = document.getElementById('armorSetsList');
  const empty = document.getElementById('armorSetsEmptyNote');
  list.innerHTML = "";
  empty.style.display = sets.length ? "none" : "block";
  sets.forEach((s, idx)=>{
    const row = document.createElement('div');
    row.className = "build-item";
    row.innerHTML = `
      <span class="bname">${esc(s.name)}</span>
      <span class="bactions">
        <button data-i="${idx}" data-act="load">${t.load}</button>
        <button data-i="${idx}" data-act="dup">${t.dup}</button>
        <button data-i="${idx}" data-act="del" class="del">${t.del}</button>
      </span>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.i);
      const act = btn.dataset.act;
      const sets = loadArmorSets();
      if(act === "load"){
        const s = sets[idx];
        state.armorSlots = {...s.armorSlots};
        state.paPieceSlots = migratePAPieceSlots(s);
        document.getElementById('usePowerArmorToggle').checked = !!s.usingPA;
        renderAll();
      } else if(act === "dup"){
        const s = JSON.parse(JSON.stringify(sets[idx]));
        s.name = s.name + " (copy)";
        sets.push(s);
        saveArmorSets(sets);
        renderArmorSetsList();
      } else if(act === "del"){
        sets.splice(idx,1);
        saveArmorSets(sets);
        renderArmorSetsList();
      }
    });
  });
  renderArmorSetsCompare();
}
document.getElementById('saveArmorSetBtn').addEventListener('click', ()=>{
  const nameInput = document.getElementById('armorSetNameInput');
  const name = nameInput.value.trim() || ("Armor " + new Date().toLocaleString());
  const sets = loadArmorSets();
  sets.push({
    name,
    armorSlots: {...state.armorSlots},
    paPieceSlots: JSON.parse(JSON.stringify(state.paPieceSlots || {helmet:null,torso:null,leftArm:null,rightArm:null,legs:null})),
    usingPA: document.getElementById('usePowerArmorToggle').checked
  });
  saveArmorSets(sets);
  nameInput.value = "";
  renderArmorSetsList();
});

// Side-by-side resistance comparison of two saved armor sets, reusing
// computeArmorResistances() with explicit params instead of live state.
function renderArmorSetsCompare(){
  const t = T();
  const box = document.getElementById('armorSetsCompareBox');
  const sets = loadArmorSets();
  if(sets.length < 2){ box.innerHTML = ""; return; }

  const optsHtml = sets.map((s,i)=>`<option value="${i}">${esc(s.name)}</option>`).join('');
  const prevA = box.dataset.a || "0";
  const prevB = box.dataset.b || "1";

  const renderStatBlock = (label, idxVal) => {
    if(idxVal === ""){
      return `<div class="pb-def-stat"><div class="ss-lbl">${label}</div><div class="ss-val">—</div></div>`;
    }
    const s = sets[parseInt(idxVal)];
    if(!s) return '';
    const res = computeArmorResistances(s.armorSlots, migratePAPieceSlots(s), s.usingPA);
    if(res.usingPA){
      return `
        <div class="armor-totals">
          <div class="pb-def-stat"><div class="ss-lbl">${label}: ${esc(s.name)}</div><div class="ss-val">DR/ER ${res.flatDrEr}</div></div>
          <div class="pb-def-stat"><div class="ss-lbl">DMG</div><div class="ss-val">${res.dmgPct}%</div></div>
          <div class="pb-def-stat"><div class="ss-lbl">RAD</div><div class="ss-val">${res.radPct}%</div></div>
        </div>`;
    }
    return `
      <div class="armor-totals">
        <div class="pb-def-stat"><div class="ss-lbl">${label}: ${esc(s.name)}</div><div class="ss-val">${t.defDR} ${res.dr}</div></div>
        <div class="pb-def-stat"><div class="ss-lbl">${t.defER}</div><div class="ss-val">${res.er}</div></div>
        <div class="pb-def-stat"><div class="ss-lbl">${t.defRR}</div><div class="ss-val">${res.rr}</div></div>
        <div class="pb-def-stat"><div class="ss-lbl">${t.defCryo||'CRYO'}</div><div class="ss-val">${res.cryo}</div></div>
      </div>`;
  };

  box.innerHTML = `
    <div class="summary-sub">${t.armorSetsCompareTitle}</div>
    <div class="summary-empty">${t.armorSetsComparePick}</div>
    <div class="mods-box">
      <label>${t.armorSetsCompareA}
        <select id="armorSetCompareA">${optsHtml}</select>
      </label>
      <label style="margin-left:12px;">${t.armorSetsCompareB}
        <select id="armorSetCompareB">${optsHtml}</select>
      </label>
    </div>
    <div id="armorSetCompareResult"></div>
  `;
  const selA = document.getElementById('armorSetCompareA');
  const selB = document.getElementById('armorSetCompareB');
  selA.value = Math.min(parseInt(prevA), sets.length-1);
  selB.value = Math.min(parseInt(prevB), sets.length-1);
  const renderResult = ()=>{
    box.dataset.a = selA.value;
    box.dataset.b = selB.value;
    document.getElementById('armorSetCompareResult').innerHTML =
      renderStatBlock(t.armorSetsCompareA, selA.value) + renderStatBlock(t.armorSetsCompareB, selB.value);
  };
  selA.addEventListener('change', renderResult);
  selB.addEventListener('change', renderResult);
  renderResult();
}

renderWeaponSearch();
renderAll();

// Registro del service worker (PWA): permite instalar la app y usarla
// offline. Solo corre servido por http(s); al abrir el archivo con file://
// se ignora silenciosamente, así que no afecta el modo offline-first de
// abrir el index.html directo.
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

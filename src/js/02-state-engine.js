function computeWeaponDamage(weaponName, receiverTier){
  const w = WEAPON_DAMAGE_DATA.weapons[weaponName];
  if(!w){
    // Arma que SÍ está en el ESM pero cuyo daño no vive en Base Damage
    // (energía/explosivo/melee automática): estado distinto a "no cruzada".
    if(WEAPON_DAMAGE_DATA.base_not_representative.indexOf(weaponName) !== -1){
      return {notRepresentative: true};
    }
    return null;
  }
  const tiers = WEAPON_DAMAGE_DATA.receiver_damage_tiers;
  const mult = receiverTier && tiers[receiverTier] ? tiers[receiverTier] : 0;
  const base = w.base_damage;
  const final = base * (1 + mult);
  return {
    base,
    mult,
    final: Math.round(final * 100) / 100,
    fireRate: w.fire_rate_per_sec || null,
    dps: w.fire_rate_per_sec ? Math.round(final * w.fire_rate_per_sec * 10) / 10 : null
  };
}

// Named Power Armor piece slots for the per-piece legendary picker. The
// verified frame math (60 flat DR/ER + 7%/piece damage + 15%/piece
// radiation) only cares about *how many* pieces are installed, not which —
// so this is purely a more granular UI over the exact same math, plus an
// optional (unverified, see above) legendary tag per piece.
const PA_PIECE_SLOTS = [
  {key:"helmet", es:"Casco", en:"Helmet"},
  {key:"torso", es:"Torso", en:"Torso"},
  {key:"leftArm", es:"Brazo izquierdo", en:"Left Arm"},
  {key:"rightArm", es:"Brazo derecho", en:"Right Arm"},
  {key:"legs", es:"Piernas", en:"Legs"}
];
function paPiecesInstalledCount(paPieceSlots){
  return Object.values(paPieceSlots||{}).filter(Boolean).length;
}
// Migrates a saved build/armor-set object to the named-slots format: if it
// already has paPieceSlots (current format), deep-clones it; if it only has
// the old flat paPieces count, synthesizes that many installed slots (no
// legendary effect, since that concept didn't exist in the old format).
function migratePAPieceSlots(saved){
  if(saved && saved.paPieceSlots) return JSON.parse(JSON.stringify(saved.paPieceSlots));
  const legacyCount = saved && typeof saved.paPieces === 'number' ? saved.paPieces : 0;
  const slots = {helmet:null, torso:null, leftArm:null, rightArm:null, legs:null};
  const keys = PA_PIECE_SLOTS.map(p=>p.key);
  for(let i=0; i<legacyCount && i<keys.length; i++){
    slots[keys[i]] = {legendaryEffect:null};
  }
  return slots;
}

// Versión actual del esquema de builds guardadas. Subir en +1 cada vez que
// cambie la FORMA de una build guardada, y agregar el paso correspondiente
// en migrateBuild().
const BUILD_SCHEMA_VERSION = 1;

// Punto único de compatibilidad hacia atrás: toma una build guardada de
// cualquier versión anterior y devuelve una copia normalizada al esquema
// actual, con defaults seguros para todo campo que falte. Toda lectura de
// builds (cargar, duplicar, comparar) pasa por acá, así el resto del código
// asume siempre la forma actual. Antes esto vivía disperso como `|| default`
// en cada sitio de carga; centralizarlo evita que un campo nuevo se olvide
// en alguno de ellos (ver auditoría, hallazgo H5).
// Normaliza el campo de efectos legendarios de arma a un array fijo de 4
// posiciones (una por estrella). Acepta el array nuevo tal cual, o migra el
// campo singular viejo (pre-Tanda 4, solo 1★) a `[valorViejo, null, null, null]`.
function normalizeLegendaryStars(starsArr, legacySingle){
  const out = [null, null, null, null];
  if(Array.isArray(starsArr)){
    for(let i=0; i<4; i++) out[i] = starsArr[i] || null;
  } else if(legacySingle){
    out[0] = legacySingle;
  }
  return out;
}

function migrateBuild(b){
  b = b || {};
  const loadout = b.weaponLoadout ? JSON.parse(JSON.stringify(b.weaponLoadout)) : [null,null,null,null,null];
  loadout.forEach(slot=>{
    if(slot) slot.legendaryEffects = normalizeLegendaryStars(slot.legendaryEffects, slot.legendaryEffect);
  });
  return {
    schemaVersion: BUILD_SCHEMA_VERSION,
    name: b.name || "Build",
    pool: typeof b.pool === 'number' ? b.pool : 56,
    special: {...(b.special || {Strength:1,Perception:1,Endurance:1,Charisma:1,Intelligence:1,Agility:1,Luck:1})},
    perkRanks: {...(b.perkRanks || {})},
    selectedWeapon: b.selectedWeapon || null,
    weaponMods: {...(b.weaponMods || {})},
    weaponLegendaryEffects: normalizeLegendaryStars(b.weaponLegendaryEffects, b.weaponLegendaryEffect),
    weaponReceiverTier: b.weaponReceiverTier || null,
    weaponLoadout: loadout,
    charLevel: b.charLevel || 50,
    legendaryPerks: b.legendaryPerks ? JSON.parse(JSON.stringify(b.legendaryPerks)) : [null,null,null,null,null,null],
    activeMutations: b.activeMutations ? [...b.activeMutations] : [],
    armorSlots: {...(b.armorSlots || {})},
    paPieceSlots: migratePAPieceSlots(b),
    usingPA: !!b.usingPA,
    charState: {...(b.charState || {isGhoul:false,hpPercent:100,wellFed:false,wellHydrated:false,inTeam:false,isNight:false,addictions:0,caps:0})}
  };
}

const MOD_DEPENDENT_PERKS = {
  "Scoped-up": "scope",
  "Smart Shot": "scope",
  "Sniper": "scope",
  "Mister Sandman": "suppressor"
};

// Mutations: numeric fields (special/maxHP/carryWeight deltas) are what the
// engine reads for getEffectiveSpecial(); "text" fields are just for display.
// NOTE: Bird Bones' penalty is -4 Strength per verified mutations.json data
// (fallout.fandom.com agrees) — not "-40 Max HP" as sometimes misremembered.
// 7 of these 19 have a numeric channel the engine actually tracks (SPECIAL/
// HP/Carry Weight). The other effects (DR/ER, regen%, accuracy%, etc.) have
// no stat in getEffectiveSpecial() yet, so they're text-only (special:{})
// until a future phase adds resistance/accuracy tracking — marking them
// numerically would just be a fake number, so they stay honest as text.
/*__DATA:MUTATIONS__*/

const SPECIAL_LIST = [
  {key:"Strength", letter:"S"},
  {key:"Perception", letter:"P"},
  {key:"Endurance", letter:"E"},
  {key:"Charisma", letter:"C"},
  {key:"Intelligence", letter:"I"},
  {key:"Agility", letter:"A"},
  {key:"Luck", letter:"L"}
];

let state = {
  lang: "es",
  pool: 56,
  special: {Strength:1,Perception:1,Endurance:1,Charisma:1,Intelligence:1,Agility:1,Luck:1},
  perkRanks: {},
  activeTab: "All",
  search: "",
  selectedWeapon: null,
  weaponMods: {},
  weaponLegendaryEffects: [null, null, null, null],
  weaponReceiverTier: null,
  weaponLoadout: [null,null,null,null,null],
  onlyCompatible: true,
  charLevel: 50,
  legendaryPerks: [null,null,null,null,null,null],
  activeMutations: [],
  activeMainTab: "stat",
  armorSlots: {},
  paPieceSlots: {helmet:null, torso:null, leftArm:null, rightArm:null, legs:null},
  charState: {
    isGhoul: false,
    hpPercent: 100,
    wellFed: false,
    wellHydrated: false,
    inTeam: false,
    isNight: false,
    addictions: 0,
    caps: 0
  }
};

function T(){ return STRINGS[state.lang]; }

// Escapa strings controlados por el usuario (nombres de builds, sets de
// armadura, armas personalizadas) antes de insertarlos vía innerHTML.
// Obligatorio en todo string de usuario: hoy el riesgo es solo local, pero
// con "build compartible vía URL" un link malicioso podría inyectar HTML.
function esc(s){
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Legendary S.P.E.C.I.A.L. cards add +1/+2/+3/+5 to their attribute by rank
// (verified: fallout.fandom.com/wiki/Fallout_76_legendary_perks).
const LEGENDARY_SPECIAL_BONUS_BY_RANK = [0,1,2,3,5];

// Perk Coins cost to rank up a legendary perk card. Index 0 = cost to go
// from rank 1->2, index 1 = rank 2->3, index 2 = rank 3->4. Verified figure,
// already referenced in STRINGS.legCoinsNote ("50/100/150 coins").
const LEGENDARY_RANKUP_COSTS = [50,100,150];

// Computes the effective S.P.E.C.I.A.L. after legendary SPECIAL cards and
// active mutations. "raw" (uncapped) feeds derived stats like HP/AP/Carry
// Weight; "capped" (1-15) feeds the perk-card point limit, matching how the
// game caps usable perk slots at 15 even if the real attribute is higher.
// Class Freak (Luck perk, ranks 1-3) reduces mutation NEGATIVE effects by
// 25/50/75% per its equipped rank — verified in perks.json description text.
// Optional `src` param lets this compute the effective SPECIAL for an
// arbitrary saved build (e.g. the build comparator) instead of only the
// live state — when omitted, it reads state.special/perkRanks/
// legendaryPerks/activeMutations exactly like before. Same defensive
// pattern already used for computeArmorResistances().
function getEffectiveSpecial(src){
  if(src === undefined){
    src = { special: state.special, perkRanks: state.perkRanks, legendaryPerks: state.legendaryPerks, activeMutations: state.activeMutations };
  }
  const classFreakRank = src.perkRanks['Class Freak'] || 0;
  const reduction = classFreakRank * 0.25;

  const result = {};
  let hpDelta = 0, carryWeightDelta = 0;

  for(const s of SPECIAL_LIST){
    const key = s.key;
    let legendaryBonus = 0;
    const lp = src.legendaryPerks.find(x => x && x.name === ('Legendary ' + key));
    if(lp) legendaryBonus = LEGENDARY_SPECIAL_BONUS_BY_RANK[lp.rank] || 0;

    let mutationDelta = 0;
    for(const mKey of src.activeMutations){
      const mut = MUTATIONS.find(m => m.key === mKey);
      if(!mut) continue;
      mutationDelta += (mut.positive.special[key] || 0);
      let neg = mut.negative.special[key] || 0;
      if(neg < 0) neg = neg * (1 - reduction);
      mutationDelta += neg;
    }

    const raw = src.special[key] + legendaryBonus + mutationDelta;
    result[key] = {
      base: src.special[key],
      legendaryBonus,
      mutationDelta,
      raw,
      capped: Math.max(1, Math.min(15, Math.round(raw)))
    };
  }

  for(const mKey of src.activeMutations){
    const mut = MUTATIONS.find(m => m.key === mKey);
    if(!mut) continue;
    hpDelta += (mut.positive.maxHP || 0);
    let negHp = mut.negative.maxHP || 0;
    if(negHp < 0) negHp = negHp * (1 - reduction);
    hpDelta += negHp;

    carryWeightDelta += (mut.positive.carryWeight || 0);
    let negCw = mut.negative.carryWeight || 0;
    if(negCw < 0) negCw = negCw * (1 - reduction);
    carryWeightDelta += negCw;
  }

  result._extra = { hpDelta, carryWeightDelta, classFreakRank, reduction };
  return result;
}

// ---- custom (user-added) weapons, persisted in localStorage ----
const CUSTOM_WEAPONS_KEY = "fo76_custom_weapons_v1";
const CUSTOM_TYPE_OPTIONS = [
  {key:"pistol", es:"Pistola", en:"Pistol"},
  {key:"rifle", es:"Rifle", en:"Rifle"},
  {key:"pistol", es:"Subfusil (SMG)", en:"SMG"},
  {key:"shotgun", es:"Escopeta", en:"Shotgun"},
  {key:"heavy_gun", es:"Arma pesada", en:"Heavy gun"},
  {key:"melee", es:"Cuerpo a cuerpo", en:"Melee"},
  {key:"unarmed", es:"Desarmado", en:"Unarmed"},
  {key:"explosive", es:"Explosivo/Arrojadiza", en:"Explosive/Throwable"}
];
function loadCustomWeapons(){
  try{
    const stored = JSON.parse(localStorage.getItem(CUSTOM_WEAPONS_KEY));
    if(stored) return stored;
  }catch(e){}
  // seed with a verified example so the feature is discoverable
  const seed = [{name:"Elder's Mark", catKey:"pistol", energy:false, note:"SMG (Once in a Blue Moon)"}];
  try{ localStorage.setItem(CUSTOM_WEAPONS_KEY, JSON.stringify(seed)); }catch(e){}
  return seed;
}
function saveCustomWeapons(list){ try{ localStorage.setItem(CUSTOM_WEAPONS_KEY, JSON.stringify(list)); }catch(e){} }
function addCustomWeapon(name, catKey, energy){
  const list = loadCustomWeapons();
  list.push({name, catKey, energy});
  saveCustomWeapons(list);
  return list;
}
function allWeapons(){
  const custom = loadCustomWeapons().map(w => ({...w, custom:true}));
  const base = WEAPONS.map(w => ({...w, custom:false}));
  const wiki = WIKI_WEAPONS.map(w => ({...w, wiki:true}));
  return [...base, ...wiki, ...custom];
}

function weaponCategoriesFor(weapon){
  if(weapon.wiki){
    return weapon.catKeys;
  }
  if(weapon.custom){
    const cats = [weapon.catKey];
    if(weapon.energy) cats.push("energy");
    return cats;
  }
  const cats = [];
  const cat = weapon.category, sub = (weapon.subcategory||"");
  if(cat === "Pistols"){ cats.push("pistol"); if(sub.includes("Energy") || sub.includes("Radiation")) cats.push("energy"); }
  else if(cat === "Rifles"){ cats.push("rifle"); if(sub.includes("Energy")) cats.push("energy"); }
  else if(cat === "SMGs"){ cats.push("pistol"); }
  else if(cat === "Heavy Guns"){ cats.push("heavy_gun"); if(sub.includes("Energy")) cats.push("energy"); }
  else if(cat === "Melee"){ cats.push("melee"); }
  else if(cat === "Throwables"){ cats.push("explosive"); }
  return cats;
}
function perkMatchesWeapon(perkName, weapon){
  if(!weapon) return false;
  const perkCats = PERK_CATEGORIES[perkName] || [];
  const wCats = weaponCategoriesFor(weapon);
  return perkCats.some(c => wCats.includes(c)) || perkCats.includes("general_damage");
}

function specialSpent(specialKey){
  let sum = 0;
  for(const p of PERKS){
    if(p.special !== specialKey) continue;
    const r = state.perkRanks[p.name] || 0;
    if(r > 0){
      const rankObj = p.ranks.find(x=>x.rank===r);
      if(rankObj) sum += rankObj.cost;
    }
  }
  return sum;
}


// Extracted from the live app's MUTATIONS constant (JS, not strict JSON,
// since it uses unquoted keys like the rest of the app's embedded data)
const MUTATIONS = [
  {
    key: "speed_demon",
    name: "Speed Demon",
    positive: { special: {}, textEs: "+20% velocidad de movimiento y recarga", textEn: "+20% movement and reload speed" },
    negative: { special: {}, textEs: "+50% consumo de hambre/sed", textEn: "+50% hunger/thirst drain rate" }
  },
  {
    key: "marsupial",
    name: "Marsupial",
    positive: { carryWeight: 20, special: {}, textEs: "+20 Carga máxima, mayor altura de salto", textEn: "+20 Carry Weight, increased jump height" },
    negative: { special: {Intelligence: -4}, textEs: "-4 Inteligencia", textEn: "-4 Intelligence" }
  },
  {
    key: "scaly_skin",
    name: "Scaly Skin",
    positive: { special: {}, textEs: "+50 Resist. Físico y Energía", textEn: "+50 Damage and Energy Resistance" },
    negative: { special: {}, textEs: "-50 Puntos de Acción máx. (no modelado aún)", textEn: "-50 Max AP (not modeled yet)" }
  },
  {
    key: "herd_mentality",
    name: "Herd Mentality",
    positive: { special: {}, textEs: "+2 a todo el SPECIAL en grupo (no aplicado automático)", textEn: "+2 to all SPECIAL when grouped (not auto-applied)" },
    negative: { special: {Strength:-2,Perception:-2,Endurance:-2,Charisma:-2,Intelligence:-2,Agility:-2,Luck:-2}, textEs: "-2 a todo el SPECIAL en solitario", textEn: "-2 to all SPECIAL when solo" }
  },
  {
    key: "egg_head",
    name: "Egg Head",
    positive: { special: {Intelligence:6}, textEs: "+6 Inteligencia", textEn: "+6 Intelligence" },
    negative: { special: {Strength:-3,Endurance:-3}, textEs: "-3 Fuerza, -3 Resistencia", textEn: "-3 Strength, -3 Endurance" }
  },
  {
    key: "eagle_eyes",
    name: "Eagle Eyes",
    positive: { special: {Perception:4}, textEs: "+4 Percepción, +25% daño crítico", textEn: "+4 Perception, +25% crit damage" },
    negative: { special: {Strength:-4}, textEs: "-4 Fuerza", textEn: "-4 Strength" }
  },
  {
    key: "adrenal_reaction",
    name: "Adrenal Reaction",
    positive: { special: {}, textEs: "Hasta +100% daño de arma con poca vida", textEn: "Up to +100% weapon damage at low HP" },
    negative: { maxHP: -50, special: {}, textEs: "-50 HP máximo", textEn: "-50 Max HP" }
  },
  {
    key: "twisted_muscles",
    name: "Twisted Muscles",
    positive: { special: {}, textEs: "+25% daño cuerpo a cuerpo, chance de lisiar", textEn: "+25% melee damage, chance to cripple" },
    negative: { special: {}, textEs: "-50% precisión de armas (no modelado aún)", textEn: "-50% gun accuracy (not modeled yet)" }
  },
  {
    key: "talons",
    name: "Talons",
    positive: { special: {}, textEs: "+25% daño desarmado, sangrado al golpear", textEn: "+25% unarmed damage, bleed on hit" },
    negative: { special: {Agility:-4}, textEs: "-4 Agilidad", textEn: "-4 Agility" }
  },
  {
    key: "bird_bones",
    name: "Bird Bones",
    positive: { special: {Agility: 4}, textEs: "+4 Agilidad, caída lenta", textEn: "+4 Agility, reduced fall speed" },
    negative: { special: {Strength: -4}, textEs: "-4 Fuerza (dato verificado, no -40 HP)", textEn: "-4 Strength (verified value, not -40 HP)" }
  },
  {
    key: "grounded",
    name: "Grounded",
    positive: { special: {}, textEs: "+100 Resistencia a Energía", textEn: "+100 Energy Resistance" },
    negative: { special: {}, textEs: "-50% daño de energía infligido (no modelado aún)", textEn: "-50% energy damage dealt (not modeled yet)" }
  },
  {
    key: "healing_factor",
    name: "Healing Factor",
    positive: { special: {}, textEs: "+300% regen. de vida fuera de combate", textEn: "+300% health regen out of combat" },
    negative: { special: {}, textEs: "-55% efecto de chems", textEn: "-55% chem effects" }
  },
  {
    key: "herbivore",
    name: "Herbivore",
    positive: { special: {}, textEs: "Verduras dan doble beneficio, sin enfermedad de plantas", textEn: "Vegetables give double benefit, no plant disease" },
    negative: { special: {}, textEs: "No puedes comer carne", textEn: "Cannot eat meat" }
  },
  {
    key: "carnivore",
    name: "Carnivore",
    positive: { special: {}, textEs: "Carne da doble beneficio, sin enfermedad de carne", textEn: "Meat gives double benefit, no meat disease" },
    negative: { special: {}, textEs: "No puedes comer verduras", textEn: "Cannot eat vegetables" }
  },
  {
    key: "electrically_charged",
    name: "Electrically Charged",
    positive: { special: {}, textEs: "Chance de electrocutar a quien te ataque cuerpo a cuerpo", textEn: "Chance to shock melee attackers" },
    negative: { special: {}, textEs: "Pequeño daño a ti mismo", textEn: "Small amount of self-damage" }
  },
  {
    key: "unstable_isotope",
    name: "Unstable Isotope",
    positive: { special: {}, textEs: "Chance de explosión radiactiva al recibir golpe cuerpo a cuerpo", textEn: "Chance of radiation blast when hit in melee" },
    negative: { special: {}, textEs: "Pequeño daño a ti mismo", textEn: "Small amount of self-damage" }
  },
  {
    key: "plague_walker",
    name: "Plague Walker",
    positive: { special: {}, textEs: "Aura de veneno según nº de enfermedades activas", textEn: "Poison aura scales with number of diseases" },
    negative: { special: {}, textEs: "Sin penalización", textEn: "No penalty" }
  },
  {
    key: "empath",
    name: "Empath",
    positive: { special: {}, textEs: "-25% daño a compañeros de equipo", textEn: "-25% damage to teammates" },
    negative: { special: {}, textEs: "+33% daño recibido tú mismo (no modelado aún)", textEn: "+33% damage to self (not modeled yet)" }
  },
  {
    key: "chameleon",
    name: "Chameleon",
    positive: { special: {}, textEs: "Invisible sin armadura, quieto y agachado", textEn: "Invisible while unarmored, still, and sneaking" },
    negative: { special: {}, textEs: "Requiere estar sin armadura y quieto", textEn: "Must be unarmored and standing still" }
  }
];

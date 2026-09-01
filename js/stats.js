const AGILITY_CRIT_RATE = 0.10;

const PLAYER_BASE_STATS = Object.freeze({
  maxHp: 10,
  maxRadiation: 100,
  maxProtection: 0,
  maxEnergy: 100,
  maxWeight: 40,
  attack: 0,
  agility: 0,
  radiationResistance: 0,
  critChance: 0,
  accuracy: 0,
  evasion: 0
});

const PLAYER_STAT_LIMITS = Object.freeze({
  hp: "maxHp",
  radiation: "maxRadiation",
  protection: "maxProtection",
  energy: "maxEnergy"
});

function getPlayerLevelBonusStats(level=state.level||1){
  const current=Math.max(1,Math.floor(Number(level)||1));
  const gainedLevels=current-1;
  return {
    maxHp:gainedLevels*4,
    maxProtection:gainedLevels,
    maxEnergy:gainedLevels*2,
    maxWeight:0,
    attack:gainedLevels,
    agility:Math.round(gainedLevels*0.5*10)/10,
    radiationResistance:Math.round(gainedLevels*0.5*10)/10,
    critChance:Math.round(gainedLevels*0.5*10)/10,
    accuracy:Math.round(gainedLevels*0.5*10)/10,
    evasion:Math.round(gainedLevels*0.5*10)/10
  };
}

function equippedCatalogItems() {
  return EQUIPMENT_SLOTS
    .map(equippedItem)
    .filter(Boolean);
}

function getEquipmentBonusStats(items=equippedCatalogItems()) {
  const bonuses={};

  items.filter(Boolean).forEach(item=>{
    Object.entries(itemEffectiveStats(item)).forEach(([key,value])=>{
      if(Number.isFinite(value))bonuses[key]=(bonuses[key]||0)+value;
    });
  });

  return bonuses;
}

function getPlayerStatsForEquipment(items=equippedCatalogItems()) {
  const stats={...PLAYER_BASE_STATS};
  const levelBonuses=getPlayerLevelBonusStats();
  const equipmentBonuses=getEquipmentBonusStats(items);

  Object.entries(levelBonuses).forEach(([key,value])=>{
    if(Number.isFinite(value))stats[key]=(stats[key]||0)+value;
  });

  Object.entries(equipmentBonuses).forEach(([key,value])=>{
    stats[key]=(stats[key]||0)+value;
  });

  if(typeof activeAvatarBonusStats==="function"){
    Object.entries(activeAvatarBonusStats()).forEach(([key,value])=>{
      if(Number.isFinite(value))stats[key]=(stats[key]||0)+value;
    });
  }

  if(typeof backpackMaxWeight==="function")stats.maxWeight=backpackMaxWeight();
  if(typeof starterSetBonusActive==="function"&&starterSetBonusActive(items)){
    stats.radiationResistance=(Number(stats.radiationResistance)||0)+5;
  }

  // v0.32: radiation below 75 affects regeneration only.
  // At 75+ it also weakens combat characteristics, without shrinking the visible HP/Energy caps.
  const radiation=Math.max(0,Number(state.radiation)||0);
  if(radiation>=90){
    stats.attack=Math.max(0,stats.attack*0.75);
    stats.maxProtection=Math.max(0,stats.maxProtection*0.75);
  }else if(radiation>=75){
    stats.attack=Math.max(0,stats.attack*0.90);
    stats.maxProtection=Math.max(0,stats.maxProtection*0.90);
  }

  stats.maxHp=Math.round(stats.maxHp*10)/10;
  stats.maxEnergy=Math.round(stats.maxEnergy*10)/10;
  stats.maxProtection=Math.round(stats.maxProtection*10)/10;
  stats.attack=Math.round(stats.attack*10)/10;

  const agilityBonus=Math.max(0,(stats.agility||0)-PLAYER_BASE_STATS.agility);
  stats.critChance=Math.round(((stats.critChance||0)+agilityBonus*AGILITY_CRIT_RATE)*10)/10;

  return stats;
}

function getPlayerStats() {
  return getPlayerStatsForEquipment();
}

const COMBAT_POWER_WEIGHTS=Object.freeze({
  maxHp:1,
  maxProtection:2,
  attack:3,
  agility:2,
  radiationResistance:1,
  critChance:10,
  accuracy:2,
  evasion:2
});

function equipmentProgressionPower(item) {
  if(!item)return 0;
  return itemQualityScore(item);
}

function calculateCombatPower(stats,items=[]) {
  const characteristicPower=Object.entries(COMBAT_POWER_WEIGHTS)
    .reduce((total,[key,weight])=>total+(Number(stats[key])||0)*weight,0);

  const progressionPower=items
    .filter(Boolean)
    .reduce((total,item)=>total+equipmentProgressionPower(item),0);

  return Math.max(0,Math.round(characteristicPower+progressionPower));
}

function getCombatPower() {
  const items=equippedCatalogItems();
  return calculateCombatPower(getPlayerStatsForEquipment(items),items);
}

function equipmentWithCandidate(candidate) {
  const items=EQUIPMENT_SLOTS
    .map(equippedItem)
    .filter(Boolean)
    .filter(item=>item.slot!==candidate?.slot);

  if(candidate)items.push(candidate);
  return items;
}

function getCombatPowerWithCandidate(candidate) {
  const items=equipmentWithCandidate(candidate);
  return calculateCombatPower(getPlayerStatsForEquipment(items),items);
}

function getItemCombatPowerContribution(item) {
  if(!item)return 0;

  const withoutSlot=EQUIPMENT_SLOTS
    .map(equippedItem)
    .filter(Boolean)
    .filter(equipped=>equipped.slot!==item.slot);

  const basePower=calculateCombatPower(
    getPlayerStatsForEquipment(withoutSlot),
    withoutSlot
  );

  const withItem=[...withoutSlot,item];
  const itemPower=calculateCombatPower(
    getPlayerStatsForEquipment(withItem),
    withItem
  );

  return Math.max(0,itemPower-basePower);
}


function getPlayerStatLimit(stat) {
  const limitKey = PLAYER_STAT_LIMITS[stat];
  if (!limitKey) return Infinity;
  return getPlayerStats()[limitKey];
}

function clampPlayerStat(stat, value) {
  return clamp(Number(value) || 0, 0, getPlayerStatLimit(stat));
}

function normalizePlayerVitals() {
  const stats = getPlayerStats();

  state.hp = clamp(Number(state.hp) || 0, 0, stats.maxHp);
  state.radiation = clamp(Number(state.radiation) || 0, 0, stats.maxRadiation);
  state.energy = clamp(Number(state.energy) || 0, 0, stats.maxEnergy);
  state.protection = clamp(
    Number.isFinite(state.protection) ? state.protection : stats.maxProtection,
    0,
    stats.maxProtection
  );

  // Keep this legacy field synchronized for old saves and existing code.
  state.maxProtection = stats.maxProtection;

  return stats;
}

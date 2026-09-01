
const EXPEDITION_MAX_LEVEL=10;
const EXPEDITION_TEST_MODE=false;
const EXPEDITION_PLAYER_DAMAGE_MIN=5;
const EXPEDITION_PLAYER_DAMAGE_MAX=9;
const EXPEDITION_BASE_CRIT_CHANCE=10;
const EXPEDITION_CRIT_MULTIPLIER=1.8;

// v0.21: each pair of Expedition levels is balanced around one equipment rarity.
// Lv1–2 White, Lv3–4 Green, Lv5–6 Blue, Lv7–8 Purple, Lv9–10 Gold.
// The lower level in a band is tuned for a fresh +1 set; the upper level is
// tuned for a developed set of the same rarity. v0.59 smooths boss spikes so
// +25 remains an advantage instead of a requirement for normal progression.
const EXPEDITION_LEVEL_BALANCE=Object.freeze({
  1:Object.freeze({rarity:"common",    mob:Object.freeze({hp:32, defense:0,  damageMin:1,  damageMax:2,  accuracy:0,evasion:0}), boss:Object.freeze({hp:100, defense:3,  damageMin:3,  damageMax:5,  accuracy:2, evasion:1})}),
  2:Object.freeze({rarity:"common",    mob:Object.freeze({hp:45, defense:2,  damageMin:2,  damageMax:3,  accuracy:1,evasion:0}), boss:Object.freeze({hp:135, defense:5,  damageMin:4,  damageMax:6,  accuracy:3, evasion:1})}),
  3:Object.freeze({rarity:"uncommon",  mob:Object.freeze({hp:75, defense:4,  damageMin:4,  damageMax:7,  accuracy:2,evasion:1}), boss:Object.freeze({hp:230, defense:9,  damageMin:10, damageMax:15, accuracy:4, evasion:2})}),
  4:Object.freeze({rarity:"uncommon",  mob:Object.freeze({hp:105,defense:7,  damageMin:8,  damageMax:12, accuracy:2,evasion:1}), boss:Object.freeze({hp:290, defense:12, damageMin:17, damageMax:23, accuracy:5, evasion:2})}),
  5:Object.freeze({rarity:"rare",      mob:Object.freeze({hp:145,defense:10, damageMin:11, damageMax:16, accuracy:3,evasion:2}), boss:Object.freeze({hp:410, defense:18, damageMin:29, damageMax:36, accuracy:6, evasion:3})}),
  6:Object.freeze({rarity:"rare",      mob:Object.freeze({hp:200,defense:14, damageMin:16, damageMax:22, accuracy:4,evasion:2}), boss:Object.freeze({hp:520, defense:23, damageMin:32, damageMax:42, accuracy:7, evasion:4})}),
  7:Object.freeze({rarity:"epic",      mob:Object.freeze({hp:230,defense:17, damageMin:18, damageMax:25, accuracy:5,evasion:3}), boss:Object.freeze({hp:700, defense:32, damageMin:46, damageMax:58, accuracy:8, evasion:5})}),
  8:Object.freeze({rarity:"epic",      mob:Object.freeze({hp:320,defense:22, damageMin:24, damageMax:33, accuracy:6,evasion:4}), boss:Object.freeze({hp:975, defense:40, damageMin:58, damageMax:72, accuracy:9, evasion:6})}),
  9:Object.freeze({rarity:"legendary", mob:Object.freeze({hp:400,defense:27, damageMin:31, damageMax:42, accuracy:7,evasion:5}), boss:Object.freeze({hp:1200,defense:50, damageMin:88, damageMax:105,accuracy:10,evasion:7})}),
 10:Object.freeze({rarity:"legendary", mob:Object.freeze({hp:560,defense:35, damageMin:45, damageMax:58, accuracy:8,evasion:5}), boss:Object.freeze({hp:1650,defense:62, damageMin:125,damageMax:150,accuracy:12,evasion:8})})
});

function expeditionBalanceForLevel(level=expeditionSelectedLevel()){
  const normalized=clamp(Math.floor(Number(level)||1),1,EXPEDITION_MAX_LEVEL);
  return EXPEDITION_LEVEL_BALANCE[normalized]||EXPEDITION_LEVEL_BALANCE[1];
}

function expeditionRecommendedRarityId(level=expeditionSelectedLevel()){
  return expeditionBalanceForLevel(level).rarity;
}

function expeditionRecommendedGearHtml(level=expeditionSelectedLevel()){
  const rarityId=expeditionRecommendedRarityId(level);
  const rarity=ITEM_RARITIES[rarityId]||ITEM_RARITIES.common;
  return `<span class="expedition-gear-recommendation rarity-${rarityId}">🎒 ${t("expeditions.recommendedGear")}: <b>${t(rarity.labelKey)}</b></span>`;
}

const EXPEDITION_TYPES=Object.freeze([
  {id:"warehouse",icon:"🧰",power:0,energy:8,reward:"craft"},
  {id:"hospital",icon:"💉",power:5,energy:8,reward:"medicine"},
  {id:"anomaly",icon:"☢",power:10,energy:10,reward:"artifact"},
  {id:"raiders",icon:"🔫",power:15,energy:11,reward:"equipment"},
  {id:"mutants",icon:"🐾",power:20,energy:10,reward:"mutant"},
  {id:"bunker",icon:"📦",power:25,energy:12,reward:"military"},
  {id:"laboratory",icon:"⚗",power:30,energy:13,reward:"rare"}
]);

const EXPEDITION_FINAL=Object.freeze({
  id:"signal",
  icon:"assets/expeditions/icons/boss.webp",
  power:45,
  energy:15,
  reward:"final"
});

const EXPEDITION_EQUIPMENT_IDS=Object.freeze([
  "old_mask","reinforced_mask","field_armor","rusty_rifle","field_pants",
  "field_hood","field_cloak","field_gloves","field_boots","combat_knife","basic_dosimeter"
]);

let expeditionCombat=null;

function expeditionState(){
  if(!state.expeditions||typeof state.expeditions!=="object"){
    state.expeditions={
      selectedLevel:1,
      unlockedLevel:1,
      completedByLevel:{"1":[]},
      finalCompletedByLevel:{},
      mastered:false,
      totalRuns:0
    };
  }

  const progress=state.expeditions;
  progress.unlockedLevel=EXPEDITION_TEST_MODE
    ? EXPEDITION_MAX_LEVEL
    : clamp(Math.floor(Number(progress.unlockedLevel)||1),1,EXPEDITION_MAX_LEVEL);
  progress.selectedLevel=clamp(
    Math.floor(Number(progress.selectedLevel)||progress.unlockedLevel),
    1,
    progress.unlockedLevel
  );

  if(!progress.completedByLevel||typeof progress.completedByLevel!=="object")progress.completedByLevel={"1":[]};
  if(!progress.finalCompletedByLevel||typeof progress.finalCompletedByLevel!=="object")progress.finalCompletedByLevel={};

  for(let level=1;level<=progress.unlockedLevel;level++){
    const key=String(level);
    const completed=Array.isArray(progress.completedByLevel[key])?progress.completedByLevel[key]:[];
    const unique=[...new Set(completed.filter(Boolean))];
    const highestCompletedIndex=unique.reduce(
      (highest,id)=>Math.max(highest,EXPEDITION_TYPES.findIndex(expedition=>expedition.id===id)),
      -1
    );

    // Old saves allowed any order. Preserve their furthest progress while converting
    // it to the new sequential route by marking all prerequisites as completed.
    progress.completedByLevel[key]=highestCompletedIndex>=0
      ? EXPEDITION_TYPES.slice(0,highestCompletedIndex+1).map(expedition=>expedition.id)
      : [];
  }

  progress.mastered=!!progress.mastered;
  progress.totalRuns=Math.max(0,Math.floor(Number(progress.totalRuns)||0));
  return progress;
}

function expeditionSelectedLevel(){
  return expeditionState().selectedLevel;
}

function expeditionCompletedIds(level=expeditionSelectedLevel()){
  const progress=expeditionState();
  const key=String(level);
  if(!Array.isArray(progress.completedByLevel[key]))progress.completedByLevel[key]=[];
  return progress.completedByLevel[key];
}

function expeditionCompleted(id,level=expeditionSelectedLevel()){
  return expeditionCompletedIds(level).includes(id);
}

function expeditionFinalCompleted(level=expeditionSelectedLevel()){
  return !!expeditionState().finalCompletedByLevel[String(level)];
}

function expeditionMainProgress(level=expeditionSelectedLevel()){
  return EXPEDITION_TYPES.filter(expedition=>expeditionCompleted(expedition.id,level)).length;
}

function expeditionFinalUnlocked(level=expeditionSelectedLevel()){
  if(EXPEDITION_TEST_MODE)return true;
  return EXPEDITION_TYPES.every(expedition=>expeditionCompleted(expedition.id,level));
}

function selectExpeditionLevel(level){
  const progress=expeditionState();
  const next=clamp(Math.floor(Number(level)||1),1,progress.unlockedLevel);
  progress.selectedLevel=next;
  saveState();
  renderExpeditions();
}

function expeditionRequiredPower(expedition,level=expeditionSelectedLevel()){
  const levelBase=10+(Math.max(1,level)-1)*70;
  return levelBase+Math.max(0,Number(expedition.power)||0);
}

function expeditionEnergyCost(expedition,level=expeditionSelectedLevel()){
  return Math.max(1,Math.round((Number(expedition.energy)||8)+(level-1)*0.5));
}

function expeditionLevelTier(level=expeditionSelectedLevel()){
  const normalized=clamp(Math.floor(Number(level)||1),1,EXPEDITION_MAX_LEVEL);
  if(normalized===10)return "boss";
  if(normalized>=9)return "legendary";
  if(normalized>=7)return "epic";
  if(normalized>=5)return "rare";
  if(normalized>=3)return "uncommon";
  return "common";
}

function expeditionTypeIcon(expedition){
  return `assets/expeditions/icons/${expedition.id}.webp`;
}

function expeditionMobImage(expedition){
  if(expedition.id===EXPEDITION_FINAL.id)return "";
  return `assets/expeditions/mobs/${expedition.id}.webp`;
}


function expeditionTierLabelKey(level=expeditionSelectedLevel()){
  return `expeditions.tiers.${expeditionLevelTier(level)}`;
}


const EXPEDITION_BOSSES = {
  1:{nameKey:"expeditions.bosses.level1", image:"assets/expeditions/bosses/boss-01.webp"},
  2:{nameKey:"expeditions.bosses.level2", image:"assets/expeditions/bosses/boss-02.webp"},
  3:{nameKey:"expeditions.bosses.level3", image:"assets/expeditions/bosses/boss-03.webp"},
  4:{nameKey:"expeditions.bosses.level4", image:"assets/expeditions/bosses/boss-04.webp"},
  5:{nameKey:"expeditions.bosses.level5", image:"assets/expeditions/bosses/boss-05.webp"},
  6:{nameKey:"expeditions.bosses.level6", image:"assets/expeditions/bosses/boss-06.webp"},
  7:{nameKey:"expeditions.bosses.level7", image:"assets/expeditions/bosses/boss-07.webp"},
  8:{nameKey:"expeditions.bosses.level8", image:"assets/expeditions/bosses/boss-08.webp"},
  9:{nameKey:"expeditions.bosses.level9", image:"assets/expeditions/bosses/boss-09.webp"},
  10:{nameKey:"expeditions.bosses.level10", image:"assets/expeditions/bosses/boss-10.webp"}
};

function expeditionBossData(level=expeditionSelectedLevel()){
  return EXPEDITION_BOSSES[level]||EXPEDITION_BOSSES[1];
}

function expeditionMobNameKey(expeditionId){
  return `expeditions.mobs.${expeditionId}`;
}

function expeditionMobFor(expedition,level=expeditionSelectedLevel()){
  const scale=clamp(Math.floor(Number(level)||1),1,EXPEDITION_MAX_LEVEL);
  const boss=expedition.id===EXPEDITION_FINAL.id;
  const profile=expeditionBalanceForLevel(scale);

  if(boss){
    const data=expeditionBossData(scale);
    const tuned=profile.boss;
    return {
      id:`boss_${scale}`,
      name:t(data.nameKey),
      nameKey:data.nameKey,
      level:scale,
      maxHp:tuned.hp,
      defense:tuned.defense,
      damageMin:tuned.damageMin,
      damageMax:tuned.damageMax,
      accuracy:tuned.accuracy,
      evasion:tuned.evasion,
      icon:"assets/expeditions/icons/boss.webp",
      image:data.image||"",
      tier:expeditionLevelTier(scale)
    };
  }

  // Later routes inside the same Expedition level are a little tougher,
  // while remaining in the same intended equipment band.
  const routeIndex=Math.max(0,EXPEDITION_TYPES.findIndex(row=>row.id===expedition.id));
  const routeScale=1+routeIndex*0.05;
  const tuned=profile.mob;
  return {
    id:`${expedition.id}_${scale}`,
    name:t(expeditionMobNameKey(expedition.id)),
    nameKey:expeditionMobNameKey(expedition.id),
    level:scale,
    maxHp:Math.round(tuned.hp*routeScale),
    defense:tuned.defense+Math.floor(routeIndex/2),
    damageMin:Math.max(1,Math.round(tuned.damageMin*(1+routeIndex*0.025))),
    damageMax:Math.max(2,Math.round(tuned.damageMax*(1+routeIndex*0.03))),
    accuracy:tuned.accuracy+Math.floor(routeIndex/3),
    evasion:tuned.evasion+Math.floor(routeIndex/4),
    icon:expedition.icon||"☣",
    image:expeditionMobImage(expedition),
    tier:expeditionLevelTier(scale)
  };
}

function expeditionMobName(mob){
  if(mob?.nameKey){
    const translated=t(mob.nameKey);
    if(translated!==mob.nameKey)return translated;
  }
  if(mob?.name)return mob.name;
  return t("expeditions.combat.enemy");
}


function expeditionRandomInt(min,max,roll=Math.random()){
  const low=Math.ceil(Math.min(min,max));
  const high=Math.floor(Math.max(min,max));
  return low+Math.floor(clamp(Number(roll)||0,0,0.999999)*(high-low+1));
}

function expeditionPlayerCritChance(){
  const stats=getPlayerStats();
  return clamp(EXPEDITION_BASE_CRIT_CHANCE+(Number(stats.critChance)||0),0,60);
}

function expeditionPlayerHitChance(mob){
  const stats=getPlayerStats();
  return clamp(85+(Number(stats.accuracy)||0)-(Number(mob?.evasion)||0),55,98);
}

function expeditionMobHitChance(mob){
  const stats=getPlayerStats();
  return clamp(85+(Number(mob?.accuracy)||0)-(Number(stats.evasion)||0),55,98);
}

function expeditionRollHit(chance,roll=Math.random()){
  return clamp(Number(roll)||0,0,0.999999)*100<chance;
}

function expeditionRadiationExposureRaw(expedition,level=1){
  const current=Math.max(1,Math.floor(Number(level)||1));
  const route=expedition?.id||"";
  if(route==="anomaly")return 3+current*1.2;
  if(route==="mutants")return 1+current*0.4;
  if(route==="bunker")return 1+current*0.5;
  if(route==="laboratory")return 3+current;
  if(route===EXPEDITION_FINAL.id)return 4+current*1.2;
  return 0;
}

function applyExpeditionRadiationExposure(expedition,level=1){
  const raw=expeditionRadiationExposureRaw(expedition,level);
  if(raw<=0)return {raw:0,gained:0,resistance:0};
  const stats=getPlayerStats();
  const resistance=clamp(Number(stats.radiationResistance)||0,0,90);
  const gained=raw*(1-resistance/100);
  state.radiation=clampPlayerStat("radiation",(Number(state.radiation)||0)+gained);
  return {raw:Math.round(raw*10)/10,gained,resistance};
}

function expeditionPlayerDamage(mob,damageRoll=Math.random(),critRoll=Math.random()){
  const stats=getPlayerStats();
  const attack=Math.max(0,Number(stats.attack)||0);
  const agility=Math.max(0,Number(stats.agility)||0);

  const baseRoll=expeditionRandomInt(EXPEDITION_PLAYER_DAMAGE_MIN,EXPEDITION_PLAYER_DAMAGE_MAX,damageRoll);
  const gearBonus=attack*0.75+agility*0.20;
  const rawDamage=baseRoll+gearBonus;
  const critical=clamp(Number(critRoll)||0,0,0.999999)*100<expeditionPlayerCritChance();
  const criticalDamage=rawDamage*(critical?EXPEDITION_CRIT_MULTIPLIER:1);
  const finalDamage=Math.max(1,Math.round(criticalDamage-Math.max(0,Number(mob?.defense)||0)));

  return {
    damage:finalDamage,
    critical,
    baseRoll,
    rawDamage,
    defense:Math.max(0,Number(mob?.defense)||0),
    critChance:expeditionPlayerCritChance()
  };
}

function expeditionMobDamage(mob,roll=Math.random()){
  const stats=getPlayerStats();
  const protection=Math.max(0,Number(stats.maxProtection)||0);
  const reduction=Math.min(0.65,protection*0.015);
  const raw=expeditionRandomInt(mob.damageMin,mob.damageMax,roll);
  return Math.max(1,Math.round(raw*(1-reduction)));
}

function closeExpeditionCombat(){
  const overlay=document.getElementById("expeditionCombatOverlay");
  if(overlay)overlay.remove();
  expeditionCombat=null;
}

function returnFromExpeditionCombat(outcome){
  const onReturn=expeditionCombat?.onReturn;
  closeExpeditionCombat();
  if(typeof onReturn==="function")onReturn(outcome);
  else renderExpeditions();
}

function expeditionCombatBar(current,max){
  return `${clamp(current/max*100,0,100)}%`;
}

function expeditionCombatLogLine(text,type=""){
  if(!expeditionCombat)return;
  expeditionCombat.log.unshift({text,type});
  expeditionCombat.log=expeditionCombat.log.slice(0,6);
}

function renderExpeditionCombat(){
  if(!expeditionCombat)return;

  let overlay=document.getElementById("expeditionCombatOverlay");
  if(!overlay){
    overlay=document.createElement("div");
    overlay.id="expeditionCombatOverlay";
    overlay.className="expedition-combat-overlay";
    document.body.appendChild(overlay);
  }

  const combat=expeditionCombat;
  const enemyName=expeditionMobName(combat.mob);
  const playerMax=Math.max(1,combat.playerMaxHp);
  const critChance=Math.round(expeditionPlayerCritChance()*10)/10;
  const hitChance=Math.round(expeditionPlayerHitChance(combat.mob)*10)/10;

  overlay.innerHTML=`<section class="expedition-combat-modal">
    <header class="expedition-combat-header">
      <div>
        <span class="eyebrow">${combat.source==="story"?t("expeditions.combat.storyEyebrow"):t("expeditions.combat.eyebrow")} · ${t("expeditions.level")} ${combat.level}</span>
        <h2>${combat.title||t(`expeditions.types.${combat.expedition.id}.name`)}</h2>
      </div>
      <button class="expedition-combat-close" data-combat-close type="button">×</button>
    </header>

    <div class="expedition-combat-arena">
      <div class="combatant player">
        <div class="combatant-name">
          <span>${t("expeditions.combat.you")}</span>
          <b>${state.nickname||t("common.defaultNickname")}</b>
        </div>
        <div class="combatant-portrait player-portrait">${typeof activeAvatar==="function"&&activeAvatar()?.image?`<img src="${activeAvatar().image}" alt="${state.nickname||t("common.defaultNickname")}">`:"⚔"}</div>
        <div class="combat-unit-stats">
          <span>${t("expeditions.combat.damage")} <b>${EXPEDITION_PLAYER_DAMAGE_MIN}–${EXPEDITION_PLAYER_DAMAGE_MAX}+</b></span>
          <span>${t("expeditions.combat.crit")} <b>${critChance}%</b></span>
          <span>${t("expeditions.combat.accuracy")} <b>${hitChance}%</b></span>
        </div>
        <div class="combat-hp-line"><span>HP</span><b>${combat.playerHp}/${playerMax}</b></div>
        <div class="combat-hp"><i style="width:${expeditionCombatBar(combat.playerHp,playerMax)}"></i></div>
      </div>

      <div class="combat-vs">VS</div>

      <div class="combatant enemy ${combat.mobHp<=0?"defeated":""}">
        <div class="combatant-name">
          <span>${t("expeditions.combat.enemy")}</span>
          <b>${enemyName}</b>
        </div>
        <div class="combatant-portrait enemy-portrait tier-${combat.mob.tier}"><img src="${combat.mob.image}" alt="${enemyName}"></div>
        <div class="combat-unit-stats enemy-stats">
          <span>${t("expeditions.combat.mobLevel")} <b>${combat.mob.level}</b></span>
          <span>${t("expeditions.combat.defense")} <b>${combat.mob.defense}</b></span>
          <span>${t("expeditions.combat.damage")} <b>${combat.mob.damageMin}–${combat.mob.damageMax}</b></span>
        </div>
        <div class="combat-hp-line"><span>HP</span><b>${Math.max(0,combat.mobHp)}/${combat.mob.maxHp}</b></div>
        <div class="combat-hp enemy"><i style="width:${expeditionCombatBar(Math.max(0,combat.mobHp),combat.mob.maxHp)}"></i></div>
      </div>
    </div>

    <div class="expedition-combat-totals combat-totals-4">
      <div><span>${t("expeditions.combat.hitsDealt")}</span><b>${combat.playerHits}</b></div>
      <div><span>${t("expeditions.combat.hitsTaken")}</span><b>${combat.mobHits}</b></div>
      <div><span>${t("expeditions.combat.totalDealt")}</span><b>${combat.totalDamageDealt}</b></div>
      <div><span>${t("expeditions.combat.totalTaken")}</span><b>${combat.totalDamageTaken}</b></div>
    </div>

    <div class="expedition-combat-log">
      ${combat.log.length?combat.log.map(row=>`<div class="${row.type}">${row.text}</div>`).join(""):`<div>${t("expeditions.combat.ready")}</div>`}
    </div>

    <div class="expedition-combat-actions">
      <button data-combat-attack class="combat-attack" type="button" ${combat.finished?"disabled":""}>
        ⚔ ${t("expeditions.combat.attack")}
      </button>
      <button data-combat-retreat class="combat-retreat" type="button" ${combat.finished?"disabled":""}>
        ${t("expeditions.combat.retreat")}
      </button>
    </div>
  </section>`;

  overlay.querySelector("[data-combat-close]").onclick=()=>{
    if(combat.finished)returnFromExpeditionCombat(combat.playerHp>0?"victory":"defeat");
    else if(window.confirm(t("expeditions.combat.retreatConfirm")))retreatExpeditionCombat();
  };

  const attack=overlay.querySelector("[data-combat-attack]");
  if(attack)attack.onclick=attackExpeditionMob;

  const retreat=overlay.querySelector("[data-combat-retreat]");
  if(retreat)retreat.onclick=()=>{
    if(window.confirm(t("expeditions.combat.retreatConfirm")))retreatExpeditionCombat();
  };
}

function canStartExpedition(expedition,level=expeditionSelectedLevel(),energyCost=expeditionEnergyCost(expedition,level),options={}){
  if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive()){
    toast(t("survival.recovery.expeditionBlocked"));
    return false;
  }
  if(typeof canTravelWithBackpack==="function"&&!canTravelWithBackpack())return false;
  if(!options.ignorePower&&!EXPEDITION_TEST_MODE&&getCombatPower()<expeditionRequiredPower(expedition,level)){
    toast(t("expeditions.notEnoughPower"));
    return false;
  }

  if(state.energy<energyCost){
    toast(t("expeditions.notEnoughEnergy"));
    return false;
  }

  return true;
}

function startExpeditionCombat(expedition,options={}){
  const level=clamp(Math.floor(Number(options.level)||expeditionSelectedLevel()),1,EXPEDITION_MAX_LEVEL);
  const baseEnergyCost=Math.max(1,Number(options.energyCost)||expeditionEnergyCost(expedition,level));
  const radiationAdjusted=typeof radiationAdjustedEnergyCost==="function"?radiationAdjustedEnergyCost(baseEnergyCost):baseEnergyCost;
  const load=typeof backpackLoadInfo==="function"?backpackLoadInfo():null;
  const energyCost=load&&load.overloaded&&!load.hardOverloaded?radiationAdjusted*1.5:radiationAdjusted;
  if(!canStartExpedition(expedition,level,energyCost,options))return false;

  state.energy=clampPlayerStat("energy",state.energy-energyCost);

  const stats=getPlayerStats();
  const maxHp=Math.max(1,Math.round(Number(stats.maxHp)||10));
  const startingHp=clamp(Math.round(Number(state.hp)||maxHp),1,maxHp);
  const mob={...expeditionMobFor(expedition,level),...(options.mobOverrides||{})};
  const mobMaxHp=Math.max(1,Math.round(Number(mob.maxHp)||1));
  mob.maxHp=mobMaxHp;
  const initialMobHp=clamp(Math.round(Number(options.initialMobHp ?? mobMaxHp)||mobMaxHp),1,mobMaxHp);

  expeditionCombat={
    expedition,
    level,
    mob,
    mobHp:initialMobHp,
    playerMaxHp:maxHp,
    playerHp:startingHp,
    log:[],
    totalDamageDealt:0,
    totalDamageTaken:0,
    playerHits:0,
    mobHits:0,
    finished:false,
    source:options.source||"expedition",
    title:options.title||"",
    onVictory:typeof options.onVictory==="function"?options.onVictory:null,
    onReturn:typeof options.onReturn==="function"?options.onReturn:null
  };

  state.hp=startingHp;
  saveState();
  syncHud();
  renderExpeditionCombat();
  return true;
}

function expeditionRepeatXp(expedition,level){
  const current=clamp(Math.floor(Number(level)||1),1,EXPEDITION_MAX_LEVEL);
  return expedition.id===EXPEDITION_FINAL.id?current*2:current;
}

function expeditionFirstClearXp(expedition,level){
  const current=clamp(Math.floor(Number(level)||1),1,EXPEDITION_MAX_LEVEL);
  return expedition.id===EXPEDITION_FINAL.id?30+current*10:15+current*5;
}

function markExpeditionVictory(expedition,level,firstClear){
  const progress=expeditionState();
  const id=expedition.id;
  const key=String(level);
  let messageKey="expeditions.farmedToast";

  const rewards=grantExpeditionReward(expedition,firstClear,level);
  if(typeof addPlayerXp==="function"){
    const xp=firstClear?expeditionFirstClearXp(expedition,level):expeditionRepeatXp(expedition,level);
    const gained=addPlayerXp(xp,{notify:true}).gained;
    if(gained)rewards.unshift({special:"xp",xp:gained});
  }
  progress.totalRuns+=1;

  if(id===EXPEDITION_FINAL.id){
    if(firstClear){
      progress.finalCompletedByLevel[key]=true;

      if(level===progress.unlockedLevel&&level<EXPEDITION_MAX_LEVEL){
        progress.unlockedLevel=level+1;
        progress.selectedLevel=level+1;
        if(!progress.completedByLevel[String(level+1)])progress.completedByLevel[String(level+1)]=[];
        messageKey="expeditions.levelUnlocked";
      }else if(level===EXPEDITION_MAX_LEVEL){
        progress.mastered=true;
        messageKey="expeditions.mastered";
      }
    }
  }else if(firstClear){
    expeditionCompletedIds(level).push(id);
    messageKey=expeditionMainProgress(level)===EXPEDITION_TYPES.length
      ?"expeditions.finalUnlocked"
      :"expeditions.completedToast";
  }

  return {messageKey,level:progress.selectedLevel,rewards,firstClear};
}

function finishExpeditionVictory(){
  const combat=expeditionCombat;
  if(!combat||combat.finished)return;
  combat.finished=true;

  let result;
  if(typeof combat.onVictory==="function"){
    result=combat.onVictory(combat)||{rewards:[],firstClear:true};
    if(result.message)expeditionCombatLogLine(result.message,"victory");
  }else{
    const id=combat.expedition.id;
    const firstClear=id===EXPEDITION_FINAL.id
      ? !expeditionFinalCompleted(combat.level)
      : !expeditionCompleted(id,combat.level);
    result=markExpeditionVictory(combat.expedition,combat.level,firstClear);

    if(result.messageKey==="expeditions.levelUnlocked"){
      expeditionCombatLogLine(
        t(result.messageKey).replace("{level}",String(result.level)),
        "victory"
      );
    }else{
      expeditionCombatLogLine(t(result.messageKey),"victory");
    }
  }

  expeditionCombatLogLine(t("expeditions.combat.victory"),"victory");
  if(combat.source==="expedition"&&typeof dailyTrack==="function")dailyTrack("expeditionKills",1);
  state.hp=clampPlayerStat("hp",combat.playerHp);
  const exposure=applyExpeditionRadiationExposure(combat.expedition,combat.level);
  if(exposure.gained>0){
    expeditionCombatLogLine(t("expeditions.combat.radiationExposure",{value:exposure.gained,resistance:Math.round(exposure.resistance)}),"radiation");
  }
  saveState();
  syncHud();
  renderExpeditionCombat();

  const actions=document.querySelector(".expedition-combat-actions");
  const log=document.querySelector(".expedition-combat-log");
  if(log){
    log.classList.add("postbattle-hidden");
  }
  if(actions){
    const starterSetReady=combat.source==="story"
      && typeof isDytiatkyStarterSetReward==="function"
      && isDytiatkyStarterSetReward(result.rewards);
    actions.classList.add("victory-actions");
    actions.innerHTML=`<div class="combat-victory-toolbar">
        <button data-combat-log-toggle class="combat-log-toggle" type="button">${t("expeditions.combat.showLog")}</button>
      </div>
      <div class="combat-victory-rewards">${expeditionRewardsHtml(result.rewards,result.firstClear)}</div>
      <div class="combat-victory-footer ${starterSetReady?"has-starter-set":""}">
        ${starterSetReady?`<button data-equip-starter-set class="combat-equip-starter-set" type="button">${t("storyUi.equipStarterSet")}</button>`:""}
        <button data-combat-finish class="combat-finish" type="button">${t("expeditions.combat.collect")}</button>
      </div>`;
    bindExpeditionRewardDetails(actions);

    const starterSetButton=actions.querySelector("[data-equip-starter-set]");
    if(starterSetButton){
      starterSetButton.onclick=()=>{
        const equipped=typeof equipDytiatkyStarterSetRewards==="function"
          ?equipDytiatkyStarterSetRewards(result.rewards)
          :0;
        if(equipped>0){
          starterSetButton.disabled=true;
          starterSetButton.classList.add("equipped");
          starterSetButton.textContent=t("storyUi.starterSetEquipped");
        }
      };
    }

    const logToggle=actions.querySelector("[data-combat-log-toggle]");
    if(logToggle&&log){
      logToggle.onclick=()=>{
        const hidden=log.classList.toggle("postbattle-hidden");
        logToggle.textContent=hidden?t("expeditions.combat.showLog"):t("expeditions.combat.hideLog");
      };
    }

    actions.querySelector("[data-combat-finish]").onclick=()=>{
      closeExpeditionDropDetails();
      if(combat.source==="story"){
        const explicitMessage=String(result?.message||"").trim();
        const narrativeText=explicitMessage || (typeof storyBattleNarrativeFallback==="function"?storyBattleNarrativeFallback(combat):"");
        if(narrativeText&&typeof showStoryBattleNarrative==="function"){
          const shown=showStoryBattleNarrative({
            title:expeditionMobName(combat.mob),
            text:narrativeText,
            onClose:()=>returnFromExpeditionCombat("victory")
          });
          if(shown)return;
        }
      }
      returnFromExpeditionCombat("victory");
    };
  }
}

function finishExpeditionDefeat(){
  const combat=expeditionCombat;
  if(!combat||combat.finished)return;
  combat.finished=true;
  combat.playerHp=0;
  state.hp=1;
  if(typeof markPlayerDamaged==="function")markPlayerDamaged();
  saveState();
  syncHud();
  expeditionCombatLogLine(t("expeditions.combat.defeat"),"defeat");
  renderExpeditionCombat();

  const actions=document.querySelector(".expedition-combat-actions");
  if(actions){
    actions.innerHTML=`<button data-combat-finish class="combat-finish danger" type="button">${t("expeditions.combat.return")}</button>`;
    actions.querySelector("[data-combat-finish]").onclick=()=>{
      returnFromExpeditionCombat("defeat");
    };
  }
}

function attackExpeditionMob(){
  const combat=expeditionCombat;
  if(!combat||combat.finished)return;

  const playerHit=expeditionRollHit(expeditionPlayerHitChance(combat.mob));
  if(playerHit){
    const hit=expeditionPlayerDamage(combat.mob);
    combat.mobHp=Math.max(0,combat.mobHp-hit.damage);
    combat.totalDamageDealt+=hit.damage;
    combat.playerHits+=1;

    expeditionCombatLogLine(
      hit.critical
        ? t("expeditions.combat.playerCrit")
            .replace("{damage}",String(hit.damage))
            .replace("{defense}",String(hit.defense))
        : t("expeditions.combat.playerHit")
            .replace("{damage}",String(hit.damage))
            .replace("{defense}",String(hit.defense)),
      hit.critical?"critical":"player-hit"
    );
  }else{
    expeditionCombatLogLine(t("expeditions.combat.playerMiss"),"miss");
  }

  if(combat.mobHp<=0){
    finishExpeditionVictory();
    return;
  }

  const mobHit=expeditionRollHit(expeditionMobHitChance(combat.mob));
  if(mobHit){
    const incoming=expeditionMobDamage(combat.mob);
    combat.playerHp=Math.max(0,combat.playerHp-incoming);
    combat.totalDamageTaken+=incoming;
    combat.mobHits+=1;
    state.hp=combat.playerHp;
    if(typeof markPlayerDamaged==="function")markPlayerDamaged();

    expeditionCombatLogLine(
      t("expeditions.combat.mobHit")
        .replace("{mob}",expeditionMobName(combat.mob))
        .replace("{damage}",String(incoming)),
      "enemy-hit"
    );
  }else{
    expeditionCombatLogLine(
      t("expeditions.combat.mobMiss").replace("{mob}",expeditionMobName(combat.mob)),
      "miss"
    );
  }

  if(combat.playerHp<=0){
    finishExpeditionDefeat();
    return;
  }

  saveState();
  syncHud();
  renderExpeditionCombat();
}

function retreatExpeditionCombat(){
  if(!expeditionCombat)return;
  state.hp=Math.max(1,expeditionCombat.playerHp);
  saveState();
  syncHud();
  returnFromExpeditionCombat("retreat");
}


function expeditionSequenceIndex(id){
  return EXPEDITION_TYPES.findIndex(expedition=>expedition.id===id);
}

function expeditionSequenceUnlocked(id,level=expeditionSelectedLevel()){
  if(EXPEDITION_TEST_MODE&&EXPEDITION_TYPES.some(expedition=>expedition.id===id))return true;
  const index=expeditionSequenceIndex(id);
  if(index<0)return id===EXPEDITION_FINAL.id?expeditionFinalUnlocked(level):false;
  if(index===0)return true;
  return expeditionCompleted(EXPEDITION_TYPES[index-1].id,level);
}

function expeditionPreviousName(id){
  const index=expeditionSequenceIndex(id);
  if(index<=0)return "";
  return t(`expeditions.types.${EXPEDITION_TYPES[index-1].id}.name`);
}

function expeditionRewardText(expedition){
  const routeKey=`expeditions.routeRewards.${expedition.id}`;
  const translated=t(routeKey);
  return translated===routeKey?t(`expeditions.rewards.${expedition.reward}`):translated;
}

function expeditionById(id){
  return id===EXPEDITION_FINAL.id
    ? EXPEDITION_FINAL
    : EXPEDITION_TYPES.find(row=>row.id===id)||null;
}

function fightExpedition(id){
  const expedition=expeditionById(id);
  if(!expedition)return false;
  const level=expeditionSelectedLevel();
  if(id===EXPEDITION_FINAL.id&&!expeditionFinalUnlocked(level))return false;
  if(id!==EXPEDITION_FINAL.id&&!expeditionSequenceUnlocked(id,level)){
    toast(t("expeditions.sequenceLocked").replace("{name}",expeditionPreviousName(id)));
    return false;
  }
  return startExpeditionCombat(expedition);
}


function simulateInstantExpeditionBattle(expedition,level){
  const stats=getPlayerStats();
  const maxHp=Math.max(1,Math.round(Number(stats.maxHp)||10));
  let playerHp=clamp(Math.round(Number(state.hp)||maxHp),1,maxHp);
  const mob=expeditionMobFor(expedition,level);
  let mobHp=mob.maxHp;

  let playerHits=0;
  let mobHits=0;
  let totalDamageDealt=0;
  let totalDamageTaken=0;
  let criticalHits=0;
  let rounds=0;

  while(playerHp>0&&mobHp>0&&rounds<250){
    rounds+=1;

    if(expeditionRollHit(expeditionPlayerHitChance(mob))){
      const hit=expeditionPlayerDamage(mob);
      playerHits+=1;
      if(hit.critical)criticalHits+=1;
      totalDamageDealt+=hit.damage;
      mobHp=Math.max(0,mobHp-hit.damage);
    }

    if(mobHp<=0)break;

    if(expeditionRollHit(expeditionMobHitChance(mob))){
      const incoming=expeditionMobDamage(mob);
      mobHits+=1;
      totalDamageTaken+=incoming;
      playerHp=Math.max(0,playerHp-incoming);
    }
  }

  return {
    victory:mobHp<=0,
    playerHits,
    mobHits,
    criticalHits,
    totalDamageDealt,
    totalDamageTaken,
    playerHp,
    playerMaxHp:maxHp,
    mobHp,
    mobMaxHp:mob.maxHp,
    mobName:expeditionMobName(mob),
    rounds
  };
}

function expeditionInstantSummaryHtml(summary){
  const playerHpPercent=clamp(summary.playerHp/Math.max(1,summary.playerMaxHp)*100,0,100);
  const mobHpPercent=clamp(summary.mobHp/Math.max(1,summary.mobMaxHp)*100,0,100);

  return `<section class="expedition-instant-summary">
    <div class="expedition-instant-summary-title">
      <span>${t("expeditions.instantSummary.title")}</span>
      <b>${summary.victory?t("expeditions.instantSummary.victory"):t("expeditions.instantSummary.defeat")}</b>
    </div>

    <div class="expedition-instant-stats">
      <div><span>${t("expeditions.combat.hitsDealt")}</span><b>${summary.playerHits}</b></div>
      <div><span>${t("expeditions.combat.hitsTaken")}</span><b>${summary.mobHits}</b></div>
      <div><span>${t("expeditions.combat.totalDealt")}</span><b>${summary.totalDamageDealt}</b></div>
      <div><span>${t("expeditions.combat.totalTaken")}</span><b>${summary.totalDamageTaken}</b></div>
      <div><span>${t("expeditions.instantSummary.criticals")}</span><b>${summary.criticalHits}</b></div>
      <div><span>${t("expeditions.instantSummary.rounds")}</span><b>${summary.rounds}</b></div>
    </div>

    <div class="expedition-instant-hp">
      <div>
        <div><span>${state.nickname||t("common.defaultNickname")}</span><b>HP ${summary.playerHp}/${summary.playerMaxHp}</b></div>
        <div class="instant-hp-bar"><i style="width:${playerHpPercent}%"></i></div>
      </div>
      <div class="enemy">
        <div><span>${summary.mobName}</span><b>HP ${summary.mobHp}/${summary.mobMaxHp}</b></div>
        <div class="instant-hp-bar enemy"><i style="width:${mobHpPercent}%"></i></div>
      </div>
    </div>
  </section>`;
}

function instantCompleteExpedition(id){
  const expedition=expeditionById(id);
  if(!expedition)return false;

  const level=expeditionSelectedLevel();
  const completed=id===EXPEDITION_FINAL.id
    ? expeditionFinalCompleted(level)
    : expeditionCompleted(id,level);

  if(!completed){
    toast(t("expeditions.manualFirst"));
    return false;
  }

  if(id===EXPEDITION_FINAL.id&&!expeditionFinalUnlocked(level))return false;
  if(id!==EXPEDITION_FINAL.id&&!expeditionSequenceUnlocked(id,level)){
    toast(t("expeditions.sequenceLocked").replace("{name}",expeditionPreviousName(id)));
    return false;
  }
  if(!canStartExpedition(expedition,level))return false;

  const baseEnergyCost=expeditionEnergyCost(expedition,level);
  const radiationAdjusted=typeof radiationAdjustedEnergyCost==="function"?radiationAdjustedEnergyCost(baseEnergyCost):baseEnergyCost;
  const load=typeof backpackLoadInfo==="function"?backpackLoadInfo():null;
  const instantEnergyCost=load&&load.overloaded&&!load.hardOverloaded?radiationAdjusted*1.5:radiationAdjusted;
  state.energy=clampPlayerStat("energy",state.energy-instantEnergyCost);

  const summary=simulateInstantExpeditionBattle(expedition,level);
  if(summary.totalDamageTaken>0&&typeof markPlayerDamaged==="function")markPlayerDamaged();
  state.hp=summary.victory
    ? clampPlayerStat("hp",summary.playerHp)
    : 1;

  let rewards=[];
  if(summary.victory){
    if(typeof dailyTrack==="function")dailyTrack("expeditionKills",1);
    rewards=grantExpeditionReward(expedition,false,level);
    if(typeof addPlayerXp==="function"){
      const gained=addPlayerXp(expeditionRepeatXp(expedition,level),{notify:true}).gained;
      if(gained)rewards.unshift({special:"xp",xp:gained});
    }
    expeditionState().totalRuns+=1;
  }

  saveState();
  syncHud();
  showExpeditionRewardModal(expedition,rewards,level,summary);
  return summary.victory;
}

function expeditionActionButtons(expedition,completed,locked,sequenceLocked=false){
  if(sequenceLocked){
    return `<div class="expedition-sequence-lock">
      <span>🔒 ${t("expeditions.lockedByPrevious")}</span>
      <small>${t("expeditions.completeFirst").replace("{name}",expeditionPreviousName(expedition.id))}</small>
    </div>`;
  }

  if(!completed){
    return `<button class="expedition-primary-action" data-expedition-fight="${expedition.id}" type="button" ${locked?"disabled":""}>
      ${t("expeditions.firstFight")}
    </button>`;
  }

  return `<div class="expedition-repeat-actions">
    <button class="expedition-primary-action" data-expedition-instant="${expedition.id}" type="button" ${locked?"disabled":""}>
      ⚡ ${t("expeditions.instant")}
    </button>
    <button class="expedition-secondary-action" data-expedition-fight="${expedition.id}" type="button" ${locked?"disabled":""}>
      ⚔ ${t("expeditions.watchFight")}
    </button>
  </div>`;
}

function expeditionCardHtml(expedition){
  const level=expeditionSelectedLevel();
  const completed=expeditionCompleted(expedition.id,level);
  const required=expeditionRequiredPower(expedition,level);
  const power=getCombatPower();
  const powerLocked=!EXPEDITION_TEST_MODE&&power<required;
  const sequenceLocked=!expeditionSequenceUnlocked(expedition.id,level);
  const locked=powerLocked||sequenceLocked;
  const energy=expeditionEnergyCost(expedition,level);
  const mob=expeditionMobFor(expedition,level);

  return `<article class="expedition-card tier-${expeditionLevelTier(level)} ${completed?"completed":""} ${locked?"locked":""} ${sequenceLocked?"sequence-locked":""}">
    <div class="expedition-card-top">
      <span class="expedition-icon expedition-icon-art"><img src="${expeditionTypeIcon(expedition)}" alt=""></span>
      <div class="expedition-title-copy">
        <span>${t("expeditions.level")} ${level}</span>
        <h3>${t(`expeditions.types.${expedition.id}.name`)}</h3>
      </div>
      ${completed?`<span class="expedition-done">✓</span>`:""}
    </div>

    <p>${t(`expeditions.types.${expedition.id}.description`)}</p>

    <div class="expedition-mob-art tier-${mob.tier}">
      <img src="${mob.image}" alt="${expeditionMobName(mob)}">
      <span class="expedition-tier-chip">${t(expeditionTierLabelKey(level))}</span>
      <span class="expedition-mob-level-chip">LV ${mob.level}</span>
    </div>

    <div class="expedition-mob-preview compact">
      <div>
        <small>${t("expeditions.combat.enemy")}</small>
        <b>${expeditionMobName(mob)}</b>
      </div>
      <em>🛡 ${mob.defense}</em>
    </div>

    <div class="expedition-reward">
      <small>${t("expeditions.mainReward")}</small>
      <b>${expeditionRewardText(expedition)}</b>
    </div>

    <div class="expedition-meta">
      <span>⚡ ${t("expeditions.power")} <b>${required}</b></span>
      <span>ϟ ${t("expeditions.energy")} <b>${energy}</b></span>
      ${expeditionRecommendedGearHtml(level)}
    </div>

    ${expeditionActionButtons(expedition,completed,locked,sequenceLocked)}
  </article>`;
}

function expeditionFinalHtml(){
  const level=expeditionSelectedLevel();
  const unlocked=expeditionFinalUnlocked(level);
  const completed=expeditionFinalCompleted(level);
  const required=expeditionRequiredPower(EXPEDITION_FINAL,level);
  const powerLocked=!EXPEDITION_TEST_MODE&&getCombatPower()<required;
  const locked=!unlocked||powerLocked;
  const mob=expeditionMobFor(EXPEDITION_FINAL,level);

  return `<article class="expedition-card expedition-boss-card tier-${mob.tier} ${unlocked?"unlocked":"locked"} ${completed?"completed":""}">
    <div class="expedition-card-top">
      <span class="expedition-icon expedition-icon-art boss-icon-art"><img src="assets/expeditions/icons/boss.webp" alt=""></span>
      <div class="expedition-title-copy">
        <span>${t("expeditions.level")} ${level}</span>
        <h3>${unlocked?expeditionMobName(mob):t("expeditions.finalLockedName")}</h3>
      </div>
      ${completed?`<span class="expedition-done">✓</span>`:""}
    </div>

    <p>${level===10?t("expeditions.finalLevelDescription"):(unlocked?t("expeditions.finalDescription"):t("expeditions.finalLockedHint"))}</p>

    <div class="expedition-mob-art boss-art tier-${mob.tier}">
      ${mob.image
        ? `<img src="${mob.image}" alt="${unlocked?expeditionMobName(mob):t("expeditions.finalLockedName")}">`
        : `<div class="expedition-boss-placeholder" aria-label="${unlocked?expeditionMobName(mob):t("expeditions.finalLockedName")}"><span class="boss-placeholder-icon"><img src="assets/expeditions/icons/boss.webp" alt=""></span><small>${t("expeditions.bossChip")}</small></div>`}
      <span class="expedition-tier-chip">${level===10?t("expeditions.tiers.boss"):t(expeditionTierLabelKey(level))}</span>
      <span class="expedition-mob-level-chip">${t("expeditions.bossChip")} ${level}</span>
      ${!unlocked?`<span class="expedition-art-lock">🔒</span>`:""}
    </div>

    <div class="expedition-mob-preview compact">
      <div>
        <small>${t("expeditions.combat.enemy")}</small>
        <b>${unlocked?expeditionMobName(mob):t("expeditions.finalLockedName")}</b>
      </div>
      <em>🛡 ${mob.defense}</em>
    </div>

    <div class="expedition-reward">
      <small>${t("expeditions.mainReward")}</small>
      <b>${t("expeditions.routeRewards.signal")}</b>
    </div>

    <div class="expedition-meta">
      <span>⚡ ${t("expeditions.power")} <b>${required}</b></span>
      <span>ϟ ${t("expeditions.energy")} <b>${expeditionEnergyCost(EXPEDITION_FINAL,level)}</b></span>
      ${expeditionRecommendedGearHtml(level)}
    </div>

    ${unlocked?expeditionActionButtons(EXPEDITION_FINAL,completed,locked):`<div class="expedition-sequence-lock"><span>🔒 ${t("expeditions.finalLockedName")}</span><small>${t("expeditions.finalLockedHint")}</small></div>`}
  </article>`;
}

function expeditionLevelSelectorHtml(){
  const progress=expeditionState();
  return Array.from({length:EXPEDITION_MAX_LEVEL},(_,index)=>{
    const level=index+1;
    const unlocked=level<=progress.unlockedLevel;
    const selected=level===progress.selectedLevel;
    const complete=expeditionFinalCompleted(level);
    return `<button
      class="expedition-level-option tier-${expeditionLevelTier(level)} ${selected?"active":""} ${complete?"complete":""}"
      data-expedition-level="${level}"
      type="button"
      ${unlocked?"":"disabled"}
      title="${unlocked?t("expeditions.levelAvailable"):t("expeditions.levelLocked")}">
      <span>${level}</span>
      ${complete?"<i>✓</i>":!unlocked?"<i>🔒</i>":""}
    </button>`;
  }).join("");
}

function renderExpeditions(){
  cloneTemplate("expeditionsTpl");
  setActiveNav("expeditions");

  const progress=expeditionState();
  const level=progress.selectedLevel;
  const current=expeditionMainProgress(level);
  const power=getCombatPower();

  document.getElementById("expeditionLevel").textContent=level;
  document.getElementById("expeditionProgress").textContent=`${current}/${EXPEDITION_TYPES.length}`;
  document.getElementById("expeditionPower").textContent=power;
  document.getElementById("expeditionRuns").textContent=progress.totalRuns;

  const selector=document.getElementById("expeditionLevelSelector");
  if(selector)selector.innerHTML=expeditionLevelSelectorHtml();

  const grid=document.getElementById("expeditionGrid");
  grid.innerHTML=`${EXPEDITION_TYPES.map(expeditionCardHtml).join("")}${expeditionFinalHtml()}`;

  document.querySelectorAll("[data-expedition-level]").forEach(button=>{
    button.onclick=()=>selectExpeditionLevel(button.dataset.expeditionLevel);
  });

  document.querySelectorAll("[data-expedition-fight]").forEach(button=>{
    button.onclick=()=>fightExpedition(button.dataset.expeditionFight);
  });

  document.querySelectorAll("[data-expedition-instant]").forEach(button=>{
    button.onclick=()=>instantCompleteExpedition(button.dataset.expeditionInstant);
  });
}

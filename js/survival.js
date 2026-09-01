/* =========================================================
   RADIATION & RECOVERY REWORK v0.32
   Weight-only backpack, 10 upgrade tiers, long decontamination and radiation sickness.
   ========================================================= */

const BACKPACK_TIERS=Object.freeze([
  Object.freeze({level:1,id:"old",maxWeight:40}),
  Object.freeze({level:2,id:"field",maxWeight:50}),
  Object.freeze({level:3,id:"tactical",maxWeight:65}),
  Object.freeze({level:4,id:"expedition",maxWeight:80}),
  Object.freeze({level:5,id:"assault",maxWeight:87}),
  Object.freeze({level:6,id:"stalker",maxWeight:94}),
  Object.freeze({level:7,id:"military",maxWeight:101}),
  Object.freeze({level:8,id:"heavy",maxWeight:108}),
  Object.freeze({level:9,id:"elite",maxWeight:116}),
  Object.freeze({level:10,id:"legendary",maxWeight:125})
]);

const BACKPACK_UPGRADE_COSTS=Object.freeze({
  2:Object.freeze({money:250,items:[{id:"scrap",qty:8},{id:"mutant_hide",qty:4}]}),
  3:Object.freeze({money:650,items:[{id:"scrap",qty:16},{id:"uncommon_hide",qty:4},{id:"battery",qty:4}]}),
  4:Object.freeze({money:1200,items:[{id:"scrap",qty:25},{id:"rare_hide",qty:3},{id:"battery",qty:8}]}),
  5:Object.freeze({money:1900,items:[{id:"scrap",qty:32},{id:"rare_hide",qty:5},{id:"battery",qty:9}]}),
  6:Object.freeze({money:2800,items:[{id:"scrap",qty:40},{id:"rare_hide",qty:7},{id:"epic_hide",qty:2},{id:"battery",qty:11}]}),
  7:Object.freeze({money:4000,items:[{id:"scrap",qty:50},{id:"epic_hide",qty:4},{id:"battery",qty:13}]}),
  8:Object.freeze({money:5500,items:[{id:"scrap",qty:62},{id:"epic_hide",qty:6},{id:"battery",qty:15}]}),
  9:Object.freeze({money:7500,items:[{id:"scrap",qty:75},{id:"epic_hide",qty:8},{id:"legendary_hide",qty:1},{id:"battery",qty:18}]}),
  10:Object.freeze({money:10000,items:[{id:"scrap",qty:90},{id:"epic_hide",qty:12},{id:"legendary_hide",qty:3},{id:"battery",qty:22}]})
});

const STORY_STAGE_RADIATION=Object.freeze({
  dytiatky:0,
  pripyat:1,
  redforest:2,
  yaniv:3,
  chnpp:4
});

const BUNKER_DECONTAMINATION_BASE_PER_SECOND=100/(2*60*60); // 100 radiation in 2 hours at 0% resistance
const STARTER_SET_IDS=Object.freeze([
  "field_hood","reinforced_mask","field_armor","field_cloak",
  "field_gloves","field_pants","field_boots","rusty_rifle"
]);

function ensureSurvivalState(){
  if(!state.backpack||typeof state.backpack!=="object")state.backpack={level:1};
  state.backpack.level=clamp(Math.floor(Number(state.backpack.level)||1),1,BACKPACK_TIERS.length);
  if(!Array.isArray(state.storage))state.storage=[];
  if(!state.bunkerRecovery||typeof state.bunkerRecovery!=="object"){
    state.bunkerRecovery={active:false,startedAt:0,lastTick:0,startRadiation:0};
  }
  state.bunkerRecovery.active=!!state.bunkerRecovery.active;
  state.bunkerRecovery.startedAt=Math.max(0,Number(state.bunkerRecovery.startedAt)||0);
  state.bunkerRecovery.lastTick=Math.max(0,Number(state.bunkerRecovery.lastTick)||0);
  state.bunkerRecovery.startRadiation=Math.max(0,Number(state.bunkerRecovery.startRadiation)||0);
  if(state.bunkerRecovery.active&&state.bunkerRecovery.startRadiation<=0){
    state.bunkerRecovery.startRadiation=Math.max(0,Number(state.radiation)||0);
  }
  return state;
}

function backpackTier(level=state?.backpack?.level||1){
  const target=clamp(Math.floor(Number(level)||1),1,BACKPACK_TIERS.length);
  return BACKPACK_TIERS[target-1];
}

function backpackMaxWeight(){
  ensureSurvivalState();
  return backpackTier().maxWeight;
}

function backpackLoadInfo(){
  const stats=typeof getPlayerStats==="function"?getPlayerStats():{maxWeight:backpackMaxWeight()};
  const weight=typeof carriedWeight==="function"?carriedWeight():(typeof inventoryWeight==="function"?inventoryWeight():0);
  const maxWeight=Math.max(1,Number(stats.maxWeight)||backpackMaxWeight());
  return {
    weight,
    maxWeight,
    weightRatio:weight/maxWeight,
    overloaded:weight>maxWeight,
    hardOverloaded:weight>maxWeight*1.10
  };
}

function canTravelWithBackpack(options={notify:true}){
  const load=backpackLoadInfo();
  if(!load.hardOverloaded)return true;
  if(options.notify!==false&&typeof toast==="function"){
    toast(t("survival.overloadBlocked",{
      weight:load.weight.toFixed(1),
      max:load.maxWeight.toFixed(1)
    }));
  }
  return false;
}

function backpackUpgradeCost(level){
  return BACKPACK_UPGRADE_COSTS[Math.floor(Number(level)||0)]||null;
}

function backpackCanUpgrade(){
  ensureSurvivalState();
  const next=state.backpack.level+1;
  const cost=backpackUpgradeCost(next);
  if(!cost)return false;
  if((Number(state.money)||0)<cost.money)return false;
  return cost.items.every(row=>(typeof tradeResourceQty==="function"?tradeResourceQty(row.id):0)>=row.qty);
}

function upgradeBackpack(){
  ensureSurvivalState();
  const next=state.backpack.level+1;
  const cost=backpackUpgradeCost(next);
  if(!cost)return false;
  if(!backpackCanUpgrade()){
    if(typeof toast==="function")toast(t("survival.backpack.notEnough"));
    return false;
  }
  state.money=(Number(state.money)||0)-cost.money;
  cost.items.forEach(row=>{
    if(typeof consumeTradeResource==="function")consumeTradeResource(row.id,row.qty);
  });
  state.backpack.level=next;
  saveState();
  if(typeof syncHud==="function")syncHud();
  if(typeof renderTradePostContent==="function")renderTradePostContent();
  if(typeof toast==="function")toast(t("survival.backpack.upgraded",{level:next}));
  return true;
}

function starterSetBonusActive(items=typeof equippedCatalogItems==="function"?equippedCatalogItems():[]){
  const byId=new Map(items.filter(Boolean).map(item=>[item.id,item]));
  return STARTER_SET_IDS.every(id=>{
    const item=byId.get(id);
    return !!item && typeof itemRarityId==="function" && itemRarityId(item)==="uncommon";
  });
}

function grantStarterKnifeGift(){
  ensureSurvivalState();
  if(state.starterKnifeGifted)return null;
  let stored=(state.inventory||[]).find(item=>item.id==="combat_knife");
  if(!stored){
    const item=typeof addEquipmentInstance==="function"?addEquipmentInstance("combat_knife","uncommon",{upgradeLevel:1}):null;
    stored=item?inventoryEntryByKey(inventoryEntryKey(item)):null;
  }else{
    if(!stored.instanceId)stored.instanceId=makeItemInstanceId("combat_knife");
    const item=inventoryItemData(stored);
    const progress=ensureItemProgression(item);
    if(progress){progress.rarity="uncommon";progress.upgradeLevel=1;progress.attributes=generateItemAttributes(itemRarityAttributeCount("uncommon"),progress.attributes||[]);}
  }
  state.starterKnifeGifted=true;
  saveState();
  return stored?inventoryItemData(stored):null;
}

function grantDytiatkyStarterSet(progress){
  ensureSurvivalState();
  if(progress?.flags?.starterSetGifted)return [];
  if(progress){
    if(!progress.flags||typeof progress.flags!=="object")progress.flags={};
    progress.flags.starterSetGifted=true;
  }
  const granted=[];
  STARTER_SET_IDS.forEach(id=>{
    if(typeof addEquipmentInstance!=="function")return;
    const item=addEquipmentInstance(id,"uncommon",{upgradeLevel:1});
    if(item)granted.push(item);
  });
  saveState();
  return granted;
}


function isDytiatkyStarterSetReward(rewards=[]){
  const ids=new Set((Array.isArray(rewards)?rewards:[])
    .filter(row=>row&&row.equipment&&row.id)
    .map(row=>row.id));
  return STARTER_SET_IDS.every(id=>ids.has(id));
}

function equipDytiatkyStarterSetRewards(rewards=[]){
  if(!isDytiatkyStarterSetReward(rewards)||typeof equipItem!=="function")return 0;
  let equipped=0;
  STARTER_SET_IDS.forEach(id=>{
    const reward=(rewards||[]).find(row=>row&&row.equipment&&row.id===id);
    if(!reward)return;
    const key=reward.instanceId||reward.id;
    if(equipItem(key)){
      equipped+=1;
      return;
    }
    const current=typeof equippedItem==="function"
      ? EQUIPMENT_SLOTS.map(slot=>equippedItem(slot)).find(item=>item?.instanceId===reward.instanceId||item?.id===reward.id)
      : null;
    if(current)equipped+=1;
  });
  normalizePlayerVitals();
  saveState();
  syncHud();
  return equipped;
}


const HOSPITAL_DECONTAMINATION_COST=250;

function useHospitalDecontamination(){
  ensureSurvivalState();
  if(isBunkerRecoveryActive()){
    if(typeof toast==="function")toast(t("survival.hospital.recoveryActive"));
    return false;
  }
  const radiation=Math.max(0,Number(state.radiation)||0);
  if(radiation<=0){
    if(typeof toast==="function")toast(t("survival.hospital.noRadiation"));
    return false;
  }
  if((Number(state.money)||0)<HOSPITAL_DECONTAMINATION_COST){
    if(typeof toast==="function")toast(t("survival.hospital.notEnough",{cost:HOSPITAL_DECONTAMINATION_COST}));
    return false;
  }
  state.money=(Number(state.money)||0)-HOSPITAL_DECONTAMINATION_COST;
  state.radiation=0;
  saveState();
  if(typeof syncHud==="function")syncHud();
  if(typeof toast==="function")toast(t("survival.hospital.completed",{cost:HOSPITAL_DECONTAMINATION_COST}));
  return true;
}

function radiationStageBase(stageId){
  return Math.max(0,Number(STORY_STAGE_RADIATION[stageId])||0);
}

function radiationResistancePercent(){
  const stats=typeof getPlayerStats==="function"?getPlayerStats():{radiationResistance:0};
  return clamp(Number(stats.radiationResistance)||0,0,90);
}

function radiationSeverity(value=state.radiation){
  const radiation=Math.max(0,Number(value)||0);
  if(radiation>=100)return "critical";
  if(radiation>=75)return "severe";
  if(radiation>=50)return "medium";
  if(radiation>=25)return "light";
  return "normal";
}

function radiationRegenerationMultiplier(value=state.radiation){
  const radiation=Math.max(0,Number(value)||0);
  if(radiation>=100)return 0;
  if(radiation>=90)return 0.10;
  if(radiation>=75)return 0.25;
  if(radiation>=50)return 0.50;
  return 1;
}

function radiationCombatPenaltyPercent(value=state.radiation){
  const radiation=Math.max(0,Number(value)||0);
  if(radiation>=90)return 25;
  if(radiation>=75)return 10;
  return 0;
}

function radiationEnergyCostMultiplier(value=state.radiation){
  const penalty=radiationCombatPenaltyPercent(value);
  return 1+penalty/100;
}

function radiationAdjustedEnergyCost(baseCost){
  const base=Math.max(0,Number(baseCost)||0);
  return base*radiationEnergyCostMultiplier();
}

function applyStoryRadiationExposure(stageId,reason="travel",options={}){
  const raw=radiationStageBase(stageId);
  if(raw<=0)return {raw:0,gained:0,resistance:radiationResistancePercent(),severity:radiationSeverity()};
  const resistance=radiationResistancePercent();
  const gained=raw*(1-resistance/100);
  state.radiation=clampPlayerStat("radiation",(Number(state.radiation)||0)+gained);
  if(typeof normalizePlayerVitals==="function")normalizePlayerVitals();

  const severity=radiationSeverity();
  if((severity==="severe"||severity==="critical")&&reason==="travel"){
    const damage=severity==="critical"?3:1;
    state.hp=Math.max(1,(Number(state.hp)||1)-damage);
    if(typeof markPlayerDamaged==="function")markPlayerDamaged();
  }

  if(options.save!==false)saveState();
  if(typeof syncHud==="function")syncHud();
  if(options.notify!==false&&typeof toast==="function"){
    toast(t("survival.radiation.gained",{amount:gained.toFixed(2),resistance:Math.round(resistance)}));
  }
  return {raw,gained,resistance,severity};
}

function isBunkerRecoveryActive(){
  ensureSurvivalState();
  return !!state.bunkerRecovery.active;
}

function bunkerRecoveryRatePerSecond(){
  const resistance=radiationResistancePercent();
  return BUNKER_DECONTAMINATION_BASE_PER_SECOND*(1+resistance/100);
}

function bunkerRecoveryRemainingSeconds(){
  const rate=bunkerRecoveryRatePerSecond();
  return rate>0?Math.ceil(Math.max(0,Number(state.radiation)||0)/rate):0;
}

function bunkerRecoveryProgress(){
  ensureSurvivalState();
  const start=Math.max(0,Number(state.bunkerRecovery.startRadiation)||0);
  const current=Math.max(0,Number(state.radiation)||0);
  if(start<=0)return current<=0?1:0;
  return clamp((start-current)/start,0,1);
}

function bunkerRecoveryCancellationPenaltyPercent(){
  const progress=bunkerRecoveryProgress();
  if(progress<0.25)return 20;
  if(progress<=0.75)return 15;
  return 10;
}

function bunkerRecoveryCancelPreview(){
  ensureSurvivalState();
  const current=Math.max(0,Number(state.radiation)||0);
  const start=Math.max(current,Number(state.bunkerRecovery.startRadiation)||current);
  const penalty=bunkerRecoveryCancellationPenaltyPercent();
  const recovered=Math.max(0,start-current);
  const penaltyAmount=recovered*(penalty/100);
  // Cancelling only returns a percentage of radiation already removed.
  // It can never make radiation higher than it was when decontamination started.
  const after=clamp(current+penaltyAmount,0,start);
  return {current,start,recovered,penalty,penaltyAmount,after,progress:bunkerRecoveryProgress()};
}

function applyBunkerRecovery(now=Date.now(),options={}){
  ensureSurvivalState();
  const recovery=state.bunkerRecovery;
  if(!recovery.active)return {changed:false,finished:false};
  const previous=recovery.lastTick||now;
  recovery.lastTick=now;
  const elapsedSeconds=Math.max(0,(now-previous)/1000);
  if(elapsedSeconds<=0)return {changed:false,finished:false};
  const before=Math.max(0,Number(state.radiation)||0);
  const removed=bunkerRecoveryRatePerSecond()*elapsedSeconds;
  state.radiation=clampPlayerStat("radiation",before-removed);
  const finished=state.radiation<=0.000001;
  if(finished){
    state.radiation=0;
    recovery.active=false;
    recovery.startedAt=0;
    recovery.lastTick=now;
    recovery.startRadiation=0;
  }
  const changed=Math.abs(before-state.radiation)>0.000001;
  if((changed||finished)&&options.save!==false)saveState();
  if(changed&&typeof syncHud==="function")syncHud();
  return {changed,finished,removed:before-state.radiation};
}

function startBunkerRecovery(){
  ensureSurvivalState();
  if((Number(state.radiation)||0)<=0){
    if(typeof toast==="function")toast(t("survival.recovery.noRadiation"));
    return false;
  }
  const now=Date.now();
  state.bunkerRecovery.active=true;
  state.bunkerRecovery.startedAt=now;
  state.bunkerRecovery.lastTick=now;
  state.bunkerRecovery.startRadiation=Math.max(0,Number(state.radiation)||0);
  saveState();
  if(typeof toast==="function")toast(t("survival.recovery.started"));
  return true;
}

function cancelBunkerRecovery(){
  ensureSurvivalState();
  if(!state.bunkerRecovery.active)return false;
  applyBunkerRecovery(Date.now(),{save:false});
  const preview=bunkerRecoveryCancelPreview();
  state.radiation=clampPlayerStat("radiation",preview.after);
  state.bunkerRecovery.active=false;
  state.bunkerRecovery.startedAt=0;
  state.bunkerRecovery.lastTick=Date.now();
  state.bunkerRecovery.startRadiation=0;
  saveState();
  if(typeof syncHud==="function")syncHud();
  if(typeof toast==="function")toast(t("survival.recovery.cancelled",{
    radiation:Math.round(Number(state.radiation)||0),
    penalty:preview.penalty
  }));
  return {...preview,after:state.radiation};
}

function storageEntryByKey(key){
  ensureSurvivalState();
  return state.storage.find(item=>item.instanceId===key)||state.storage.find(item=>item.id===key)||null;
}

function storageItemData(entry){
  if(!entry)return null;
  const meta=inventoryCatalogItem(entry.id)||{};
  return {...meta,...entry,qty:entry.qty||0};
}

function transferInventoryToStorage(key,qty=1){
  ensureSurvivalState();
  const stored=inventoryEntryByKey(key);
  const item=inventoryItemData(stored);
  if(!stored||!item)return false;
  if(isQuestInventoryItem(item)){
    toast(t("survival.storage.questBlocked"));
    return false;
  }
  const amount=Math.max(1,Math.floor(Number(qty)||1));
  if(item.type==="equipment"){
    state.inventory=state.inventory.filter(entry=>entry!==stored);
    state.storage.push({...stored,qty:1});
  }else{
    const moved=Math.min(amount,stored.qty);
    stored.qty-=moved;
    const target=state.storage.find(entry=>entry.id===stored.id&&!entry.instanceId);
    if(target)target.qty+=moved;
    else state.storage.push({id:stored.id,qty:moved});
    state.inventory=state.inventory.filter(entry=>entry.qty>0);
  }
  saveState();
  syncHud();
  return true;
}

function transferStorageToInventory(key,qty=1){
  ensureSurvivalState();
  const stored=storageEntryByKey(key);
  const item=storageItemData(stored);
  if(!stored||!item)return false;
  const amount=Math.max(1,Math.floor(Number(qty)||1));
  const currentLoad=backpackLoadInfo();
  const movedQty=item.type==="equipment"?1:Math.min(amount,stored.qty);
  const extraWeight=inventoryItemWeight(item)*movedQty;
  if(currentLoad.weight+extraWeight>currentLoad.maxWeight*1.10){
    toast(t("survival.storage.backpackFull"));
    return false;
  }
  if(item.type==="equipment"){
    state.storage=state.storage.filter(entry=>entry!==stored);
    state.inventory.push({...stored,qty:1});
  }else{
    stored.qty-=movedQty;
    const target=state.inventory.find(entry=>entry.id===stored.id&&!entry.instanceId);
    if(target)target.qty+=movedQty;
    else state.inventory.push({id:stored.id,qty:movedQty});
    state.storage=state.storage.filter(entry=>entry.qty>0);
  }
  saveState();
  syncHud();
  return true;
}

function formatSurvivalTime(seconds){
  const total=Math.max(0,Math.ceil(Number(seconds)||0));
  const hours=Math.floor(total/3600);
  const minutes=Math.floor((total%3600)/60);
  const secs=total%60;
  if(hours>0)return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
  return `${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

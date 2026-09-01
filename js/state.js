const STORAGE_KEY = "zone-survivor-state-v1";
const SAVE_STORE_KEY = "zone-survivor-save-slots-v1";
const ACTIVE_SAVE_KEY = "zone-survivor-active-save-v1";
const MAX_SAVE_SLOTS = 5;

// Player levels are intentionally uncapped. Expedition content still has 10
// difficulty tiers, but the hero can keep gaining levels after the story ends.
const PLAYER_LEVEL_XP_BASE = 100;
const PLAYER_LEVEL_XP_STEP = 35;

function playerXpToNextLevel(level=1){
  const current=Math.max(1,Math.floor(Number(level)||1));
  return PLAYER_LEVEL_XP_BASE+PLAYER_LEVEL_XP_STEP*(current-1);
}

function playerTotalXpForLevel(level=1){
  const current=Math.max(1,Math.floor(Number(level)||1));
  const transitions=current-1;
  return transitions*PLAYER_LEVEL_XP_BASE+PLAYER_LEVEL_XP_STEP*transitions*(transitions-1)/2;
}

function playerLevelFromXp(totalXp=0){
  const xp=Math.max(0,Math.floor(Number(totalXp)||0));
  // Solve: XP = 100n + 35*n*(n-1)/2, where n = level - 1.
  let transitions=Math.max(0,Math.floor((-165+Math.sqrt(27225+280*xp))/70));
  while(playerTotalXpForLevel(transitions+2)<=xp)transitions+=1;
  while(transitions>0&&playerTotalXpForLevel(transitions+1)>xp)transitions-=1;
  return transitions+1;
}

function normalizePlayerLevelState(target=state){
  if(!target||typeof target!=="object")return 1;
  const savedLevel=Math.max(1,Math.floor(Number(target.level)||1));
  const savedXp=Math.max(0,Math.floor(Number(target.xp)||0));
  // Preserve at least the level already earned in an older save when the XP curve changes.
  target.xp=Math.max(savedXp,playerTotalXpForLevel(savedLevel));
  target.level=playerLevelFromXp(target.xp);
  return target.level;
}

function playerXpProgress(){
  normalizePlayerLevelState();
  const level=state.level||1;
  const levelStart=playerTotalXpForLevel(level);
  const required=playerXpToNextLevel(level);
  return {
    level,
    total:state.xp||0,
    current:Math.max(0,(state.xp||0)-levelStart),
    required,
    nextTotal:levelStart+required,
    maxed:false
  };
}

function addPlayerXp(amount,{notify=true}={}){
  const gain=Math.max(0,Math.floor(Number(amount)||0));
  normalizePlayerLevelState();
  const oldLevel=state.level||1;
  if(!gain)return {gained:0,oldLevel,newLevel:oldLevel,levelsGained:0,maxed:false};

  const oldStats=typeof getPlayerStats==="function"?getPlayerStats():null;
  const before=state.xp||0;
  state.xp=before+gain;
  state.level=playerLevelFromXp(state.xp);
  const actualGain=state.xp-before;
  const newLevel=state.level;

  if(newLevel>oldLevel&&typeof getPlayerStats==="function"){
    const newStats=getPlayerStats();
    if(oldStats){
      state.hp=Math.min(newStats.maxHp,(Number(state.hp)||0)+Math.max(0,newStats.maxHp-oldStats.maxHp));
      state.energy=Math.min(newStats.maxEnergy,(Number(state.energy)||0)+Math.max(0,newStats.maxEnergy-oldStats.maxEnergy));
      state.protection=Math.min(newStats.maxProtection,(Number(state.protection)||0)+Math.max(0,newStats.maxProtection-oldStats.maxProtection));
    }
    if(typeof normalizePlayerVitals==="function")normalizePlayerVitals();
  }

  if(newLevel>oldLevel&&notify&&typeof toast==="function"&&typeof t==="function"){
    toast(t("levelSystem.levelUp",{level:newLevel}));
  }

  return {gained:actualGain,oldLevel,newLevel,levelsGained:newLevel-oldLevel,maxed:false};
}

let pendingNewSaveId = null;
let pendingPreviousState = null;

function emptySaveStore(){
  return {version:1,slots:[]};
}

function readSaveStore(){
  try{
    const parsed=JSON.parse(localStorage.getItem(SAVE_STORE_KEY)||"null");
    if(!parsed||!Array.isArray(parsed.slots))return emptySaveStore();
    return parsed;
  }catch{
    return emptySaveStore();
  }
}

function writeSaveStore(store){
  localStorage.setItem(SAVE_STORE_KEY,JSON.stringify(store));
}

function makeSaveSlotId(){
  return `hero-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
}

function activeSaveSlotId(){
  return localStorage.getItem(ACTIVE_SAVE_KEY)||"";
}

function setActiveSaveSlotId(id){
  if(id)localStorage.setItem(ACTIVE_SAVE_KEY,id);
  else localStorage.removeItem(ACTIVE_SAVE_KEY);
}

function saveSlotSummary(slot){
  const saved=slot?.state||{};
  const safeAvatar=typeof avatarSafeActiveIdForSnapshot==="function"
    ? avatarSafeActiveIdForSnapshot(saved)
    : (saved.activeAvatar||"novice");
  return {
    id:slot.id,
    nickname:saved.nickname||"",
    level:Number(saved.level)||1,
    currentRegion:saved.currentRegion||"south",
    currentLocation:saved.currentLocation||"south_01",
    storyStage:saved.storyStage||"dytiatky",
    day:Number(saved.day)||1,
    activeAvatar:safeAvatar,
    createdAt:Number(slot.createdAt)||0,
    updatedAt:Number(slot.updatedAt)||0,
    active:slot.id===activeSaveSlotId()
  };
}

function listSaveSlots(){
  return readSaveStore().slots
    .filter(slot=>slot?.id&&slot?.state?.hasStarted)
    .map((slot,index)=>({...saveSlotSummary(slot),_storeOrder:index}))
    .sort((a,b)=>{
      const aCreated=Number(a.createdAt)||0;
      const bCreated=Number(b.createdAt)||0;
      if(aCreated&&bCreated&&aCreated!==bCreated)return aCreated-bCreated;
      return a._storeOrder-b._storeOrder;
    });
}

function canCreateSaveSlot(){
  return listSaveSlots().length<MAX_SAVE_SLOTS;
}

function findSaveSlot(id){
  return readSaveStore().slots.find(slot=>slot.id===id)||null;
}

function prepareNewHeroCreation(){
  if(!canCreateSaveSlot())return false;
  if(typeof state!=="undefined"&&state?.hasStarted)saveState();
  pendingPreviousState=typeof state!=="undefined"?structuredClone(state):null;
  pendingNewSaveId=makeSaveSlotId();
  if(typeof state!=="undefined")state=normalizeItemInstanceState(structuredClone(initialState));
  return true;
}

function cancelNewHeroCreation(){
  if(!pendingNewSaveId)return false;
  const previous=pendingPreviousState;
  pendingNewSaveId=null;
  pendingPreviousState=null;

  if(previous){
    state=normalizeItemInstanceState({...structuredClone(initialState),...previous});
  }else{
    const slot=findSaveSlot(activeSaveSlotId());
    state=normalizeItemInstanceState({...structuredClone(initialState),...(slot?.state||{})});
  }
  return true;
}

function deleteSaveSlot(id){
  const store=readSaveStore();
  const index=store.slots.findIndex(slot=>slot.id===id);
  if(index<0)return false;

  store.slots.splice(index,1);
  writeSaveStore(store);

  if(activeSaveSlotId()===id){
    setActiveSaveSlotId("");
    if(!store.slots.some(slot=>slot?.state?.hasStarted))localStorage.removeItem(STORAGE_KEY);
  }
  return true;
}

function activateSaveSlot(id){
  const currentId=activeSaveSlotId();
  const currentStillExists=!!currentId&&readSaveStore().slots.some(slot=>slot.id===currentId);
  if(currentStillExists&&typeof state!=="undefined"&&state?.hasStarted)saveState();
  const slot=findSaveSlot(id);
  if(!slot?.state?.hasStarted)return false;

  pendingNewSaveId=null;
  pendingPreviousState=null;
  setActiveSaveSlotId(id);
  state=normalizeItemInstanceState({...structuredClone(initialState),...structuredClone(slot.state)});
  if(typeof normalizeAvatarState==="function")normalizeAvatarState();
  normalizePlayerVitals();
  saveState();
  return true;
}


const SAVE_BACKUP_FORMAT="the-1037-signal-save-backup";
const SAVE_BACKUP_VERSION=1;

function buildSaveBackup(){
  if(typeof state!=="undefined"&&state?.hasStarted)saveState();
  return {
    format:SAVE_BACKUP_FORMAT,
    backupVersion:SAVE_BACKUP_VERSION,
    gameVersion:typeof GAME_META!=="undefined"?GAME_META.version:"",
    exportedAt:Date.now(),
    activeSaveId:activeSaveSlotId(),
    store:structuredClone(readSaveStore())
  };
}

function validateSaveBackup(payload){
  if(!payload||typeof payload!=="object")return {ok:false,reason:"invalid"};
  if(payload.format!==SAVE_BACKUP_FORMAT)return {ok:false,reason:"format"};
  if(Number(payload.backupVersion)!==SAVE_BACKUP_VERSION)return {ok:false,reason:"version"};
  if(!payload.store||!Array.isArray(payload.store.slots))return {ok:false,reason:"slots"};
  const validSlots=payload.store.slots.filter(slot=>slot&&typeof slot.id==="string"&&slot.state&&typeof slot.state==="object"&&slot.state.hasStarted);
  if(validSlots.length!==payload.store.slots.length)return {ok:false,reason:"slotData"};
  if(validSlots.length>MAX_SAVE_SLOTS)return {ok:false,reason:"tooMany"};
  if(new Set(validSlots.map(slot=>slot.id)).size!==validSlots.length)return {ok:false,reason:"duplicate"};
  return {ok:true,slots:validSlots};
}

function exportSaveBackup(){
  const payload=buildSaveBackup();
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const link=document.createElement("a");
  const stamp=new Date().toISOString().slice(0,10);
  link.href=URL.createObjectURL(blob);
  link.download=`the-1037-signal-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(link.href),0);
  return true;
}

async function importSaveBackupFile(file){
  if(!file||typeof file.text!=="function")return {ok:false,reason:"file"};
  try{
    const payload=JSON.parse(await file.text());
    const validation=validateSaveBackup(payload);
    if(!validation.ok)return validation;
    const nextStore={version:1,slots:validation.slots.map(slot=>({
      id:slot.id,
      createdAt:Number(slot.createdAt)||Date.now(),
      updatedAt:Number(slot.updatedAt)||Date.now(),
      state:structuredClone(slot.state)
    }))};
    writeSaveStore(nextStore);
    const requested=String(payload.activeSaveId||"");
    const active=nextStore.slots.some(slot=>slot.id===requested)?requested:(nextStore.slots[0]?.id||"");
    setActiveSaveSlotId(active);
    if(active){
      const slot=nextStore.slots.find(row=>row.id===active);
      state=normalizeItemInstanceState({...structuredClone(initialState),...structuredClone(slot.state)});
      normalizePlayerVitals();
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }else{
      state=normalizeItemInstanceState(structuredClone(initialState));
      localStorage.removeItem(STORAGE_KEY);
    }
    return {ok:true,count:nextStore.slots.length};
  }catch{
    return {ok:false,reason:"parse"};
  }
}


const initialState = {
  saveVersion: 30,
  balanceMigrationVersion: 0,
  hasStarted: false,
  currentRoute: "world",
  viewMode: "menu",
  nickname: "",
  level: 1,
  xp: 0,
  hp: 10,
  radiation: 0,
  protection: 0,
  maxProtection: 0,
  energy: 100,
  money: 650,
  day: 1,
  gameMinutes: 8 * 60 + 30,
  currentRegion: "south",
  currentLocation: "south_01",
  openedLocations: ["south_01"],
  storyStage: "dytiatky",
  storyProgress: {},
  discoveredItems: [],
  unlockedAvatars: ["novice"],
  activeAvatar: "novice",
  itemProgression: {},
  upgradePity: {},
  itemLocks: {},
  tradePost: {
    shopWindow: 0,
    shopItems: [],
    auctionListings: [],
    fieldContracts: []
  },
  backpack: { level: 1 },
  storage: [],
  bunkerRecovery: { active:false, startedAt:0, lastTick:0, startRadiation:0 },
  starterKnifeGifted: false,
  expeditions: {
    selectedLevel: 1,
    unlockedLevel: 1,
    completedByLevel: {"1":[]},
    finalCompletedByLevel: {},
    mastered: false,
    totalRuns: 0
  },
  recovery: {
    lastTick: 0,
    lastDamageAt: 0
  },
  equipment: {
    head: null,
    mask: null,
    body: null,
    cloak: null,
    gloves: null,
    pants: null,
    boots: null,
    ranged: null,
    melee: null,
    dosimeter: null
  },
  inventory: [
    {id:"bandage", qty:1},
    {id:"water", qty:1},
    {id:"old_note", qty:1},
    {id:"combat_knife", qty:1}
  ]
};

let itemInstanceSequence=0;

function makeItemInstanceId(id="item") {
  itemInstanceSequence+=1;
  return `${id}-${Date.now().toString(36)}-${itemInstanceSequence.toString(36)}-${Math.random().toString(36).slice(2,7)}`;
}

function isEquipmentCatalogId(id) {
  return GAME_DATA.inventory.some(item=>item.id===id && item.type==="equipment");
}

function normalizeItemInstanceState(loaded) {
  const oldProgression=loaded.itemProgression && typeof loaded.itemProgression==="object"
    ? loaded.itemProgression
    : {};
  const oldPity=loaded.upgradePity && typeof loaded.upgradePity==="object"
    ? loaded.upgradePity
    : {};

  const nextProgression={};
  const nextPity={};
  const equippedIds=new Set();
  const claimedLegacyProgression=new Set();

  loaded.equipment=loaded.equipment && typeof loaded.equipment==="object"
    ? loaded.equipment
    : {};

  Object.keys(loaded.equipment).forEach(slot=>{
    const raw=loaded.equipment[slot];
    if(!raw)return;

    const ref=typeof raw==="string"
      ? {id:raw,instanceId:makeItemInstanceId(raw)}
      : {
          id:raw.id,
          instanceId:raw.instanceId||makeItemInstanceId(raw.id||"item")
        };

    if(!ref.id){
      loaded.equipment[slot]=null;
      return;
    }

    loaded.equipment[slot]=ref;
    equippedIds.add(ref.id);

    const progress=oldProgression[ref.instanceId]||oldProgression[ref.id];
    if(progress){
      nextProgression[ref.instanceId]={...progress};
      claimedLegacyProgression.add(ref.id);
    }

    const pity=oldPity[ref.instanceId] ?? oldPity[ref.id];
    if(Number.isFinite(pity))nextPity[ref.instanceId]=pity;
  });

  const normalizedInventory=[];

  (loaded.inventory||[]).forEach(entry=>{
    if(!entry?.id||entry.id==="field_backpack")return;

    if(!isEquipmentCatalogId(entry.id)){
      normalizedInventory.push({...entry,qty:Math.max(0,Number(entry.qty)||0)});
      return;
    }

    if(entry.instanceId){
      const instance={id:entry.id,qty:1,instanceId:entry.instanceId};
      normalizedInventory.push(instance);

      const progress=oldProgression[entry.instanceId];
      if(progress)nextProgression[entry.instanceId]={...progress};

      const pity=oldPity[entry.instanceId];
      if(Number.isFinite(pity))nextPity[entry.instanceId]=pity;
      return;
    }

    const qty=Math.max(1,Math.floor(Number(entry.qty)||1));
    for(let index=0;index<qty;index+=1){
      const instanceId=makeItemInstanceId(entry.id);
      normalizedInventory.push({id:entry.id,qty:1,instanceId});

      // Old saves had one progression per catalog id.
      // If that catalog item is equipped, its progression belongs to the equipped copy.
      // Otherwise preserve it on the first inventory copy only.
      if(
        !equippedIds.has(entry.id) &&
        !claimedLegacyProgression.has(entry.id) &&
        oldProgression[entry.id]
      ){
        nextProgression[instanceId]={...oldProgression[entry.id]};
        if(Number.isFinite(oldPity[entry.id]))nextPity[instanceId]=oldPity[entry.id];
        claimedLegacyProgression.add(entry.id);
      }
    }
  });

  const normalizedStorage=[];
  (Array.isArray(loaded.storage)?loaded.storage:[]).forEach(entry=>{
    if(!entry?.id)return;
    if(!isEquipmentCatalogId(entry.id)){
      normalizedStorage.push({...entry,qty:Math.max(0,Number(entry.qty)||0)});
      return;
    }
    const instanceId=entry.instanceId||makeItemInstanceId(entry.id);
    normalizedStorage.push({id:entry.id,qty:1,instanceId});
    const progress=oldProgression[instanceId]||oldProgression[entry.id];
    if(progress)nextProgression[instanceId]={...progress};
    const pity=oldPity[instanceId] ?? oldPity[entry.id];
    if(Number.isFinite(pity))nextPity[instanceId]=pity;
  });
  loaded.storage=normalizedStorage.filter(entry=>entry.qty>0);

  const auctionListings=Array.isArray(loaded.tradePost?.auctionListings)
    ? loaded.tradePost.auctionListings
    : [];

  auctionListings.forEach(listing=>{
    const auctionItem=listing?.item;
    if(!auctionItem?.instanceId)return;

    const progress=oldProgression[auctionItem.instanceId];
    if(progress)nextProgression[auctionItem.instanceId]={...progress};

    const pity=oldPity[auctionItem.instanceId];
    if(Number.isFinite(pity))nextPity[auctionItem.instanceId]=pity;
  });

  loaded.inventory=normalizedInventory.filter(entry=>entry.qty>0);
  loaded.itemProgression=nextProgression;
  loaded.upgradePity=nextPity;
  loaded.saveVersion=30;
  return loaded;
}

let state = loadState();

function loadState() {
  try {
    const store=readSaveStore();
    let activeId=activeSaveSlotId();
    let slot=store.slots.find(entry=>entry.id===activeId&&entry?.state?.hasStarted);

    // One-time migration from the old single-save format.
    if(!slot){
      const legacy=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      if(legacy?.hasStarted){
        const migratedId=makeSaveSlotId();
        const migrated={
          id:migratedId,
          createdAt:Date.now(),
          updatedAt:Date.now(),
          state:legacy
        };
        store.slots.push(migrated);
        writeSaveStore(store);
        setActiveSaveSlotId(migratedId);
        activeId=migratedId;
        slot=migrated;
      }
    }

    const raw=slot?.state||{};
    const loaded={...structuredClone(initialState),...structuredClone(raw)};
    if(loaded.equipment && "backpack" in loaded.equipment)delete loaded.equipment.backpack;
    const normalized=normalizeItemInstanceState(loaded);
    if(normalized.currentLocation==="dytiatky")normalized.currentLocation="south_01";
    if(Array.isArray(normalized.openedLocations)){
      normalized.openedLocations=normalized.openedLocations.map(id=>id==="dytiatky"?"south_01":id);
      normalized.openedLocations=[...new Set(normalized.openedLocations)];
    }
    if(normalized.currentRoute==="shop"||normalized.currentRoute==="craft") normalized.currentRoute="tradepost";
    if(!normalized.tradePost||typeof normalized.tradePost!=="object"){
      normalized.tradePost={shopWindow:0,shopItems:[],auctionListings:[],fieldContracts:[]};
    }
    if(!Array.isArray(normalized.tradePost.shopItems))normalized.tradePost.shopItems=[];
    if(!Array.isArray(normalized.tradePost.auctionListings))normalized.tradePost.auctionListings=[];
    if(!Array.isArray(normalized.tradePost.fieldContracts))normalized.tradePost.fieldContracts=[];
    if(!normalized.backpack||typeof normalized.backpack!=="object")normalized.backpack={level:1};
    normalized.backpack.level=clamp(Math.floor(Number(normalized.backpack.level)||1),1,10);
    if(!Array.isArray(normalized.storage))normalized.storage=[];
    if(!normalized.bunkerRecovery||typeof normalized.bunkerRecovery!=="object")normalized.bunkerRecovery={active:false,startedAt:0,lastTick:0,startRadiation:0};
    normalized.bunkerRecovery.active=!!normalized.bunkerRecovery.active;
    normalized.bunkerRecovery.startedAt=Math.max(0,Number(normalized.bunkerRecovery.startedAt)||0);
    normalized.bunkerRecovery.lastTick=Math.max(0,Number(normalized.bunkerRecovery.lastTick)||0);
    normalized.bunkerRecovery.startRadiation=Math.max(0,Number(normalized.bunkerRecovery.startRadiation)||0);
    if(normalized.bunkerRecovery.active&&normalized.bunkerRecovery.startRadiation<=0){
      normalized.bunkerRecovery.startRadiation=Math.max(0,Number(normalized.radiation)||0);
    }
    normalized.starterKnifeGifted=!!normalized.starterKnifeGifted;
    if(!normalized.expeditions||typeof normalized.expeditions!=="object"){
      normalized.expeditions={
        selectedLevel:1,
        unlockedLevel:1,
        completedByLevel:{"1":[]},
        finalCompletedByLevel:{},
        mastered:false,
        totalRuns:0
      };
    }

    // Migration from the old single-current-level Expedition progress.
    if(!normalized.expeditions.completedByLevel||typeof normalized.expeditions.completedByLevel!=="object"){
      const legacyLevel=clamp(Math.floor(Number(normalized.expeditions.level)||1),1,10);
      const legacyCompleted=Array.isArray(normalized.expeditions.completed)
        ? [...new Set(normalized.expeditions.completed.filter(Boolean))]
        : [];
      const completedByLevel={};
      const finalCompletedByLevel={};

      for(let level=1;level<legacyLevel;level++){
        completedByLevel[String(level)]=["warehouse","hospital","anomaly","raiders","mutants","bunker","laboratory"];
        finalCompletedByLevel[String(level)]=true;
      }

      completedByLevel[String(legacyLevel)]=legacyCompleted;
      if(normalized.expeditions.finalCompleted)finalCompletedByLevel[String(legacyLevel)]=true;

      normalized.expeditions.completedByLevel=completedByLevel;
      normalized.expeditions.finalCompletedByLevel=finalCompletedByLevel;
      normalized.expeditions.selectedLevel=legacyLevel;
      normalized.expeditions.unlockedLevel=legacyLevel;
      delete normalized.expeditions.level;
      delete normalized.expeditions.completed;
      delete normalized.expeditions.finalCompleted;
    }

    normalized.expeditions.unlockedLevel=clamp(
      Math.floor(Number(normalized.expeditions.unlockedLevel)||1),1,10
    );
    normalized.expeditions.selectedLevel=clamp(
      Math.floor(Number(normalized.expeditions.selectedLevel)||normalized.expeditions.unlockedLevel),
      1,
      normalized.expeditions.unlockedLevel
    );

    if(!normalized.expeditions.completedByLevel||typeof normalized.expeditions.completedByLevel!=="object"){
      normalized.expeditions.completedByLevel={"1":[]};
    }
    for(let level=1;level<=normalized.expeditions.unlockedLevel;level++){
      const key=String(level);
      const entries=Array.isArray(normalized.expeditions.completedByLevel[key])
        ? normalized.expeditions.completedByLevel[key]
        : [];
      normalized.expeditions.completedByLevel[key]=[...new Set(entries.filter(Boolean))];
    }

    if(!normalized.expeditions.finalCompletedByLevel||typeof normalized.expeditions.finalCompletedByLevel!=="object"){
      normalized.expeditions.finalCompletedByLevel={};
    }
    normalized.expeditions.mastered=!!normalized.expeditions.mastered;
    normalized.expeditions.totalRuns=Math.max(0,Math.floor(Number(normalized.expeditions.totalRuns)||0));
    if(!normalized.recovery||typeof normalized.recovery!=="object")normalized.recovery={lastTick:0,lastDamageAt:0};
    normalized.recovery.lastTick=Math.max(0,Number(normalized.recovery.lastTick)||0);
    normalized.recovery.lastDamageAt=Math.max(0,Number(normalized.recovery.lastDamageAt)||0);
    if(normalized.currentRoute==="location")normalized.currentRoute="world";
    normalizePlayerLevelState(normalized);
    return normalized;
  } catch {
    return normalizeItemInstanceState(structuredClone(initialState));
  }
}

function saveState() {
  // Keep the legacy key synchronized for compatibility with old builds.
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  if(!state?.hasStarted)return;

  const store=readSaveStore();
  let id=pendingNewSaveId||activeSaveSlotId();
  let slot=store.slots.find(entry=>entry.id===id);

  if(!slot){
    if(store.slots.filter(entry=>entry?.state?.hasStarted).length>=MAX_SAVE_SLOTS)return;
    id=id||makeSaveSlotId();
    slot={id,createdAt:Date.now(),updatedAt:Date.now(),state:{}};
    store.slots.push(slot);
  }

  slot.state=structuredClone(state);
  slot.updatedAt=Date.now();
  if(!slot.createdAt)slot.createdAt=slot.updatedAt;

  writeSaveStore(store);
  setActiveSaveSlotId(id);

  if(pendingNewSaveId===id){
    pendingNewSaveId=null;
    pendingPreviousState=null;
  }
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function sample(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function inventoryItem(id) { return state.inventory.find(i => i.id === id); }
function inventoryEntryKey(item) { return item?.instanceId || item?.id || ""; }
function inventoryEntryByKey(key) {
  return state.inventory.find(item=>item.instanceId===key) || state.inventory.find(item=>item.id===key) || null;
}
function inventoryCatalogItem(id) {
  return GAME_DATA.inventory.find(item => item.id === id) || null;
}
function inventoryItemData(item) {
  if(!item)return null;
  const meta = inventoryCatalogItem(item.id) || {};
  return {...meta, ...item, qty:item.qty || 0};
}
function inventoryItemWeight(item) {
  const data = inventoryItemData(item);
  return Number(data.weight || 0);
}

function inventoryWeight() {
  return state.inventory.reduce((sum, item) => sum + item.qty * inventoryItemWeight(item), 0);
}

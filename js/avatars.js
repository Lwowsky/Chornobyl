const AVATAR_TEST_MODE = false;

const AVATAR_PRESETS = Object.freeze([
  {
    id:"novice",
    image:"assets/avatars/novice.webp",
    nameKey:"avatars.novice.name",
    descriptionKey:"avatars.novice.description",
    setId:"field",
    rarity:"common",
    previousId:null,
    requirements:[],
    bonus:{stats:{}}
  },
  {
    id:"stalker",
    image:"assets/avatars/stalker.webp",
    nameKey:"avatars.stalker.name",
    descriptionKey:"avatars.stalker.description",
    setId:"field",
    rarity:"uncommon",
    previousId:"novice",
    requirements:["field_hood","old_mask","field_armor","field_cloak","field_gloves","field_pants","field_boots"],
    bonus:{stats:{radiationResistance:2}}
  },
  {
    id:"scout",
    image:"assets/avatars/scout.webp",
    nameKey:"avatars.scout.name",
    descriptionKey:"avatars.scout.description",
    setId:"field",
    rarity:"rare",
    previousId:"stalker",
    requirements:["field_hood","reinforced_mask","field_armor","field_cloak","field_gloves","field_pants","field_boots","basic_dosimeter"],
    bonus:{stats:{maxEnergy:5}}
  },
  {
    id:"military",
    image:"assets/avatars/military.webp",
    nameKey:"avatars.military.name",
    descriptionKey:"avatars.military.description",
    setId:"field",
    rarity:"epic",
    previousId:"scout",
    requirements:["field_hood","reinforced_mask","field_armor","field_cloak","field_gloves","field_pants","field_boots","rusty_rifle"],
    bonus:{stats:{maxProtection:3}}
  },
  {
    id:"veteran",
    image:"assets/avatars/veteran.webp",
    nameKey:"avatars.veteran.name",
    descriptionKey:"avatars.veteran.description",
    setId:"field",
    rarity:"legendary",
    previousId:"military",
    requirements:["field_hood","reinforced_mask","field_armor","field_cloak","field_gloves","field_pants","field_boots","rusty_rifle","combat_knife","basic_dosimeter"],
    bonus:{stats:{maxHp:3,radiationResistance:3}}
  }
]);

function avatarById(id) {
  return AVATAR_PRESETS.find(avatar => avatar.id === id) || AVATAR_PRESETS[0];
}

function avatarDiscoveryIds(snapshot=state) {
  const discovered=new Set(Array.isArray(snapshot?.discoveredItems)?snapshot.discoveredItems:[]);
  (Array.isArray(snapshot?.inventory)?snapshot.inventory:[]).forEach(item=>{if(item?.id)discovered.add(item.id);});
  const equipment=snapshot?.equipment&&typeof snapshot.equipment==="object"?snapshot.equipment:{};
  Object.values(equipment).forEach(item=>{
    const id=typeof item==="string"?item:item?.id;
    if(id)discovered.add(id);
  });
  return discovered;
}

function avatarUnlockedIdsForSnapshot(snapshot=state) {
  if(AVATAR_TEST_MODE)return AVATAR_PRESETS.map(avatar=>avatar.id);
  const discovered=avatarDiscoveryIds(snapshot);
  const unlocked=[];

  AVATAR_PRESETS.forEach((avatar,index)=>{
    if(index===0){
      unlocked.push(avatar.id);
      return;
    }
    const previousReady=!avatar.previousId||unlocked.includes(avatar.previousId);
    const requirementsReady=(avatar.requirements||[]).every(id=>discovered.has(id));
    if(previousReady&&requirementsReady)unlocked.push(avatar.id);
  });

  return unlocked;
}

function avatarSafeActiveIdForSnapshot(snapshot=state) {
  const unlocked=avatarUnlockedIdsForSnapshot(snapshot);
  const requested=String(snapshot?.activeAvatar||"novice");
  return unlocked.includes(requested)?requested:"novice";
}

function normalizeAvatarState() {
  if (!Array.isArray(state.discoveredItems)) state.discoveredItems = [];

  const discovered=avatarDiscoveryIds(state);
  state.discoveredItems=[...discovered];
  state.unlockedAvatars=avatarUnlockedIdsForSnapshot(state);
  state.activeAvatar=avatarSafeActiveIdForSnapshot(state);
  return state.activeAvatar;
}

function markItemDiscovered(id) {
  if (!id) return;
  if (!Array.isArray(state.discoveredItems)) state.discoveredItems = [];
  const itemId=typeof id==="string"?id:id?.id;
  if(itemId&&!state.discoveredItems.includes(itemId))state.discoveredItems.push(itemId);
  syncAvatarUnlocks();
}

function avatarRequirementProgress(avatar) {
  const requirements=avatar?.requirements||[];
  const discovered=avatarDiscoveryIds(state);
  const collected=requirements.filter(id=>discovered.has(id));
  return {collected:collected.length,total:requirements.length};
}

function avatarUnlockStatus(avatar) {
  const unlockedIds=avatarUnlockedIdsForSnapshot(state);
  const previous=avatar?.previousId?avatarById(avatar.previousId):null;
  const progress=avatarRequirementProgress(avatar);
  return {
    unlocked:unlockedIds.includes(avatar.id),
    previous,
    previousUnlocked:!previous||unlockedIds.includes(previous.id),
    progress,
    requirementsMet:progress.collected>=progress.total
  };
}

function isAvatarUnlocked(id) {
  if (AVATAR_TEST_MODE) return AVATAR_PRESETS.some(avatar=>avatar.id===id);
  return avatarUnlockedIdsForSnapshot(state).includes(id);
}

function syncAvatarUnlocks() {
  state.unlockedAvatars=avatarUnlockedIdsForSnapshot(state);
  if(!state.unlockedAvatars.includes(state.activeAvatar))state.activeAvatar="novice";
  return state.unlockedAvatars;
}

function selectAvatar(id) {
  normalizeAvatarState();
  if (!isAvatarUnlocked(id)) return false;
  state.activeAvatar = id;
  normalizePlayerVitals();
  saveState();
  syncHud();
  return true;
}

function activeAvatar() {
  normalizeAvatarState();
  return avatarById(state.activeAvatar);
}

function activeAvatarBonusStats() {
  return activeAvatar()?.bonus?.stats || {};
}

function avatarBonusEntries(avatar) {
  return Object.entries(avatar?.bonus?.stats || {}).filter(([,value]) => Number.isFinite(value) && value !== 0);
}

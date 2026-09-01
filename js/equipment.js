const EQUIPMENT_SLOTS = Object.freeze([
  "head",
  "mask",
  "body",
  "cloak",
  "gloves",
  "pants",
  "boots",
  "ranged",
  "melee",
  "dosimeter"
]);

const EQUIPMENT_SLOT_UI = Object.freeze({
  head:      {labelKey:"equipment.slots.head",      emptyIcon:"assets/equipment/placeholders-png/head.webp"},
  mask:      {labelKey:"equipment.slots.mask",      emptyIcon:"assets/equipment/placeholders-png/mask.webp"},
  body:      {labelKey:"equipment.slots.body",      emptyIcon:"assets/equipment/placeholders-png/body.webp"},
  cloak:      {labelKey:"equipment.slots.cloak",      emptyIcon:"assets/equipment/placeholders-png/cloak.webp"},
  gloves:      {labelKey:"equipment.slots.gloves",      emptyIcon:"assets/equipment/placeholders-png/gloves.webp"},
  pants:      {labelKey:"equipment.slots.pants",      emptyIcon:"assets/equipment/placeholders-png/pants.webp"},
  boots:      {labelKey:"equipment.slots.boots",      emptyIcon:"assets/equipment/placeholders-png/boots.webp"},
  ranged:      {labelKey:"equipment.slots.ranged",      emptyIcon:"assets/equipment/placeholders-png/ranged.webp"},
  melee:      {labelKey:"equipment.slots.melee",      emptyIcon:"assets/equipment/placeholders-png/melee.webp"},
  dosimeter:      {labelKey:"equipment.slots.dosimeter",      emptyIcon:"assets/equipment/placeholders-png/dosimeter.webp"}
});

const EQUIPMENT_SLOT_COLUMNS = Object.freeze({
  left: ["head","mask","body","cloak","gloves"],
  right: ["pants","boots","ranged","melee","dosimeter"]
});


function normalizeEquipmentState() {
  const current=state.equipment && typeof state.equipment==="object"
    ? {...state.equipment}
    : {};

  if(!current.body&&current.armor)current.body=current.armor;
  if(!current.ranged&&current.weapon)current.ranged=current.weapon;

  if(current.artifact){
    const artifact=typeof current.artifact==="string"
      ? {id:current.artifact,instanceId:makeItemInstanceId(current.artifact)}
      : current.artifact;
    if(artifact.id)state.inventory.push({id:artifact.id,qty:1,instanceId:artifact.instanceId||makeItemInstanceId(artifact.id)});
    current.artifact=null;
  }

  state.equipment=Object.fromEntries(
    EQUIPMENT_SLOTS.map(slot=>{
      const raw=current[slot];
      if(!raw)return [slot,null];
      if(typeof raw==="string")return [slot,{id:raw,instanceId:makeItemInstanceId(raw)}];
      return [slot,{id:raw.id,instanceId:raw.instanceId||makeItemInstanceId(raw.id||"item")}];
    })
  );

  return state.equipment;
}

function isEquipmentSlot(slot) {
  return EQUIPMENT_SLOTS.includes(slot);
}

function isEquipableItem(item) {
  return !!item && item.type === "equipment" && isEquipmentSlot(item.slot);
}

function equippedItemRef(slot) {
  if(!isEquipmentSlot(slot))return null;
  normalizeEquipmentState();
  return state.equipment[slot]||null;
}


function equippedItemKey(slot) {
  const ref=equippedItemRef(slot);
  return ref?.instanceId||ref?.id||null;
}

function equippedItem(slot) {
  const ref=equippedItemRef(slot);
  if(!ref)return null;
  const catalog=inventoryCatalogItem(ref.id);
  return catalog?{...catalog,...ref,qty:1}:null;
}

function equipmentWeight() {
  normalizeEquipmentState();
  return EQUIPMENT_SLOTS.reduce((sum, slot) => {
    const item = equippedItem(slot);
    return sum + Number(item?.weight || 0)*0.70;
  }, 0);
}

function carriedWeight() {
  return inventoryWeight() + equipmentWeight();
}

function removeInventoryEntry(key) {
  const stored=inventoryEntryByKey(key);
  if(!stored)return null;

  const snapshot={...stored};
  stored.qty-=1;
  state.inventory=state.inventory.filter(item=>item.qty>0);
  return snapshot;
}

function equipItem(key) {
  const stored=inventoryEntryByKey(key);
  const item=inventoryItemData(stored);
  if(!stored||!isEquipableItem(item))return false;

  normalizeEquipmentState();
  const slot=item.slot;
  const current=equippedItemRef(slot);

  if(current&&equippedItemKey(slot)===inventoryEntryKey(item))return false;

  const removed=removeInventoryEntry(inventoryEntryKey(item));
  if(!removed)return false;

  if(current){
    state.inventory.push({id:current.id,qty:1,instanceId:current.instanceId||makeItemInstanceId(current.id)});
  }

  state.equipment[slot]={
    id:item.id,
    instanceId:item.instanceId||makeItemInstanceId(item.id)
  };

  normalizePlayerVitals();
  saveState();
  syncHud();
  return true;
}

function unequipItem(slot) {
  if(!isEquipmentSlot(slot))return false;
  normalizeEquipmentState();

  const current=equippedItemRef(slot);
  if(!current)return false;

  state.equipment[slot]=null;
  state.inventory.push({
    id:current.id,
    qty:1,
    instanceId:current.instanceId||makeItemInstanceId(current.id)
  });

  normalizePlayerVitals();
  saveState();
  syncHud();
  return true;
}

function equipmentSlotUi(slot) {
  return EQUIPMENT_SLOT_UI[slot] || {labelKey:slot, emptyIcon:"□"};
}

function equipmentEmptySlotIcon(slot) {
  const ui=equipmentSlotUi(slot);
  return `<img class="equipment-placeholder-image" src="${ui.emptyIcon}" alt="">`;
}

function equipmentItemDisplayIcon(item) {
  if (!item) return "";
  if (item.profileIcon) return `<img src="${item.profileIcon}" alt="">`;
  return item.icon || "□";
}

function equipmentItemsInInventory(slot) {
  return state.inventory
    .map(inventoryItemData)
    .filter(item => item.qty > 0 && isEquipableItem(item) && item.slot === slot);
}


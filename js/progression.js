const ITEM_RARITIES = Object.freeze({
  common:    {id:"common",    labelKey:"rarities.common",    order:0, maxUpgrade:25, statMultiplier:1.00},
  uncommon:  {id:"uncommon",  labelKey:"rarities.uncommon",  order:1, maxUpgrade:25, statMultiplier:1.10},
  rare:      {id:"rare",      labelKey:"rarities.rare",      order:2, maxUpgrade:25, statMultiplier:1.25},
  epic:      {id:"epic",      labelKey:"rarities.epic",      order:3, maxUpgrade:25, statMultiplier:1.45},
  legendary: {id:"legendary", labelKey:"rarities.legendary", order:4, maxUpgrade:25, statMultiplier:1.70}
});

const ITEM_RARITY_ORDER = Object.freeze(
  Object.values(ITEM_RARITIES).sort((a,b)=>a.order-b.order).map(rarity=>rarity.id)
);

const ITEM_UPGRADE_PITY_STEP = 5;
const ITEM_UPGRADE_PITY_MAX = 30;

const ITEM_UPGRADE_CHANCE = Object.freeze({
  common:    {start:90,end:45,promote:40},
  uncommon:  {start:78,end:32,promote:30},
  rare:      {start:64,end:22,promote:20},
  epic:      {start:50,end:14,promote:12},
  legendary: {start:35,end:8,promote:null}
});

const ITEM_UPGRADE_MATERIAL = Object.freeze({
  common:"mutant_hide",
  uncommon:"uncommon_hide",
  rare:"rare_hide",
  epic:"epic_hide",
  legendary:"legendary_hide"
});


const ITEM_ATTRIBUTE_VALUES = Object.freeze({
  // Percentage-based attributes intentionally keep the compact v0.19 scale.
  // Flat combat stats use rarity-specific values below so a naturally dropped
  // legendary item is exactly as strong as an item promoted to legendary.
  maxHp:6,
  maxProtection:4,
  attack:4,
  agility:1,
  radiationResistance:1.25,
  critChance:0.25,
  accuracy:0.75,
  evasion:0.5
});

const ITEM_FLAT_ATTRIBUTE_RARITY_VALUES = Object.freeze({
  maxHp:Object.freeze({common:6,uncommon:12,rare:18,epic:24,legendary:30}),
  maxProtection:Object.freeze({common:4,uncommon:8,rare:12,epic:16,legendary:20}),
  attack:Object.freeze({common:4,uncommon:8,rare:12,epic:16,legendary:20}),
  agility:Object.freeze({common:1,uncommon:2,rare:3,epic:4,legendary:5})
});

const ITEM_PERCENT_ATTRIBUTE_KEYS = Object.freeze([
  "radiationResistance","critChance","accuracy","evasion"
]);

const ITEM_ATTRIBUTE_KEYS = Object.freeze(Object.keys(ITEM_ATTRIBUTE_VALUES));
const ITEM_RARITY_ATTRIBUTE_COUNTS = Object.freeze({
  common:2,
  uncommon:3,
  rare:4,
  epic:5,
  legendary:7
});
const ITEM_UPGRADE_STAT_STEP = 0.02;

function itemRarityAttributeCount(rarityId="common"){
  return ITEM_RARITY_ATTRIBUTE_COUNTS[rarityId]||ITEM_RARITY_ATTRIBUTE_COUNTS.common;
}

function generateItemAttributes(count=2,existing=[]){
  const result=[...new Set((existing||[]).filter(key=>ITEM_ATTRIBUTE_VALUES[key]))];
  const target=clamp(Math.floor(Number(count)||2),1,ITEM_ATTRIBUTE_KEYS.length);
  while(result.length<target){
    const next=sample(ITEM_ATTRIBUTE_KEYS.filter(key=>!result.includes(key)));
    if(!next)break;
    result.push(next);
  }
  return result.slice(0,target);
}

function ensureItemAttributes(itemOrId){
  const progress=ensureItemProgression(itemOrId);
  if(!progress)return [];
  const target=itemRarityAttributeCount(progress.rarity);
  progress.attributes=generateItemAttributes(target,progress.attributes);
  return progress.attributes;
}

function itemAttributeKeys(item){
  return ensureItemAttributes(item);
}

function roundItemStat(value){
  return Math.round((Number(value)||0)*100)/100;
}

function itemEffectiveAttributeValue(key,rarityId,upgradeLevel){
  const rarity=ITEM_RARITIES[rarityId]||ITEM_RARITIES.common;
  const level=clamp(Math.floor(Number(upgradeLevel)||1),1,rarity.maxUpgrade);
  const upgradeMultiplier=1+(level-1)*ITEM_UPGRADE_STAT_STEP;
  const flatByRarity=ITEM_FLAT_ATTRIBUTE_RARITY_VALUES[key];

  if(flatByRarity){
    const base=Number(flatByRarity[rarity.id])||Number(flatByRarity.common)||0;
    return roundItemStat(base*upgradeMultiplier);
  }

  return roundItemStat((ITEM_ATTRIBUTE_VALUES[key]||0)*rarity.statMultiplier*upgradeMultiplier);
}

function itemAttributes(item){
  const rarityId=itemRarityId(item);
  const upgradeLevel=itemUpgradeLevel(item);
  return itemAttributeKeys(item).map(key=>({key,value:itemEffectiveAttributeValue(key,rarityId,upgradeLevel)}));
}

function normalizeItemProgressionState() {
  if (!state.itemProgression || typeof state.itemProgression !== "object") state.itemProgression = {};
  if (!state.upgradePity || typeof state.upgradePity !== "object") state.upgradePity = {};
  return state.itemProgression;
}

function catalogItemRarityId(item) {
  const id=item?.rarity || "common";
  return ITEM_RARITIES[id] ? id : "common";
}

function catalogItemUpgradeLevel(item) {
  const rarity=ITEM_RARITIES[catalogItemRarityId(item)];
  return clamp(Math.floor(Number(item?.upgradeLevel) || 1),1,rarity.maxUpgrade);
}

function progressionItemKey(item) {
  return item?.instanceId||item?.id||null;
}

function resolveProgressionItem(itemOrKey) {
  if(itemOrKey&&typeof itemOrKey==="object")return itemOrKey;

  if(typeof itemOrKey==="string"){
    const stored=inventoryEntryByKey(itemOrKey);
    if(stored)return inventoryItemData(stored);

    if(typeof EQUIPMENT_SLOTS!=="undefined"){
      const equipped=EQUIPMENT_SLOTS.map(equippedItem).find(item=>inventoryEntryKey(item)===itemOrKey);
      if(equipped)return equipped;
    }

    return inventoryCatalogItem(itemOrKey);
  }

  return null;
}

function ensureItemProgression(itemOrId) {
  normalizeItemProgressionState();
  const item=resolveProgressionItem(itemOrId);
  const key=progressionItemKey(item);
  if(!item?.id||!key)return null;

  if(!state.itemProgression[key]){
    state.itemProgression[key]={
      rarity:catalogItemRarityId(item),
      upgradeLevel:catalogItemUpgradeLevel(item),
      attributes:generateItemAttributes()
    };
  }

  const stored=state.itemProgression[key];
  if(!ITEM_RARITIES[stored.rarity])stored.rarity=catalogItemRarityId(item);
  const rarity=ITEM_RARITIES[stored.rarity];
  stored.upgradeLevel=clamp(Math.floor(Number(stored.upgradeLevel)||1),1,rarity.maxUpgrade);
  stored.attributes=generateItemAttributes(
    itemRarityAttributeCount(stored.rarity),
    Array.isArray(stored.attributes)?stored.attributes:[]
  );
  stored.balanceVersion=4;

  if(!Number.isFinite(state.upgradePity[key]))state.upgradePity[key]=0;
  state.upgradePity[key]=clamp(Math.floor(state.upgradePity[key]),0,ITEM_UPGRADE_PITY_MAX);

  return stored;
}

function itemRarityId(item) {
  if (!item?.id) return catalogItemRarityId(item);
  return ensureItemProgression(item)?.rarity || catalogItemRarityId(item);
}

function itemRarity(item) {
  return ITEM_RARITIES[itemRarityId(item)];
}

function itemUpgradeLevel(item) {
  if (!item?.id) return catalogItemUpgradeLevel(item);
  return ensureItemProgression(item)?.upgradeLevel || 1;
}

function itemProgressionStage(item) {
  const rarity=itemRarity(item);
  const level=itemUpgradeLevel(item);
  return rarity.order*rarity.maxUpgrade + Math.max(0,level-1);
}

function itemQualityScore(item) {
  const rarity=itemRarity(item);
  return itemProgressionStage(item) + rarity.order*14;
}

function itemProgressionLabel(item) {
  const rarity=itemRarity(item);
  return `${t(rarity.labelKey)} +${itemUpgradeLevel(item)}`;
}


function itemEffectiveStatsAt(item,rarityId,upgradeLevel) {
  const resolved=resolveProgressionItem(item);
  const progress=ensureItemProgression(resolved);
  if(!progress)return {};
  const targetRarity=ITEM_RARITIES[rarityId]?rarityId:progress.rarity;
  const keys=[...new Set((progress.attributes||[]).filter(key=>ITEM_ATTRIBUTE_VALUES[key]))];
  return Object.fromEntries(keys.map(key=>[key,itemEffectiveAttributeValue(key,targetRarity,upgradeLevel)]));
}

function itemEffectiveStats(item) {
  return itemEffectiveStatsAt(item,itemRarityId(item),itemUpgradeLevel(item));
}

function equipmentCatalogForSlot(slot){
  return GAME_DATA.inventory.filter(item=>item.type==="equipment"&&item.slot===slot);
}

function addEquipmentInstance(id,rarityId="common",options={}){
  const catalog=inventoryCatalogItem(id);
  if(!catalog||catalog.type!=="equipment")return null;
  const rarity=ITEM_RARITIES[rarityId]?rarityId:"common";
  const instance={id,qty:1,instanceId:makeItemInstanceId(id)};
  state.inventory.push(instance);
  const item=inventoryItemData(instance);
  const progression=ensureItemProgression(item);
  progression.rarity=rarity;
  progression.upgradeLevel=clamp(Math.floor(Number(options.upgradeLevel)||1),1,ITEM_RARITIES[rarity].maxUpgrade);
  progression.attributes=generateItemAttributes(
    itemRarityAttributeCount(rarity),
    Array.isArray(options.attributes)?options.attributes:progression.attributes
  );
  progression.balanceVersion=4;
  if(typeof markItemDiscovered==="function")markItemDiscovered(id);
  return item;
}

function equipmentSlotQuality(slot){
  if(typeof equippedItem!=="function")return -1000;
  const item=equippedItem(slot);
  return item?itemQualityScore(item):-1000;
}

function weakestEquipmentSlots(count=3){
  const slots=typeof EQUIPMENT_SLOTS!=="undefined"?[...EQUIPMENT_SLOTS]:[];
  return slots
    .map(slot=>({slot,quality:equipmentSlotQuality(slot)}))
    .sort((a,b)=>a.quality-b.quality)
    .slice(0,Math.max(1,Math.floor(Number(count)||3)))
    .map(row=>row.slot);
}

function grantSmartQuestEquipment(rarityId="uncommon"){
  const candidates=weakestEquipmentSlots(3).filter(slot=>equipmentCatalogForSlot(slot).length);
  const slot=sample(candidates.length?candidates:(typeof EQUIPMENT_SLOTS!=="undefined"?EQUIPMENT_SLOTS:[]));
  const catalog=sample(equipmentCatalogForSlot(slot));
  return catalog?addEquipmentInstance(catalog.id,rarityId):null;
}

function nextItemProgression(item) {
  const rarity=itemRarity(item);
  const level=itemUpgradeLevel(item);

  if (level < rarity.maxUpgrade) {
    return {rarity:rarity.id,upgradeLevel:level+1,rarityChanged:false};
  }

  const nextId=ITEM_RARITY_ORDER[rarity.order+1];
  if (!nextId) return null;

  return {rarity:nextId,upgradeLevel:1,rarityChanged:true};
}

function canUpgradeItem(item) {
  return !!nextItemProgression(item);
}

function itemUpgradePity(item) {
  const resolved=resolveProgressionItem(item);
  const key=progressionItemKey(resolved);
  if(!key)return 0;
  ensureItemProgression(resolved);
  return state.upgradePity[key]||0;
}

function baseItemUpgradeChance(item) {
  const rarity=itemRarity(item);
  const level=itemUpgradeLevel(item);
  const config=ITEM_UPGRADE_CHANCE[rarity.id];

  if (level >= rarity.maxUpgrade) {
    return nextItemProgression(item) ? config.promote : 0;
  }

  const progress=(level-1)/(rarity.maxUpgrade-1);
  return Math.round(config.start-(config.start-config.end)*progress);
}

function itemUpgradeChance(item) {
  return clamp(baseItemUpgradeChance(item)+itemUpgradePity(item),1,95);
}

function itemUpgradeRecipe(item) {
  const rarity=itemRarity(item);
  const level=itemUpgradeLevel(item);
  const promotion=level>=rarity.maxUpgrade;
  const colorMaterialId=ITEM_UPGRADE_MATERIAL[rarity.id];
  const rangedWeapon=item?.slot==="ranged";

  if (!nextItemProgression(item)) return [];

  // Every upgrade consumes a material that matches the current item colour.
  // Ranged weapons additionally use live ammunition as their main tuning cost.
  if (promotion) {
    const tier=rarity.order+1;
    const recipe=[
      {id:colorMaterialId,qty:12+tier*4},
      {id:"scrap",qty:5+tier*2}
    ];
    if(rangedWeapon){
      recipe.push({id:"ammo",qty:35+tier*15});
    }else{
      recipe.push(
        {id:"battery",qty:Math.max(1,tier*2)},
        {id:"mutant_tooth",qty:2+tier}
      );
    }
    return recipe;
  }

  const band=Math.floor((level-1)/5);
  const recipe=[
    {id:colorMaterialId,qty:2+band}
  ];

  if(rangedWeapon){
    recipe.push({id:"ammo",qty:6+level+rarity.order*4});
    if(level>=10)recipe.push({id:"scrap",qty:1+Math.floor(level/10)});
    return recipe;
  }

  recipe.push({id:"scrap",qty:1+Math.floor(level/8)});
  if (rarity.order>=1) recipe.push({id:"battery",qty:1+Math.floor(level/12)});
  if (rarity.order>=2) recipe.push({id:"mutant_tooth",qty:1+Math.floor(level/10)});

  return recipe;
}

function upgradeMaterialCount(id) {
  return Math.max(0,Number(inventoryItem(id)?.qty)||0);
}

function hasItemUpgradeMaterials(item) {
  return itemUpgradeRecipe(item).every(material=>upgradeMaterialCount(material.id)>=material.qty);
}

function consumeItemUpgradeMaterials(item) {
  const recipe=itemUpgradeRecipe(item);
  if (!recipe.every(material=>upgradeMaterialCount(material.id)>=material.qty)) return false;

  recipe.forEach(material=>{
    const stored=inventoryItem(material.id);
    stored.qty-=material.qty;
  });
  state.inventory=state.inventory.filter(entry=>entry.qty>0);
  return true;
}

function applySuccessfulItemUpgrade(item) {
  const resolved=resolveProgressionItem(item);
  const next=nextItemProgression(resolved);
  if(!next)return false;

  const key=progressionItemKey(resolved);
  const stored=ensureItemProgression(resolved);
  stored.rarity=next.rarity;
  stored.upgradeLevel=next.upgradeLevel;
  stored.attributes=generateItemAttributes(itemRarityAttributeCount(stored.rarity),stored.attributes);
  stored.balanceVersion=4;
  state.upgradePity[key]=0;

  normalizePlayerVitals();
  saveState();
  if(typeof syncHud==="function")syncHud();
  return true;
}

function attemptItemUpgrade(itemOrId,roll=Math.random()) {
  const item=resolveProgressionItem(itemOrId);
  const key=progressionItemKey(item);
  if(!item?.id||!key)return {ok:false,reason:"invalid"};
  if(!canUpgradeItem(item))return {ok:false,reason:"maxed"};
  if(!hasItemUpgradeMaterials(item))return {ok:false,reason:"materials"};

  const chance=itemUpgradeChance(item);
  const recipe=itemUpgradeRecipe(item).map(material=>({...material}));

  if(!consumeItemUpgradeMaterials(item))return {ok:false,reason:"materials"};

  const normalizedRoll=clamp(Number(roll)||0,0,0.999999);
  const success=normalizedRoll*100<chance;

  if(success){
    applySuccessfulItemUpgrade(item);
  }else{
    ensureItemProgression(item);
    state.upgradePity[key]=clamp(
      itemUpgradePity(item)+ITEM_UPGRADE_PITY_STEP,
      0,
      ITEM_UPGRADE_PITY_MAX
    );
    saveState();
  }

  return {
    ok:true,
    success,
    chance,
    pity:itemUpgradePity(item),
    recipe,
    rarity:itemRarityId(item),
    upgradeLevel:itemUpgradeLevel(item),
    instanceId:item.instanceId||null
  };
}

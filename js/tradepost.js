
let tradePostActiveTab="storage";
let tradePostTimer=null;
let bunkerStorageSort="rarity";
let bunkerStorageSearch="";
let bunkerBagPage=0;
let bunkerWarehousePage=0;
const BUNKER_STORAGE_PAGE_SIZE=5;

const SHOP_ROTATION_MS=3*60*60*1000;
const SHOP_SIZE=5;
const AUCTION_MAX_ACTIVE=2;
const AUCTION_DURATION_MS=24*60*60*1000;
const RESOURCE_REFINEMENT_RECIPES=Object.freeze([
  Object.freeze({id:"uncommon_hide",cost:[{id:"mutant_hide",qty:8},{id:"scrap",qty:2}],result:{id:"uncommon_hide",qty:1}}),
  Object.freeze({id:"rare_hide",cost:[{id:"uncommon_hide",qty:6},{id:"battery",qty:3}],result:{id:"rare_hide",qty:1}}),
  Object.freeze({id:"epic_hide",cost:[{id:"rare_hide",qty:5},{id:"battery",qty:4},{id:"mutant_tooth",qty:4}],result:{id:"epic_hide",qty:1}}),
  Object.freeze({id:"legendary_hide",cost:[{id:"epic_hide",qty:4},{id:"battery",qty:6},{id:"mutant_tooth",qty:6}],result:{id:"legendary_hide",qty:1}})
]);

const TRADE_RARITY_WEIGHTS=Object.freeze([
  {id:"common",weight:70},
  {id:"uncommon",weight:20},
  {id:"rare",weight:7},
  {id:"epic",weight:2.5},
  {id:"legendary",weight:0.5}
]);

function weightedTradeRarity(){
  const total=TRADE_RARITY_WEIGHTS.reduce((sum,row)=>sum+row.weight,0);
  let roll=Math.random()*total;
  for(const row of TRADE_RARITY_WEIGHTS){
    roll-=row.weight;
    if(roll<=0)return row.id;
  }
  return "common";
}

function tradePostState(){
  if(!state.tradePost||typeof state.tradePost!=="object"){
    state.tradePost={shopWindow:0,shopItems:[],auctionListings:[],fieldContracts:[]};
  }
  if(!Array.isArray(state.tradePost.shopItems))state.tradePost.shopItems=[];
  if(!Array.isArray(state.tradePost.auctionListings))state.tradePost.auctionListings=[];
  if(!Array.isArray(state.tradePost.fieldContracts))state.tradePost.fieldContracts=[];
  if(!state.tradePost.contractStats||typeof state.tradePost.contractStats!=="object")state.tradePost.contractStats={completed:0,legendary:0,earnedMoney:0,earnedXp:0,rerolls:0};
  if(!Array.isArray(state.tradePost.contractHistory))state.tradePost.contractHistory=[];
  return state.tradePost;
}

function isTradeSellable(item){
  return !!item && item.type!=="quest" && item.category!=="quest";
}

function tradeItemLocked(item){
  return typeof isItemLocked==="function"&&isItemLocked(item);
}

function canTradeItem(item){
  return isTradeSellable(item)&&!tradeItemLocked(item);
}

function itemMarketBase(item){
  if(!item)return 10;
  if(item.type==="equipment")return 100;
  if(item.type==="artifact")return 180;
  if(item.type==="consumable")return 24;
  if(item.type==="resource")return 18;
  if(item.type==="trophy")return 22;
  if(item.type==="ammo")return 8;
  if(item.type==="tool")return 30;
  return 15;
}

function itemMarketRange(item){
  const data=inventoryItemData(item);
  const base=itemMarketBase(data);
  let multiplier=1;

  if(data.type==="equipment"){
    const rarity=itemRarity(data);
    const rarityMultiplier=[1,1.8,3.2,5.4,9][rarity.order]||1;
    const levelMultiplier=1+(Math.max(1,itemUpgradeLevel(data))-1)*0.018;
    multiplier=rarityMultiplier*levelMultiplier;
  }

  const min=Math.max(1,Math.round(base*multiplier));
  return {min,max:Math.max(min+1,Math.round(min*1.5))};
}

function instantSellPrice(item){
  return Math.max(1,Math.floor(itemMarketRange(item).min*0.7));
}

function auctionSaleChance(price,range){
  const span=Math.max(1,range.max-range.min);
  const ratio=clamp((price-range.min)/span,0,1);
  return Math.round((100-ratio*50)*10)/10;
}

function shopWindowId(now=Date.now()){
  return Math.floor(now/SHOP_ROTATION_MS);
}

function shopWindowEnd(now=Date.now()){
  return (shopWindowId(now)+1)*SHOP_ROTATION_MS;
}

function shopCandidateCatalog(){
  return GAME_DATA.inventory.filter(item=>isTradeSellable(item) && item.id!=="old_note");
}

function marketRangeForOffer(catalog,rarityId){
  if(catalog.type!=="equipment")return itemMarketRange({...catalog,qty:1});
  const rarity=ITEM_RARITIES[rarityId]||ITEM_RARITIES.common;
  const min=Math.max(1,Math.round(itemMarketBase(catalog)*([1,1.8,3.2,5.4,9][rarity.order]||1)));
  return {min,max:Math.round(min*1.5)};
}

function generateShopOffers(){
  const pool=[...shopCandidateCatalog()];
  const offers=[];

  while(pool.length&&offers.length<SHOP_SIZE){
    const index=Math.floor(Math.random()*pool.length);
    const catalog=pool.splice(index,1)[0];
    const rarity=catalog.type==="equipment"?weightedTradeRarity():null;
    const range=marketRangeForOffer(catalog,rarity);
    const price=Math.round((range.min+range.max)/2);
    const qty=catalog.type==="equipment"?1:(catalog.type==="ammo"?10:1);

    offers.push({
      offerId:`offer-${Date.now().toString(36)}-${offers.length}`,
      id:catalog.id,
      rarity,
      attributes:catalog.type==="equipment"?generateItemAttributes(itemRarityAttributeCount(rarity||"common")):[],
      qty,
      price,
      sold:false
    });
  }
  return offers;
}

function ensureShopRotation(){
  const trade=tradePostState();
  const windowId=shopWindowId();
  if(trade.shopWindow!==windowId || trade.shopItems.length!==SHOP_SIZE){
    trade.shopWindow=windowId;
    trade.shopItems=generateShopOffers();
    saveState();
  }
  return trade.shopItems;
}

function addShopEquipment(offer){
  const instance={id:offer.id,qty:1,instanceId:makeItemInstanceId(offer.id)};
  state.inventory.push(instance);
  const item=inventoryItemData(instance);
  const progression=ensureItemProgression(item);
  progression.rarity=offer.rarity||"common";
  progression.upgradeLevel=1;
  progression.attributes=generateItemAttributes(itemRarityAttributeCount(progression.rarity),Array.isArray(offer.attributes)?offer.attributes:[]);
  ensureItemAttributes(item);
  if(typeof markItemDiscovered==="function")markItemDiscovered(offer.id);
  return item;
}

function buyShopOffer(offerId){
  const offer=ensureShopRotation().find(row=>row.offerId===offerId);
  if(!offer||offer.sold)return;
  if(state.money<offer.price){
    toast(t("tradePost.notEnoughMoney"));
    return;
  }

  const catalog=inventoryCatalogItem(offer.id);
  if(!catalog)return;

  state.money-=offer.price;
  if(catalog.type==="equipment")addShopEquipment(offer);
  else addItem(offer.id,offer.qty||1);

  offer.sold=true;
  saveState();
  syncHud();
  renderTradePostContent();
  toast(t("tradePost.bought"));
}

function deleteProgressionForItem(item){
  const key=inventoryEntryKey(item);
  if(key&&state.itemProgression)delete state.itemProgression[key];
  if(key&&state.upgradePity)delete state.upgradePity[key];
}

function takeOneInventoryItem(key){
  const stored=inventoryEntryByKey(key);
  if(!stored)return null;
  const snapshot={...stored,qty:1};

  if(stored.instanceId){
    state.inventory=state.inventory.filter(item=>item!==stored);
  }else{
    stored.qty-=1;
    state.inventory=state.inventory.filter(item=>item.qty>0);
  }
  return snapshot;
}

function returnAuctionItem(item){
  if(!item)return;
  if(item.instanceId){
    state.inventory.push({...item,qty:1});
    return;
  }
  const existing=inventoryItem(item.id);
  if(existing)existing.qty+=1;
  else state.inventory.push({id:item.id,qty:1});
}

function sellInventoryItemNow(key){
  const stored=inventoryEntryByKey(key);
  if(!stored)return;
  const item=inventoryItemData(stored);
  if(!isTradeSellable(item))return;
  if(tradeItemLocked(item)){toast(t("tradePost.lockedForSale"));return;}

  const price=instantSellPrice(item);
  const removed=takeOneInventoryItem(key);
  if(!removed)return;

  if(removed.instanceId)deleteProgressionForItem(removed);
  state.money+=price;
  if(typeof dailyTrack==="function")dailyTrack("sell",1);
  saveState();
  syncHud();
  renderTradePostContent();
  toast(`${t("tradePost.soldNow")} +${price} ₴`);
}

function activeAuctionListings(){
  return tradePostState().auctionListings.filter(listing=>listing.status==="active");
}

function resolveAuctionListing(listing,now=Date.now()){
  if(listing.status!=="active")return;

  const endAt=listing.createdAt+AUCTION_DURATION_MS;
  if(now<endAt)return;

  const range={
    min:Number(listing.marketMin)||1,
    max:Math.max(Number(listing.marketMin)||1,Number(listing.marketMax)||1)
  };
  const chance=Number.isFinite(listing.saleChance)
    ? listing.saleChance
    : auctionSaleChance(listing.price,range);

  listing.saleChance=chance;
  listing.resolvedAt=endAt;

  if(Math.random()*100<chance){
    listing.status="sold";
    listing.soldAt=endAt;
    state.money+=listing.price;
    if(listing.item.instanceId)deleteProgressionForItem(listing.item);
  }else{
    listing.status="returned";
    listing.returnedAt=endAt;
    returnAuctionItem(listing.item);
  }
}

function resolveAuctions(){
  const trade=tradePostState();
  const before=JSON.stringify(trade.auctionListings.map(x=>[x.id,x.status,x.resolvedAt]));
  trade.auctionListings.forEach(listing=>resolveAuctionListing(listing));
  trade.auctionListings=trade.auctionListings.slice(-12);
  const after=JSON.stringify(trade.auctionListings.map(x=>[x.id,x.status,x.resolvedAt]));
  if(before!==after){
    saveState();
    syncHud();
  }
}

function createAuctionListing(key,price){
  resolveAuctions();
  if(activeAuctionListings().length>=AUCTION_MAX_ACTIVE){
    toast(t("tradePost.auctionLimit"));
    return false;
  }

  const stored=inventoryEntryByKey(key);
  if(!stored)return false;
  const item=inventoryItemData(stored);
  if(!isTradeSellable(item))return false;
  if(tradeItemLocked(item)){toast(t("tradePost.lockedForSale"));return false;}

  const range=itemMarketRange(item);
  const cleanPrice=clamp(Math.round(Number(price)||range.min),range.min,range.max);
  const removed=takeOneInventoryItem(key);
  if(!removed)return false;

  const listing={
    id:`auction-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
    item:removed,
    rarity:item.type==="equipment"?itemRarity(item).id:null,
    upgradeLevel:item.type==="equipment"?itemUpgradeLevel(item):null,
    attributes:item.type==="equipment"?itemAttributes(item).map(attribute=>attribute.key):[],
    price:cleanPrice,
    marketMin:range.min,
    marketMax:range.max,
    saleChance:auctionSaleChance(cleanPrice,range),
    createdAt:Date.now(),
    status:"active"
  };

  tradePostState().auctionListings.push(listing);
  saveState();
  renderTradePostContent();
  toast(t("tradePost.listed"));
  return true;
}

function cancelAuctionListing(listingId){
  resolveAuctions();
  const listing=tradePostState().auctionListings.find(row=>row.id===listingId);
  if(!listing||listing.status!=="active")return false;

  listing.status="cancelled";
  listing.cancelledAt=Date.now();
  returnAuctionItem(listing.item);
  saveState();
  syncHud();
  renderTradePostContent();
  toast(t("tradePost.cancelled"));
  return true;
}

function formatTradeTime(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const h=String(Math.floor(total/3600)).padStart(2,"0");
  const m=String(Math.floor((total%3600)/60)).padStart(2,"0");
  const s=String(total%60).padStart(2,"0");
  return `${h}:${m}:${s}`;
}

function tradeItemTitle(item){
  return t(`items.${item.id}`);
}

function tradeItemArt(item){
  return item.profileIcon?`<img src="${item.profileIcon}" alt="">`:(item.icon||"□");
}

function tradeRarityLabel(item,rarityId=null){
  if(item.type!=="equipment")return "";
  const rarity=ITEM_RARITIES[rarityId||itemRarity(item).id]||ITEM_RARITIES.common;
  return `<span class="trade-rarity rarity-${rarity.id}">${t(rarity.labelKey)}</span>`;
}

function tradeAttributesHtml(item){
  if(item.type!=="equipment"||!item.instanceId)return "";
  return `<div class="trade-attributes">${itemAttributes(item).map(attribute=>{
    const suffix=["radiationResistance","critChance","accuracy","evasion"].includes(attribute.key)?"%":"";
    return `<span>${profileStatLabel(attribute.key)} <b>+${attribute.value}${suffix}</b></span>`;
  }).join("")}</div>`;
}

function shopOfferAttributesHtml(offer){
  if(!Array.isArray(offer.attributes)||!offer.attributes.length)return "";
  const rarityId=offer.rarity||"common";
  return `<div class="trade-attributes">${offer.attributes.map(key=>{
    const value=itemEffectiveAttributeValue(key,rarityId,1);
    const suffix=["radiationResistance","critChance","accuracy","evasion"].includes(key)?"%":"";
    return `<span>${profileStatLabel(key)} <b>+${value}${suffix}</b></span>`;
  }).join("")}</div>`;
}

function auctionListingAttributesHtml(listing){
  if(!Array.isArray(listing.attributes)||!listing.attributes.length)return "";
  const rarityId=listing.rarity||"common";
  const upgradeLevel=Math.max(1,Math.floor(Number(listing.upgradeLevel)||1));
  return `<div class="trade-attributes">${listing.attributes.map(key=>{
    const value=itemEffectiveAttributeValue(key,rarityId,upgradeLevel);
    const suffix=["radiationResistance","critChance","accuracy","evasion"].includes(key)?"%":"";
    return `<span>${profileStatLabel(key)} <b>+${value}${suffix}</b></span>`;
  }).join("")}</div>`;
}

function auctionListingRarityLabel(listing,item){
  if(item.type!=="equipment")return "";
  const rarity=ITEM_RARITIES[listing.rarity]||ITEM_RARITIES.common;
  return `<span class="trade-rarity rarity-${rarity.id}">${t(rarity.labelKey)}${listing.upgradeLevel?` +${listing.upgradeLevel}`:""}</span>`;
}

function weightedFieldContractRarity(level=state.level||1,minRarity="common"){
  const current=Math.max(1,Math.floor(Number(level)||1));
  const minimumOrder=fieldContractRarityOrder(minRarity);
  const rows=[
    {id:"common",weight:Math.max(24,56-current*1.15)},
    {id:"uncommon",weight:29},
    {id:"rare",weight:11+Math.min(9,current*.45)},
    {id:"epic",weight:3+Math.min(6,current*.22)},
    {id:"legendary",weight:1+Math.min(3,current*.09)}
  ].filter(row=>fieldContractRarityOrder(row.id)>=minimumOrder);
  let roll=Math.random()*rows.reduce((sum,row)=>sum+row.weight,0);
  for(const row of rows){
    roll-=row.weight;
    if(roll<=0)return row.id;
  }
  return rows[rows.length-1]?.id||minRarity||"common";
}

function makeFieldContract(slotIndex,options={}){
  const level=Math.max(1,Math.floor(Number(state.level)||1));
  const rarityId=FIELD_CONTRACT_RARITIES[options.rarity]?options.rarity:weightedFieldContractRarity(level,options.minRarity||"common");
  const rarity=FIELD_CONTRACT_RARITIES[rarityId];
  const template=options.templateId
    ?FIELD_CONTRACT_TEMPLATES.find(row=>row.id===options.templateId)||sample(FIELD_CONTRACT_TEMPLATES)
    :sample(FIELD_CONTRACT_TEMPLATES);
  const multiplier=rarity.multiplier;
  const xp=Math.max(1,Math.round(fieldContractXp(level)*multiplier));
  const money=Math.max(10,Math.round((18+Math.min(180,level*4))*multiplier));
  const items=[];
  if(template.id==="salvage")fieldContractAddRewardItem(items,"scrap",Math.round((2+Math.min(7,Math.floor(level/3)))*multiplier));
  else if(template.id==="battery"){
    fieldContractAddRewardItem(items,"battery",Math.max(1,Math.round((1+Math.min(4,Math.floor(level/6)))*multiplier)));
    fieldContractAddRewardItem(items,"scrap",Math.max(1,Math.round(multiplier)));
  }else if(template.id==="mutant"){
    fieldContractAddRewardItem(items,"mutant_hide",Math.max(2,Math.round((2+Math.min(6,Math.floor(level/5)))*multiplier)));
    fieldContractAddRewardItem(items,"mutant_tooth",Math.max(1,Math.round((1+Math.min(5,Math.floor(level/5)))*multiplier)));
  }else{
    fieldContractAddRewardItem(items,"battery",Math.max(1,Math.round(multiplier)));
    if((ITEM_RARITIES[rarityId]?.order||0)>=2)fieldContractAddRewardItem(items,"weak_artifact",1);
  }
  fieldContractAddRewardItem(items,rarity.material,rarity.materialQty);
  return {
    id:`contract-${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2,7)}`,
    templateId:template.id,
    icon:template.icon,
    rarity:rarityId,
    rerollCount:Math.max(0,Math.floor(Number(options.rerollCount)||0)),
    level,
    createdAt:Date.now(),
    startedAt:0,
    endsAt:0,
    reward:{xp,money,items,equipment:fieldContractEquipmentReward(rarityId)}
  };
}

function ensureFieldContracts(){
  const trade=tradePostState();
  const capacity=fieldContractCapacity();
  let changed=false;
  if(trade.fieldContracts.length>FIELD_CONTRACT_MAX_SLOTS){
    trade.fieldContracts=trade.fieldContracts.slice(0,FIELD_CONTRACT_MAX_SLOTS);
    changed=true;
  }
  trade.fieldContracts.forEach((contract,index)=>{
    if(!contract||typeof contract!=="object"){
      trade.fieldContracts[index]=makeFieldContract(index);
      changed=true;
      return;
    }
    if(!FIELD_CONTRACT_RARITIES[contract.rarity]){contract.rarity="common";changed=true;}
    if(!Number.isFinite(contract.rerollCount)){contract.rerollCount=0;changed=true;}
  });
  while(trade.fieldContracts.length<capacity){
    trade.fieldContracts.push(makeFieldContract(trade.fieldContracts.length));
    changed=true;
  }
  if(changed)saveState();
  return trade.fieldContracts;
}

function tradeResourceQty(id){
  const bag=Math.max(0,Math.floor(Number(inventoryItem(id)?.qty)||0));
  const stored=Array.isArray(state.storage)
    ?state.storage.filter(item=>item.id===id&&!item.instanceId).reduce((sum,item)=>sum+Math.max(0,Math.floor(Number(item.qty)||0)),0)
    :0;
  return bag+stored;
}

function canCraftResourceRecipe(recipe){
  return recipe.cost.every(item=>tradeResourceQty(item.id)>=item.qty);
}

function consumeTradeResource(id,qty){
  let remaining=Math.max(0,Math.floor(Number(qty)||0));
  if(tradeResourceQty(id)<remaining)return false;

  const bag=inventoryItem(id);
  if(bag&&remaining>0){
    const taken=Math.min(remaining,Math.max(0,Math.floor(Number(bag.qty)||0)));
    bag.qty-=taken;
    remaining-=taken;
    state.inventory=state.inventory.filter(entry=>entry.qty>0);
  }

  if(remaining>0&&Array.isArray(state.storage)){
    for(const entry of state.storage){
      if(remaining<=0)break;
      if(entry.id!==id||entry.instanceId)continue;
      const taken=Math.min(remaining,Math.max(0,Math.floor(Number(entry.qty)||0)));
      entry.qty-=taken;
      remaining-=taken;
    }
    state.storage=state.storage.filter(entry=>entry.qty>0);
  }
  return remaining===0;
}

function craftResourceRecipe(recipeId){
  const recipe=RESOURCE_REFINEMENT_RECIPES.find(row=>row.id===recipeId);
  if(!recipe||!canCraftResourceRecipe(recipe)){
    toast(t("craft.notEnoughMaterials"));
    return false;
  }
  recipe.cost.forEach(item=>consumeTradeResource(item.id,item.qty));
  addItem(recipe.result.id,recipe.result.qty);
  if(typeof dailyTrack==="function")dailyTrack("craft",1);
  saveState();
  syncHud();
  renderTradePostContent();
  toast(t("craft.crafted",{item:t(`items.${recipe.result.id}`)}));
  return true;
}

function contractSpecialRewardIconHtml(type){
  const path=type==="xp"?"assets/inventory-items/item_exp.webp":"assets/inventory-items/item_money.webp";
  return `<img src="${path}" alt="">`;
}

function closeFieldContractRewardModal(){
  document.getElementById("fieldContractRewardOverlay")?.remove();
}

function recipeCostHtml(recipe){
  return recipe.cost.map(item=>`<span class="${tradeResourceQty(item.id)>=item.qty?"enough":"missing"}">${t(`items.${item.id}`)} ${tradeResourceQty(item.id)}/${item.qty}</span>`).join("");
}

function backpackVisualGrade(level){
  const current=Math.max(1,Math.floor(Number(level)||1));
  if(current>=10)return "red";
  if(current>=9)return "legendary";
  if(current>=7)return "epic";
  if(current>=5)return "rare";
  if(current>=3)return "uncommon";
  return "common";
}

function renderBackpackUpgradeCard(){
  const current=typeof backpackTier==="function"?backpackTier():{level:1,maxWeight:40,id:"old"};
  const next=typeof backpackTier==="function"?backpackTier(current.level+1):null;
  const isMax=current.level>=BACKPACK_TIERS.length;
  const cost=isMax?null:backpackUpgradeCost(current.level+1);
  const costHtml=cost?`${cost.items.map(row=>`<span class="${tradeResourceQty(row.id)>=row.qty?"enough":"missing"}">${t(`items.${row.id}`)} ${tradeResourceQty(row.id)}/${row.qty}</span>`).join("")}<span class="${state.money>=cost.money?"enough":"missing"}">₴ ${state.money}/${cost.money}</span>`:"";
  return `<section class="backpack-upgrade-panel">
    <div class="trade-section-head">
      <div><h2>${t("survival.backpack.title")}</h2><p>${t("survival.backpack.hint")}</p></div>
      <div class="bunker-tier-badge">${t("survival.backpack.level",{level:current.level})}</div>
    </div>
    <div class="backpack-upgrade-card">
      <div class="backpack-upgrade-current backpack-grade-${backpackVisualGrade(current.level)}">
        <span class="backpack-frame"><img src="assets/inventory-items/item_backpack.webp" alt=""></span>
        <div><b>${t(`survival.backpack.tiers.${current.id}`)}</b><small>${t("survival.backpack.capacity",{weight:current.maxWeight})}</small></div>
      </div>
      ${isMax?`<strong class="backpack-max">${t("survival.backpack.maxed")}</strong>`:`
        <div class="backpack-upgrade-arrow">→</div>
        <div class="backpack-upgrade-current next backpack-grade-${backpackVisualGrade(next.level)}">
          <span class="backpack-frame"><img src="assets/inventory-items/item_backpack.webp" alt=""></span>
          <div><b>${t(`survival.backpack.tiers.${next.id}`)}</b><small>${t("survival.backpack.capacity",{weight:next.maxWeight})}</small></div>
        </div>
        <div class="backpack-upgrade-cost">${costHtml}</div>
        <button data-backpack-upgrade type="button" ${backpackCanUpgrade()?"":"disabled"}>${t("survival.backpack.upgrade")}</button>`}
    </div>
  </section>`;
}

function renderTradeCraft(){
  return `<div class="craft-panel">
    ${renderBackpackUpgradeCard()}
    <section class="resource-refinement">
      <div class="trade-section-head"><div><h2>${t("craft.refinementTitle")}</h2><p>${t("craft.refinementHint")}</p></div></div>
      <div class="refinement-grid">
        ${RESOURCE_REFINEMENT_RECIPES.map(recipe=>`<article class="refinement-card">
          <div><span>${t("craft.recipe")}</span><h3>${t(`items.${recipe.result.id}`)}</h3></div>
          <div class="refinement-cost">${recipeCostHtml(recipe)}</div>
          <button data-craft-recipe="${recipe.id}" type="button" ${canCraftResourceRecipe(recipe)?"":"disabled"}>${t("craft.craftButton")}</button>
        </article>`).join("")}
      </div>
    </section>
    ${renderItemSalvage()}
  </div>`;
}

function bunkerItemRarityHtml(item){
  if(!item||item.type!=="equipment"||typeof itemRarity!=="function")return "";
  const rarity=itemRarity(item);
  return `<span class="trade-rarity rarity-${rarity.id}">${t(rarity.labelKey)} +${itemUpgradeLevel(item)}</span>`;
}

function bunkerStorageItemRarityOrder(item){
  if(item?.type==="equipment"&&typeof itemRarity==="function")return itemRarity(item).order;
  if(item?.upgradeMaterialRarity&&ITEM_RARITIES[item.upgradeMaterialRarity])return ITEM_RARITIES[item.upgradeMaterialRarity].order;
  return -1;
}

function bunkerStorageFilteredItems(items){
  const search=bunkerStorageSearch.trim().toLowerCase();
  let result=items.filter(item=>!search||t(`items.${item.id}`).toLowerCase().includes(search));
  if(bunkerStorageSort==="rarity")result.sort((a,b)=>bunkerStorageItemRarityOrder(a)-bunkerStorageItemRarityOrder(b)||t(`items.${a.id}`).localeCompare(t(`items.${b.id}`),languageLocale()));
  else if(bunkerStorageSort==="name")result.sort((a,b)=>t(`items.${a.id}`).localeCompare(t(`items.${b.id}`),languageLocale()));
  else if(bunkerStorageSort==="weight")result.sort((a,b)=>inventoryItemWeight(b)-inventoryItemWeight(a));
  else if(bunkerStorageSort==="qty")result.sort((a,b)=>b.qty-a.qty);
  return result;
}

function bunkerStoragePage(items,page){
  const totalPages=Math.max(1,Math.ceil(items.length/BUNKER_STORAGE_PAGE_SIZE));
  const safePage=Math.max(0,Math.min(totalPages-1,Math.floor(Number(page)||0)));
  return {page:safePage,totalPages,items:items.slice(safePage*BUNKER_STORAGE_PAGE_SIZE,(safePage+1)*BUNKER_STORAGE_PAGE_SIZE)};
}

function bunkerStoragePager(side,pageInfo){
  if(pageInfo.totalPages<=1)return "";
  return `<div class="bunker-storage-pager">
    <button data-storage-page="${side}" data-storage-page-dir="-1" type="button" ${pageInfo.page<=0?"disabled":""} aria-label="${t("survival.storage.previous")}">←</button>
    <span>${t("survival.storage.page",{current:pageInfo.page+1,total:pageInfo.totalPages})}</span>
    <button data-storage-page="${side}" data-storage-page-dir="1" type="button" ${pageInfo.page>=pageInfo.totalPages-1?"disabled":""} aria-label="${t("survival.storage.next")}">→</button>
  </div>`;
}

function renderBunkerStorage(){
  if(typeof ensureSurvivalState==="function")ensureSurvivalState();
  const inventoryRaw=(state.inventory||[]).map(inventoryItemData).filter(item=>item.qty>0&&!isQuestInventoryItem(item));
  const storageRaw=(state.storage||[]).map(storageItemData).filter(item=>item.qty>0);
  const inventory=bunkerStorageFilteredItems(inventoryRaw);
  const storage=bunkerStorageFilteredItems(storageRaw);
  const bagPage=bunkerStoragePage(inventory,bunkerBagPage);
  const warehousePage=bunkerStoragePage(storage,bunkerWarehousePage);
  bunkerBagPage=bagPage.page;
  bunkerWarehousePage=warehousePage.page;
  const load=typeof backpackLoadInfo==="function"?backpackLoadInfo():{weight:0,maxWeight:40};
  const itemRow=(item,side)=>{
    const key=inventoryEntryKey(item);
    const all=item.type==="equipment"?1:item.qty;
    return `<article class="bunker-storage-row ${inventoryGridItemClass(item)}">
      <div class="trade-mini-art">${tradeItemArt(item)}</div>
      <div class="bunker-storage-copy">
        <b>${t(`items.${item.id}`)}</b>
        ${bunkerItemRarityHtml(item)}
        <small>${inventoryItemWeight(item).toFixed(2)} ${t("units.kg")} · ×${item.qty}</small>
      </div>
      <div class="bunker-storage-actions">
        ${side==="bag"?`<button data-storage-put="${key}" data-storage-qty="1" type="button">${t("survival.storage.putOne")}</button>${all>1?`<button data-storage-put="${key}" data-storage-qty="${all}" class="secondary" type="button">${t("survival.storage.putAll")}</button>`:""}`:`<button data-storage-take="${key}" data-storage-qty="1" type="button">${t("survival.storage.takeOne")}</button>${all>1?`<button data-storage-take="${key}" data-storage-qty="${all}" class="secondary" type="button">${t("survival.storage.takeAll")}</button>`:""}`}
      </div>
    </article>`;
  };
  return `<div class="bunker-storage-screen">
    <div class="bunker-storage-tools">
      <label><span>⌕</span><input id="bunkerStorageSearch" type="search" value="${bunkerStorageSearch.replace(/"/g,"&quot;")}" placeholder="${t("survival.storage.searchPlaceholder")}"></label>
      <button data-storage-sort-cycle type="button">⇅ ${t(`inventory.sortModes.${bunkerStorageSort}`)}</button>
    </div>
    <div class="bunker-storage-summary">
      <div><span>${t("survival.storage.backpack")}</span><b>${load.weight.toFixed(1)}/${load.maxWeight} ${t("units.kg")}</b><small>${t("survival.storage.weightOnly")}</small></div>
      <div class="unlimited"><span>${t("survival.storage.storage")}</span><b>∞</b><small>${t("survival.storage.itemsStored",{count:storageRaw.reduce((sum,item)=>sum+item.qty,0)})}</small></div>
    </div>
    <div class="bunker-storage-columns">
      <section>
        <div class="trade-section-head"><div><h2>${t("survival.storage.backpack")}</h2><p>${t("survival.storage.backpackHint")}</p></div></div>
        <div class="bunker-storage-list">${bagPage.items.length?bagPage.items.map(item=>itemRow(item,"bag")).join(""):`<div class="trade-empty">${t("survival.storage.bagEmpty")}</div>`}</div>
        ${bunkerStoragePager("bag",bagPage)}
      </section>
      <section>
        <div class="trade-section-head"><div><h2>${t("survival.storage.storage")}</h2><p>${t("survival.storage.storageHint")}</p></div></div>
        <div class="bunker-storage-list">${warehousePage.items.length?warehousePage.items.map(item=>itemRow(item,"storage")).join(""):`<div class="trade-empty">${t("survival.storage.storageEmpty")}</div>`}</div>
        ${bunkerStoragePager("storage",warehousePage)}
      </section>
    </div>
    <div class="bunker-storage-note">🔒 ${t("survival.storage.questNote")}</div>
  </div>`;
}

function bunkerRecoverySupportHtml(){
  const active=typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive();
  const support=typeof recoveryRates==="function"?recoveryRates():{hp:active?3:2,energy:1,radiationMultiplier:1};
  const regenPenalty=Math.round((1-(support.radiationMultiplier??1))*100);
  const hpValue=typeof recoveryRateLabel==="function"?recoveryRateLabel(support.hp):support.hp;
  const energyValue=typeof recoveryRateLabel==="function"?recoveryRateLabel(support.energy):support.energy;
  return `❤️ ${t("survival.recovery.hpSupport",{value:hpValue})} · ⚡ ${t("survival.recovery.energySupport",{value:energyValue})}${regenPenalty>0?` · ☢ ${t("survival.recovery.regenPenalty",{value:regenPenalty})}`:""}`;
}

function renderBunkerRecovery(){
  if(typeof applyBunkerRecovery==="function")applyBunkerRecovery(Date.now(),{save:true});
  const active=typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive();
  const radiation=Math.max(0,Number(state.radiation)||0);
  const resistance=typeof radiationResistancePercent==="function"?radiationResistancePercent():0;
  const rate=typeof bunkerRecoveryRatePerSecond==="function"?bunkerRecoveryRatePerSecond():(100/(2*60*60));
  const remaining=typeof bunkerRecoveryRemainingSeconds==="function"?bunkerRecoveryRemainingSeconds():0;
  const severity=typeof radiationSeverity==="function"?radiationSeverity():"normal";
  const cancelPreview=active&&typeof bunkerRecoveryCancelPreview==="function"?bunkerRecoveryCancelPreview():null;
  return `<div class="bunker-recovery-screen">
    <section class="bunker-recovery-hero ${active?"active":""}">
      <div class="bunker-recovery-icon">☢</div>
      <div class="bunker-recovery-copy">
        <span>${t("survival.recovery.eyebrow")}</span>
        <h2>${active?t("survival.recovery.inProgress"):t("survival.recovery.title")}</h2>
        <p>${active?t("survival.recovery.activeHint"):t("survival.recovery.hint")}</p>
      </div>
      <div class="bunker-recovery-rad severity-${severity}"><small>${t("hud.radiation")}</small><b id="bunkerRecoveryRadiation">${Math.floor(radiation)}</b><span>/100</span></div>
    </section>
    <div class="bunker-recovery-stats">
      <div><span>${t("survival.recovery.protection")}</span><b>${Math.round(resistance)}%</b></div>
      <div><span>${t("survival.recovery.speed")}</span><b>${(rate*60).toFixed(1)} ☢/${t("units.min")}</b></div>
      <div><span>${t("survival.recovery.remaining")}</span><b id="bunkerRecoveryTimer">${formatSurvivalTime(remaining)}</b></div>
      <div><span>${t("survival.recovery.after")}</span><b>0 ☢</b></div>
    </div>
    <div id="bunkerRecoverySupport" class="bunker-recovery-warning recovery-support">${bunkerRecoverySupportHtml()}</div>
    <div id="bunkerRecoveryWarning" class="bunker-recovery-warning">${active
      ?`⛔ ${t("survival.recovery.blockedHint")} ${t("survival.recovery.activeCancelPenalty",{penalty:cancelPreview?.penalty||20})}`
      :`✓ ${t("survival.recovery.cancelHint")}`}</div>
    <div class="bunker-recovery-actions">
      ${active?`<button id="bunkerRecoveryCancel" class="danger" type="button">${t("survival.recovery.cancel")}</button>`:`<button id="bunkerRecoveryStart" type="button" ${radiation<=0?"disabled":""}>${t("survival.recovery.start")}</button>`}
    </div>
  </div>`;
}

function shopOfferComparisonHtml(offer,catalog){
  if(catalog?.type!=="equipment"||!catalog.slot)return "";
  const current=typeof equippedItem==="function"?equippedItem(catalog.slot):null;
  const candidate=Object.fromEntries((offer.attributes||[]).map(key=>[key,itemEffectiveAttributeValue(key,offer.rarity||"common",1)]));
  if(!current){
    return `<div class="trade-compare"><b>${t("tradePost.compareTitle")}</b><small>${t("tradePost.compareEmpty",{slot:t(`equipment.slots.${catalog.slot}`)})}</small></div>`;
  }
  const equippedStats=typeof itemEffectiveStats==="function"?itemEffectiveStats(current):{};
  const keys=[...new Set([...Object.keys(candidate),...Object.keys(equippedStats)])];
  const rows=keys.map(key=>{
    const next=Number(candidate[key])||0;
    const before=Number(equippedStats[key])||0;
    const diff=Math.round((next-before)*100)/100;
    return {key,next,before,diff};
  }).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,4);
  return `<div class="trade-compare"><b>${t("tradePost.compareTitle")}: ${t(`items.${current.id}`)}</b>${rows.map(row=>{
    const suffix=["radiationResistance","critChance","accuracy","evasion"].includes(row.key)?"%":"";
    const cls=row.diff>0?"up":row.diff<0?"down":"same";
    const sign=row.diff>0?"+":"";
    return `<span class="${cls}"><em>${profileStatLabel(row.key)}</em><strong>${row.before}${suffix} → ${row.next}${suffix}</strong><i>${sign}${row.diff}${suffix}</i></span>`;
  }).join("")}</div>`;
}

function renderTradeShop(){
  const offers=ensureShopRotation();
  const inventory=state.inventory.map(inventoryItemData).filter(item=>item.qty>0&&isTradeSellable(item));

  return `
    <div class="trade-section-head">
      <div><h2>${t("tradePost.shopTitle")}</h2><p>${t("tradePost.shopHint")}</p></div>
      <div class="trade-refresh">↻ ${t("tradePost.refreshIn")} <b id="tradeShopTimer">${formatTradeTime(shopWindowEnd()-Date.now())}</b></div>
    </div>
    <div class="trade-shop-grid">
      ${offers.map(offer=>{
        const catalog=inventoryCatalogItem(offer.id);
        return `<article class="trade-card ${offer.sold?"sold":""}">
          <div class="trade-card-art">${tradeItemArt(catalog)}</div>
          <div class="trade-card-copy">
            ${tradeRarityLabel(catalog,offer.rarity)}
            <h3>${tradeItemTitle(catalog)}</h3>
            <small>×${offer.qty}</small>
            ${shopOfferAttributesHtml(offer)}
            ${shopOfferComparisonHtml(offer,catalog)}
          </div>
          <strong class="trade-price">${offer.price} ₴</strong>
          <button data-buy-offer="${offer.offerId}" type="button" ${offer.sold?"disabled":""}>${offer.sold?t("tradePost.sold"):t("common.buy")}</button>
        </article>`;
      }).join("")}
    </div>

    <div class="trade-section-head trade-sell-head">
      <div><h2>${t("tradePost.instantSellTitle")}</h2><p>${t("tradePost.instantSellHint")}</p></div>
    </div>
    <div class="trade-sell-list">
      ${inventory.length?inventory.map(item=>{
        const range=itemMarketRange(item);
        const instant=instantSellPrice(item);
        return `<article class="trade-sell-row">
          <div class="trade-mini-art">${tradeItemArt(item)}</div>
          <div class="trade-sell-copy">
            <b>${tradeItemTitle(item)}</b>
            ${tradeRarityLabel(item)}
            <small>${t("tradePost.marketRange")}: ${range.min}–${range.max} ₴</small>
            ${tradeAttributesHtml(item)}
          </div>
          <span class="trade-sell-qty">×${item.qty}</span>
          ${tradeItemLocked(item)?`<span class="trade-locked-sale">🔒 ${t("tradePost.locked")}</span>`:`<button data-instant-sell="${inventoryEntryKey(item)}" type="button">${instant} ₴</button>`}
        </article>`;
      }).join(""):`<div class="trade-empty">${t("tradePost.noSellItems")}</div>`}
    </div>`;
}

function renderTradeAuction(){
  resolveAuctions();
  const trade=tradePostState();
  const inventory=state.inventory.map(inventoryItemData).filter(item=>item.qty>0&&canTradeItem(item));
  const active=activeAuctionListings();

  return `
    <div class="trade-section-head">
      <div><h2>${t("tradePost.auctionTitle")}</h2><p>${t("tradePost.auctionHint")}</p></div>
      <div class="trade-auction-slots">${t("tradePost.activeLots")}: <b>${active.length}/${AUCTION_MAX_ACTIVE}</b></div>
    </div>

    <div class="trade-auction-create trade-auction-create-fixed">
      <label>
        <span>${t("tradePost.item")}</span>
        <select id="auctionItemSelect">
          ${inventory.map(item=>{
            const range=itemMarketRange(item);
            return `<option value="${inventoryEntryKey(item)}">${tradeItemTitle(item)} · ${range.min}–${range.max} ₴</option>`;
          }).join("")}
        </select>
      </label>
      <label>
        <span>${t("tradePost.price")}</span>
        <input id="auctionPrice" type="number" min="1" step="1">
        <small id="auctionRangeLabel"></small>
      </label>
      <div class="trade-auction-duration-fixed">
        <span>${t("tradePost.duration")}</span>
        <b>24 ${t("tradePost.hours")}</b>
        <small>${t("tradePost.durationFixedHint")}</small>
      </div>
      <div class="trade-auction-preview">
        <span>${t("tradePost.saleChance24")}</span>
        <b id="auctionChance">—</b>
        <small>${t("tradePost.saleChanceHint")}</small>
      </div>
      <button id="auctionCreate" class="trade-primary" type="button" ${!inventory.length||active.length>=AUCTION_MAX_ACTIVE?"disabled":""}>${t("tradePost.listItem")}</button>
    </div>

    <div class="trade-listings">
      ${trade.auctionListings.length?trade.auctionListings.slice().reverse().map(listing=>{
        const item=inventoryItemData(listing.item);
        const endAt=listing.createdAt+AUCTION_DURATION_MS;
        const statusKey=`tradePost.status.${listing.status}`;
        const chance=Number.isFinite(listing.saleChance)
          ? listing.saleChance
          : auctionSaleChance(listing.price,{min:listing.marketMin,max:listing.marketMax});
        return `<article class="trade-listing ${listing.status}">
          <div class="trade-mini-art">${tradeItemArt(item)}</div>
          <div class="trade-listing-copy">
            <b>${tradeItemTitle(item)}</b>
            ${auctionListingRarityLabel(listing,item)}
            ${auctionListingAttributesHtml(listing)}
            <small>${t("tradePost.listPrice")}: ${listing.price} ₴ · ${t("tradePost.saleChance24")}: ${chance}%</small>
          </div>
          <div class="trade-listing-status">
            <strong>${t(statusKey)}</strong>
            <small>${listing.status==="active"?formatTradeTime(endAt-Date.now()):""}</small>
            ${listing.status==="active"?`<button class="trade-cancel" data-cancel-auction="${listing.id}" type="button">${t("tradePost.cancelLot")}</button>`:""}
          </div>
        </article>`;
      }).join(""):`<div class="trade-empty">${t("tradePost.noListings")}</div>`}
    </div>`;
}

function bindTradeAuctionForm(){
  const select=document.getElementById("auctionItemSelect");
  const price=document.getElementById("auctionPrice");
  const rangeLabel=document.getElementById("auctionRangeLabel");
  const chance=document.getElementById("auctionChance");
  const create=document.getElementById("auctionCreate");
  if(!select||!price||!rangeLabel||!chance||!create)return;

  const refresh=()=>{
    const item=inventoryItemData(inventoryEntryByKey(select.value));
    if(!item)return;
    const range=itemMarketRange(item);
    price.min=range.min;
    price.max=range.max;
    if(!Number(price.value)||Number(price.value)<range.min||Number(price.value)>range.max)price.value=range.min;
    rangeLabel.textContent=`${t("tradePost.marketRange")}: ${range.min}–${range.max} ₴`;
    chance.textContent=`${auctionSaleChance(Number(price.value),range)}%`;
  };

  select.onchange=refresh;
  price.oninput=refresh;
  create.onclick=()=>createAuctionListing(select.value,price.value);
  refresh();
}

function renderTradePostContent(){
  const content=document.getElementById("tradePostContent");
  if(!content)return;
  const money=document.getElementById("tradePostMoney");
  if(money)money.textContent=state.money;

  ensureShopRotation();
  resolveAuctions();

  content.innerHTML=tradePostActiveTab==="storage"
    ? renderBunkerStorage()
    : tradePostActiveTab==="recovery"
      ? renderBunkerRecovery()
      : tradePostActiveTab==="shop"
        ? renderTradeShop()
        : tradePostActiveTab==="contracts"
          ? renderFieldContracts()
          : tradePostActiveTab==="auction"
            ? renderTradeAuction()
            : renderTradeCraft();

  document.querySelectorAll("[data-trade-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.tradeTab===tradePostActiveTab);
  });

  content.querySelectorAll("[data-buy-offer]").forEach(button=>{
    button.onclick=()=>buyShopOffer(button.dataset.buyOffer);
  });
  content.querySelectorAll("[data-instant-sell]").forEach(button=>{
    button.onclick=()=>sellInventoryItemNow(button.dataset.instantSell);
  });
  content.querySelectorAll("[data-cancel-auction]").forEach(button=>{
    button.onclick=()=>cancelAuctionListing(button.dataset.cancelAuction);
  });
  content.querySelectorAll("[data-field-contract-start]").forEach(button=>{
    button.onclick=event=>{event.stopPropagation();startFieldContract(Number(button.dataset.fieldContractStart));};
  });
  content.querySelectorAll("[data-field-contract-claim]").forEach(button=>{
    button.onclick=event=>{event.stopPropagation();claimFieldContract(Number(button.dataset.fieldContractClaim));};
  });
  content.querySelectorAll("[data-field-contract-reroll]").forEach(button=>{
    button.onclick=event=>{event.stopPropagation();rerollFieldContract(Number(button.dataset.fieldContractReroll));};
  });
  content.querySelectorAll("[data-field-contract-details]").forEach(card=>{
    const open=()=>openFieldContractRewardModal(Number(card.dataset.fieldContractDetails));
    card.onclick=event=>{if(event.target.closest("button"))return;open();};
    card.onkeydown=event=>{if((event.key==="Enter"||event.key===" ")&&!event.target.closest("button")){event.preventDefault();open();}};
  });
  content.querySelectorAll("[data-craft-recipe]").forEach(button=>{
    button.onclick=()=>craftResourceRecipe(button.dataset.craftRecipe);
  });
  content.querySelectorAll("[data-salvage-item]").forEach(button=>{
    button.onclick=()=>salvageInventoryItemByKey(button.dataset.salvageItem);
  });
  content.querySelectorAll("[data-storage-put]").forEach(button=>{
    button.onclick=()=>{
      if(transferInventoryToStorage(button.dataset.storagePut,Number(button.dataset.storageQty)||1))renderTradePostContent();
    };
  });
  content.querySelectorAll("[data-storage-take]").forEach(button=>{
    button.onclick=()=>{
      if(transferStorageToInventory(button.dataset.storageTake,Number(button.dataset.storageQty)||1))renderTradePostContent();
    };
  });
  const storageSearch=content.querySelector("#bunkerStorageSearch");
  if(storageSearch){
    storageSearch.oninput=()=>{
      bunkerStorageSearch=storageSearch.value;
      bunkerBagPage=0;
      bunkerWarehousePage=0;
      renderTradePostContent();
      const fresh=document.getElementById("bunkerStorageSearch");
      if(fresh){fresh.focus();fresh.setSelectionRange(fresh.value.length,fresh.value.length);}
    };
  }
  const storageSort=content.querySelector("[data-storage-sort-cycle]");
  if(storageSort)storageSort.onclick=()=>{
    const order=["rarity","name","weight","qty"];
    const index=order.indexOf(bunkerStorageSort);
    bunkerStorageSort=order[(index+1)%order.length];
    bunkerBagPage=0;
    bunkerWarehousePage=0;
    renderTradePostContent();
  };
  content.querySelectorAll("[data-storage-page]").forEach(button=>{
    button.onclick=()=>{
      const direction=Number(button.dataset.storagePageDir)||0;
      if(button.dataset.storagePage==="bag")bunkerBagPage=Math.max(0,bunkerBagPage+direction);
      else bunkerWarehousePage=Math.max(0,bunkerWarehousePage+direction);
      renderTradePostContent();
    };
  });
  
  const backpackUpgrade=content.querySelector("[data-backpack-upgrade]");
  if(backpackUpgrade)backpackUpgrade.onclick=()=>upgradeBackpack();
  const recoveryStart=content.querySelector("#bunkerRecoveryStart");
  if(recoveryStart)recoveryStart.onclick=()=>{if(startBunkerRecovery())renderTradePostContent();};
  const recoveryCancel=content.querySelector("#bunkerRecoveryCancel");
  if(recoveryCancel)recoveryCancel.onclick=()=>{
    if(typeof applyBunkerRecovery==="function")applyBunkerRecovery(Date.now(),{save:true});
    const currentFallback=Math.max(0,Number(state.radiation)||0);
    const startFallback=Math.max(currentFallback,Number(state.bunkerRecovery?.startRadiation)||currentFallback);
    const recoveredFallback=Math.max(0,startFallback-currentFallback);
    const preview=typeof bunkerRecoveryCancelPreview==="function"
      ?bunkerRecoveryCancelPreview()
      :{current:currentFallback,start:startFallback,recovered:recoveredFallback,penalty:20,after:Math.min(startFallback,currentFallback+recoveredFallback*0.2)};
    const confirmed=window.confirm(t("survival.recovery.cancelConfirm",{
      start:Math.round(preview.start),
      current:Math.round(preview.current),
      recovered:Math.round(preview.recovered),
      penalty:preview.penalty,
      after:Math.round(preview.after)
    }));
    if(!confirmed)return;
    cancelBunkerRecovery();
    renderTradePostContent();
  };

  if(tradePostActiveTab==="auction")bindTradeAuctionForm();
}

function renderTradePost(){
  cloneTemplate("tradePostTpl");
  setActiveNav("tradepost");

  document.querySelectorAll("[data-trade-tab]").forEach(button=>{
    button.onclick=()=>{
      tradePostActiveTab=button.dataset.tradeTab;
      renderTradePostContent();
    };
  });

  renderTradePostContent();

  if(tradePostTimer)clearInterval(tradePostTimer);
  tradePostTimer=setInterval(()=>{
    if(state.currentRoute!=="tradepost"){
      clearInterval(tradePostTimer);
      tradePostTimer=null;
      return;
    }

    const previousWindow=tradePostState().shopWindow;
    ensureShopRotation();
    if(previousWindow!==tradePostState().shopWindow){
      renderTradePostContent();
      return;
    }

    resolveAuctions();
    const timer=document.getElementById("tradeShopTimer");
    if(timer)timer.textContent=formatTradeTime(shopWindowEnd()-Date.now());

    if(tradePostActiveTab==="recovery"){
      const before=typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive();
      if(typeof applyBunkerRecovery==="function")applyBunkerRecovery(Date.now(),{save:true});
      const after=typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive();
      const rad=document.getElementById("bunkerRecoveryRadiation");
      const timerNode=document.getElementById("bunkerRecoveryTimer");
      const warningNode=document.getElementById("bunkerRecoveryWarning");
      const supportNode=document.getElementById("bunkerRecoverySupport");
      if(rad)rad.textContent=Math.floor(Number(state.radiation)||0);
      if(timerNode)timerNode.textContent=formatSurvivalTime(bunkerRecoveryRemainingSeconds());
      if(supportNode)supportNode.innerHTML=bunkerRecoverySupportHtml();
      if(warningNode&&after&&typeof bunkerRecoveryCancelPreview==="function"){
        const preview=bunkerRecoveryCancelPreview();
        warningNode.textContent=`⛔ ${t("survival.recovery.blockedHint")} ${t("survival.recovery.activeCancelPenalty",{penalty:preview.penalty})}`;
      }
      if(before&&!after){renderTradePostContent();return;}
    }

    if(tradePostActiveTab==="contracts"){
      let contractReady=false;
      document.querySelectorAll("[data-contract-timer]").forEach(node=>{
        const endAt=Number(node.dataset.contractEnd)||0;
        const remaining=endAt-Date.now();
        node.textContent=formatTradeTime(remaining);
        if(remaining<=0)contractReady=true;
      });
      if(contractReady){
        renderTradePostContent();
        return;
      }
    }

    if(tradePostActiveTab==="auction"){
      document.querySelectorAll(".trade-listing.active .trade-listing-status small").forEach((node,index)=>{
        const listing=activeAuctionListings().slice().reverse()[index];
        if(listing)node.textContent=formatTradeTime(listing.createdAt+AUCTION_DURATION_MS-Date.now());
      });
    }
  },1000);
}

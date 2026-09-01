/* Item salvage subsystem. */

const ITEM_SALVAGE_EXCLUDED_IDS=new Set([
  "scrap","battery","ammo","mutant_tooth","mutant_hide",
  "uncommon_hide","rare_hide","epic_hide","legendary_hide"
]);

function salvageMaterialForRarity(rarityId){
  return {
    common:"mutant_hide",
    uncommon:"uncommon_hide",
    rare:"rare_hide",
    epic:"epic_hide",
    legendary:"legendary_hide"
  }[rarityId]||"mutant_hide";
}

function itemSalvageRewards(item){
  if(!item)return [];
  const rewards=[];
  const addReward=(id,qty)=>{
    const amount=Math.max(0,Math.floor(Number(qty)||0));
    if(!id||amount<=0)return;
    const existing=rewards.find(row=>row.id===id);
    if(existing)existing.qty+=amount;
    else rewards.push({id,qty:amount});
  };

  if(item.type==="equipment"){
    const rarityId=typeof itemRarity==="function"?itemRarity(item).id:(item.upgradeMaterialRarity||"common");
    const upgradeLevel=typeof itemUpgradeLevel==="function"?Math.max(1,itemUpgradeLevel(item)):1;
    const scrapBase={common:2,uncommon:3,rare:4,epic:5,legendary:6}[rarityId]||2;
    addReward("scrap",scrapBase+Math.floor((upgradeLevel-1)/10));
    addReward(salvageMaterialForRarity(rarityId),1+(upgradeLevel>=20?1:0));
    if(["dosimeter","mask","ranged"].includes(item.slot)||["basic_dosimeter","flashlight","reinforced_mask","rusty_rifle"].includes(item.id))addReward("battery",1);
  }else if(item.type==="tool"){
    if(item.id==="toolkit")addReward("scrap",2);
    else {
      addReward("scrap",1);
      if(["flashlight","basic_dosimeter"].includes(item.id))addReward("battery",1);
    }
  }else if(item.type==="artifact"){
    addReward("battery",1);
    addReward("uncommon_hide",1);
  }

  return rewards;
}

function canSalvageInventoryItem(item){
  if(!item||isQuestInventoryItem(item))return false;
  if(ITEM_SALVAGE_EXCLUDED_IDS.has(item.id))return false;
  if(tradeItemLocked(item))return false;
  return item.type==="equipment"||item.type==="tool"||item.type==="artifact";
}

function salvageInventoryCandidates(){
  return (state.inventory||[])
    .map(inventoryItemData)
    .filter(item=>item&&item.qty>0&&canSalvageInventoryItem(item));
}

function salvageRewardHtml(rewards){
  return rewards.map(row=>`<span>${t(`items.${row.id}`)} ×${row.qty}</span>`).join("");
}

function salvageInventoryItemByKey(key){
  const stored=inventoryEntryByKey(key);
  const item=inventoryItemData(stored);
  if(!stored||!item||!canSalvageInventoryItem(item)){
    toast(t("tradePost.salvage.cannot"));
    return false;
  }
  const rewards=itemSalvageRewards(item);
  if(!rewards.length){
    toast(t("tradePost.salvage.noRecipe"));
    return false;
  }
  const removed=removeInventoryEntry(key);
  if(!removed)return false;
  if(typeof deleteProgressionForItem==="function")deleteProgressionForItem(removed);
  rewards.forEach(row=>addItem(row.id,row.qty));
  saveState();
  syncHud();
  renderTradePostContent();
  toast(t("tradePost.salvage.done",{item:t(`items.${item.id}`)}));
  return true;
}

function renderItemSalvage(){
  const items=salvageInventoryCandidates();
  if(!items.length){
    return `<section class="item-salvage">
      <div class="trade-section-head"><div><h2>${t("tradePost.salvage.title")}</h2><p>${t("tradePost.salvage.hint")}</p></div></div>
      <div class="bunker-storage-note">${t("tradePost.salvage.emptyHint")}</div>
    </section>`;
  }

  return `<section class="item-salvage">
    <div class="trade-section-head"><div><h2>${t("tradePost.salvage.title")}</h2><p>${t("tradePost.salvage.hint")}</p></div></div>
    <div class="salvage-grid">
      ${items.map(item=>{
        const rewards=itemSalvageRewards(item);
        const key=inventoryEntryKey(item);
        const locked=tradeItemLocked(item);
        const rarity=item.type==="equipment"&&typeof itemRarity==="function"?itemRarity(item):null;
        const level=item.type==="equipment"&&typeof itemUpgradeLevel==="function"?itemUpgradeLevel(item):0;
        return `<article class="salvage-card ${locked?"locked":""} ${rarity?`rarity-${rarity.id}`:""}">
          <div class="salvage-art">${tradeItemArt(item)}</div>
          <div class="salvage-copy">
            <div class="salvage-meta">${rarity?`<span class="trade-rarity rarity-${rarity.id}">${t(rarity.labelKey)}${level?` +${level}`:""}</span>`:`<span>${(item.type||"").toUpperCase()}</span>`}</div>
            <h3>${tradeItemTitle(item)}</h3>
            <div class="salvage-rewards">${salvageRewardHtml(rewards)}</div>
          </div>
          ${locked?`<div class="trade-locked-sale">🔒 ${t("tradePost.locked")}</div>`:`<button data-salvage-item="${key}" type="button">${t("tradePost.salvage.button")}</button>`}
        </article>`;
      }).join("")}
    </div>
  </section>`;
}

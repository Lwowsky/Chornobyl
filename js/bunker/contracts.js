/* Field contract subsystem. */

const FIELD_CONTRACT_DURATION_MS=3*60*60*1000;

const FIELD_CONTRACT_TEMPLATES=Object.freeze([
  Object.freeze({id:"salvage",icon:'<img src="assets/inventory-items/item_toolkit.webp" alt="">'}),
  Object.freeze({id:"mutant",icon:'<img src="assets/inventory-items/item_mutant_tooth.webp" alt="">'}),
  Object.freeze({id:"battery",icon:'<img src="assets/inventory-items/quest_module.webp" alt="">'}),
  Object.freeze({id:"anomaly",icon:'<img src="assets/inventory-items/material_red.webp" alt="">'})
]);

const FIELD_CONTRACT_RARITIES=Object.freeze({
  common:Object.freeze({id:"common",multiplier:1.00,material:"mutant_hide",materialQty:2,equipmentChance:0}),
  uncommon:Object.freeze({id:"uncommon",multiplier:1.55,material:"uncommon_hide",materialQty:1,equipmentChance:0.06}),
  rare:Object.freeze({id:"rare",multiplier:2.25,material:"rare_hide",materialQty:1,equipmentChance:0.14}),
  epic:Object.freeze({id:"epic",multiplier:3.40,material:"epic_hide",materialQty:1,equipmentChance:0.24}),
  legendary:Object.freeze({id:"legendary",multiplier:5.20,material:"legendary_hide",materialQty:1,equipmentChance:0.38})
});

const FIELD_CONTRACT_REROLL_BASE_COST=100;

const FIELD_CONTRACT_MAX_SLOTS=5;

function fieldContractUnlockLevel(slotIndex){
  return 1+Math.max(0,Math.floor(Number(slotIndex)||0))*2;
}

function fieldContractCapacity(){
  const level=Math.max(1,Math.floor(Number(state.level)||1));
  return Math.min(FIELD_CONTRACT_MAX_SLOTS,1+Math.floor((level-1)/2));
}

function fieldContractSlotUnlocked(slotIndex){
  return Math.max(1,Math.floor(Number(state.level)||1))>=fieldContractUnlockLevel(slotIndex);
}

function fieldContractXp(level=state.level||1){
  const current=Math.max(1,Math.floor(Number(level)||1));
  return Math.max(1,Math.round(6/Math.sqrt(current)));
}

function fieldContractRarityOrder(rarityId){
  const order=ITEM_RARITY_ORDER.indexOf(rarityId);
  return order>=0?order:0;
}

function fieldContractRarity(contract){
  return FIELD_CONTRACT_RARITIES[contract?.rarity]||FIELD_CONTRACT_RARITIES.common;
}

function fieldContractRerollCost(contract){
  const count=Math.max(0,Math.floor(Number(contract?.rerollCount)||0));
  if(count===0)return 0;
  return Math.min(51200,FIELD_CONTRACT_REROLL_BASE_COST*Math.pow(2,count-1));
}

function fieldContractAddRewardItem(items,id,qty){
  const amount=Math.max(0,Math.floor(Number(qty)||0));
  if(!id||!amount)return;
  const row=items.find(item=>item.id===id);
  if(row)row.qty+=amount; else items.push({id,qty:amount});
}

function fieldContractEquipmentReward(rarityId){
  const rarity=FIELD_CONTRACT_RARITIES[rarityId]||FIELD_CONTRACT_RARITIES.common;
  if(Math.random()>=rarity.equipmentChance)return null;
  const candidates=GAME_DATA.inventory.filter(item=>item.type==="equipment"&&item.id!=="basic_dosimeter");
  const catalog=sample(candidates);
  return catalog?{id:catalog.id,rarity:rarityId,upgradeLevel:1}:null;
}

function fieldContractState(contract,now=Date.now()){
  if(!contract.startedAt)return "available";
  return now>=contract.endsAt?"ready":"active";
}

function startFieldContract(index){
  if(!fieldContractSlotUnlocked(index))return false;
  const contracts=ensureFieldContracts();
  const contract=contracts[index];
  if(!contract||contract.startedAt)return false;
  contract.startedAt=Date.now();
  contract.endsAt=contract.startedAt+FIELD_CONTRACT_DURATION_MS;
  saveState();
  renderTradePostContent();
  toast(t("craft.contractStarted"));
  return true;
}

function rerollFieldContract(index){
  if(!fieldContractSlotUnlocked(index))return false;
  const contracts=ensureFieldContracts();
  const current=contracts[index];
  if(!current||fieldContractState(current)!=="available")return false;
  const cost=fieldContractRerollCost(current);
  if((Number(state.money)||0)<cost){toast(t("tradePost.notEnoughMoney"));return false;}
  const accepted=window.confirm(t("craft.contractRerollConfirm",{cost:cost?`${cost} ₴`:t("craft.contractFree")}));
  if(!accepted)return false;
  if(cost>0)state.money-=cost;
  const trade=tradePostState();
  trade.contractStats.rerolls=(Number(trade.contractStats.rerolls)||0)+1;
  let next=null;
  for(let attempt=0;attempt<5;attempt+=1){
    next=makeFieldContract(index,{rerollCount:(current.rerollCount||0)+1,minRarity:current.rarity});
    if(next.templateId!==current.templateId||next.rarity!==current.rarity)break;
  }
  contracts[index]=next||makeFieldContract(index,{rerollCount:(current.rerollCount||0)+1,minRarity:current.rarity});
  saveState();
  syncHud();
  renderTradePostContent();
  toast(t("craft.contractRerolled"));
  return true;
}

function claimFieldContract(index){
  if(!fieldContractSlotUnlocked(index))return false;
  const contracts=ensureFieldContracts();
  const contract=contracts[index];
  if(!contract||fieldContractState(contract)!=="ready")return false;
  const reward=contract.reward||{};
  if(typeof addPlayerXp==="function")addPlayerXp(reward.xp||0,{notify:true});
  state.money=(Number(state.money)||0)+(Number(reward.money)||0);
  (reward.items||[]).forEach(item=>addItem(item.id,item.qty||1));
  if(reward.equipment?.id&&typeof addEquipmentInstance==="function"){
    addEquipmentInstance(reward.equipment.id,reward.equipment.rarity||contract.rarity||"common",{upgradeLevel:reward.equipment.upgradeLevel||1});
  }
  const trade=tradePostState();
  trade.contractStats.completed=(Number(trade.contractStats.completed)||0)+1;
  trade.contractStats.earnedMoney=(Number(trade.contractStats.earnedMoney)||0)+(Number(reward.money)||0);
  trade.contractStats.earnedXp=(Number(trade.contractStats.earnedXp)||0)+(Number(reward.xp)||0);
  if(contract.rarity==="legendary")trade.contractStats.legendary=(Number(trade.contractStats.legendary)||0)+1;
  if(typeof dailyTrack==="function")dailyTrack("contracts",1);
  trade.contractHistory.unshift({templateId:contract.templateId,rarity:contract.rarity||"common",money:Number(reward.money)||0,xp:Number(reward.xp)||0,claimedAt:Date.now()});
  trade.contractHistory=trade.contractHistory.slice(0,5);
  contracts[index]=makeFieldContract(index,{rerollCount:0});
  saveState();
  syncHud();
  renderTradePostContent();
  toast(t("craft.contractClaimed"));
  return true;
}

function fieldContractRewardCount(contract){
  const reward=contract?.reward||{};
  return 2+(Array.isArray(reward.items)?reward.items.length:0)+(reward.equipment?.id?1:0);
}

function fieldContractRewardTile(item){
  const catalog=inventoryCatalogItem(item.id)||rewardCatalogItemById(item.id);
  const rarityClass=catalog?.upgradeMaterialRarity?` rarity-${catalog.upgradeMaterialRarity}`:"";
  const art=catalog?tradeItemArt(catalog):(typeof rewardItemIconHtml==="function"?rewardItemIconHtml(item.id):"<span>◆</span>");
  const title=catalog?tradeItemTitle(catalog):(typeof rewardItemTitle==="function"?rewardItemTitle(item.id):String(item.id||t("common.zoneReward")));
  return `<div class="contract-reward-tile${rarityClass}">
    <span class="contract-reward-art">${art}</span>
    <b>${title}</b>
    <small>×${item.qty||1}</small>
  </div>`;
}

function fieldContractRewardTilesHtml(contract){
  const reward=contract?.reward||{};
  const rows=[
    `<div class="contract-reward-tile special"><span class="contract-reward-art">${contractSpecialRewardIconHtml("xp")}</span><b>${t("craft.rewardExperience")}</b><small>+${reward.xp||0} EXP</small></div>`,
    `<div class="contract-reward-tile special"><span class="contract-reward-art">${contractSpecialRewardIconHtml("money")}</span><b>${t("craft.rewardMoney")}</b><small>+${reward.money||0} ₴</small></div>`,
    ...(reward.items||[]).map(fieldContractRewardTile)
  ];
  if(reward.equipment?.id){
    const catalog=inventoryCatalogItem(reward.equipment.id);
    const rarity=ITEM_RARITIES[reward.equipment.rarity]||ITEM_RARITIES.common;
    if(catalog)rows.push(`<div class="contract-reward-tile equipment rarity-${rarity.id}">
      <span class="contract-reward-art">${tradeItemArt(catalog)}</span>
      <b>${tradeItemTitle(catalog)}</b>
      <small>${t(rarity.labelKey)} · Lv.${reward.equipment.upgradeLevel||1}</small>
    </div>`);
  }
  return rows.join("");
}

function openFieldContractRewardModal(index){
  const contract=ensureFieldContracts()[Number(index)];
  if(!contract)return;
  closeFieldContractRewardModal();
  const rarity=fieldContractRarity(contract);
  const overlay=document.createElement("div");
  overlay.id="fieldContractRewardOverlay";
  overlay.className="contract-reward-overlay";
  overlay.innerHTML=`<section class="contract-reward-modal rarity-${rarity.id}" role="dialog" aria-modal="true">
    <button class="contract-reward-close" data-contract-reward-close type="button">×</button>
    <div class="contract-reward-heading">
      <span>${t("craft.contractRewardDetailsEyebrow")}</span>
      <h2>${t(`craft.contracts.${contract.templateId}.title`)}</h2>
      <div class="field-contract-quality"><span class="trade-rarity rarity-${rarity.id}">${t((ITEM_RARITIES[rarity.id]||ITEM_RARITIES.common).labelKey)}</span><small>${t("craft.contractQuality")}</small></div>
      <p>${t("craft.contractRewardDetailsHint")}</p>
    </div>
    <div class="contract-reward-grid">${fieldContractRewardTilesHtml(contract)}</div>
    <button class="contract-reward-ok" data-contract-reward-close type="button">${t("common.close")}</button>
  </section>`;
  document.body.appendChild(overlay);
  overlay.onclick=event=>{if(event.target===overlay)closeFieldContractRewardModal();};
  overlay.querySelectorAll("[data-contract-reward-close]").forEach(button=>button.onclick=closeFieldContractRewardModal);
}

function renderFieldContracts(){
  const contracts=ensureFieldContracts();
  const trade=tradePostState();
  const stats=trade.contractStats||{};
  const history=Array.isArray(trade.contractHistory)?trade.contractHistory:[];
  const now=Date.now();
  return `<section class="field-contracts field-contracts-tab">
    <div class="trade-section-head">
      <div><h2>${t("craft.contractsTitle")}</h2><p>${t("craft.contractsHintV37")}</p></div>
      <div class="field-contract-capacity">${t("craft.contractSlotsProgress",{count:fieldContractCapacity(),max:FIELD_CONTRACT_MAX_SLOTS})}</div>
    </div>
    <div class="field-contract-stats">
      <div><span>${t("craft.contractStatsCompleted")}</span><b>${Number(stats.completed)||0}</b></div>
      <div><span>${t("craft.contractStatsLegendary")}</span><b>${Number(stats.legendary)||0}</b></div>
      <div><span>${t("craft.contractStatsMoney")}</span><b>${Number(stats.earnedMoney)||0} ₴</b></div>
      <div><span>${t("craft.contractStatsRerolls")}</span><b>${Number(stats.rerolls)||0}</b></div>
    </div>
    <div class="field-contract-rarity-legend">${ITEM_RARITY_ORDER.map(id=>`<span class="contract-rarity-chip rarity-${id}">${t((ITEM_RARITIES[id]||ITEM_RARITIES.common).labelKey)}</span>`).join("")}</div>
    <div class="field-contract-grid">
      ${Array.from({length:FIELD_CONTRACT_MAX_SLOTS},(_,index)=>{
        const requiredLevel=fieldContractUnlockLevel(index);
        if(!fieldContractSlotUnlocked(index)){
          return `<article class="field-contract-card locked" aria-disabled="true">
            <div class="field-contract-icon">🔒</div>
            <div class="field-contract-copy">
              <div class="field-contract-meta"><span>${t("craft.contractSlotNumber",{slot:index+1})}</span><b>${t("craft.contractLocked")}</b></div>
              <h3>${t("craft.contractLockedTitle")}</h3>
              <p>${t("craft.contractUnlockLevel",{level:requiredLevel})}</p>
              <small class="field-contract-unlock-progress">${t("craft.contractUnlockProgress",{current:Math.max(1,Math.floor(Number(state.level)||1)),required:requiredLevel})}</small>
            </div>
          </article>`;
        }
        const contract=contracts[index]||makeFieldContract(index);
        const status=fieldContractState(contract,now);
        const rarity=fieldContractRarity(contract);
        const title=t(`craft.contracts.${contract.templateId}.title`);
        const description=t(`craft.contracts.${contract.templateId}.description`);
        const rerollCost=fieldContractRerollCost(contract);
        return `<article class="field-contract-card ${status} rarity-${rarity.id}" data-field-contract-details="${index}" tabindex="0">
          <div class="field-contract-icon">${contract.icon||"◆"}</div>
          <div class="field-contract-copy">
            <div class="field-contract-meta"><span>${t("craft.contractLevel",{level:contract.level})}</span><b>${status==="available"?t("craft.contractAvailable"):status==="ready"?t("craft.contractReady"):t("craft.contractActive")}</b></div>
            <div class="field-contract-quality"><span class="trade-rarity rarity-${rarity.id}">${t((ITEM_RARITIES[rarity.id]||ITEM_RARITIES.common).labelKey)}</span><small>${t("craft.contractQuality")}</small></div>
            <h3>${title}</h3><p>${description}</p>
            <small class="field-contract-reward-summary">${t("craft.contractReward")}: ${t("craft.contractRewardCount",{count:fieldContractRewardCount(contract)})}</small>
            <small class="field-contract-open-hint">▣ ${t("craft.contractOpenRewards")}</small>
            ${status==="available"?`<small class="field-contract-floor">🛡 ${t("craft.contractRerollFloor",{quality:t((ITEM_RARITIES[rarity.id]||ITEM_RARITIES.common).labelKey)})}</small>`:""}
            ${status==="active"?`<strong class="field-contract-timer" data-contract-timer="${index}" data-contract-end="${contract.endsAt}">${formatTradeTime(contract.endsAt-now)}</strong>`:""}
          </div>
          <div class="field-contract-action">
            ${status==="available"?`<button data-field-contract-start="${index}" type="button">${t("craft.contractStart")}</button><button data-field-contract-reroll="${index}" class="reroll" type="button">↻ ${rerollCost?t("craft.contractRerollCost",{cost:rerollCost}):t("craft.contractRerollFree")}</button>`:""}
            ${status==="ready"?`<button data-field-contract-claim="${index}" class="ready" type="button">${t("craft.contractClaim")}</button>`:""}
            ${status==="active"?`<span>${t("craft.contractDuration")}</span>`:""}
          </div>
        </article>`;
      }).join("")}
    </div>
    ${history.length?`<section class="field-contract-history"><div class="trade-section-head"><div><h2>${t("craft.contractHistoryTitle")}</h2><p>${t("craft.contractHistoryHint")}</p></div></div><div class="field-contract-history-list">${history.map(row=>`<div class="field-contract-history-row rarity-${row.rarity||"common"}"><span class="trade-rarity rarity-${row.rarity||"common"}">${t((ITEM_RARITIES[row.rarity]||ITEM_RARITIES.common).labelKey)}</span><b>${t(`craft.contracts.${row.templateId}.title`)}</b><small>+${row.xp||0} EXP · +${row.money||0} ₴</small></div>`).join("")}</div></section>`:""}
  </section>`;
}

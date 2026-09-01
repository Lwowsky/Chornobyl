/* Expedition reward rendering and details. */

function expeditionRewardItemName(reward){
  const normalized=typeof normalizeRewardEntry==="function"?normalizeRewardEntry(reward):reward;
  if(normalized?.special==="money")return t("craft.rewardMoney");
  if(normalized?.special==="xp")return t("levelSystem.experience");
  if(!normalized?.id)return normalized?.name||t("common.zoneReward");
  return typeof rewardItemTitle==="function"
    ? rewardItemTitle(normalized.id,normalized.name||t("common.zoneReward"))
    : (normalized.name||normalized.id);
}

function expeditionRewardCardHtml(reward){
  const normalized=typeof normalizeRewardEntry==="function"?normalizeRewardEntry(reward):reward;
  if(normalized?.special==="xp")return `<div class="expedition-drop-card special-xp"><div class="expedition-drop-icon"><img src="assets/inventory-items/item_exp.webp" alt=""></div><div class="expedition-drop-copy"><small>${t("levelSystem.experience")}</small><b>+${Math.max(0,Number(normalized.xp)||0)} EXP</b></div></div>`;
  if(normalized?.special==="money")return `<div class="expedition-drop-card special-money"><div class="expedition-drop-icon"><img src="assets/inventory-items/item_money.webp" alt=""></div><div class="expedition-drop-copy"><small>${t("craft.rewardMoney")}</small><b>+${Math.max(0,Number(normalized.money)||0)} ₴</b></div></div>`;
  const item=normalized?.id?(inventoryCatalogItem(normalized.id)||rewardCatalogItemById(normalized.id)||{}):{};
  const icon=normalized?.equipment
    ? (typeof equipmentItemDisplayIcon==="function"?equipmentItemDisplayIcon({...item,...normalized}):(typeof rewardItemIconHtml==="function"?rewardItemIconHtml(normalized.id):"🎒"))
    : (normalized?.icon || (typeof rewardItemIconHtml==="function"&&normalized?.id?rewardItemIconHtml(normalized.id):(item.profileIcon?`<img src="${item.profileIcon}" alt="">`:(item.icon||"◆"))));
  const rarity=normalized?.rarity&&ITEM_RARITIES[normalized.rarity]?ITEM_RARITIES[normalized.rarity]:null;
  const rewardId=normalized?.id||"reward_fallback";
  const isEquipment=!!(normalized?.equipment || item?.type==="equipment" || item?.slot);

  return `<button class="expedition-drop-card ${rarity?`rarity-${rarity.id}`:""}"
    data-expedition-drop="${normalized?.instanceId||rewardId}"
    data-expedition-drop-equipment="${normalized?.equipment?"1":"0"}"
    data-expedition-drop-id="${rewardId}"
    type="button">
    <div class="expedition-drop-icon">${icon}</div>
    <div class="expedition-drop-copy">
      <small>${isEquipment?t("expeditions.drop.equipment"):t("expeditions.drop.resource")}</small>
      <b>${expeditionRewardItemName(normalized)}</b>
      ${rarity?`<span>${t(rarity.labelKey)} +1</span>`:""}
      <em>${t("expeditions.drop.clickDetails")}</em>
    </div>
    <strong>×${Math.max(1,Number(normalized?.qty)||1)}</strong>
  </button>`;
}

function expeditionRewardsHtml(rewards,firstClear=false){
  const safeRewards=(Array.isArray(rewards)?rewards:[])
    .map(row=>typeof normalizeRewardEntry==="function"?normalizeRewardEntry(row):row)
    .filter(Boolean);
  return `<section class="expedition-drops">
    <div class="expedition-drops-head">
      <div>
        <span>${firstClear?t("expeditions.drop.firstClear"):t("expeditions.drop.title")}</span>
        <h3>${t("expeditions.drop.received")}</h3>
      </div>
      <b>${safeRewards.length}</b>
    </div>
    <div class="expedition-drop-grid">
      ${safeRewards.map(expeditionRewardCardHtml).join("")}
    </div>
  </section>`;
}


function expeditionRewardStoredItem(key,id){
  const stored=state.inventory.find(entry=>entry.instanceId===key);
  if(stored)return inventoryItemData(stored);
  if(typeof equippedItem==="function"&&typeof EQUIPMENT_SLOTS!=="undefined"){
    const equipped=EQUIPMENT_SLOTS.map(slot=>equippedItem(slot)).find(item=>item&&(item.instanceId===key||(!key&&item.id===id)));
    if(equipped)return equipped;
  }
  return inventoryItemData(inventoryItem(id));
}

function closeExpeditionDropDetails(){
  const overlay=document.getElementById("expeditionDropDetailsOverlay");
  if(overlay)overlay.remove();
}

function expeditionResourceDetailsHtml(item){
  const qty=inventoryItem(item.id)?.qty||0;
  const weight=inventoryItemWeight(item);
  return `<div class="expedition-resource-detail">
    <div class="expedition-resource-detail-icon">${item.icon||"◆"}</div>
    <div>
      <span>${t("expeditions.drop.resource")}</span>
      <h3>${t(`items.${item.id}`)}</h3>
      <p>${t(`itemDescriptions.${item.id}`)}</p>
      <div class="expedition-resource-meta">
        <div><small>${t("inventory.quantity")}</small><b>${qty}</b></div>
        <div><small>${t("inventory.weight")}</small><b>${weight.toFixed(2)} ${t("units.kg")}</b></div>
      </div>
    </div>
  </div>`;
}

function expeditionEquipmentDetailsHtml(item){
  const rarity=itemRarity(item);
  const level=itemUpgradeLevel(item);
  const effectiveStats=Object.keys(itemEffectiveStats(item)).length;

  return `<div class="profile-item-popover-main expedition-profile-item-detail">
    <div class="profile-item-popover-item">
      <div class="profile-item-popover-icon">${equipmentItemDisplayIcon(item)}</div>
      <div class="profile-item-tooltip-title">
        <span class="profile-item-popover-slot">${t(equipmentSlotUi(item.slot).labelKey)}</span>
        <h3>${t(`items.${item.id}`)}</h3>
        <div class="profile-item-title-meta">
          <span class="item-rarity item-rarity--${rarity.id}">${t(rarity.labelKey)} +${level}</span>
        </div>
      </div>
    </div>

    ${typeof profileEquippedComparison==="function"?profileEquippedComparison(item):""}

    <div class="profile-item-popover-meta profile-item-popover-meta-3">
      <div><span>${t("inventory.weight")}</span><b>${inventoryItemWeight(item).toFixed(2)} ${t("units.kg")}</b></div>
      <div><span>${t("profile.itemPopup.level")}</span><b>+${level} / +${rarity.maxUpgrade}</b></div>
      ${typeof profileItemCombatPowerHtml==="function"?profileItemCombatPowerHtml(item):""}
    </div>

    <p class="profile-item-popover-description">${t(`itemDescriptions.${item.id}`)}</p>

    <div class="profile-item-popover-section">
      <strong>${t("profile.itemPopup.currentStats")}</strong>
      <div class="profile-item-popover-stats">
        ${effectiveStats&&typeof profileItemStatRows==="function"
          ?profileItemStatRows(item)
          :`<div class="profile-item-popover-empty">${t("profile.itemPopup.noStats")}</div>`}
      </div>
    </div>
  </div>`;
}

function showExpeditionDropDetails(key,id,isEquipment){
  const item=expeditionRewardStoredItem(key,id);
  if(!item)return;

  closeExpeditionDropDetails();
  const overlay=document.createElement("div");
  overlay.id="expeditionDropDetailsOverlay";
  overlay.className="expedition-drop-details-overlay";
  overlay.innerHTML=`<section class="expedition-drop-details-modal ${isEquipment?"equipment":"resource"}">
    <button data-close-drop-details class="expedition-drop-details-close" type="button">×</button>
    ${isEquipment?expeditionEquipmentDetailsHtml(item):expeditionResourceDetailsHtml(item)}
  </section>`;
  document.body.appendChild(overlay);

  overlay.querySelector("[data-close-drop-details]").onclick=closeExpeditionDropDetails;
  overlay.onclick=event=>{
    if(event.target===overlay)closeExpeditionDropDetails();
  };
}

function bindExpeditionRewardDetails(scope=document){
  scope.querySelectorAll("[data-expedition-drop]").forEach(button=>{
    button.onclick=()=>showExpeditionDropDetails(
      button.dataset.expeditionDrop,
      button.dataset.expeditionDropId,
      button.dataset.expeditionDropEquipment==="1"
    );
  });
}

function showExpeditionRewardModal(expedition,rewards,level,battleSummary=null){
  let overlay=document.getElementById("expeditionRewardOverlay");
  if(!overlay){
    overlay=document.createElement("div");
    overlay.id="expeditionRewardOverlay";
    overlay.className="expedition-reward-overlay";
    document.body.appendChild(overlay);
  }

  const victory=battleSummary?battleSummary.victory:true;
  overlay.innerHTML=`<section class="expedition-reward-modal ${victory?"":"defeat"}">
    <div class="expedition-reward-modal-mark">${victory?"✓":"×"}</div>
    <span>${victory?t("expeditions.drop.victory"):t("expeditions.instantSummary.defeat")} · ${t("expeditions.level")} ${level}</span>
    <h2>${t(`expeditions.types.${expedition.id}.name`)}</h2>
    ${battleSummary?expeditionInstantSummaryHtml(battleSummary):""}
    ${victory?expeditionRewardsHtml(rewards,false):`<div class="expedition-no-loot">${t("expeditions.instantSummary.noLoot")}</div>`}
    <button data-close-expedition-reward type="button">${t("expeditions.drop.continue")}</button>
  </section>`;

  bindExpeditionRewardDetails(overlay);
  overlay.querySelector("[data-close-expedition-reward]").onclick=()=>{
    closeExpeditionDropDetails();
    overlay.remove();
    renderExpeditions();
  };
}

function maxRarityOrderForPlayerLevel(level=state.level||1){
  const current=Math.max(1,Math.floor(Number(level)||1));
  if(current>=14)return 4;
  if(current>=9)return 3;
  if(current>=5)return 2;
  if(current>=2)return 1;
  return 0;
}

function maxRarityOrderForExpeditionLevel(level){
  const current=Math.max(1,Math.floor(Number(level)||1));
  if(current>=9)return 4;
  if(current>=7)return 3;
  if(current>=5)return 2;
  if(current>=3)return 1;
  return 0;
}

function weightedRarityUpTo(maxOrder,level=1){
  const base=[
    {id:"common",weight:55},
    {id:"uncommon",weight:30},
    {id:"rare",weight:11},
    {id:"epic",weight:3.5},
    {id:"legendary",weight:0.5}
  ];
  const allowed=base.filter((row,index)=>index<=maxOrder);
  if(level>=7){
    allowed.forEach((row,index)=>{if(index>=2)row.weight*=1.35;});
  }
  const total=allowed.reduce((sum,row)=>sum+row.weight,0);
  let roll=Math.random()*total;
  for(const row of allowed){
    roll-=row.weight;
    if(roll<=0)return row.id;
  }
  return allowed[allowed.length-1]?.id||"common";
}

function expeditionEquipmentRarity(level){
  const maxOrder=Math.min(maxRarityOrderForPlayerLevel(),maxRarityOrderForExpeditionLevel(level));
  return weightedRarityUpTo(maxOrder,level);
}

function expeditionEquipmentDropChance(expedition){
  if(expedition.id===EXPEDITION_FINAL.id)return 100;
  if(["raiders","bunker","laboratory"].includes(expedition.id))return 25;
  return 12;
}

function addExpeditionEquipment(rarityId){
  const id=sample(EXPEDITION_EQUIPMENT_IDS);
  const item=addEquipmentInstance(id,ITEM_RARITIES[rarityId]?rarityId:"common");
  if(!item)return null;
  return {...item,expeditionRarity:itemRarityId(item)};
}

function maybeGrantExpeditionEquipment(expedition,level){
  const chance=expeditionEquipmentDropChance(expedition);
  if(Math.random()*100>=chance)return null;
  return addExpeditionEquipment(expeditionEquipmentRarity(level));
}

function addExpeditionStack(id,qty){
  addItem(id,Math.max(1,Math.floor(qty)));
  return {id,qty:Math.max(1,Math.floor(qty))};
}

function grantExpeditionReward(expedition,firstClear,level=expeditionSelectedLevel()){
  const rewardScale=firstClear?1:0.55;
  const rewards=[];
  const amount=base=>Math.max(1,Math.round(base*rewardScale));

  // Expeditions now fund a meaningful part of the long-term upgrade economy.
  // First clears pay the full amount; repeat farming pays 55%, like materials.
  const routeIndex=Math.max(0,EXPEDITION_TYPES.findIndex(row=>row.id===expedition.id));
  const moneyBase=expedition.id===EXPEDITION_FINAL.id
    ? 30+level*12
    : 12+level*6+routeIndex*3;
  const money=amount(moneyBase);
  state.money=(Number(state.money)||0)+money;
  rewards.push({special:"money",money});

  // Each of the seven routes has a clear farming purpose for equipment progression.
  // Any combat route can drop equipment; elite routes and bosses have higher chances.
  if(expedition.id==="warehouse"){
    rewards.push(addExpeditionStack("scrap",amount(7+level*2)));
    rewards.push(addExpeditionStack("battery",amount(1+Math.floor(level/3))));
  }

  if(expedition.id==="hospital"){
    rewards.push(addExpeditionStack("battery",amount(2+Math.floor(level/2))));
    rewards.push(addExpeditionStack("bandage",amount(1+Math.floor(level/4))));
    if(firstClear||level>=3)rewards.push(addExpeditionStack("medkit",1));
  }

  if(expedition.id==="anomaly"){
    rewards.push(addExpeditionStack("mutant_tooth",amount(2+Math.floor(level/2))));
    rewards.push(addExpeditionStack("weak_artifact",amount(1+Math.floor(level/5))));
  }

  if(expedition.id==="raiders"){
    rewards.push(addExpeditionStack("scrap",amount(5+level)));
    rewards.push(addExpeditionStack("ammo",amount(10+level*3)));
  }

  if(expedition.id==="mutants"){
    rewards.push(addExpeditionStack("mutant_hide",amount(6+level*2)));
    rewards.push(addExpeditionStack("mutant_tooth",amount(3+Math.floor(level/2))));
  }

  if(expedition.id==="bunker"){
    const militaryTier=level>=8?"epic_hide":level>=5?"rare_hide":"uncommon_hide";
    rewards.push(addExpeditionStack(militaryTier,amount(1+Math.floor(level/4))));
    rewards.push(addExpeditionStack("battery",amount(2+Math.ceil(level/3))));
  }

  if(expedition.id==="laboratory"){
    const researchTier=level>=9?"legendary_hide":level>=7?"epic_hide":level>=4?"rare_hide":"uncommon_hide";
    rewards.push(addExpeditionStack(researchTier,amount(1+Math.floor(level/3))));
    rewards.push(addExpeditionStack("mutant_tooth",amount(1+Math.floor(level/3))));
  }

  if(expedition.reward==="final"){
    const tier=level>=8?"legendary_hide":level>=5?"epic_hide":"rare_hide";
    rewards.push(addExpeditionStack(tier,Math.max(1,Math.ceil(level/3))));
  }

  const equipmentDrop=maybeGrantExpeditionEquipment(expedition,level);
  if(equipmentDrop)rewards.push({id:equipmentDrop.id,qty:1,equipment:true,rarity:equipmentDrop.expeditionRarity,instanceId:equipmentDrop.instanceId});

  return rewards;
}

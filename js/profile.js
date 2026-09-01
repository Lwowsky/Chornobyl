let profileActiveTab="profile";
let profileSelectedSlot=EQUIPMENT_SLOT_COLUMNS.left[0];
let profileBagTab="items";
let profileBagPage=1;
let profileItemPopover=null;
let profilePopoverOutsideHandler=null;
let profilePopoverKeyHandler=null;

const PROFILE_ACHIEVEMENTS = Object.freeze([
  {id:"firstStep",titleKey:"achievements.firstStep.title",descriptionKey:"achievements.firstStep.description",target:1,value:()=>state.hasStarted?1:0},
  {id:"explorer",titleKey:"achievements.explorer.title",descriptionKey:"achievements.explorer.description",target:5,value:()=>state.openedLocations?.length||0},
  {id:"collector",titleKey:"achievements.collector.title",descriptionKey:"achievements.collector.description",target:10,value:()=>state.discoveredItems?.length||0},
  {id:"wardrobe",titleKey:"achievements.wardrobe.title",descriptionKey:"achievements.wardrobe.description",target:3,value:()=>state.unlockedAvatars?.length||1}
]);

function profileStatLabel(stat){
  const keys={
    maxHp:"profile.stats.hp",
    maxProtection:"profile.stats.protection",
    attack:"profile.stats.attack",
    agility:"profile.stats.agility",
    radiationResistance:"profile.stats.radiationProtection",
    critChance:"profile.stats.crit",
    accuracy:"profile.stats.accuracy",
    evasion:"profile.stats.evasion",
    maxEnergy:"profile.stats.energy",
    maxWeight:"profile.stats.weight"
  };
  return keys[stat]?t(keys[stat]):stat;
}

function profileItemProgression(item){
  const rarity=itemRarity(item);
  return `<span class="item-rarity item-rarity--${rarity.id}">${t(rarity.labelKey)} +${itemUpgradeLevel(item)}</span>`;
}

function profileEquipmentSlotButton(slot){
  const ui=equipmentSlotUi(slot);
  const item=equippedItem(slot);
  const rarity=item ? itemRarity(item) : null;
  return `<button class="profile-equipment-slot ${profileSelectedSlot===slot?"active":""} ${item?"equipped":"empty"} ${rarity?`rarity-${rarity.id}`:""}" data-equipment-slot="${slot}" type="button">
    <span class="profile-equipment-label">${t(ui.labelKey)}</span>
    <span class="profile-equipment-box">
      <span class="profile-equipment-icon ${item?"":"placeholder"}">${item?equipmentItemDisplayIcon(item):equipmentEmptySlotIcon(slot)}</span>
      ${item?`<span class="profile-equipment-upgrade">+${itemUpgradeLevel(item)}</span>`:""}
    </span>
    <span class="profile-equipment-name">${item?t(`items.${item.id}`):t("profile.emptySlot")}</span>
  </button>`;
}

function renderProfileEquipmentSlots(){
  const left=document.getElementById("equipmentSlotsLeft");
  const right=document.getElementById("equipmentSlotsRight");
  if(!left||!right)return;

  left.innerHTML=EQUIPMENT_SLOT_COLUMNS.left.map(profileEquipmentSlotButton).join("");
  right.innerHTML=EQUIPMENT_SLOT_COLUMNS.right.map(profileEquipmentSlotButton).join("");

  document.querySelectorAll("[data-equipment-slot]").forEach(button=>{
    button.onclick=event=>{
      event.stopPropagation();
      profileSelectedSlot=button.dataset.equipmentSlot;

      document.querySelectorAll("[data-equipment-slot]").forEach(slotButton=>{
        slotButton.classList.toggle("active",slotButton===button);
      });

      const item=equippedItem(profileSelectedSlot);
      if(item){
        openProfileItemPopover(button,item,{mode:"equipped",slot:profileSelectedSlot});
      }else{
        openProfileSlotPicker(button,profileSelectedSlot);
      }
    };
  });
}

function profileEquipmentStatBonus(key,equipmentBonuses){
  let bonus=Number(equipmentBonuses[key]||0);

  if(key==="critChance"){
    bonus+=Math.max(0,Number(equipmentBonuses.agility||0))*AGILITY_CRIT_RATE;
  }

  return Math.round(bonus*10)/10;
}

function profileLevelStatBonus(key){
  if(typeof getPlayerLevelBonusStats!=="function")return 0;
  const bonuses=getPlayerLevelBonusStats();
  let bonus=Number(bonuses[key]||0);
  if(key==="critChance")bonus+=Math.max(0,Number(bonuses.agility||0))*AGILITY_CRIT_RATE;
  return Math.round(bonus*10)/10;
}

function profileAvatarStatBonus(key){
  if(typeof activeAvatarBonusStats!=="function")return 0;
  const bonuses=activeAvatarBonusStats()||{};
  let bonus=Number(bonuses[key]||0);
  if(key==="critChance")bonus+=Math.max(0,Number(bonuses.agility||0))*AGILITY_CRIT_RATE;
  return Math.round(bonus*10)/10;
}

function renderProfileStats(){
  const container=document.getElementById("profileStats");
  if(!container)return;

  const player=getPlayerStats();
  const equipmentBonuses=getEquipmentBonusStats();
  const rows=[
    {key:"maxHp",value:player.maxHp},
    {key:"maxProtection",value:player.maxProtection},
    {key:"attack",value:player.attack},
    {key:"agility",value:player.agility},
    {key:"radiationResistance",value:player.radiationResistance,suffix:"%"},
    {key:"critChance",value:player.critChance,suffix:"%"},
    {key:"accuracy",value:player.accuracy,suffix:"%"},
    {key:"evasion",value:player.evasion,suffix:"%"},
    {key:"maxEnergy",value:player.maxEnergy},
    {key:"maxWeight",value:player.maxWeight,suffix:` ${t("units.kg")}`}
  ];

  container.innerHTML=rows.map(row=>{
    const value=Math.round(Number(row.value||0)*10)/10;
    const gearBonus=profileEquipmentStatBonus(row.key,equipmentBonuses);
    const levelBonus=profileLevelStatBonus(row.key);
    const avatarBonus=profileAvatarStatBonus(row.key);
    const base=Number(PLAYER_BASE_STATS[row.key]||0);
    const tooltipId=`profileStatHelp-${row.key}`;

    return `<button class="profile-stat-card profile-stat-${row.key}" type="button" aria-describedby="${tooltipId}">
      <span class="profile-stat-info" aria-hidden="true">i</span>
      <span class="profile-stat-row">
        <span>${profileStatLabel(row.key)}</span>
        <b>${value}${row.suffix||""}${gearBonus>0?` <em>(+${gearBonus}${row.suffix||""})</em>`:""}</b>
      </span>
      <span class="profile-stat-help" id="${tooltipId}" role="tooltip">
        <strong>${profileStatLabel(row.key)}</strong>
        <span>${t(`profile.statDescriptions.${row.key}`)}</span>
        <small>
          ${t("profile.statBreakdown.base")}: ${base}${row.suffix||""}
          <i>•</i>
          ${t("profile.statBreakdown.level")}: ${levelBonus>0?"+":""}${levelBonus}${row.suffix||""}
          <i>•</i>
          ${t("profile.statBreakdown.equipment")}: ${gearBonus>0?"+":""}${gearBonus}${row.suffix||""}
          <i>•</i>
          ${t("profile.statBreakdown.avatar")}: ${avatarBonus>0?"+":""}${avatarBonus}${row.suffix||""}
        </small>
      </span>
    </button>`;
  }).join("");
}

function renderProfileCharacter(){
  const image=document.getElementById("profileCharacterBase");
  const avatar=activeAvatar();
  if(image){image.src=avatar.image;image.alt=t(avatar.nameKey);}
}

function profileItemStatRows(item,preview=null){
  const current=itemEffectiveStats(item);
  const next=preview
    ? itemEffectiveStatsAt(item,preview.rarity,preview.upgradeLevel)
    : null;

  const keys=Object.keys(current);
  if(!keys.length){
    return `<div class="profile-item-popover-empty">${t("profile.itemPopup.noStats")}</div>`;
  }

  return keys.map(key=>{
    const currentValue=current[key];
    const nextValue=next?.[key];
    const suffix=["radiationResistance","critChance","accuracy","evasion"].includes(key)?"%":"";

    if(Number.isFinite(nextValue)){
      const delta=Math.round((nextValue-currentValue)*10)/10;
      return `<div class="profile-item-compare-card">
        <strong>${profileStatLabel(key)}</strong>
        <div class="profile-item-compare-values">
          <div><small>${t("profile.itemPopup.current")}</small><b>+${currentValue}${suffix}</b></div>
          <div><small>${t("profile.itemPopup.after")}</small><b class="next">+${nextValue}${suffix}</b></div>
          <div><small>${t("profile.itemPopup.gain")}</small><b class="${delta>0?"gain":"unchanged"}">${delta>0?`+${delta}${suffix}`:t("profile.itemPopup.noChange")}</b></div>
        </div>
      </div>`;
    }

    const attributeIndex=itemAttributeKeys(item).indexOf(key);
    const reforgeCost=typeof itemReforgeCost==="function"?itemReforgeCost(item):0;
    const reforgePrice=reforgeCost===0?t("profile.itemPopup.reforgeFree"):`₴ ${reforgeCost}`;
    return `<div class="profile-item-popover-stat item-reforge-row">
      <span>${profileStatLabel(key)}</span>
      <b>+${currentValue}${suffix}</b>
      <button class="item-reforge-button" data-profile-reforge="${attributeIndex}" type="button">↻ ${reforgePrice}</button>
    </div>`;
  }).join("");
}




function closeProfileItemPopover(){
  if(profileItemPopover){
    profileItemPopover.remove();
    profileItemPopover=null;
  }

  if(profilePopoverOutsideHandler){
    document.removeEventListener("pointerdown",profilePopoverOutsideHandler,true);
    profilePopoverOutsideHandler=null;
  }

  if(profilePopoverKeyHandler){
    document.removeEventListener("keydown",profilePopoverKeyHandler,true);
    profilePopoverKeyHandler=null;
  }
}

function positionProfileItemPopover(anchor,popover){
  const panel=document.querySelector(".profile-panel");
  if(!panel||!anchor||!popover)return;

  const panelRect=panel.getBoundingClientRect();
  const anchorRect=anchor.getBoundingClientRect();
  const width=Math.min(430,Math.max(320,panelRect.width-20));
  const viewportPadding=12;
  const maxHeight=Math.max(320,window.innerHeight-viewportPadding*2);

  popover.style.width=`${width}px`;
  popover.style.maxHeight=`${maxHeight}px`;

  const desiredLeft=anchorRect.left-panelRect.left+(anchorRect.width-width)/2;
  const maxLeft=Math.max(8,panelRect.width-width-8);
  const left=clamp(desiredLeft,8,maxLeft);

  // Measure after width/max-height is applied, then clamp the whole popup to the viewport.
  const naturalHeight=Math.min(popover.scrollHeight,maxHeight);
  const preferredViewportTop=anchorRect.bottom+8;
  const latestViewportTop=Math.max(viewportPadding,window.innerHeight-naturalHeight-viewportPadding);
  const viewportTop=clamp(preferredViewportTop,viewportPadding,latestViewportTop);
  const top=viewportTop-panelRect.top;

  popover.style.left=`${left}px`;
  popover.style.top=`${top}px`;
}

function openProfileSlotPicker(anchor,slot){
  closeProfileItemPopover();

  const host=document.getElementById("profileItemPopoverHost");
  if(!host||!anchor)return;

  const items=equipmentItemsInInventory(slot);
  const popover=document.createElement("div");
  popover.className="profile-item-popover profile-slot-picker";
  popover.dataset.mode="picker";
  popover.dataset.slot=slot;

  popover.innerHTML=`<button class="profile-item-popover-close" type="button" aria-label="${t("profile.itemPopup.close")}">×</button>
    <div class="profile-slot-picker-head">
      <span>${t(equipmentSlotUi(slot).labelKey)}</span>
      <h3>${t("profile.chooseItem")}</h3>
    </div>
    <div class="profile-slot-picker-list">
      ${items.length?items.map(item=>{
        const rarity=itemRarity(item);
        return `<button class="profile-slot-picker-item rarity-${rarity.id}" data-profile-picker-item="${inventoryEntryKey(item)}" type="button">
          <span class="profile-owned-item-icon">${equipmentItemDisplayIcon(item)}</span>
          <span class="profile-slot-picker-copy">
            <strong>${t(`items.${item.id}`)}</strong>
            <small class="item-rarity item-rarity--${rarity.id}">${itemProgressionLabel(item)}</small>
          </span>
          <b>+${itemUpgradeLevel(item)}</b>
        </button>`;
      }).join(""):`<div class="profile-owned-empty">${t("profile.noAvailableGear")}</div>`}
    </div>`;

  host.appendChild(popover);
  profileItemPopover=popover;
  positionProfileItemPopover(anchor,popover);

  popover.querySelector(".profile-item-popover-close").onclick=closeProfileItemPopover;
  popover.querySelectorAll("[data-profile-picker-item]").forEach(button=>{
    button.onclick=()=>{
      if(!equipItem(button.dataset.profilePickerItem))return;
      closeProfileItemPopover();
      refreshProfileEquipment();
    };
  });

  profilePopoverOutsideHandler=event=>{
    if(!profileItemPopover)return;
    if(profileItemPopover.contains(event.target)||anchor.contains(event.target))return;
    closeProfileItemPopover();
  };
  profilePopoverKeyHandler=event=>{
    if(event.key==="Escape")closeProfileItemPopover();
  };
  setTimeout(()=>{
    if(profileItemPopover){
      document.addEventListener("pointerdown",profilePopoverOutsideHandler,true);
      document.addEventListener("keydown",profilePopoverKeyHandler,true);
    }
  },0);
}

function profileUpgradeMaterialsHtml(item){
  const recipe=itemUpgradeRecipe(item);
  if(!recipe.length)return "";

  return `<div class="profile-upgrade-materials">
    <strong>${t("profile.itemPopup.materials")}</strong>
    ${recipe.map(material=>{
      const have=upgradeMaterialCount(material.id);
      const enough=have>=material.qty;
      return `<div class="profile-upgrade-material-row ${enough?"enough":"missing"}">
        <span>${t(`items.${material.id}`)}</span>
        <b>${have} / ${material.qty}</b>
      </div>`;
    }).join("")}
  </div>`;
}

function profileUpgradeChanceHtml(item){
  const base=baseItemUpgradeChance(item);
  const pity=itemUpgradePity(item);
  const total=itemUpgradeChance(item);

  return `<div class="profile-upgrade-chance">
    <div><span>${t("profile.itemPopup.baseChance")}</span><b>${base}%</b></div>
    <div><span>${t("profile.itemPopup.pityBonus")}</span><b class="${pity>0?"positive":""}">+${pity}%</b></div>
    <div class="total"><span>${t("profile.itemPopup.totalChance")}</span><b>${total}%</b></div>
  </div>`;
}

function profileNextUpgradeSummary(item){
  const next=nextItemProgression(item);
  if(!next)return "";

  const nextRarity=ITEM_RARITIES[next.rarity];
  const currentRarity=itemRarity(item);

  return `<div class="profile-next-upgrade">
    <div class="profile-next-upgrade-head">
      <div>
        <small>${t("profile.itemPopup.nextUpgrade")}</small>
        <strong>
          <span class="item-rarity item-rarity--${currentRarity.id}">${t(currentRarity.labelKey)} +${itemUpgradeLevel(item)}</span>
          <i>→</i>
          <span class="item-rarity item-rarity--${nextRarity.id}">${t(nextRarity.labelKey)} +${next.upgradeLevel}</span>
        </strong>
      </div>
      <b>${itemUpgradeChance(item)}%</b>
    </div>
    <div class="profile-item-comparison">${profileItemStatRows(item,next)}</div>
  </div>`;
}

function openProfileUpgradePreview(item,popover,message=""){
  const body=popover.querySelector("[data-profile-popup-body]");
  if(!body)return;

  const next=nextItemProgression(item);
  if(!next){
    body.innerHTML=`<div class="profile-upgrade-preview">
      <strong>${t("profile.itemPopup.maxed")}</strong>
      <p>${t("profile.itemPopup.maxedHint")}</p>
      <button class="profile-popup-action ghost" data-profile-upgrade-back type="button">${t("common.back")}</button>
    </div>`;
    body.querySelector("[data-profile-upgrade-back]").onclick=()=>{
      renderProfileItemPopoverBody(item,popover,popover.dataset.mode,popover.dataset.slot);
    };
    return;
  }

  const rarity=ITEM_RARITIES[next.rarity];
  const currentRarity=itemRarity(item);
  const hasMaterials=hasItemUpgradeMaterials(item);
  const isPromotion=next.rarityChanged;

  body.innerHTML=`<div class="profile-upgrade-preview">
    <div class="profile-upgrade-arrow">
      <span class="item-rarity item-rarity--${currentRarity.id}">${t(currentRarity.labelKey)} +${itemUpgradeLevel(item)}</span>
      <b>→</b>
      <span class="item-rarity item-rarity--${rarity.id}">${t(rarity.labelKey)} +${next.upgradeLevel}</span>
    </div>

    ${message?`<div class="profile-upgrade-result ${message==="success"?"success":"failure"}">${message==="success"?t("profile.itemPopup.upgradeSuccess"):t("profile.itemPopup.upgradeFailed")}</div>`:""}

    <div class="profile-upgrade-stats">${profileItemStatRows(item,next)}</div>
    ${profileUpgradeMaterialsHtml(item)}
    ${profileUpgradeChanceHtml(item)}

    <div class="profile-upgrade-rule">${isPromotion?t("profile.itemPopup.rarityPromotionHint"):t("profile.itemPopup.upgradeRuleHint")}</div>

    <button class="profile-popup-action primary" data-profile-upgrade-confirm type="button" ${hasMaterials?"":"disabled"}>${isPromotion?t("profile.itemPopup.promoteRarity"):t("profile.itemPopup.confirmUpgrade")}</button>
    <button class="profile-popup-action ghost" data-profile-upgrade-back type="button">${t("common.back")}</button>
  </div>`;

  body.querySelector("[data-profile-upgrade-back]").onclick=()=>{
    renderProfileItemPopoverBody(item,popover,popover.dataset.mode,popover.dataset.slot);
  };

  const confirm=body.querySelector("[data-profile-upgrade-confirm]");
  if(confirm&&!confirm.disabled){
    confirm.onclick=()=>{
      const result=attemptItemUpgrade(item);
      if(!result.ok){
        openProfileUpgradePreview(item,popover,"");
        return;
      }

      renderProfileStats();
      renderProfileEquipmentSlots();
      renderProfileOwnedGear();

      const key=inventoryEntryKey(item);
      const fresh=popover.dataset.mode==="equipped"
        ? equippedItem(popover.dataset.slot)
        : inventoryItemData(inventoryEntryByKey(key));

      const freshRarity=itemRarity(fresh);
      popover.className=`profile-item-popover rarity-${freshRarity.id} profile-rpg-tooltip`;
      const outcome=result.success?"success":"failure";
      openProfileUpgradePreview(fresh,popover,outcome);

      const newAnchor=document.querySelector(
        popover.dataset.mode==="equipped"
          ? `[data-equipment-slot="${CSS.escape(popover.dataset.slot)}"]`
          : `[data-inventory-grid-item="${CSS.escape(key)}"]`
      );

      if(newAnchor)positionProfileItemPopover(newAnchor,popover);
    };
  }
}

function renderProfileItemPopoverBody(item,popover,mode,slot){
  const body=popover.querySelector("[data-profile-popup-body]");
  if(!body)return;

  const rarity=itemRarity(item);
  const level=itemUpgradeLevel(item);
  const next=nextItemProgression(item);
  const effectiveStats=Object.keys(itemEffectiveStats(item)).length;
  const status=profileItemStatusData(item,mode,slot);
  const occupiedByOther=mode==="inventory"&&equippedItem(slot)&&equippedItemKey(slot)!==inventoryEntryKey(item);

  popover.className=`profile-item-popover rarity-${rarity.id} profile-rpg-tooltip profile-item-status-${status.id}`;

  body.innerHTML=`<div class="profile-item-popover-main">
    <div class="profile-item-popover-item">
      <div class="profile-item-popover-icon">${equipmentItemDisplayIcon(item)}</div>
      <div class="profile-item-tooltip-title">
        <span class="profile-item-popover-slot">${t(equipmentSlotUi(slot).labelKey)}</span>
        <h3>${t(`items.${item.id}`)}</h3>
        <div class="profile-item-title-meta">
          <span class="item-rarity item-rarity--${rarity.id}">${t(rarity.labelKey)} +${level}</span>
          <span class="profile-item-status-badge ${status.id}">${status.label}</span>
        </div>
      </div>
    </div>

    ${mode==="inventory"?profileEquippedComparison(item):""}

    <div class="profile-item-popover-meta profile-item-popover-meta-3">
      <div><span>${t("inventory.weight")}</span><b>${inventoryItemWeight(item).toFixed(2)} ${t("units.kg")}</b></div>
      <div><span>${t("profile.itemPopup.level")}</span><b>+${level} / +${rarity.maxUpgrade}</b></div>
      ${profileItemCombatPowerHtml(item)}
    </div>

    <p class="profile-item-popover-description">${t(`itemDescriptions.${item.id}`)}</p>

    <div class="profile-item-popover-section item-reforge-panel">
      <div class="item-reforge-head">
        <strong>${t("profile.itemPopup.currentStats")}</strong>
        <small>${itemReforgeCost(item)===0?t("profile.itemPopup.reforgeFirstFree"):t("profile.itemPopup.reforgeChance")}</small>
      </div>
      <div class="profile-item-popover-stats">${effectiveStats?profileItemStatRows(item):`<div class="profile-item-popover-empty">${t("profile.itemPopup.noStats")}</div>`}</div>
      <p class="item-reforge-hint">${t("profile.itemPopup.reforgeHint")}</p>
    </div>

    ${next?profileNextUpgradeSummary(item):`<div class="profile-item-max-note">${t("profile.itemPopup.maxedHint")}</div>`}

    <div class="profile-item-popover-actions profile-item-actions-final">
      <button class="profile-popup-action primary" data-profile-popup-upgrade type="button" ${canUpgradeItem(item)?"":"disabled"}>${t("profile.itemPopup.upgrade")}</button>
      <button class="profile-popup-action secondary" data-profile-popup-main-action type="button">${
        mode==="equipped"
          ? t("profile.unequip")
          : (occupiedByOther?t("profile.itemPopup.replace"):t("profile.itemPopup.equip"))
      }</button>
      <button class="profile-popup-action tertiary" data-profile-popup-close-action type="button">${t("profile.itemPopup.close")}</button>
    </div>
  </div>`;

  body.querySelectorAll("[data-profile-reforge]").forEach(button=>{
    button.onclick=()=>{
      const index=Number(button.dataset.profileReforge);
      const result=reforgeItemAttribute(item,index);
      if(!result.ok){
        if(result.reason==="money")toast(t("profile.itemPopup.reforgeNotEnoughMoney"));
        return;
      }
      const oldLabel=profileStatLabel(result.oldKey);
      const newLabel=profileStatLabel(result.newKey);
      toast(result.changed
        ?t("profile.itemPopup.reforgeChanged",{old:oldLabel,new:newLabel})
        :t("profile.itemPopup.reforgeSame",{stat:oldLabel}));
      if(typeof syncHud==="function")syncHud();
      renderProfileItemPopoverBody(item,popover,mode,slot);
      normalizeAvatarState();
      renderProfileEquipmentSlots();
      renderProfileStats();
      renderProfileEquipmentSummary();
      renderProfileCharacter();
      renderProfileOwnedGear();
      const anchor=document.querySelector(
        mode==="equipped"
          ? `[data-equipment-slot="${CSS.escape(slot)}"]`
          : `[data-inventory-grid-item="${CSS.escape(inventoryEntryKey(item))}"]`
      );
      if(anchor)positionProfileItemPopover(anchor,popover);
    };
  });

  const upgrade=body.querySelector("[data-profile-popup-upgrade]");
  if(upgrade&&!upgrade.disabled){
    upgrade.onclick=()=>openProfileUpgradePreview(item,popover);
  }

  body.querySelector("[data-profile-popup-main-action]").onclick=()=>{
    const success=mode==="equipped"
      ? unequipItem(slot)
      : equipItem(inventoryEntryKey(item));

    if(!success)return;

    closeProfileItemPopover();
    refreshProfileEquipment();
  };

  body.querySelector("[data-profile-popup-close-action]").onclick=closeProfileItemPopover;
}

function openProfileItemPopover(anchor,item,{mode,slot}){
  closeProfileItemPopover();

  const host=document.getElementById("profileItemPopoverHost");
  if(!host||!anchor||!item)return;

  const popover=document.createElement("div");
  popover.className="profile-item-popover";
  popover.dataset.mode=mode;
  popover.dataset.slot=slot;
  popover.innerHTML=`<button class="profile-item-popover-close" type="button" aria-label="${t("profile.itemPopup.close")}">×</button>
    <div data-profile-popup-body></div>`;

  host.appendChild(popover);
  profileItemPopover=popover;

  renderProfileItemPopoverBody(item,popover,mode,slot);
  positionProfileItemPopover(anchor,popover);

  popover.querySelector(".profile-item-popover-close").onclick=closeProfileItemPopover;

  profilePopoverOutsideHandler=event=>{
    if(!profileItemPopover)return;
    if(profileItemPopover.contains(event.target)||anchor.contains(event.target))return;
    closeProfileItemPopover();
  };

  profilePopoverKeyHandler=event=>{
    if(event.key==="Escape")closeProfileItemPopover();
  };

  setTimeout(()=>{
    if(profileItemPopover){
      document.addEventListener("pointerdown",profilePopoverOutsideHandler,true);
      document.addEventListener("keydown",profilePopoverKeyHandler,true);
    }
  },0);
}

function profileBagItems(){
  return state.inventory
    .filter(stored=>stored.qty>0)
    .map(inventoryItemData)
    .filter(item=>{
      if(profileBagTab==="resources")return item.type==="resource";
      return item.type==="equipment";
    });
}



function profileItemIsEquipped(item){
  if(!isEquipableItem(item))return false;
  return equippedItemKey(item.slot)===inventoryEntryKey(item);
}

function profileItemComparisonRelation(item){
  if(!isEquipableItem(item))return "none";

  const current=equippedItem(item.slot);
  if(!current||inventoryEntryKey(current)===inventoryEntryKey(item))return "none";

  const currentQuality=itemQualityScore(current);
  const candidateQuality=itemQualityScore(item);

  if(candidateQuality>currentQuality)return "better";
  if(candidateQuality<currentQuality)return "worse";

  const currentPower=getItemCombatPowerContribution(current);
  const candidatePower=getItemCombatPowerContribution(item);
  if(candidatePower>currentPower)return "better";
  if(candidatePower<currentPower)return "worse";
  return "equal";
}


function profileBagItemClass(item){
  if(!isEquipableItem(item))return "";
  if(profileItemIsEquipped(item))return "profile-item-equipped";

  const relation=profileItemComparisonRelation(item);
  if(relation==="better")return "profile-item-upgrade-candidate";
  if(relation==="worse")return "profile-item-downgrade-candidate";
  return "";
}

function profileBagItemBadges(item){
  if(!isEquipableItem(item))return "";

  if(profileItemIsEquipped(item)){
    return `<span class="profile-bag-status equipped" title="${t("profile.itemStatus.equipped")}">${t("profile.itemStatus.equippedShort")}</span>`;
  }

  const relation=profileItemComparisonRelation(item);
  if(relation==="better"){
    return `<span class="profile-bag-status better" title="${t("profile.itemStatus.better")}">↑</span>`;
  }
  if(relation==="worse"){
    return `<span class="profile-bag-status worse" title="${t("profile.itemStatus.worse")}">↓</span>`;
  }

  return "";
}

function profileItemStatusData(item,mode,slot){
  if(mode==="equipped"){
    return {id:"equipped",label:t("profile.itemStatus.equipped")};
  }

  const current=equippedItem(slot);
  if(!current){
    return {id:"empty",label:t("profile.itemStatus.freeSlot")};
  }

  if(inventoryEntryKey(current)===inventoryEntryKey(item)){
    return {id:"equipped",label:t("profile.itemStatus.equipped")};
  }

  const relation=profileItemComparisonRelation(item);
  if(relation==="better")return {id:"better",label:t("profile.itemStatus.betterShort")};
  if(relation==="worse")return {id:"worse",label:t("profile.itemStatus.worseShort")};
  return {id:"equal",label:t("profile.itemStatus.equal")};
}

function profileItemCombatPowerHtml(item){
  const power=getItemCombatPowerContribution(item);

  return `<div class="profile-item-power-meta">
    <span>${t("profile.summary.combatPower")}</span>
    <b>⚡ +${power}</b>
  </div>`;
}

function profileEquippedComparison(item){
  if(!isEquipableItem(item))return "";

  const current=equippedItem(item.slot);
  if(!current||inventoryEntryKey(current)===inventoryEntryKey(item)){
    return `<section class="profile-equipped-compare empty">
      <div class="profile-equipped-compare-title">
        <span>${t("profile.itemCompare.title")}</span>
        <b>${current?t("profile.itemCompare.sameItem"):t("profile.itemCompare.emptySlot")}</b>
      </div>
    </section>`;
  }

  const candidateStats=itemEffectiveStats(item);
  const equippedStats=itemEffectiveStats(current);
  const currentRarity=itemRarity(current);
  const candidateRarity=itemRarity(item);
  const keys=[...new Set([...Object.keys(equippedStats),...Object.keys(candidateStats)])];

  return `<section class="profile-equipped-compare">
    <div class="profile-equipped-compare-title">
      <span>${t("profile.itemCompare.title")}</span>
      <b>${t("profile.itemCompare.currentlyEquipped")}</b>
    </div>

    <div class="profile-equipped-compare-items">
      <div class="profile-equipped-item rarity-${currentRarity.id}">
        <span class="profile-equipped-item-icon">${equipmentItemDisplayIcon(current)}</span>
        <div>
          <small>${t("profile.itemCompare.now")}</small>
          <strong>${t(`items.${current.id}`)}</strong>
          ${profileItemProgression(current)}
        </div>
      </div>

      <span class="profile-equipped-compare-arrow">→</span>

      <div class="profile-equipped-item candidate rarity-${candidateRarity.id}">
        <span class="profile-equipped-item-icon">${equipmentItemDisplayIcon(item)}</span>
        <div>
          <small>${t("profile.itemCompare.new")}</small>
          <strong>${t(`items.${item.id}`)}</strong>
          ${profileItemProgression(item)}
        </div>
      </div>
    </div>

    ${(()=>{
      const currentPower=getCombatPower();
      const candidatePower=getCombatPowerWithCandidate(item);
      const delta=candidatePower-currentPower;
      const deltaClass=delta>0?"positive":delta<0?"negative":"neutral";
      const deltaText=delta>0?`+${delta}`:delta<0?`${delta}`:t("profile.itemPopup.noChange");

      return `<div class="profile-combat-power-compare">
        <span>${t("profile.summary.combatPower")}</span>
        <b>${currentPower}</b>
        <i>→</i>
        <b>${candidatePower}</b>
        <em class="${deltaClass}">${deltaText}</em>
      </div>`;
    })()}

    <div class="profile-equipped-stat-list">
      ${keys.map(key=>{
        const oldValue=Number(equippedStats[key]||0);
        const newValue=Number(candidateStats[key]||0);
        const delta=Math.round((newValue-oldValue)*10)/10;
        const suffix=["radiationResistance","critChance","accuracy","evasion"].includes(key)?"%":"";
        const deltaClass=delta>0?"positive":delta<0?"negative":"neutral";
        const deltaText=delta>0?`+${delta}${suffix}`:delta<0?`${delta}${suffix}`:t("profile.itemPopup.noChange");

        return `<div class="profile-equipped-stat-row">
          <span>${profileStatLabel(key)}</span>
          <b>${oldValue}${suffix}</b>
          <i>→</i>
          <b>${newValue}${suffix}</b>
          <em class="${deltaClass}">${deltaText}</em>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function renderProfileOwnedGear(){
  const grid=document.getElementById("profileOwnedGear");
  if(!grid)return;

  document.querySelectorAll("[data-profile-bag-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.profileBagTab===profileBagTab);
  });

  const items=profileBagItems();
  const pageSize=9;
  const totalPages=Math.max(1,Math.ceil(items.length/pageSize));
  profileBagPage=clamp(profileBagPage,1,totalPages);
  const visibleItems=items.slice((profileBagPage-1)*pageSize,profileBagPage*pageSize);

  const count=document.getElementById("profileBagCount");
  if(count)count.textContent=`${items.length}`;

  renderInventoryGrid(grid,visibleItems,{
    showWeight:false,
    emptyTitleKey:profileBagTab==="resources"?"profile.noResources":"profile.noItems",
    emptyHintKey:profileBagTab==="resources"?"profile.noResources":"profile.noItems",
    extraClass:profileBagItemClass,
    extraBadges:profileBagItemBadges,
    onSelect:(itemId,event,button)=>{
      event.stopPropagation();
      const stored=inventoryEntryByKey(itemId);
      if(!stored)return;
      const item=inventoryItemData(stored);
      if(isEquipableItem(item)){
        openProfileItemPopover(button,item,{mode:"inventory",slot:item.slot});
      }
    }
  });

  const pager=document.getElementById("profileBagPager");
  if(!pager)return;

  if(items.length<=pageSize){
    pager.hidden=true;
    pager.replaceChildren();
    return;
  }

  pager.hidden=false;
  pager.innerHTML=`
    <button data-profile-bag-prev type="button" ${profileBagPage===1?"disabled":""} aria-label="${t("profile.bagPrevious")}">‹</button>
    <span>${profileBagPage} / ${totalPages}</span>
    <button data-profile-bag-next type="button" ${profileBagPage===totalPages?"disabled":""} aria-label="${t("profile.bagNext")}">›</button>
  `;

  pager.querySelector("[data-profile-bag-prev]").onclick=()=>{
    profileBagPage--;
    renderProfileOwnedGear();
  };
  pager.querySelector("[data-profile-bag-next]").onclick=()=>{
    profileBagPage++;
    renderProfileOwnedGear();
  };
}

function renderProfileStatistics(){
  const grid=document.getElementById("profileStatisticsGrid");
  if(!grid)return;
  normalizeAvatarState();
  const equippedCount=EQUIPMENT_SLOTS.filter(slot=>equippedItem(slot)).length;
  const rows=[
    ["profile.statisticsData.locations",state.openedLocations?.length||0],
    ["profile.statisticsData.items",state.discoveredItems?.length||0],
    ["profile.statisticsData.avatars",state.unlockedAvatars?.length||1],
    ["profile.statisticsData.equipped",`${equippedCount} / ${EQUIPMENT_SLOTS.length}`],
    ["profile.statisticsData.money",`₴ ${state.money}`],
    ["profile.statisticsData.day",state.day||1],
    ["profile.statisticsData.inventoryWeight",`${inventoryWeight().toFixed(1)} ${t("units.kg")}`],
    ["profile.statisticsData.level",state.level||1]
  ];
  grid.innerHTML=rows.map(([key,value])=>`<article><span>${t(key)}</span><b>${value}</b></article>`).join("");
}

function renderProfileAchievements(){
  const grid=document.getElementById("profileAchievementsGrid");
  if(!grid)return;
  grid.innerHTML=PROFILE_ACHIEVEMENTS.map(achievement=>{
    const current=Math.min(achievement.target,Math.max(0,achievement.value()));
    const done=current>=achievement.target;
    const percent=Math.round(current/achievement.target*100);
    return `<article class="profile-achievement ${done?"complete":""}">
      <div class="profile-achievement-mark">${done?"✓":"•"}</div>
      <div><h3>${t(achievement.titleKey)}</h3><p>${t(achievement.descriptionKey)}</p>
        <div class="profile-achievement-progress"><span style="width:${percent}%"></span></div>
        <small>${current} / ${achievement.target}</small>
      </div>
    </article>`;
  }).join("");
}

function avatarBonusHtml(avatar){
  const entries=avatarBonusEntries(avatar);
  if(!entries.length)return `<span class="profile-avatar-bonus">${t("profile.avatarNoBonus")}</span>`;
  return `<span class="profile-avatar-bonus">${t("profile.avatarBonus")}: ${entries.map(([key,value])=>`+${value} ${profileStatLabel(key)}`).join(" · ")}</span>`;
}

function renderProfileAvatars(){
  const grid=document.getElementById("profileAvatarGrid");
  const counter=document.getElementById("profileAvatarUnlocked");
  if(!grid)return;
  normalizeAvatarState();
  if(counter)counter.textContent=`${state.unlockedAvatars.length} / ${AVATAR_PRESETS.length}`;
  grid.innerHTML=AVATAR_PRESETS.map(avatar=>{
    const status=avatarUnlockStatus(avatar);
    const unlocked=status.unlocked;
    const active=state.activeAvatar===avatar.id;
    const progress=status.progress;
    const rarity=ITEM_RARITIES[avatar.rarity]||ITEM_RARITIES.common;
    const lockedText=!status.previousUnlocked&&status.previous
      ? t("profile.avatarRequiresPrevious",{name:t(status.previous.nameKey)})
      : `${t("profile.avatarProgress")} ${progress.collected}/${progress.total}`;
    return `<button class="profile-avatar-card ${unlocked?"unlocked":"locked"} ${active?"active":""}" data-avatar-id="${avatar.id}" type="button" ${unlocked?"":"disabled"}>
      <span class="profile-avatar-thumb"><img src="${avatar.image}" alt="">${unlocked?"":`<span class="profile-avatar-lock">🔒</span>`}</span>
      <span class="item-rarity item-rarity--${rarity.id}">${t(rarity.labelKey)}</span>
      <strong>${t(avatar.nameKey)}</strong>
      <span>${unlocked?t(avatar.descriptionKey):lockedText}</span>
      ${avatarBonusHtml(avatar)}
      ${active?`<em>${t("profile.avatarSelected")}</em>`:""}
    </button>`;
  }).join("");
  grid.querySelectorAll("[data-avatar-id]:not([disabled])").forEach(button=>{
    button.onclick=()=>{if(selectAvatar(button.dataset.avatarId)){renderProfileCharacter();renderProfileStats();renderProfileAvatars();}};
  });
}

function profileHighestEquippedRarity(items){
  if(!items.length)return null;
  return items
    .map(item=>itemRarity(item))
    .sort((a,b)=>b.order-a.order)[0]||null;
}

function renderProfileEquipmentSummary(){
  const container=document.getElementById("profileEquipmentSummary");
  if(!container)return;

  const items=EQUIPMENT_SLOTS.map(equippedItem).filter(Boolean);
  const equippedCount=items.length;
  const averageLevel=equippedCount
    ? Math.round(items.reduce((sum,item)=>sum+itemUpgradeLevel(item),0)/equippedCount*10)/10
    : 0;
  const highest=profileHighestEquippedRarity(items);
  const combatPower=getCombatPower();

  container.innerHTML=`
    <div>
      <span>${t("profile.summary.equipped")}</span>
      <b>${equippedCount} / ${EQUIPMENT_SLOTS.length}</b>
    </div>
    <div>
      <span>${t("profile.summary.averageLevel")}</span>
      <b>+${averageLevel}</b>
    </div>
    <div>
      <span>${t("profile.summary.highestRarity")}</span>
      <b class="${highest?`item-rarity item-rarity--${highest.id}`:""}">${highest?t(highest.labelKey):t("profile.summary.none")}</b>
    </div>
    <div>
      <span>${t("profile.summary.equipmentWeight")}</span>
      <b>${equipmentWeight().toFixed(1)} ${t("units.kg")}</b>
    </div>
    <div class="profile-summary-power" tabindex="0">
      <span>${t("profile.summary.combatPower")}</span>
      <b>⚡ ${combatPower}</b>
      <small>${t("profile.summary.combatPowerHint")}</small>
    </div>
  `;
}

function refreshProfileEquipment(){
  normalizeAvatarState();
  renderProfileEquipmentSlots();
  renderProfileStats();
  renderProfileEquipmentSummary();
  closeProfileItemPopover();
  renderProfileCharacter();
  renderProfileOwnedGear();
}

function renderProfileTab(){
  closeProfileItemPopover();
  document.querySelectorAll("[data-profile-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.profileTab===profileActiveTab);
  });
  document.querySelectorAll("[data-profile-panel]").forEach(panel=>{
    panel.hidden=panel.dataset.profilePanel!==profileActiveTab;
  });
  if(profileActiveTab==="profile")refreshProfileEquipment();
  if(profileActiveTab==="statistics")renderProfileStatistics();
  if(profileActiveTab==="achievements")renderProfileAchievements();
  if(profileActiveTab==="avatars")renderProfileAvatars();
}

function renderProfile(){
  cloneTemplate("profileTpl");
  setActiveNav("profile");
  normalizeEquipmentState();
  normalizeAvatarState();
  document.getElementById("profileNickname").textContent=state.nickname||t("common.defaultNickname");
  document.getElementById("profileLevel").textContent=state.level||1;
  const topPower=document.getElementById("profileTopPower");
  if(topPower)topPower.textContent=getCombatPower();
  document.querySelectorAll("[data-profile-tab]").forEach(button=>{button.onclick=()=>{profileActiveTab=button.dataset.profileTab;renderProfileTab();};});
  document.querySelectorAll("[data-profile-bag-tab]").forEach(button=>{
    button.onclick=()=>{
      profileBagTab=button.dataset.profileBagTab;
      profileBagPage=1;
      renderProfileOwnedGear();
    };
  });
  renderProfileTab();
}

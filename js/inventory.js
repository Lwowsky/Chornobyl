function addItem(id, qty) {
  const amount=Math.max(0,Math.floor(Number(qty)||0));
  const catalog=inventoryCatalogItem(id);
  if(!catalog||amount<=0)return;

  if(catalog.type==="equipment"){
    for(let index=0;index<amount;index+=1){
      const instance={id,qty:1,instanceId:makeItemInstanceId(id)};
      state.inventory.push(instance);
      if(typeof ensureItemAttributes==="function")ensureItemAttributes(inventoryItemData(instance));
    }
  }else{
    const item=inventoryItem(id);
    if(item)item.qty+=amount;
    else state.inventory.push({id,qty:amount});
  }

  if(typeof markItemDiscovered==="function")markItemDiscovered(id);
}



function normalizeItemLocks(){
  if(!state.itemLocks||typeof state.itemLocks!=="object")state.itemLocks={};
  return state.itemLocks;
}

function canLockInventoryItem(item){
  return !!item && !isQuestInventoryItem(item) && ["equipment","artifact"].includes(item.type);
}

function itemLockKey(itemOrKey){
  if(typeof itemOrKey==="string")return itemOrKey;
  return itemOrKey?inventoryEntryKey(itemOrKey):"";
}

function isItemLocked(itemOrKey){
  const key=itemLockKey(itemOrKey);
  return !!(key&&normalizeItemLocks()[key]);
}

function setItemLocked(itemOrKey,locked){
  const key=itemLockKey(itemOrKey);
  if(!key)return false;
  const locks=normalizeItemLocks();
  if(locked)locks[key]=true; else delete locks[key];
  saveState();
  return true;
}

function toggleItemLocked(itemOrKey){
  return setItemLocked(itemOrKey,!isItemLocked(itemOrKey));
}

let inventoryUiCategory = "food";
let inventoryUiSelectedId = "";
let inventoryUiSearch = "";
let inventoryUiSort = "default";

function inventoryCategoryItems(category) {
  const search = inventoryUiSearch.trim().toLowerCase();

  let items = state.inventory
    .map(inventoryItemData)
    .filter(item => item.qty > 0)
    .filter(item => item.category === category);

  if (search) {
    items = items.filter(item => {
      const name = t(`items.${item.id}`).toLowerCase();
      const description = t(`itemDescriptions.${item.id}`).toLowerCase();
      return name.includes(search) || description.includes(search);
    });
  }

  if (inventoryUiSort === "name") {
    items.sort((a,b) => t(`items.${a.id}`).localeCompare(t(`items.${b.id}`), languageLocale()));
  } else if (inventoryUiSort === "weight") {
    items.sort((a,b) => inventoryItemWeight(b) - inventoryItemWeight(a));
  } else if (inventoryUiSort === "qty") {
    items.sort((a,b) => b.qty - a.qty);
  } else if (inventoryUiSort === "rarity") {
    items.sort((a,b)=>{
      const ar=isEquipableItem(a)?itemRarity(a).order:-1;
      const br=isEquipableItem(b)?itemRarity(b).order:-1;
      return br-ar || t(`items.${a.id}`).localeCompare(t(`items.${b.id}`),languageLocale());
    });
  }

  return items;
}

function inventoryCategoryCount(category) {
  return state.inventory
    .map(inventoryItemData)
    .filter(item => item.qty > 0 && item.category === category)
    .reduce((sum,item) => sum + item.qty, 0);
}

function inventoryGridItemArt(item) {
  if (typeof isEquipableItem === "function" && isEquipableItem(item) && typeof equipmentItemDisplayIcon === "function") {
    return equipmentItemDisplayIcon(item);
  }
  if (item.profileIcon) return `<img src="${item.profileIcon}" alt="">`;
  return item.icon || "□";
}

function isQuestInventoryItem(item) {
  return !!item && (item.type==="quest" || item.category==="quest");
}

function inventoryGridItemClass(item) {
  if (typeof isEquipableItem === "function" && isEquipableItem(item) && typeof itemRarity === "function") {
    return `rarity-${itemRarity(item).id}`;
  }
  if(item?.upgradeMaterialRarity) return `rarity-${item.upgradeMaterialRarity}`;
  if(isQuestInventoryItem(item)) return "quest-protected";
  return "";
}

function inventoryGridLevelBadge(item) {
  if (typeof isEquipableItem !== "function" || !isEquipableItem(item) || typeof itemUpgradeLevel !== "function") return "";
  return `<span class="inventory-slot-level">+${itemUpgradeLevel(item)}</span>`;
}

function renderInventoryGrid(container, items, options={}) {
  if(!container)return;

  const {
    selectedId="",
    onSelect=null,
    showWeight=true,
    emptyTitleKey="inventory.emptyCategory",
    emptyHintKey="inventory.emptyCategoryHint",
    extraBadges=null,
    extraClass=null
  }=options;

  if(!items.length){
    container.innerHTML=`<div class="inventory-empty-grid">
      <div>∅</div>
      <strong>${t(emptyTitleKey)}</strong>
      <span>${t(emptyHintKey)}</span>
    </div>`;
    return;
  }

  container.innerHTML=items.map(item=>{
    const customClass=typeof extraClass==="function" ? extraClass(item) : "";
    const customBadges=typeof extraBadges==="function" ? extraBadges(item) : "";
    return `<button class="inventory-slot ${inventoryGridItemClass(item)} ${customClass} ${selectedId===inventoryEntryKey(item)?"selected":""}" data-inventory-grid-item="${inventoryEntryKey(item)}" type="button">
      <span class="inventory-slot-art">${inventoryGridItemArt(item)}</span>
      <span class="inventory-slot-name">${t(`items.${item.id}`)}</span>
      <span class="inventory-slot-qty">×${item.qty}</span>
      ${inventoryGridLevelBadge(item)}
      ${isItemLocked(item)?`<span class="inventory-slot-lock" title="${t("inventory.locked")}">🔒</span>`:""}
      ${customBadges}
      ${showWeight?`<span class="inventory-slot-weight">${(inventoryItemWeight(item)*item.qty).toFixed(2)} ${t("units.kg")}</span>`:""}
    </button>`;
  }).join("");

  if(typeof onSelect==="function"){
    container.querySelectorAll("[data-inventory-grid-item]").forEach(button=>{
      button.onclick=event=>onSelect(button.dataset.inventoryGridItem,event,button);
    });
  }
}

function renderInventory() {
  cloneTemplate("inventoryTpl");
  setActiveNav("inventory");

  const categories=document.getElementById("inventoryCategories");
  const search=document.getElementById("inventorySearch");
  const sort=document.getElementById("inventorySort");

  search.placeholder=t("inventory.searchPlaceholder");
  search.value=inventoryUiSearch;
  const sortLabel=sort?.querySelector("span:last-child");
  if(sortLabel)sortLabel.textContent=t(`inventory.sortModes.${inventoryUiSort}`);

  categories.innerHTML=GAME_DATA.inventoryCategories.map(category=>`
    <button class="inventory-category ${inventoryUiCategory===category.id?"active":""}" data-category="${category.id}" type="button">
      <span class="inventory-category-icon"><img src="${category.icon}" alt=""></span>
      <span class="inventory-category-copy">
        <b>${t(`inventory.categories.${category.id}`)}</b>
        <small>${inventoryCategoryCount(category.id)}</small>
      </span>
    </button>
  `).join("");

  categories.querySelectorAll("[data-category]").forEach(button=>{
    button.onclick=()=>{
      inventoryUiCategory=button.dataset.category;
      inventoryUiSelectedId="";
      refreshInventoryView();
    };
  });

  search.oninput=()=>{
    inventoryUiSearch=search.value;
    inventoryUiSelectedId="";
    refreshInventoryView(false);
  };

  sort.onclick=()=>{
    const order=["default","rarity","name","weight","qty"];
    const index=order.indexOf(inventoryUiSort);
    inventoryUiSort=order[(index+1)%order.length];
    toast(t(`inventory.sortModes.${inventoryUiSort}`));
    const label=sort.querySelector("span:last-child");
    if(label)label.textContent=t(`inventory.sortModes.${inventoryUiSort}`);
    refreshInventoryView(false);
  };

  refreshInventoryView();
}

function refreshInventoryView(rebuildCategories=true) {
  const category=GAME_DATA.inventoryCategories.find(x=>x.id===inventoryUiCategory)||GAME_DATA.inventoryCategories[0];
  const items=inventoryCategoryItems(category.id);
  const grid=document.getElementById("inventoryGrid");
  const details=document.getElementById("inventoryDetails");

  if(!grid||!details)return;

  document.getElementById("inventoryCategoryIcon").innerHTML=`<img src="${category.icon}" alt="">`;
  document.getElementById("inventoryCategoryTitle").textContent=t(`inventory.categories.${category.id}`);
  document.getElementById("inventoryVisibleCount").textContent=items.length;

  const weight=carriedWeight();
  const playerStats=getPlayerStats();
  document.getElementById("inventoryWeight").textContent=weight.toFixed(1);
  document.getElementById("inventoryMaxWeight").textContent=playerStats.maxWeight;
  document.getElementById("inventoryMoney").textContent=state.money;
  document.getElementById("inventoryWeightBar").style.width=Math.min(100,weight/playerStats.maxWeight*100)+"%";

  if(rebuildCategories){
    document.querySelectorAll(".inventory-category").forEach(button=>{
      const id=button.dataset.category;
      button.classList.toggle("active",id===category.id);
      const counter=button.querySelector("small");
      if(counter)counter.textContent=inventoryCategoryCount(id);
    });
  }

  if(!items.length){
    renderInventoryGrid(grid,[],{
      emptyTitleKey:"inventory.emptyCategory",
      emptyHintKey:"inventory.emptyCategoryHint"
    });
    inventoryUiSelectedId="";
    renderInventoryDetails(null);
    return;
  }

  if(!inventoryUiSelectedId||!items.some(item=>inventoryEntryKey(item)===inventoryUiSelectedId)){
    inventoryUiSelectedId=inventoryEntryKey(items[0]);
  }

  renderInventoryGrid(grid,items,{
    selectedId:inventoryUiSelectedId,
    showWeight:true,
    onSelect:(itemId,event,button)=>{
      inventoryUiSelectedId=itemId;
      grid.querySelectorAll(".inventory-slot").forEach(slot=>slot.classList.toggle("selected",slot===button));
      renderInventoryDetails(inventoryItemData(inventoryEntryByKey(itemId)));
    }
  });

  renderInventoryDetails(inventoryItemData(inventoryEntryByKey(inventoryUiSelectedId)));
}

function itemAction(item) {
  return item?.action || null;
}

function itemActionLimit(action) {
  if (!action?.stat) return 0;
  return getPlayerStatLimit(action.stat);
}

function applyItemAction(item) {
  const action = itemAction(item);
  if (!action) return false;

  if (action.type === "restore") {
    const current = Number(state[action.stat] ?? 0);
    state[action.stat] = clamp(current + Number(action.amount || 0), 0, itemActionLimit(action));
    return true;
  }

  if (action.type === "reduce") {
    const current = Number(state[action.stat] ?? 0);
    state[action.stat] = clamp(current - Number(action.amount || 0), 0, itemActionLimit(action));
    return true;
  }

  return false;
}

function itemActionStatRow(item) {
  const action = itemAction(item);
  if (!action || !["restore","reduce"].includes(action.type)) return "";

  const statUi = {
    hp: {icon:"♥", key:"hud.hp"},
    energy: {icon:"ϟ", key:"hud.energy"},
    protection: {icon:"⬡", key:"hud.protection"},
    radiation: {icon:"☢", key:"hud.radiation"}
  };

  const ui = statUi[action.stat];
  if (!ui) return "";

  const sign=action.type==="reduce"?"−":"+";
  return `<div><span>${ui.icon} ${t(ui.key)}</span><b>${sign}${action.amount}</b></div>`;
}



function inventoryAttributeRows(item) {
  if(!isEquipableItem(item)||typeof itemAttributes!=="function")return "";
  const cost=typeof itemReforgeCost==="function"?itemReforgeCost(item):0;
  const rows=itemAttributes(item).map((attribute,index)=>{
    const suffix=["radiationResistance","critChance","accuracy","evasion"].includes(attribute.key)?"%":"";
    const price=cost===0?t("profile.itemPopup.reforgeFree"):`₴ ${cost}`;
    return `<div class="item-reforge-row">
      <span>${profileStatLabel(attribute.key)}</span>
      <b>+${attribute.value}${suffix}</b>
      <button class="item-reforge-button" data-inventory-reforge="${index}" type="button">↻ ${price}</button>
    </div>`;
  }).join("");
  if(!rows)return "";
  return `<section class="item-reforge-panel inventory-reforge-panel">
    <div class="item-reforge-head">
      <strong>${t("profile.itemPopup.reforgeTitle")}</strong>
      <small>${cost===0?t("profile.itemPopup.reforgeFirstFree"):t("profile.itemPopup.reforgeChance")}</small>
    </div>
    <div class="inventory-detail-stats inventory-attribute-stats">${rows}</div>
    <p>${t("profile.itemPopup.reforgeHint")}</p>
  </section>`;
}

function renderInventoryDetails(item) {
  const details = document.getElementById("inventoryDetails");
  if (!details) return;

  if (!item) {
    details.innerHTML = `
      <div class="inventory-empty-detail">
        <div class="inventory-empty-icon">🎒</div>
        <h2>${t("inventory.selectItem")}</h2>
        <p>${t("inventory.selectItemHint")}</p>
      </div>
    `;
    return;
  }

  const totalWeight = inventoryItemWeight(item) * item.qty;
  const canUse = !!itemAction(item);
  const actionStatRow = itemActionStatRow(item);

  details.innerHTML = `
    <div class="inventory-detail-art ${inventoryGridItemClass(item)}">${inventoryGridItemArt(item)}</div>
    <div class="inventory-detail-copy">
      <div class="inventory-detail-eyebrow">
        <span class="inventory-detail-category">${t(`inventory.categories.${item.category || "other"}`)}</span>
        ${isEquipableItem(item)?`<span class="inventory-detail-rarity rarity-${itemRarity(item).id}">${t(itemRarity(item).labelKey)} +${itemUpgradeLevel(item)}</span>`:""}
        ${item.upgradeMaterialRarity?`<span class="inventory-detail-rarity rarity-${item.upgradeMaterialRarity}">${t(`rarities.${item.upgradeMaterialRarity}`)}</span>`:""}
        ${isQuestInventoryItem(item)?`<span class="inventory-quest-protected">${t("inventory.questProtected")}</span>`:""}
      </div>
      <h2>${t(`items.${item.id}`)}</h2>
      <p>${t(`itemDescriptions.${item.id}`)}</p>

      ${actionStatRow ? `<div class="inventory-detail-stats">${actionStatRow}</div>` : ""}
      ${inventoryAttributeRows(item)}

      <div class="inventory-detail-meta">
        <div><span>${t("inventory.weight")}</span><b>${inventoryItemWeight(item).toFixed(2)} ${t("units.kg")}</b></div>
        <div><span>${t("inventory.quantity")}</span><b>${item.qty}</b></div>
        <div><span>${t("inventory.stackWeight")}</span><b>${totalWeight.toFixed(2)} ${t("units.kg")}</b></div>
      </div>

      <div class="inventory-detail-actions">
        ${isEquipableItem(item)?`<button id="inventoryEquipItem" class="inventory-primary" type="button">${t("inventory.equip")}</button>`:`<button id="inventoryUseItem" class="inventory-primary" type="button" ${canUse ? "" : "disabled"}>${t("common.use")}</button>`}
        ${canLockInventoryItem(item)?`<button id="inventoryLockItem" class="inventory-lock-button ${isItemLocked(item)?"locked":""}" type="button">${isItemLocked(item)?`🔒 ${t("inventory.unlockItem")}`:`🔓 ${t("inventory.lockItem")}`}</button>`:""}
        ${isQuestInventoryItem(item)
          ?`<span class="inventory-quest-lock">🔒 ${t("inventory.questLockedHint")}</span>`
          :isItemLocked(item)
            ?`<span class="inventory-quest-lock">🔒 ${t("inventory.lockedDropHint")}</span>`
            :`<button id="inventoryDropItem" class="inventory-secondary" type="button">${t("inventory.dropOne")}</button>`}
      </div>
    </div>
  `;

  details.querySelectorAll("[data-inventory-reforge]").forEach(button=>{
    button.onclick=()=>{
      const index=Number(button.dataset.inventoryReforge);
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
      refreshInventoryView(false);
    };
  });

  const equip=document.getElementById("inventoryEquipItem");
  if(equip){
    equip.onclick=()=>{
      if(equipItem(inventoryEntryKey(item))){
        inventoryUiSelectedId="";
        refreshInventoryView();
        toast(t("inventory.equipped"));
      }
    };
  }

  const use = document.getElementById("inventoryUseItem");
  if (use && canUse) {
    use.onclick = () => useItem(item.id);
  }

  const lockButton=document.getElementById("inventoryLockItem");
  if(lockButton){
    lockButton.onclick=()=>{
      toggleItemLocked(item);
      refreshInventoryView(false);
      toast(t(isItemLocked(item)?"inventory.itemLocked":"inventory.itemUnlocked"));
    };
  }

  const drop = document.getElementById("inventoryDropItem");
  if (drop) {
    drop.onclick = () => {
      if(isQuestInventoryItem(item)){
        toast(t("inventory.questLockedHint"));
        return;
      }
      const stored=inventoryEntryByKey(inventoryEntryKey(item));
      if(!stored)return;
      stored.qty-=1;
      state.inventory=state.inventory.filter(x=>x.qty>0);
      saveState();
      syncHud();
      inventoryUiSelectedId = "";
      refreshInventoryView();
      toast(t("inventory.dropped"));
    };
  }
}

function useItem(id) {
  const storedItem = inventoryItem(id);
  if (!storedItem || storedItem.qty <= 0) return;

  const item = inventoryItemData(storedItem);
  if (!applyItemAction(item)) {
    toast(t(`items.${id}`));
    return;
  }

  storedItem.qty -= 1;
  state.inventory = state.inventory.filter(entry => entry.qty > 0);
  if(typeof dailyTrackMedicalItem==="function")dailyTrackMedicalItem(id);

  saveState();
  syncHud();
  renderInventory();
}

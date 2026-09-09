(function () {
  const tf = (key, vars = {}, fallback = "") => window.GameI18n?.format?.(key, vars, fallback) || fallback;
  function normalizeQty(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
  function getQuantity(id) { return normalizeQty(window.GameState.inventory?.[id]); }
  function getStorageQuantity(id) { return normalizeQty(window.GameState.storage?.[id]); }

  function itemWeight(id) { return Number(window.GameInventoryData.getItem(id)?.weight) || 0; }
  function carriedWeight() {
    return Object.entries(window.GameState.inventory || {}).reduce((total, [id, qty]) => total + itemWeight(id) * normalizeQty(qty), 0);
  }
  function capacity() {
    const backpack = Number(window.GameInventoryData.getBackpack(window.GameState.backpackId)?.capacity) || 40;
    const bonus = Number(window.GameEquipment?.getBonuses?.().carryWeight) || 0;
    return Math.max(0, backpack + bonus);
  }
  function freeWeight() { return Math.max(0, capacity() - carriedWeight()); }

  function maxAddable(id, qty) {
    const weight = itemWeight(id);
    if (weight <= 0) return qty;
    return Math.max(0, Math.min(qty, Math.floor((freeWeight() + 1e-9) / weight)));
  }

  function addItem(id, qty = 1, options = {}) {
    const item = window.GameInventoryData.getItem(id);
    qty = normalizeQty(qty);
    if (!item || !qty) return { added: 0, stored: 0, rejected: qty };
    if (item.type === "equipment" && item.statModel === "rarityProgression") window.GameEquipmentRarity?.ensureRoll?.(item);
    const added = maxAddable(id, qty);
    if (added) window.GameState.inventory[id] = getQuantity(id) + added;
    const remainder = qty - added;
    let stored = 0;
    if (remainder && options.overflowToStorage !== false) {
      stored = remainder;
      window.GameState.storage[id] = getStorageQuantity(id) + stored;
    }
    syncWeight();
    if (!options.silent) window.GameStateStore.save();
    return { added, stored, rejected: qty - added - stored };
  }

  function removeItem(id, qty = 1, options = {}) {
    qty = normalizeQty(qty);
    const have = getQuantity(id);
    const removed = Math.min(have, qty);
    if (!removed) return 0;
    const next = have - removed;
    if (next) window.GameState.inventory[id] = next;
    else delete window.GameState.inventory[id];
    syncWeight();
    if (!options.silent) window.GameStateStore.save();
    return removed;
  }

  function addToStorage(id, qty = 1, options = {}) {
    qty = normalizeQty(qty);
    if (!window.GameInventoryData.getItem(id) || !qty) return 0;
    window.GameState.storage[id] = getStorageQuantity(id) + qty;
    if (!options.silent) window.GameStateStore.save();
    return qty;
  }

  function moveToStorage(id, qty = 1) {
    const removed = removeItem(id, qty, { silent: true });
    if (!removed) return { ok: false, moved: 0 };
    addToStorage(id, removed, { silent: true });
    syncWeight();
    window.GameStateStore.save();
    return { ok: true, moved: removed };
  }

  function moveFromStorage(id, qty = 1) {
    qty = Math.min(normalizeQty(qty), getStorageQuantity(id));
    if (!qty) return { ok: false, moved: 0 };
    const result = addItem(id, qty, { overflowToStorage: false, silent: true });
    if (result.added) {
      const left = getStorageQuantity(id) - result.added;
      if (left) window.GameState.storage[id] = left;
      else delete window.GameState.storage[id];
    }
    syncWeight();
    window.GameStateStore.save();
    return { ok: result.added > 0, moved: result.added };
  }

  function syncWeight() {
    const p = window.GameState.player;
    p.bagMax = capacity();
    p.bagWeight = Math.round(carriedWeight() * 100) / 100;
    if (p.stats) p.stats.carryWeight = p.bagMax;
  }

  function bootstrapStarterKit() {
    if (window.GameState.starterKitApplied) { syncWeight(); return; }
    const kit = window.GameStarterKit;
    window.GameState.backpackId = kit.backpackId;
    window.GameState.player.money = kit.money;
    kit.items.forEach((entry) => addItem(entry.id, entry.qty, { silent: true }));
    Object.entries(kit.equipped).forEach(([slot, id]) => {
      if (getQuantity(id)) {
        removeItem(id, 1, { silent: true });
        window.GameState.equipment[slot] = id;
      }
    });
    window.GameState.starterKitApplied = true;
    syncWeight();
    window.GameStateStore.save();
  }

  function openGearCrate() {
    const pool = [
      { id: "scrap", qty: 8, weight: 35 },
      { id: "bandage", qty: 3, weight: 18 },
      { id: "iodine", qty: 2, weight: 14 },
      { id: "uncommon_hide", qty: 2, weight: 12 },
      { id: "rare_hide", qty: 1, weight: 6 },
      { id: "field_gloves", qty: 1, weight: 5 },
      { id: "field_boots", qty: 1, weight: 4 },
      { id: "reinforced_mask", qty: 1, weight: 3 },
      { id: "rusty_rifle", qty: 1, weight: 3 }
    ];
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    const reward = pool.find((entry) => (roll -= entry.weight) <= 0) || pool[0];
    removeItem("gear_crate", 1, { silent: true });
    const added = addItem(reward.id, reward.qty, { overflowToStorage: true, silent: true });
    window.GameStateStore.save();
    const name = window.GameI18n?.resolve(`items.${reward.id}`) || reward.id;
    const storage = added.stored ? tf("inventory.messages.crateOverflow", { qty: added.stored }, ` Частина (×${added.stored}) відправлена на склад.`) : "";
    return { ok: true, message: tf("inventory.messages.crateOpened", { name, qty: reward.qty, storage }, `Ящик відкрито: ${name} ×${reward.qty}.${storage}`) };
  }

  function useItem(id) {
    const item = window.GameInventoryData.getItem(id);
    if (!item || !getQuantity(id)) return { ok: false, message: tf("inventory.messages.cannotUse", {}, "Предмет не можна використати.") };
    if (item.type === "crate") return openGearCrate();
    if (item.type !== "consumable") return { ok: false, message: tf("inventory.messages.cannotUse", {}, "Предмет не можна використати.") };
    const action = item.action || {};
    if (action.type === "restore" && action.stat === "hp") window.GameVitals?.heal?.(action.amount, { silent: true });
    else if (action.type === "restore" && action.stat === "energy") window.GameVitals?.restoreEnergy?.(action.amount, { silent: true });
    else if (action.type === "reduce" && action.stat === "radiation") window.GameVitals?.reduceRadiation?.(action.amount, { silent: true });
    else return { ok: false, message: tf("inventory.messages.actionNotConnected", {}, "Для цього предмета дія ще не підключена.") };
    removeItem(id, 1, { silent: true });
    window.GameStateStore.save();
    window.GameHud?.render?.();
    window.GameProfile?.renderAll?.();
    return { ok: true, message: tf("inventory.messages.itemUsed", {}, "Предмет використано.") };
  }

  window.GameInventory = {
    getQuantity, getStorageQuantity, carriedWeight, capacity, freeWeight,
    addItem, removeItem, addToStorage, moveToStorage, moveFromStorage,
    syncWeight, bootstrapStarterKit, useItem
  };
})();

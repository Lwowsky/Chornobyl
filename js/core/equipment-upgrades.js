(function () {
  const MAX_LEVEL = 25;
  const STAT_STEP = 0.02;

  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;

  function getLevel(itemId) {
    const raw = window.GameState.equipmentUpgrades?.[itemId];
    return Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(raw) || 1)));
  }

  function multiplier(itemId, level = getLevel(itemId)) {
    return 1 + (Math.max(1, level) - 1) * STAT_STEP;
  }

  function scaleBonuses(itemOrId, level) {
    const item = typeof itemOrId === "string" ? window.GameInventoryData.getItem(itemOrId) : itemOrId;
    if (!item) return {};
    const useLevel = level || getLevel(item.id);
    if (item.statModel === "rarityProgression" && window.GameEquipmentRarity?.itemBonuses) {
      return window.GameEquipmentRarity.itemBonuses(item, useLevel);
    }
    const m = multiplier(item.id, useLevel);
    return Object.fromEntries(Object.entries(item.bonuses || {}).map(([key, value]) => [key, Math.round((Number(value) || 0) * m * 100) / 100]));
  }

  function nextLevel(itemId) {
    const level = getLevel(itemId);
    return level >= MAX_LEVEL ? null : level + 1;
  }

  function cost(itemId) {
    const level = getLevel(itemId);
    if (level >= MAX_LEVEL) return null;
    return { scrap: Math.max(2, Math.ceil(level * 1.5)) };
  }

  function canUpgrade(itemId) {
    const recipe = cost(itemId);
    if (!recipe) return false;
    return Object.entries(recipe).every(([id, qty]) => (window.GameInventory?.getQuantity?.(id) || 0) >= qty);
  }

  function upgrade(itemId) {
    const item = window.GameInventoryData.getItem(itemId);
    if (!item || item.type !== "equipment") return { ok: false, message: t("profile.itemPopup.notEquipment", "Цей предмет не можна покращувати.") };
    const next = nextLevel(itemId);
    if (!next) return { ok: false, message: t("profile.itemPopup.maxed", "Предмет уже має максимальний рівень.") };
    const recipe = cost(itemId);
    if (!canUpgrade(itemId)) return { ok: false, message: t("profile.itemPopup.notEnoughMaterials", "Недостатньо матеріалів для покращення.") };

    Object.entries(recipe).forEach(([id, qty]) => window.GameInventory.removeItem(id, qty, { silent: true }));
    window.GameState.equipmentUpgrades[itemId] = next;
    window.GameProgression?.syncPlayerStats?.();
    window.GameStateStore.save();
    window.GameHud?.render?.();
    window.GameEquipment?.renderProfile?.();
    window.GameProfile?.renderAll?.();
    window.GameInventoryUi?.render?.();
    return { ok: true, message: t("profile.itemPopup.upgradeSuccess", "Предмет покращено.") };
  }

  window.GameEquipmentUpgrades = { MAX_LEVEL, STAT_STEP, getLevel, multiplier, scaleBonuses, nextLevel, cost, canUpgrade, upgrade };
})();

(function () {
  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;

  const PROMOTION_COSTS = Object.freeze({
    white: Object.freeze({ scrap: 30, uncommon_hide: 2 }),
    green: Object.freeze({ scrap: 60, rare_hide: 2 }),
    blue: Object.freeze({ scrap: 120, epic_hide: 2 }),
    purple: Object.freeze({ scrap: 240, legendary_hide: 2 }),
    gold: Object.freeze({ scrap: 500, mythic_core: 1 })
  });

  function currentTier(item) {
    return window.GameEquipmentRarity?.getTier?.(item?.testSet || item?.rarityTier || item?.rarity) || null;
  }

  function targetId(item) {
    if (!item) return "";
    if (item.promotionTargetId) return item.promotionTargetId;
    const tier = currentTier(item);
    const next = tier && window.GameEquipmentRarity?.nextTier?.(tier.id);
    if (!next) return "";
    if (item.testSet && item.slot) return `test_${next.id}_${item.slot}`;
    return "";
  }

  function targetItem(item) {
    const id = targetId(item);
    return id ? window.GameInventoryData?.getItem?.(id) : null;
  }

  function cost(item) {
    const tier = currentTier(item);
    return tier ? PROMOTION_COSTS[tier.id] || null : null;
  }

  function canPromote(item) {
    if (!item || item.type !== "equipment") return false;
    const tier = currentTier(item);
    if (!tier || tier.id === "red") return false;
    if ((window.GameEquipmentUpgrades?.getLevel?.(item.id) || 1) < (window.GameEquipmentUpgrades?.MAX_LEVEL || 25)) return false;
    const recipe = cost(item);
    const target = targetItem(item);
    if (!recipe || !target) return false;
    return Object.entries(recipe).every(([id, qty]) => (window.GameInventory?.getQuantity?.(id) || 0) >= qty);
  }

  function preview(item) {
    if (!item) return null;
    const from = currentTier(item);
    const target = targetItem(item);
    if (!from || !target) return null;
    const to = currentTier(target);
    const sourceRoll = window.GameState?.equipmentRolls?.[item.id] || window.GameEquipmentRarity?.ensureRoll?.(item);
    const seed = sourceRoll?.seed || item.statSeed || item.slot || item.id;
    const currentStats = sourceRoll?.stats || window.GameEquipmentRarity?.statsFor?.(from.id, seed) || [];
    const nextStats = window.GameEquipmentRarity?.statsFor?.(to.id, seed) || [];
    const addedStats = nextStats.filter((stat) => !currentStats.includes(stat));
    return {
      from,
      to,
      target,
      currentStats,
      nextStats,
      addedStats,
      bonuses: window.GameEquipmentRarity?.bonusesFor?.({ tier: to.id, seed, level: 1, stats: nextStats }) || {},
      recipe: cost(item)
    };
  }

  function promote(itemId) {
    const item = window.GameInventoryData?.getItem?.(itemId);
    if (!item || item.type !== "equipment") return { ok: false, message: t("profile.itemPopup.promotionNotEquipment", "Цю річ не можна підвищити за рідкістю.") };
    const tier = currentTier(item);
    if (!tier || tier.id === "red") return { ok: false, message: t("profile.itemPopup.promotionMaxRarity", "Це вже максимальна рідкість.") };

    const level = window.GameEquipmentUpgrades?.getLevel?.(item.id) || 1;
    const maxLevel = window.GameEquipmentUpgrades?.MAX_LEVEL || 25;
    if (level < maxLevel) return { ok: false, message: t("profile.itemPopup.promotionNeedMax", "Спочатку покращіть річ до +25.") };

    const target = targetItem(item);
    const recipe = cost(item);
    if (!target || !recipe) return { ok: false, message: t("profile.itemPopup.promotionUnavailable", "Для цієї речі наступна рідкість поки недоступна.") };
    if (!Object.entries(recipe).every(([id, qty]) => (window.GameInventory?.getQuantity?.(id) || 0) >= qty)) {
      return { ok: false, message: t("profile.itemPopup.notEnoughPromotionMaterials", "Недостатньо матеріалів для підвищення рідкості.") };
    }

    Object.entries(recipe).forEach(([id, qty]) => window.GameInventory.removeItem(id, qty, { silent: true }));

    const sourceRoll = window.GameState.equipmentRolls?.[item.id] || window.GameEquipmentRarity?.ensureRoll?.(item);
    if (sourceRoll) {
      window.GameState.equipmentRolls[target.id] = {
        seed: sourceRoll.seed,
        stats: window.GameEquipmentRarity.statsFor(currentTier(target).id, sourceRoll.seed)
      };
    }

    const slot = item.slot;
    const equipped = window.GameEquipment?.getEquipped?.(slot) === item.id;
    if (equipped) {
      window.GameState.equipment[slot] = target.id;
    } else {
      const removed = window.GameInventory.removeItem(item.id, 1, { silent: true });
      if (!removed) return { ok: false, message: t("profile.itemPopup.promotionMissingItem", "Предмет не знайдено в рюкзаку.") };
      window.GameInventory.addItem(target.id, 1, { overflowToStorage: false, silent: true });
    }

    delete window.GameState.equipmentUpgrades[item.id];
    delete window.GameState.equipmentRolls[item.id];
    window.GameState.equipmentUpgrades[target.id] = 1;
    window.GameProgression?.syncPlayerStats?.();
    window.GameInventory?.syncWeight?.();
    window.GameStateStore.save();
    window.GameHud?.render?.();
    window.GameEquipment?.renderProfile?.();
    window.GameProfile?.renderAll?.();
    window.GameInventoryUi?.render?.();

    return {
      ok: true,
      targetId: target.id,
      message: t("profile.itemPopup.promotionSuccess", "Рідкість підвищено. Нова річ починає з +1.")
    };
  }

  window.GameEquipmentPromotion = {
    PROMOTION_COSTS,
    currentTier,
    targetId,
    targetItem,
    cost,
    canPromote,
    preview,
    promote
  };
})();

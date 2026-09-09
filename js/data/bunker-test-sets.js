(function () {
  const SLOT_DEFS = Object.freeze([
    { id: "head", label: "Голова", icon: "assets/equipment/items-png/head.webp" },
    { id: "mask", label: "Маска", icon: "assets/equipment/items-png/mask.webp" },
    { id: "body", label: "Тіло", icon: "assets/equipment/items-png/body.webp" },
    { id: "cloak", label: "Плащ", icon: "assets/equipment/items-png/cloak.webp" },
    { id: "pants", label: "Штани", icon: "assets/equipment/items-png/pants.webp" },
    { id: "boots", label: "Взуття", icon: "assets/equipment/items-png/boots.webp" },
    { id: "gloves", label: "Рукавиці", icon: "assets/equipment/items-png/gloves.webp" },
    { id: "melee", label: "Ближня зброя", icon: "assets/equipment/items-png/melee.webp" },
    { id: "ranged", label: "Дальня зброя", icon: "assets/equipment/items-png/ranged.webp" },
    { id: "dosimeter", label: "Дозиметр", icon: "assets/equipment/items-png/dosimeter.webp" },
    { id: "talisman", label: "Талісман", icon: "assets/inventory-items/material_epic.webp" },
    { id: "artifact", label: "Артефакт", icon: "assets/inventory-items/material_red.webp" }
  ]);

  const SET_VISUALS = Object.freeze({
    white: { name: "Білий · Польовий", short: "Білий", color: "#d7d7cf" },
    green: { name: "Зелений · Сталкер", short: "Зелений", color: "#63d96d" },
    blue: { name: "Синій · Ветеран", short: "Синій", color: "#55a7ff" },
    purple: { name: "Фіолетовий · Еліта", short: "Фіолетовий", color: "#c873ff" },
    gold: { name: "Золотий · Легенда", short: "Золотий", color: "#ffc641" },
    red: { name: "Червоний · Сигнал 1037", short: "Червоний", color: "#ff4e4e" }
  });

  const RARITY = window.GameEquipmentRarity;
  const SETS = Object.freeze(RARITY.TIERS.map((tier) => Object.freeze({
    ...tier,
    ...SET_VISUALS[tier.id]
  })));

  const items = [];
  SETS.forEach((set) => {
    SLOT_DEFS.forEach((slot) => {
      // Same slot uses the same random order through all rarities.
      // Therefore promotion preserves existing stats and only adds new unique ones.
      const statSeed = `slot:${slot.id}`;
      const rolledStats = RARITY.statsFor(set.id, statSeed);
      items.push({
        id: `test_${set.id}_${slot.id}`,
        icon: "◆",
        category: "gear",
        type: "equipment",
        slot: slot.id,
        weight: 0.05,
        profileIcon: slot.icon,
        rarity: set.rarity,
        rarityTier: set.id,
        testSet: set.id,
        statModel: "rarityProgression",
        statSeed,
        rolledStats,
        bonuses: RARITY.bonusesFor({ tier: set.id, seed: statSeed, level: 1, stats: rolledStats }),
        promotionTargetId: set.id === "red" ? "" : `test_${RARITY.nextTier(set.id).id}_${slot.id}`
      });
    });
  });

  window.GameInventoryData.registerItems(items);
  window.GameBunkerTestData = { SETS, SLOT_DEFS, ALL_STATS: RARITY.STATS, items };
})();

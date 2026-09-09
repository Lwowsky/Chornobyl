(function () {
  const MAX_ITEM_LEVEL = 25;

  const STATS = Object.freeze([
    "maxHp",
    "maxEnergy",
    "attack",
    "defense",
    "stamina",
    "radiationResistance",
    "critChance",
    "critDamage",
    "carryWeight"
  ]);

  const STAT_UNITS = Object.freeze({
    maxHp: 5,
    maxEnergy: 4,
    attack: 1,
    defense: 1,
    stamina: 1,
    radiationResistance: 1,
    critChance: 0.5,
    critDamage: 2,
    carryWeight: 0.5
  });

  const TIERS = Object.freeze([
    { id: "white", rarity: "common", statCount: 2, index: 0, label: "Білий", color: "#d7d7cf", glow: "rgba(215,215,207,.22)" },
    { id: "green", rarity: "uncommon", statCount: 3, index: 1, label: "Зелений", color: "#63d96d", glow: "rgba(99,217,109,.24)" },
    { id: "blue", rarity: "rare", statCount: 4, index: 2, label: "Синій", color: "#55a7ff", glow: "rgba(85,167,255,.26)" },
    { id: "purple", rarity: "epic", statCount: 5, index: 3, label: "Фіолетовий", color: "#c873ff", glow: "rgba(200,115,255,.26)" },
    { id: "gold", rarity: "legendary", statCount: 7, index: 4, label: "Золотий", color: "#ffc641", glow: "rgba(255,198,65,.27)" },
    { id: "red", rarity: "mythic", statCount: STATS.length, index: 5, label: "Червоний", color: "#ff4e4e", glow: "rgba(255,78,78,.30)" }
  ]);

  function hashSeed(value) {
    const text = String(value || "item");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = hashSeed(seed) || 1;
    return function random() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffledStats(seed) {
    const result = [...STATS];
    const random = seededRandom(seed);
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function getTier(rarityOrTier) {
    return TIERS.find((tier) => tier.id === rarityOrTier || tier.rarity === rarityOrTier) || TIERS[0];
  }

  function nextTier(rarityOrTier) {
    const tier = getTier(rarityOrTier);
    return TIERS[tier.index + 1] || null;
  }

  function statsFor(rarityOrTier, seed) {
    const tier = getTier(rarityOrTier);
    if (tier.id === "red") return [...STATS];
    return shuffledStats(seed).slice(0, tier.statCount);
  }

  // One rarity occupies a continuous 10-point power band.
  // Example for Attack (unit = 1): white +25 = 10, green +1 = 11.
  // A found green +1 and a promoted white -> green +1 therefore have identical values.
  function powerPoint(rarityOrTier, level = 1) {
    const tier = getTier(rarityOrTier);
    const safeLevel = Math.max(1, Math.min(MAX_ITEM_LEVEL, Math.floor(Number(level) || 1)));
    const withinTier = 1 + ((safeLevel - 1) * 9) / (MAX_ITEM_LEVEL - 1);
    return tier.index * 10 + withinTier;
  }

  function round(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function statValue(stat, rarityOrTier, level = 1) {
    return round((STAT_UNITS[stat] || 1) * powerPoint(rarityOrTier, level));
  }

  function bonusesFor({ rarity, tier, seed, level = 1, stats } = {}) {
    const useTier = getTier(tier || rarity);
    const selected = Array.isArray(stats) && stats.length ? [...new Set(stats)].filter((stat) => STATS.includes(stat)) : statsFor(useTier.id, seed);
    return Object.fromEntries(selected.map((stat) => [stat, statValue(stat, useTier.id, level)]));
  }

  function ensureRoll(item, forcedSeed) {
    if (!item || item.type !== "equipment" || item.statModel !== "rarityProgression") return null;
    const rolls = window.GameState?.equipmentRolls || (window.GameState ? (window.GameState.equipmentRolls = {}) : {});
    if (rolls[item.id]) return rolls[item.id];
    const tier = getTier(item.testSet || item.rarityTier || item.rarity);
    const seed = forcedSeed || `${item.id}:${Date.now()}:${Math.random()}`;
    const roll = { seed, stats: statsFor(tier.id, seed) };
    if (window.GameState) rolls[item.id] = roll;
    return roll;
  }

  function itemBonuses(item, level = 1) {
    if (!item) return {};
    const tier = getTier(item.testSet || item.rarityTier || item.rarity);
    const saved = window.GameState?.equipmentRolls?.[item.id];
    const seed = saved?.seed || item.statSeed || item.slot || item.id;
    const stats = saved?.stats || item.rolledStats || statsFor(tier.id, seed);
    return bonusesFor({ tier: tier.id, seed, level, stats });
  }

  function promotionPreview(item) {
    if (!item) return null;
    const current = getTier(item.testSet || item.rarityTier || item.rarity);
    const next = nextTier(current.id);
    if (!next) return null;
    const seed = item.statSeed || item.slot || item.id;
    const nextStats = statsFor(next.id, seed);
    return {
      from: current.id,
      to: next.id,
      level: 1,
      stats: nextStats,
      bonuses: bonusesFor({ tier: next.id, seed, level: 1, stats: nextStats })
    };
  }

  window.GameEquipmentRarity = {
    MAX_ITEM_LEVEL,
    STATS,
    STAT_UNITS,
    TIERS,
    getTier,
    nextTier,
    shuffledStats,
    statsFor,
    powerPoint,
    statValue,
    bonusesFor,
    ensureRoll,
    itemBonuses,
    promotionPreview,
    rarityClass(itemOrTier) { return `rarity-${getTier(itemOrTier?.testSet || itemOrTier?.rarityTier || itemOrTier?.rarity || itemOrTier).id}`; }
  };
})();

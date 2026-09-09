(function () {
  const MAX_LEVEL = 100;
  const XP_GROWTH = 1.244;
  const LEVEL_ONE = Object.freeze({
    hpMax: 50,
    energyMax: 100,
    attack: 6,
    defense: 3,
    stamina: 16,
    radiationResistance: 6,
    critChance: 7,
    critDamage: 150
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function requiredXp(level) {
    const safe = clamp(Math.floor(Number(level) || 1), 1, MAX_LEVEL);
    if (safe >= MAX_LEVEL) return 0;
    return Math.round(100 * Math.pow(XP_GROWTH, safe - 1));
  }

  function baseStats(level) {
    const l = clamp(Math.floor(Number(level) || 1), 1, MAX_LEVEL);
    return {
      hpMax: 50 + (l - 1) * 6,
      energyMax: 100 + (l - 1) * 2,
      attack: 6 + (l - 1),
      defense: 3 + Math.floor((l - 1) / 2),
      stamina: 16 + (l - 1),
      radiationResistance: Math.min(35, 6 + (l - 1) * 0.8),
      critChance: Math.min(25, 7 + (l - 1) * 0.25),
      critDamage: 150 + Math.floor((l - 1) / 10) * 5
    };
  }

  function getStatBreakdown() {
    const p = window.GameState.player;
    const currentBase = baseStats(p.level);
    const equipment = window.GameEquipment?.getBonuses?.() || {};
    const backpack = window.GameInventoryData?.getBackpack?.(window.GameState.backpackId);
    const total = p.stats || {};

    const rows = {
      health: {
        base: LEVEL_ONE.hpMax,
        level: round2(currentBase.hpMax - LEVEL_ONE.hpMax),
        equipment: round2(equipment.maxHp || 0),
        total: total.health ?? p.hpMax
      },
      energy: {
        base: LEVEL_ONE.energyMax,
        level: round2(currentBase.energyMax - LEVEL_ONE.energyMax),
        equipment: round2(equipment.maxEnergy || 0),
        total: p.energyMax
      },
      attack: {
        base: LEVEL_ONE.attack,
        level: round2(currentBase.attack - LEVEL_ONE.attack),
        equipment: round2(equipment.attack || 0),
        total: total.attack || 0
      },
      defense: {
        base: LEVEL_ONE.defense,
        level: round2(currentBase.defense - LEVEL_ONE.defense),
        equipment: round2(equipment.defense || 0),
        total: total.defense || 0
      },
      stamina: {
        base: LEVEL_ONE.stamina,
        level: round2(currentBase.stamina - LEVEL_ONE.stamina),
        equipment: round2(equipment.stamina || 0),
        total: total.stamina || 0
      },
      radiationResistance: {
        base: LEVEL_ONE.radiationResistance,
        level: round2(currentBase.radiationResistance - LEVEL_ONE.radiationResistance),
        equipment: round2(equipment.radiationResistance || 0),
        total: total.radiationResistance || 0
      },
      critChance: {
        base: LEVEL_ONE.critChance,
        level: round2(currentBase.critChance - LEVEL_ONE.critChance),
        equipment: round2(equipment.critChance || 0),
        total: total.critChance || 0
      },
      critDamage: {
        base: LEVEL_ONE.critDamage,
        level: round2(currentBase.critDamage - LEVEL_ONE.critDamage),
        equipment: round2(equipment.critDamage || 0),
        total: total.critDamage || 0
      },
      carryWeight: {
        base: Number(backpack?.capacity) || 40,
        level: 0,
        equipment: round2(equipment.carryWeight || 0),
        total: total.carryWeight || p.bagMax || 40
      }
    };
    return rows;
  }

  function syncPlayerStats(options = {}) {
    const p = window.GameState.player;
    const previousHpMax = Math.max(1, Number(p.hpMax) || 1);
    const previousEnergyMax = Math.max(1, Number(p.energyMax) || 1);
    const hpRatio = clamp((Number(p.hp) || 0) / previousHpMax, 0, 1);
    const energyRatio = clamp((Number(p.energy) || 0) / previousEnergyMax, 0, 1);
    const base = baseStats(p.level);
    const equipment = window.GameEquipment?.getBonuses?.() || {};
    const backpack = window.GameInventoryData?.getBackpack?.(window.GameState.backpackId);

    p.hpMax = Math.round(base.hpMax + (equipment.maxHp || 0));
    p.energyMax = Math.round(base.energyMax + (equipment.maxEnergy || 0));
    p.radiationMax = 100;
    p.bagMax = Math.max(0, (backpack?.capacity || 40) + (equipment.carryWeight || 0));
    p.stats = {
      health: p.hpMax,
      attack: round2(base.attack + (equipment.attack || 0)),
      defense: round2(base.defense + (equipment.defense || 0)),
      stamina: round2(base.stamina + (equipment.stamina || 0)),
      radiationResistance: round2(base.radiationResistance + (equipment.radiationResistance || 0)),
      critChance: round2(base.critChance + (equipment.critChance || 0)),
      critDamage: round2(base.critDamage + (equipment.critDamage || 0)),
      carryWeight: p.bagMax
    };
    p.power = Math.max(1, Math.round(
      p.stats.attack * 2
      + p.stats.defense * 1.5
      + p.stats.stamina * 0.35
      + p.stats.radiationResistance * 0.25
      + p.stats.critChance * 0.5
      + p.level * 1.2
    ));
    p.xpNext = requiredXp(p.level);

    if (options.fullRestore) {
      p.hp = p.hpMax;
      p.energy = p.energyMax;
    } else {
      p.hp = Math.min(p.hpMax, Math.max(0, Math.round(p.hpMax * hpRatio)));
      p.energy = Math.min(p.energyMax, Math.max(0, Math.round(p.energyMax * energyRatio)));
    }
    p.radiation = clamp(Number(p.radiation) || 0, 0, p.radiationMax);
    window.GameInventory?.syncWeight?.();
    return p.stats;
  }

  function addXp(amount, source = "") {
    const p = window.GameState.player;
    const gained = Math.max(0, Math.floor(Number(amount) || 0));
    if (!gained || p.level >= MAX_LEVEL) return { gained: 0, levels: 0, level: p.level, source };

    const startLevel = p.level;
    p.xp = Math.max(0, Math.floor(Number(p.xp) || 0)) + gained;
    while (p.level < MAX_LEVEL) {
      const needed = requiredXp(p.level);
      if (p.xp < needed) break;
      p.xp -= needed;
      p.level += 1;
    }
    if (p.level >= MAX_LEVEL) p.xp = 0;
    const levels = p.level - startLevel;
    syncPlayerStats({ fullRestore: levels > 0 });
    window.GameStateStore.save();
    window.GameHud?.render?.();
    window.GameProfile?.renderAll?.();
    window.GameInventoryUi?.render?.();
    return { gained, levels, level: p.level, source };
  }

  function getProgress() {
    const p = window.GameState.player;
    const next = requiredXp(p.level);
    return {
      level: p.level,
      xp: p.xp,
      xpNext: next,
      percent: next ? Math.min(100, (p.xp / next) * 100) : 100,
      isMaxLevel: p.level >= MAX_LEVEL
    };
  }

  window.GameProgression = {
    MAX_LEVEL,
    LEVEL_ONE,
    requiredXp,
    baseStats,
    getStatBreakdown,
    syncPlayerStats,
    addXp,
    getProgress
  };
})();

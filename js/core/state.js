(function () {
  const STORAGE_KEY = "the1037.player.v2";

  const defaultPlayer = {
    nickname: "Test",
    level: 5,
    xp: 130,
    xpNext: 240,
    hp: 74,
    hpMax: 74,
    energy: 108,
    energyMax: 108,
    radiation: 14,
    radiationMax: 100,
    bagWeight: 0,
    bagMax: 40,
    money: 1196,
    power: 10,
    stats: {
      health: 74,
      attack: 10,
      defense: 5,
      stamina: 20,
      radiationResistance: 10,
      critChance: 8,
      critDamage: 150,
      carryWeight: 40
    }
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function buildDefaultState() {
    return {
      version: 2,
      player: clone(defaultPlayer),
      backpackId: "field_40",
      inventory: {},
      storage: {},
      warehouse: { level: 1 },
      questBoard: { entries: {}, trackedId: "", unlocked: {}, dailyKey: "", factionRep: 0 },
      equipment: {},
      equipmentUpgrades: {},
      equipmentRolls: {},
      starterKitApplied: false
    };
  }

  function mergeState(saved) {
    const base = buildDefaultState();
    if (!saved || typeof saved !== "object") return base;
    base.player = { ...base.player, ...(saved.player || {}) };
    base.player.stats = { ...defaultPlayer.stats, ...(saved.player?.stats || {}) };
    base.backpackId = saved.backpackId || base.backpackId;
    base.inventory = saved.inventory && typeof saved.inventory === "object" ? saved.inventory : {};
    base.storage = saved.storage && typeof saved.storage === "object" ? saved.storage : {};
    base.warehouse = saved.warehouse && typeof saved.warehouse === "object"
      ? { ...base.warehouse, ...saved.warehouse, level: Math.max(1, Math.min(5, Number(saved.warehouse.level) || 1)) }
      : base.warehouse;
    base.questBoard = saved.questBoard && typeof saved.questBoard === "object"
      ? {
          ...base.questBoard,
          ...saved.questBoard,
          entries: saved.questBoard.entries && typeof saved.questBoard.entries === "object" ? saved.questBoard.entries : {},
          unlocked: saved.questBoard.unlocked && typeof saved.questBoard.unlocked === "object" ? saved.questBoard.unlocked : {},
          trackedId: String(saved.questBoard.trackedId || ""),
          factionRep: Math.max(0, Number(saved.questBoard.factionRep) || 0)
        }
      : base.questBoard;
    base.equipment = saved.equipment && typeof saved.equipment === "object" ? saved.equipment : {};
    base.equipmentUpgrades = saved.equipmentUpgrades && typeof saved.equipmentUpgrades === "object" ? saved.equipmentUpgrades : {};
    base.equipmentRolls = saved.equipmentRolls && typeof saved.equipmentRolls === "object" ? saved.equipmentRolls : {};
    base.starterKitApplied = Boolean(saved.starterKitApplied);
    return base;
  }

  function load() {
    try { return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); }
    catch { return buildDefaultState(); }
  }

  const state = load();
  window.GameState = state;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch {}
    window.dispatchEvent(new CustomEvent("game:state-changed"));
  }

  function reset() {
    const fresh = buildDefaultState();
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, fresh);
    save();
  }

  window.GameStateStore = { save, reset, storageKey: STORAGE_KEY };
})();

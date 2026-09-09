(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function update(options = {}) {
    const p = window.GameState.player;
    p.hp = clamp(p.hp, 0, p.hpMax);
    p.energy = clamp(p.energy, 0, p.energyMax);
    p.radiation = clamp(p.radiation, 0, p.radiationMax || 100);
    if (!options.silent) window.GameStateStore.save();
    window.GameHud?.render?.();
    window.GameProfile?.renderProgression?.();
    return snapshot();
  }

  function snapshot() {
    const p = window.GameState.player;
    return {
      hp: p.hp,
      hpMax: p.hpMax,
      energy: p.energy,
      energyMax: p.energyMax,
      radiation: p.radiation,
      radiationMax: p.radiationMax
    };
  }

  function damage(amount, options = {}) {
    const p = window.GameState.player;
    p.hp = clamp(p.hp - Math.max(0, Number(amount) || 0), 0, p.hpMax);
    return update(options);
  }

  function heal(amount, options = {}) {
    const p = window.GameState.player;
    p.hp = clamp(p.hp + Math.max(0, Number(amount) || 0), 0, p.hpMax);
    return update(options);
  }

  function restoreEnergy(amount, options = {}) {
    const p = window.GameState.player;
    p.energy = clamp(p.energy + Math.max(0, Number(amount) || 0), 0, p.energyMax);
    return update(options);
  }

  function spendEnergy(amount, options = {}) {
    const p = window.GameState.player;
    p.energy = clamp(p.energy - Math.max(0, Number(amount) || 0), 0, p.energyMax);
    return update(options);
  }

  function addRadiation(amount, options = {}) {
    const p = window.GameState.player;
    p.radiation = clamp(p.radiation + Math.max(0, Number(amount) || 0), 0, p.radiationMax || 100);
    return update(options);
  }

  function reduceRadiation(amount, options = {}) {
    const p = window.GameState.player;
    p.radiation = clamp(p.radiation - Math.max(0, Number(amount) || 0), 0, p.radiationMax || 100);
    return update(options);
  }

  function fullRestore(options = {}) {
    const p = window.GameState.player;
    p.hp = p.hpMax;
    p.energy = p.energyMax;
    return update(options);
  }

  window.GameVitals = {
    snapshot,
    update,
    damage,
    heal,
    restoreEnergy,
    spendEnergy,
    addRadiation,
    reduceRadiation,
    fullRestore
  };
})();

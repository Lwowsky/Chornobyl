(function () {
  function player() {
    return window.GameState?.player || {};
  }

  function settings() {
    return window.GameHospitalData?.settings || {};
  }

  function money() {
    return Math.max(0, Math.floor(Number(player().money) || 0));
  }

  function missingHp() {
    const p = player();
    return Math.max(0, Math.floor((Number(p.hpMax) || 0) - (Number(p.hp) || 0)));
  }

  function healCost() {
    const missing = missingHp();
    if (!missing) return 0;
    const raw = missing * Math.max(0, Number(settings().healCostPerHp) || 0);
    return Math.max(Math.max(0, Number(settings().healMinimumCost) || 0), Math.round(raw));
  }

  function snapshot() {
    const p = player();
    return {
      hp: Math.max(0, Number(p.hp) || 0),
      hpMax: Math.max(1, Number(p.hpMax) || 1),
      radiation: Math.max(0, Number(p.radiation) || 0),
      radiationMax: Math.max(1, Number(p.radiationMax) || 100),
      money: money()
    };
  }

  function quote(serviceId) {
    const state = snapshot();
    if (serviceId === "fullHeal") {
      const cost = healCost();
      return {
        id: serviceId,
        cost,
        before: state.hp,
        after: state.hpMax,
        amount: Math.max(0, state.hpMax - state.hp),
        needed: state.hp < state.hpMax,
        affordable: state.money >= cost
      };
    }

    if (serviceId === "partialDecon") {
      const amount = Math.max(1, Number(settings().partialRadiationAmount) || 25);
      const cost = Math.max(0, Math.floor(Number(settings().partialRadiationCost) || 0));
      return {
        id: serviceId,
        cost,
        before: state.radiation,
        after: Math.max(0, state.radiation - amount),
        amount: Math.min(amount, state.radiation),
        needed: state.radiation > 0,
        affordable: state.money >= cost
      };
    }

    if (serviceId === "fullDecon") {
      const cost = Math.max(0, Math.floor(Number(settings().fullRadiationCost) || 0));
      return {
        id: serviceId,
        cost,
        before: state.radiation,
        after: 0,
        amount: state.radiation,
        needed: state.radiation > 0,
        affordable: state.money >= cost
      };
    }

    return null;
  }

  function commit(cost, mutate) {
    const p = player();
    if (!p || money() < cost) return { ok: false, reason: "money" };
    p.money = money() - cost;
    mutate(p);
    window.GameVitals?.update?.({ silent: true });
    window.GameStateStore?.save?.();
    window.GameHud?.render?.();
    return { ok: true };
  }

  function execute(serviceId) {
    const current = quote(serviceId);
    if (!current) return { ok: false, reason: "unknown" };
    if (!current.needed) return { ok: false, reason: "notNeeded", quote: current };
    if (!current.affordable) return { ok: false, reason: "money", quote: current };

    if (serviceId === "fullHeal") {
      return { ...commit(current.cost, (p) => { p.hp = p.hpMax; }), quote: current };
    }
    if (serviceId === "partialDecon") {
      return { ...commit(current.cost, (p) => { p.radiation = Math.max(0, (Number(p.radiation) || 0) - current.amount); }), quote: current };
    }
    if (serviceId === "fullDecon") {
      return { ...commit(current.cost, (p) => { p.radiation = 0; }), quote: current };
    }
    return { ok: false, reason: "unknown" };
  }

  window.GameHospitalRuntime = { snapshot, quote, execute, healCost };
})();

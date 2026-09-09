(function () {
  const CONTRACT_LIMIT = 5;

  function now() { return Date.now(); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function dayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function nextDailyResetMs() {
    const next = new Date();
    next.setHours(24, 0, 0, 0);
    return Math.max(0, next.getTime() - Date.now());
  }

  function ensureState() {
    const base = {
      entries: {},
      trackedId: "",
      unlocked: {},
      dailyKey: dayKey(),
      factionRep: 0
    };
    const current = window.GameState.questBoard;
    window.GameState.questBoard = current && typeof current === "object"
      ? {
          ...base,
          ...current,
          entries: current.entries && typeof current.entries === "object" ? current.entries : {},
          unlocked: current.unlocked && typeof current.unlocked === "object" ? current.unlocked : {}
        }
      : base;
    return window.GameState.questBoard;
  }

  function resetDailyIfNeeded() {
    const state = ensureState();
    const currentKey = dayKey();
    if (state.dailyKey === currentKey) return false;
    Object.keys(state.entries).forEach((id) => {
      if (window.GameQuestRegistry.get(id)?.type === "daily") delete state.entries[id];
    });
    if (window.GameQuestRegistry.get(state.trackedId)?.type === "daily") state.trackedId = "";
    state.dailyKey = currentKey;
    window.GameStateStore.save();
    return true;
  }

  function entry(id) {
    return ensureState().entries[String(id || "")] || null;
  }

  function totalInventory(itemId) {
    return (window.GameInventory?.getQuantity?.(itemId) || 0) + (window.GameInventory?.getStorageQuantity?.(itemId) || 0);
  }

  function matches(meta, expected) {
    if (!expected) return true;
    return Object.entries(expected).every(([key, value]) => meta?.[key] === value);
  }

  function objectiveProgress(quest, objective) {
    if (objective.type === "inventory") return Math.min(objective.target, totalInventory(objective.itemId));
    if (objective.type === "stat") return Math.min(objective.target, Number(window.GameState.player?.[objective.stat]) || 0);
    const saved = entry(quest.id)?.progress?.[objective.id];
    return Math.min(objective.target, Math.max(0, Number(saved) || 0));
  }

  function progress(quest) {
    const objectives = quest.objectives.map((objective) => ({
      ...objective,
      current: objectiveProgress(quest, objective),
      complete: objectiveProgress(quest, objective) >= objective.target
    }));
    return {
      objectives,
      complete: objectives.every((objective) => objective.complete),
      current: objectives.reduce((sum, objective) => sum + Math.min(objective.current, objective.target), 0),
      target: objectives.reduce((sum, objective) => sum + objective.target, 0)
    };
  }

  function isUnlocked(quest) {
    if (!quest.requiresUnlock) return true;
    return Boolean(ensureState().unlocked[quest.id]);
  }

  function status(quest) {
    if (!quest) return "missing";
    if (!isUnlocked(quest)) return "hidden";
    const saved = entry(quest.id);
    if (saved?.status === "claimed") return "completed";
    if ((Number(window.GameState.player?.level) || 1) < quest.minLevel) return "locked";
    if (saved?.status === "active") return progress(quest).complete ? "ready" : "active";
    return "available";
  }

  function activeContractCount() {
    return Object.keys(ensureState().entries).reduce((count, id) => {
      const quest = window.GameQuestRegistry.get(id);
      return count + (quest?.type === "contract" && entry(id)?.status === "active" ? 1 : 0);
    }, 0);
  }

  function accept(id) {
    resetDailyIfNeeded();
    const quest = window.GameQuestRegistry.get(id);
    if (!quest) return { ok: false, code: "missing" };
    if (status(quest) !== "available") return { ok: false, code: status(quest) };
    if (quest.type === "contract" && activeContractCount() >= CONTRACT_LIMIT) return { ok: false, code: "contractLimit" };
    ensureState().entries[id] = { status: "active", acceptedAt: now(), progress: {} };
    window.GameStateStore.save();
    return { ok: true };
  }

  function track(id) {
    const quest = window.GameQuestRegistry.get(id);
    if (!quest || !["active", "ready"].includes(status(quest))) return { ok: false };
    const state = ensureState();
    state.trackedId = state.trackedId === id ? "" : id;
    window.GameStateStore.save();
    return { ok: true, tracked: state.trackedId === id };
  }

  function claim(id) {
    const quest = window.GameQuestRegistry.get(id);
    if (!quest || status(quest) !== "ready") return { ok: false, code: "notReady" };
    const state = ensureState();
    const saved = state.entries[id];
    saved.status = "claimed";
    saved.completedAt = now();
    if (state.trackedId === id) state.trackedId = "";
    state.factionRep = Math.max(0, Number(state.factionRep) || 0) + Math.max(0, Number(quest.rewards?.reputation) || 0);
    const reward = clone(quest.rewards || {});
    delete reward.reputation;
    window.GameRewards?.grant?.(reward, `quest:${id}`);
    window.GameStateStore.save();
    return { ok: true, rewards: quest.rewards || {} };
  }

  function unlock(id) {
    if (!window.GameQuestRegistry.get(id)) return false;
    ensureState().unlocked[id] = true;
    window.GameStateStore.save();
    return true;
  }

  function report(eventName, amount = 1, meta = {}) {
    amount = Math.max(0, Number(amount) || 0);
    if (!amount) return 0;
    let changed = 0;
    const state = ensureState();
    Object.keys(state.entries).forEach((id) => {
      const saved = state.entries[id];
      if (saved?.status !== "active") return;
      const quest = window.GameQuestRegistry.get(id);
      if (!quest) return;
      quest.objectives.forEach((objective) => {
        if (objective.type !== "event" || objective.event !== eventName || !matches(meta, objective.match)) return;
        saved.progress = saved.progress || {};
        const previous = Math.max(0, Number(saved.progress[objective.id]) || 0);
        const next = Math.min(objective.target, previous + amount);
        if (next !== previous) {
          saved.progress[objective.id] = next;
          changed += 1;
        }
      });
    });
    if (changed) window.GameStateStore.save();
    return changed;
  }

  function list(type) {
    resetDailyIfNeeded();
    if (type === "completed") return window.GameQuestRegistry.all().filter((quest) => status(quest) === "completed");
    return window.GameQuestRegistry.byType(type).filter((quest) => status(quest) !== "hidden");
  }

  function summary() {
    const state = ensureState();
    const all = window.GameQuestRegistry.all();
    return {
      totalRegistered: all.length,
      activeContracts: activeContractCount(),
      contractLimit: CONTRACT_LIMIT,
      trackedId: state.trackedId,
      factionRep: Math.max(0, Number(state.factionRep) || 0),
      dailyResetMs: nextDailyResetMs()
    };
  }

  window.GameQuests = {
    ensureState,
    resetDailyIfNeeded,
    nextDailyResetMs,
    status,
    progress,
    accept,
    track,
    claim,
    unlock,
    report,
    list,
    summary,
    entry
  };
})();

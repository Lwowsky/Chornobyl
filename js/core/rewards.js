(function () {
  function grant(reward = {}, source = "") {
    const result = { money: 0, xp: 0, items: [], storage: [] };
    if (reward.money) {
      result.money = Math.max(0, Math.floor(Number(reward.money) || 0));
      window.GameState.player.money += result.money;
    }
    if (reward.xp) {
      const xpResult = window.GameProgression.addXp(reward.xp, source);
      result.xp = xpResult.gained;
    }
    for (const entry of reward.items || []) {
      const qty = Math.max(1, Math.floor(Number(entry.qty) || 1));
      const added = window.GameInventory.addItem(entry.id, qty, { overflowToStorage: true, silent: true });
      if (added.added) result.items.push({ id: entry.id, qty: added.added });
      if (added.stored) result.storage.push({ id: entry.id, qty: added.stored });
    }
    window.GameInventory.syncWeight();
    window.GameStateStore.save();
    window.GameHud?.render?.();
    window.GameInventoryUi?.render?.();
    return result;
  }
  window.GameRewards = { grant };
})();

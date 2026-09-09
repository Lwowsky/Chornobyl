(function () {
  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;

  function screen() { return document.getElementById("bunkerView"); }
  function grid() { return document.getElementById("bunkerSetGrid"); }
  function status() { return document.getElementById("bunkerStatus"); }

  function statLabel(stat) {
    const map = {
      maxHp: "Здоров’я",
      maxEnergy: "Енергія",
      attack: "Атака",
      defense: "Захист",
      stamina: "Витривалість",
      radiationResistance: "Радіозахист",
      critChance: "Шанс крит. удару",
      critDamage: "Крит. шкода",
      carryWeight: "Вага"
    };
    return map[stat] || stat;
  }

  function formatStat(stat, value) {
    const suffix = ["radiationResistance", "critChance", "critDamage"].includes(stat) ? "%" : stat === "carryWeight" ? " кг" : "";
    return `+${Number(value)}${suffix}`;
  }

  function setItems(setId) {
    return window.GameBunkerTestData.items.filter((item) => item.testSet === setId);
  }

  function setTotals(setId) {
    const totals = {};
    setItems(setId).forEach((item) => {
      Object.entries(item.bonuses || {}).forEach(([stat, value]) => {
        totals[stat] = Math.round(((totals[stat] || 0) + Number(value || 0)) * 100) / 100;
      });
    });
    return totals;
  }

  function ownedCount(setId) {
    return setItems(setId).filter((item) => (window.GameInventory?.getQuantity?.(item.id) || 0) > 0).length;
  }

  function equippedCount(setId) {
    const equipped = Object.values(window.GameState?.equipment || {});
    return setItems(setId).filter((item) => equipped.includes(item.id)).length;
  }

  function addSet(setId) {
    let added = 0;
    setItems(setId).forEach((item) => {
      const result = window.GameInventory.addItem(item.id, 1, { overflowToStorage: false, silent: true });
      added += result.added || 0;
    });
    window.GameStateStore.save();
    window.GameInventoryUi?.render?.();
    window.GameHud?.render?.();
    setMessage(added ? t("bunker.added", "Сет додано в рюкзак.") : "У рюкзаку недостатньо місця.");
    render();
  }

  function equipSet(setId) {
    const items = setItems(setId);
    for (const item of items) {
      if (window.GameEquipment?.getEquipped?.(item.slot) === item.id) continue;
      if (!(window.GameInventory?.getQuantity?.(item.id) > 0)) {
        window.GameInventory.addItem(item.id, 1, { overflowToStorage: false, silent: true });
      }
      window.GameEquipment.equip(item.id);
    }
    window.GameProgression?.syncPlayerStats?.();
    window.GameStateStore.save();
    window.GameHud?.render?.();
    window.GameProfile?.renderAll?.();
    setMessage(t("bunker.equipped", "Сет екіпіровано."));
    render();
  }

  function setMessage(message) {
    const host = status();
    if (!host) return;
    host.textContent = message;
    host.hidden = !message;
  }

  function renderCard(set) {
    const tier = window.GameEquipmentRarity?.getTier?.(set.id) || set;
    const owned = ownedCount(set.id);
    const equipped = equippedCount(set.id);
    const statRule = set.id === "red"
      ? `Кожна річ має всі ${window.GameBunkerTestData.ALL_STATS.length} характеристик.`
      : `Кожна річ має ${tier.statCount} випадкові унікальні характеристики з ${window.GameBunkerTestData.ALL_STATS.length}.`;
    const exampleItem = setItems(set.id)[0];
    const exampleStats = Object.entries(exampleItem?.bonuses || {}).map(([stat, value]) => `<span><em>${statLabel(stat)}</em><b>${formatStat(stat, value)}</b></span>`).join("");
    return `<article class="bunker-set-card rarity-${set.id}" style="--set-accent:${set.color}">
      <header class="bunker-set-card__head">
        <div><small>${t(`rarities.${set.rarity}`, set.short)}</small><h2>${set.name}</h2></div>
        <b>${t("bunker.free", "Безкоштовно")}</b>
      </header>
      <div class="bunker-set-card__meta">
        <span>${t("bunker.pieces", "12 речей")}</span>
        <span>${t("bunker.owned", "У рюкзаку")}: ${owned}/12</span>
        <span>${t("bunker.active", "Одягнено")}: ${equipped}/12</span>
      </div>
      <p class="bunker-set-card__note stat-rule">${statRule}</p>
      <section class="bunker-set-card__stats"><strong>Приклад: ${window.GameBunkerTestData.SLOT_DEFS[0].label}</strong><div>${exampleStats}</div></section>
      <div class="bunker-set-card__actions">
        <button type="button" data-bunker-take="${set.id}">${t("bunker.takeSet", "Отримати сет")}</button>
        <button type="button" class="is-primary" data-bunker-equip="${set.id}">${t("bunker.equipSet", "Одягнути сет")}</button>
      </div>
    </article>`;
  }

  function render() {
    const host = grid();
    if (!host || !window.GameBunkerTestData) return;
    host.innerHTML = window.GameBunkerTestData.SETS.map(renderCard).join("");
    host.querySelectorAll("[data-bunker-take]").forEach((button) => button.addEventListener("click", () => addSet(button.dataset.bunkerTake)));
    host.querySelectorAll("[data-bunker-equip]").forEach((button) => button.addEventListener("click", () => equipSet(button.dataset.bunkerEquip)));
  }

  function bind() {
    render();
    window.addEventListener("game:state-changed", () => {
      if (screen()?.getAttribute("aria-hidden") === "false") render();
    });
  }

  window.GameBunker = { bind, render, addSet, equipSet };
})();

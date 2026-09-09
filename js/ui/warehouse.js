(function () {
  const FILTERS = ["all", "ammo", "medicine", "resources", "tools", "artifacts", "other"];
  let activeFilter = "all";
  let activeTab = "bag";
  let selectedId = "";
  let lastFocused = null;

  const $ = (id) => document.getElementById(id);
  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;
  const tf = (key, vars = {}, fallback = "") => window.GameI18n?.format?.(key, vars, fallback) || fallback;

  function warehouseState() {
    window.GameState.warehouse = window.GameState.warehouse && typeof window.GameState.warehouse === "object"
      ? window.GameState.warehouse
      : { level: 1 };
    window.GameState.warehouse.level = Math.max(1, Math.min(5, Number(window.GameState.warehouse.level) || 1));
    return window.GameState.warehouse;
  }

  function itemName(item) {
    if (!item) return "";
    return window.GameI18n?.resolve?.(item.nameKey || `items.${item.id}`) || item.id;
  }

  function bagQty(id) { return window.GameInventory?.getQuantity?.(id) || 0; }
  function storageQty(id) { return window.GameInventory?.getStorageQuantity?.(id) || 0; }
  function totalQty(id) { return bagQty(id) + storageQty(id); }
  function visibleQty(id) { return activeTab === "stash" ? storageQty(id) : bagQty(id); }

  function storageUsedSlots() {
    return Object.values(window.GameState.storage || {}).filter((qty) => Number(qty) > 0).length;
  }

  function matchesFilter(item, filter) {
    if (filter === "all") return true;
    if (filter === "ammo") return item.category === "ammo";
    if (filter === "medicine") return item.category === "medicine";
    if (filter === "resources") return item.category === "resources" || item.category === "trophies";
    if (filter === "tools") return item.category === "tools";
    if (filter === "artifacts") return item.type === "artifact" || String(item.id).includes("artifact");
    return !["ammo", "medicine", "resources", "trophies", "tools"].includes(item.category) && item.type !== "artifact";
  }

  function allOwnedItems() {
    return window.GameInventoryData.allItems()
      .filter((item) => totalQty(item.id) > 0)
      .sort((a, b) => itemName(a).localeCompare(itemName(b), "uk"));
  }

  function setMessage(message) {
    const node = $("warehouseMessage");
    if (node) node.textContent = message || "";
  }

  function renderFilters() {
    const root = $("warehouseFilters");
    if (!root) return;
    root.innerHTML = FILTERS.map((id) => `
      <button class="warehouse-filter ${id === activeFilter ? "is-active" : ""}" type="button" data-warehouse-filter="${id}" aria-pressed="${id === activeFilter}">
        ${t(`warehouse.filters.${id}`, id)}
      </button>`).join("");
  }

  function renderSelection() {
    const root = $("warehouseSelection");
    const item = window.GameInventoryData.getItem(selectedId);
    if (!root) return;
    if (!item || visibleQty(item.id) <= 0) {
      selectedId = "";
      root.textContent = t("warehouse.selectedHint", "Оберіть предмет, щоб переміщати його між сумкою і сховищем.");
      return;
    }
    root.innerHTML = `<b>${itemName(item)}</b>&nbsp; · &nbsp;${t("warehouse.inBag", "Сумка")} <em>×${bagQty(item.id)}</em>&nbsp; · &nbsp;${t("warehouse.inStorage", "Сховище")} <em>×${storageQty(item.id)}</em>`;
  }

  function renderGrid() {
    const root = $("warehouseGrid");
    const empty = $("warehouseEmpty");
    const title = document.querySelector('.warehouse-panel[data-warehouse-panel="stash"] .warehouse-panel__head h3');
    if (!root) return;

    const items = allOwnedItems()
      .filter((item) => visibleQty(item.id) > 0)
      .filter((item) => matchesFilter(item, activeFilter));

    if (title) {
      title.textContent = activeTab === "bag"
        ? t("warehouse.itemsTitleBag", "Речі у сумці")
        : t("warehouse.itemsTitleStash", "Речі у сховищі");
    }

    if (selectedId && !items.some((item) => item.id === selectedId)) selectedId = "";
    if (!selectedId && items.length) selectedId = items[0].id;

    const cards = items.map((item) => {
      const qty = visibleQty(item.id);
      const image = item.profileIcon
        ? `<img src="${item.profileIcon}" alt="" draggable="false">`
        : `<span class="warehouse-item__emoji" aria-hidden="true">${item.icon || "□"}</span>`;
      return `<button class="warehouse-item ${item.id === selectedId ? "is-selected" : ""}" type="button" data-warehouse-item="${item.id}" aria-label="${itemName(item)} ×${qty}">
        ${image}
        <span class="warehouse-item__name">${itemName(item)}</span>
        <b class="warehouse-item__qty">${qty}</b>
      </button>`;
    });

    const minimumCells = 18;
    for (let i = cards.length; i < minimumCells; i += 1) cards.push('<span class="warehouse-item warehouse-item--empty" aria-hidden="true"></span>');
    root.innerHTML = cards.join("");
    if (empty) {
      empty.textContent = activeTab === "bag"
        ? t("warehouse.noItemsBag", "У сумці поки немає предметів у цій категорії.")
        : t("warehouse.noItemsStash", "У сховищі поки немає предметів у цій категорії.");
      empty.hidden = items.length > 0;
    }
    renderSelection();
    renderActionState();
  }

  function renderTabs() {
    document.querySelectorAll("[data-warehouse-tab]").forEach((button) => {
      const active = button.dataset.warehouseTab === activeTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-warehouse-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.warehousePanel !== "stash";
    });
  }

  function bonusListMarkup(levelData) {
    return (levelData?.bonuses || []).map((key) => `<li>${t(`warehouse.bonuses.${key}`, key)}</li>`).join("");
  }

  function availableResource(id) {
    return bagQty(id) + storageQty(id);
  }

  function canPayUpgrade(current) {
    if (!current?.upgrade) return false;
    const cost = current.upgrade;
    return Number(window.GameState.player.money || 0) >= cost.money
      && availableResource("scrap") >= cost.scrap
      && availableResource("battery") >= cost.battery;
  }

  function requirementMarkup(label, current, needed, icon) {
    const missing = current < needed;
    return `<span class="warehouse-requirement ${missing ? "is-missing" : ""}"><span aria-hidden="true">${icon}</span>${label}<b>${current}/${needed}</b></span>`;
  }

  function renderLevelPanel() {
    const state = warehouseState();
    const current = window.GameWarehouseData.getLevel(state.level);
    const next = window.GameWarehouseData.getNextLevel(state.level);
    const used = storageUsedSlots();
    const cap = current.capacity;
    const pct = cap ? Math.min(100, used / cap * 100) : 0;

    $("warehouseCapacityMini").textContent = `${used} / ${cap}`;
    $("warehouseLevelLabel").textContent = tf("warehouse.levelPanel.level", { level: current.level }, `Рівень ${current.level}`);
    $("warehouseOccupied").textContent = `${used} / ${cap}`;
    $("warehouseLevelProgress").style.width = `${pct}%`;
    $("warehouseCurrentBonuses").innerHTML = bonusListMarkup(current);

    const nextSection = $("warehouseNextUpgrade");
    const maxSection = $("warehouseMaxLevel");
    if (next) {
      nextSection.hidden = false;
      maxSection.hidden = true;
      $("warehouseNextLevelLabel").textContent = tf("warehouse.levelPanel.level", { level: next.level }, `Рівень ${next.level}`);
      $("warehouseNextBonuses").innerHTML = bonusListMarkup(next);
      const cost = current.upgrade;
      const money = Number(window.GameState.player.money || 0);
      $("warehouseRequirements").innerHTML = [
        requirementMarkup(t("warehouse.levelPanel.scrap", "Металобрухт"), availableResource("scrap"), cost.scrap, "⚙"),
        requirementMarkup(t("warehouse.levelPanel.battery", "Батареї"), availableResource("battery"), cost.battery, "▣"),
        requirementMarkup(t("warehouse.levelPanel.money", "Гроші"), money, cost.money, "₴")
      ].join("");
      $("warehouseUpgrade").disabled = !canPayUpgrade(current);
    } else {
      nextSection.hidden = true;
      maxSection.hidden = false;
    }

    const workshop = $("warehouseWorkshopStatus");
    if (workshop) workshop.textContent = state.level >= 2
      ? t("warehouse.workshop.unlocked", "Базовий доступ відкрито.")
      : t("warehouse.workshop.locked", "Розділ відкривається з 2 рівня складу.");

    const crates = window.GameInventoryData.allItems().filter((item) => item.type === "crate").reduce((sum, item) => sum + totalQty(item.id), 0);
    const crateCount = $("warehouseCrateCount");
    if (crateCount) crateCount.textContent = tf("warehouse.containers.count", { count: crates }, `Доступно ящиків: ${crates}`);

    const summary = $("warehouseUpgradeSummary");
    if (summary) summary.innerHTML = next
      ? `<ul class="warehouse-summary-list">${bonusListMarkup(next)}</ul>`
      : `<strong>${t("warehouse.levelPanel.maxTitle", "Максимальний рівень")}</strong><p>${t("warehouse.levelPanel.maxText", "Усі покращення складу вже відкриті.")}</p>`;
  }

  function renderActionState() {
    const item = window.GameInventoryData.getItem(selectedId);
    const store = $("warehouseStore");
    const take = $("warehouseTake");
    const crate = $("warehouseOpenCrate");
    const usableSelection = item && visibleQty(item.id) > 0;
    if (store) store.disabled = !usableSelection || activeTab !== "bag" || bagQty(item.id) <= 0;
    if (take) take.disabled = !usableSelection || activeTab !== "stash" || storageQty(item.id) <= 0;
    if (crate) crate.disabled = !usableSelection || item.type !== "crate";
  }

  function render() {
    renderTabs();
    renderFilters();
    renderGrid();
    renderLevelPanel();
  }

  function storeSelected() {
    if (!selectedId) return setMessage(t("warehouse.messages.selectItem", "Спочатку оберіть предмет."));
    if (!bagQty(selectedId)) return setMessage(t("warehouse.messages.nothingToStore", "У рюкзаку немає цього предмета."));
    const result = window.GameInventory.moveToStorage(selectedId, 1);
    setMessage(result.ok ? t("warehouse.messages.stored", "Предмет переміщено на склад.") : t("warehouse.messages.nothingToStore", "У рюкзаку немає цього предмета."));
    window.GameHud?.render?.();
    render();
  }

  function takeSelected() {
    if (!selectedId) return setMessage(t("warehouse.messages.selectItem", "Спочатку оберіть предмет."));
    if (!storageQty(selectedId)) return setMessage(t("warehouse.messages.nothingToTake", "На складі немає цього предмета."));
    const result = window.GameInventory.moveFromStorage(selectedId, 1);
    setMessage(result.ok ? t("warehouse.messages.taken", "Предмет переміщено в рюкзак.") : t("warehouse.messages.bagFull", "У рюкзаку недостатньо місця."));
    window.GameHud?.render?.();
    render();
  }

  function openSelectedCrate() {
    let item = window.GameInventoryData.getItem(selectedId);
    if (!item || item.type !== "crate" || !totalQty(item.id)) {
      item = window.GameInventoryData.allItems().find((entry) => entry.type === "crate" && totalQty(entry.id) > 0) || null;
      if (!item) return setMessage(t("warehouse.messages.noCrates", "Немає доступного ящика."));
      selectedId = item.id;
    }

    if (!bagQty(item.id) && storageQty(item.id)) {
      const move = window.GameInventory.moveFromStorage(item.id, 1);
      if (!move.ok) return setMessage(t("warehouse.messages.bagFull", "У рюкзаку недостатньо місця."));
    }

    const result = window.GameInventory.useItem(item.id);
    setMessage(result?.message || t("warehouse.messages.selectCrate", "Оберіть ящик, який хочете відкрити."));
    window.GameHud?.render?.();
    render();
  }

  function removeResourceEverywhere(id, qty) {
    let left = Math.max(0, Math.floor(qty));
    if (!left) return;
    const fromBag = Math.min(left, bagQty(id));
    if (fromBag) {
      window.GameInventory.removeItem(id, fromBag, { silent: true });
      left -= fromBag;
    }
    if (left) {
      const stored = storageQty(id);
      const removed = Math.min(left, stored);
      const remain = stored - removed;
      if (remain) window.GameState.storage[id] = remain;
      else delete window.GameState.storage[id];
      left -= removed;
    }
  }

  function upgradeWarehouse() {
    const state = warehouseState();
    const current = window.GameWarehouseData.getLevel(state.level);
    const next = window.GameWarehouseData.getNextLevel(state.level);
    if (!next || !current.upgrade) return setMessage(t("warehouse.messages.maxLevel", "Склад уже має максимальний рівень."));
    if (!canPayUpgrade(current)) return setMessage(t("warehouse.messages.upgradeMissing", "Не вистачає ресурсів для покращення."));

    window.GameState.player.money -= current.upgrade.money;
    removeResourceEverywhere("scrap", current.upgrade.scrap);
    removeResourceEverywhere("battery", current.upgrade.battery);
    state.level = next.level;
    window.GameInventory.syncWeight();
    window.GameStateStore.save();
    window.GameHud?.render?.();
    setMessage(tf("warehouse.messages.upgradeDone", { level: next.level }, `Склад покращено до рівня ${next.level}.`));
    render();
  }

  function open() {
    const modal = $("warehouseModal");
    if (!modal) return;
    lastFocused = document.activeElement;
    setMessage("");
    activeTab = "bag";
    activeFilter = "all";
    modal.hidden = false;
    document.body.classList.add("is-warehouse-open");
    window.GameI18n?.applyTranslations?.(modal);
    render();
    requestAnimationFrame(() => $("warehouseClose")?.focus());
  }

  function close() {
    const modal = $("warehouseModal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("is-warehouse-open");
    document.querySelector('[data-hub-point="storage"]')?.classList.remove("is-active");
    lastFocused?.focus?.();
  }

  function bind() {
    $("warehouseClose")?.addEventListener("click", close);
    $("warehouseBackdrop")?.addEventListener("click", close);
    $("warehouseStore")?.addEventListener("click", storeSelected);
    $("warehouseTake")?.addEventListener("click", takeSelected);
    $("warehouseOpenCrate")?.addEventListener("click", openSelectedCrate);
    $("warehouseUpgrade")?.addEventListener("click", upgradeWarehouse);

    $("warehouseFilters")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-warehouse-filter]");
      if (!button) return;
      activeFilter = button.dataset.warehouseFilter || "all";
      setMessage("");
      renderFilters();
      renderGrid();
    });

    $("warehouseGrid")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-warehouse-item]");
      if (!button) return;
      selectedId = button.dataset.warehouseItem || "";
      setMessage("");
      renderGrid();
    });

    document.querySelectorAll("[data-warehouse-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activeTab = button.dataset.warehouseTab || "bag";
        setMessage("");
        render();
      });
    });

    window.addEventListener("game:state-changed", () => {
      if (!$("warehouseModal")?.hidden) render();
    });
  }

  window.GameWarehouse = { bind, open, close, render };
})();

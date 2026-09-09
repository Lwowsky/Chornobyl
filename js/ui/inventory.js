(function () {
  let activeCategory = "all";
  let selectedId = "";
  let searchTerm = "";
  let sortMode = "category";
  let statusMessage = "";

  const t = (key, fallback = "") => window.GameI18n?.resolve(key) || fallback;
  const itemName = (id) => t(`items.${id}`, id);
  const itemDescription = (id) => t(`itemDescriptions.${id}`, t("inventory.defaultItemDescription", "Предмет із Зони."));
  const quantityFor = (id) => window.GameInventory.getQuantity(id);

  function entries() {
    let list = window.GameInventoryData.allItems()
      .map((item) => ({ item, qty: quantityFor(item.id) }))
      .filter((entry) => entry.qty > 0);

    if (activeCategory !== "all") {
      list = list.filter((entry) => entry.item.category === activeCategory);
    }

    const term = searchTerm.trim().toLocaleLowerCase("uk");
    if (term) {
      list = list.filter((entry) => `${itemName(entry.item.id)} ${itemDescription(entry.item.id)}`
        .toLocaleLowerCase("uk")
        .includes(term));
    }

    const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
    list.sort((a, b) => {
      if (sortMode === "name") return itemName(a.item.id).localeCompare(itemName(b.item.id), "uk");
      if (sortMode === "weight") return (b.item.weight || 0) - (a.item.weight || 0);
      if (sortMode === "qty") return b.qty - a.qty;
      if (sortMode === "rarity") {
        return (rarityOrder[b.item.rarity || "common"] || 0) - (rarityOrder[a.item.rarity || "common"] || 0);
      }
      return String(a.item.category).localeCompare(String(b.item.category))
        || itemName(a.item.id).localeCompare(itemName(b.item.id), "uk");
    });
    return list;
  }

  function renderCategories() {
    const host = document.getElementById("inventoryCategories");
    if (!host) return;
    const categories = [{ id: "all", icon: "assets/nav/inventory.webp" }, ...window.GameInventoryData.categories];

    host.innerHTML = categories.map((category) => {
      const count = category.id === "all"
        ? window.GameInventoryData.allItems().filter((item) => quantityFor(item.id) > 0).length
        : window.GameInventoryData.allItems().filter((item) => item.category === category.id && quantityFor(item.id) > 0).length;
      return `<button class="inventory-category ${activeCategory === category.id ? "is-active" : ""}" type="button" data-inventory-category="${category.id}">
        <img src="${category.icon}" alt=""><span>${t(`inventory.categories.${category.id}`, category.id)}</span><b>${count}</b>
      </button>`;
    }).join("");

    host.querySelectorAll("[data-inventory-category]").forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.inventoryCategory;
        selectedId = "";
        statusMessage = "";
        window.GameInventoryDetails?.closeMobile?.();
        render();
      });
    });
  }

  function markSelectedItem() {
    document.querySelectorAll("[data-inventory-item]").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.inventoryItem === selectedId);
    });
  }

  function renderGrid() {
    const host = document.getElementById("inventoryGrid");
    if (!host) return;
    const list = entries();
    const counter = document.getElementById("inventoryVisibleCount");
    if (counter) counter.textContent = list.length;

    if (!list.length) {
      host.innerHTML = `<div class="inventory-empty"><strong>${t("inventory.empty", "Тут поки порожньо")}</strong><span>${t("inventory.emptyBag", "Знайдені предмети з’являться тут.")}</span></div>`;
      selectedId = "";
      renderDetails();
      return;
    }

    if (!selectedId || !list.some((entry) => entry.item.id === selectedId)) {
      selectedId = list[0].item.id;
    }

    host.innerHTML = list.map(({ item, qty }) => {
      const weight = (Number(item.weight) || 0).toFixed(2);
      return `<button class="inventory-item ${selectedId === item.id ? "is-selected" : ""}" type="button" data-inventory-item="${item.id}">
        <span class="inventory-item__icon"><img src="${item.profileIcon || "assets/inventory-items/item_backpack.webp"}" alt=""></span>
        <span class="inventory-item__copy">
          <strong>${itemName(item.id)}</strong>
          <small>${t(`inventory.categories.${item.category}`, item.category)} · ${weight} кг</small>
        </span>
        <b>×${qty}</b>
      </button>`;
    }).join("");

    host.querySelectorAll("[data-inventory-item]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedId = button.dataset.inventoryItem;
        statusMessage = "";
        markSelectedItem();
        renderDetails();
        window.GameInventoryDetails?.openMobile?.();
      });
    });
  }

  function renderDetails() {
    const item = selectedId ? window.GameInventoryData.getItem(selectedId) : null;
    const qty = item ? quantityFor(item.id) : 0;
    window.GameInventoryDetails?.render?.({
      item,
      qty,
      statusMessage,
      onAction: handleAction
    });
  }

  function handleAction(action, slot) {
    let result = { ok: false, message: t("inventory.messages.unavailable", "Дія недоступна.") };

    if (action === "use") result = window.GameInventory.useItem(selectedId);
    else if (action === "equip") result = window.GameEquipment.equip(selectedId);
    else if (action === "unequip") result = window.GameEquipment.unequip(slot);

    statusMessage = result.message || "";
    window.GameHud?.render?.();
    window.GameEquipment?.renderProfile?.();
    window.GameProfile?.renderAll?.();
    render();
  }

  function render() {
    if (!document.getElementById("inventoryView")) return;
    window.GameInventory.syncWeight();
    renderCategories();
    renderGrid();
    renderDetails();
  }

  function bind() {
    window.GameInventoryDetails?.bind?.();

    document.getElementById("inventorySearch")?.addEventListener("input", (event) => {
      searchTerm = event.target.value;
      selectedId = "";
      statusMessage = "";
      window.GameInventoryDetails?.closeMobile?.();
      render();
    });

    document.getElementById("inventorySort")?.addEventListener("click", () => {
      const modes = ["category", "name", "weight", "qty", "rarity"];
      sortMode = modes[(modes.indexOf(sortMode) + 1) % modes.length];
      const label = document.getElementById("inventorySortLabel");
      if (label) label.textContent = t(`inventory.sortModes.${sortMode}`, sortMode);
      render();
    });

    window.addEventListener("game:state-changed", render);
    render();
  }

  window.GameInventoryUi = { bind, render };
})();

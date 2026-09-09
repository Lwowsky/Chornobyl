(function () {
  const MOBILE_QUERY = "(max-width: 720px)";

  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;
  const tf = (key, vars = {}, fallback = "") => window.GameI18n?.format?.(key, vars, fallback) || fallback;

  function isMobile() {
    return window.matchMedia?.(MOBILE_QUERY)?.matches ?? window.innerWidth <= 720;
  }

  function host() {
    return document.getElementById("inventoryDetails");
  }

  function backdrop() {
    return document.getElementById("inventoryDetailsBackdrop");
  }

  function openMobile() {
    if (!isMobile()) return;
    const panel = host();
    const shade = backdrop();
    if (!panel) return;
    panel.classList.add("is-mobile-open");
    panel.setAttribute("aria-hidden", "false");
    if (shade) shade.hidden = false;
    document.getElementById("inventoryDetailsClose")?.focus?.({ preventScroll: true });
  }

  function closeMobile() {
    const panel = host();
    const shade = backdrop();
    panel?.classList.remove("is-mobile-open");
    if (isMobile()) panel?.setAttribute("aria-hidden", "true");
    else panel?.setAttribute("aria-hidden", "false");
    if (shade) shade.hidden = true;
  }

  function statLabel(stat) {
    const labels = {
      hp: ["profile.stats.health", "Здоров’я"],
      maxHp: ["profile.stats.health", "Здоров’я"],
      energy: ["hud.energy", "Енергія"],
      maxEnergy: ["hud.energy", "Енергія"],
      radiation: ["hud.radiation", "Радіація"],
      protection: ["profile.stats.defense", "Захист"],
      attack: ["profile.stats.attack", "Атака"],
      defense: ["profile.stats.defense", "Захист"],
      stamina: ["profile.stats.stamina", "Витривалість"],
      radiationResistance: ["profile.stats.radiationResistance", "Радіозахист"],
      critChance: ["profile.stats.critChance", "Шанс крит. удару"],
      critDamage: ["profile.stats.critDamage", "Крит. шкода"],
      carryWeight: ["profile.stats.carryWeight", "Вага"]
    };
    const [key, fallback] = labels[stat] || ["", stat];
    return key ? t(key, fallback) : fallback;
  }

  function statSuffix(stat) {
    if (["radiationResistance", "critChance", "critDamage"].includes(stat)) return "%";
    if (stat === "carryWeight") return " кг";
    return "";
  }

  function effectRows(item) {
    const rows = [];
    if (item?.action?.stat) {
      const sign = item.action.type === "reduce" ? "−" : "+";
      rows.push({
        label: statLabel(item.action.stat),
        value: `${sign}${Number(item.action.amount || 0)}${statSuffix(item.action.stat)}`
      });
    }

    const bonuses = window.GameEquipment?.getItemBonuses?.(item?.id) || item?.bonuses || {};
    Object.entries(bonuses).forEach(([stat, value]) => {
      rows.push({
        label: statLabel(stat),
        value: `+${Number(value)}${statSuffix(stat)}`
      });
    });
    return rows;
  }

  function buildActions(item, equippedSlot) {
    const buttons = [];
    if (item.type === "consumable" || item.type === "crate") {
      buttons.push(`<button type="button" data-inventory-action="use">${t("inventory.actions.use", "Використати")}</button>`);
    }
    if (item.type === "equipment" && !equippedSlot) {
      buttons.push(`<button type="button" data-inventory-action="equip">${t("inventory.actions.equip", "Екіпірувати")}</button>`);
    }
    if (equippedSlot) {
      buttons.push(`<button type="button" class="is-secondary" data-inventory-action="unequip" data-slot="${equippedSlot}">${t("inventory.actions.unequip", "Зняти")}</button>`);
    }
    return buttons.join("");
  }

  function renderEffects(item) {
    const rows = effectRows(item);
    if (!rows.length) return "";
    return `<section class="inventory-detail-effects">
      <strong>${t("inventory.details.effects", "Ефект / характеристики")}</strong>
      <div>${rows.map((row) => `<span><em>${row.label}</em><b>${row.value}</b></span>`).join("")}</div>
    </section>`;
  }

  function render({ item, qty = 0, statusMessage = "", onAction } = {}) {
    const panel = host();
    if (!panel) return;

    if (!item || !qty) {
      panel.innerHTML = `<div class="inventory-details-empty">
        <img src="assets/inventory-items/item_backpack.webp" alt="">
        <strong>${t("inventory.selectItem", "Оберіть предмет")}</strong>
        <span>${t("inventory.selectItemHint", "Тут з'явиться опис і доступні дії.")}</span>
      </div>`;
      closeMobile();
      return;
    }

    const equippedSlot = Object.entries(window.GameState?.equipment || {}).find(([, id]) => id === item.id)?.[0] || "";
    const unitWeight = Number(item.weight) || 0;
    const totalWeight = unitWeight * qty;
    const category = t(`inventory.categories.${item.category}`, item.category);
    const itemName = t(`items.${item.id}`, item.id);
    const description = t(`itemDescriptions.${item.id}`, t("inventory.defaultItemDescription", "Предмет із Зони."));

    panel.innerHTML = `<button class="inventory-details__close" id="inventoryDetailsClose" type="button" aria-label="${t("inventory.details.close", "Закрити опис предмета")}">×</button>
      <div class="inventory-detail-card">
        <div class="inventory-detail-card__hero">
          <img src="${item.profileIcon || "assets/inventory-items/item_backpack.webp"}" alt="">
          <span>${category}</span>
        </div>
        <div class="inventory-detail-heading">
          <div>
            <span>${category}</span>
            <h2 id="inventoryDetailsTitle">${itemName}</h2>
          </div>
          ${equippedSlot ? `<b class="inventory-detail-equipped">${t("inventory.details.equipped", "Екіпіровано")}</b>` : ""}
        </div>
        <p>${description}</p>
        ${renderEffects(item)}
        <dl>
          <div><dt>${t("inventory.quantity", "Кількість")}</dt><dd>×${qty}</dd></div>
          <div><dt>${t("inventory.unitWeight", "Вага 1 шт.")}</dt><dd>${tf("inventory.itemWeightValue", { value: unitWeight.toFixed(2) }, `${unitWeight.toFixed(2)} кг`)}</dd></div>
          <div><dt>${t("inventory.totalWeight", "Загальна вага")}</dt><dd>${tf("inventory.itemWeightValue", { value: totalWeight.toFixed(2) }, `${totalWeight.toFixed(2)} кг`)}</dd></div>
          ${item.slot ? `<div><dt>${t("inventory.slot", "Слот")}</dt><dd>${t(`slots.${item.slot}`, item.slot)}</dd></div>` : ""}
        </dl>
        ${statusMessage ? `<div class="inventory-detail-status">${statusMessage}</div>` : ""}
        <div class="inventory-detail-actions">${buildActions(item, equippedSlot)}</div>
      </div>`;

    panel.scrollTop = 0;
    panel.querySelectorAll("[data-inventory-action]").forEach((button) => {
      button.addEventListener("click", () => onAction?.(button.dataset.inventoryAction, button.dataset.slot));
    });
    document.getElementById("inventoryDetailsClose")?.addEventListener("click", closeMobile);
  }

  function bind() {
    backdrop()?.addEventListener("click", closeMobile);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMobile();
    });
    window.addEventListener("resize", () => {
      if (!isMobile()) closeMobile();
    });
  }

  window.GameInventoryDetails = { bind, render, openMobile, closeMobile, isMobile };
})();

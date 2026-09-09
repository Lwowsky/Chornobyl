(function () {
  let activeSlot = "";
  let selectedItemId = "";
  let lastFocused = null;
  let statusMessage = "";

  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;

  function modal() { return document.getElementById("profileEquipmentPicker"); }
  function bodyHost() { return document.getElementById("profileEquipmentPickerList"); }

  function statLabel(stat) {
    const map = {
      maxHp: ["profile.stats.health", "Здоров’я"],
      maxEnergy: ["hud.energy", "Енергія"],
      attack: ["profile.stats.attack", "Атака"],
      defense: ["profile.stats.defense", "Захист"],
      stamina: ["profile.stats.stamina", "Витривалість"],
      radiationResistance: ["profile.stats.radiationResistance", "Радіозахист"],
      critChance: ["profile.stats.critChance", "Шанс крит. удару"],
      critDamage: ["profile.stats.critDamage", "Крит. шкода"],
      carryWeight: ["profile.stats.carryWeight", "Вага"]
    };
    const [key, fallback] = map[stat] || ["", stat];
    return key ? t(key, fallback) : fallback;
  }

  function statSuffix(stat) {
    if (["radiationResistance", "critChance", "critDamage"].includes(stat)) return "%";
    if (stat === "carryWeight") return " кг";
    return "";
  }

  function formatValue(stat, value) {
    const n = Number(value) || 0;
    const fixed = Number.isInteger(n) ? n : Math.round(n * 100) / 100;
    return `${fixed >= 0 ? "+" : ""}${fixed}${statSuffix(stat)}`;
  }

  function equippedItemId() {
    return window.GameEquipment?.getEquipped?.(activeSlot) || "";
  }

  function candidates() {
    return window.GameEquipment?.availableForSlot?.(activeSlot) || [];
  }

  function selectedItem() {
    return selectedItemId ? window.GameInventoryData.getItem(selectedItemId) : null;
  }

  function renderStatRows(item, level) {
    const bonuses = window.GameEquipmentUpgrades?.scaleBonuses?.(item, level) || window.GameEquipment?.getItemBonuses?.(item) || {};
    const rows = Object.entries(bonuses);
    if (!rows.length) return `<div class="profile-item-popup__empty-stats">${t("profile.itemPopup.noStats", "Без додаткових характеристик")}</div>`;
    return rows.map(([stat, value]) => `<div><span>${statLabel(stat)}</span><b>${formatValue(stat, value)}</b></div>`).join("");
  }

  function renderUpgradeRows(item, currentLevel, nextLevel) {
    const current = window.GameEquipmentUpgrades?.scaleBonuses?.(item, currentLevel) || {};
    const next = window.GameEquipmentUpgrades?.scaleBonuses?.(item, nextLevel) || {};
    return Object.keys(current).map((stat) => {
      const now = Number(current[stat] || 0);
      const after = Number(next[stat] || 0);
      const delta = Math.round((after - now) * 100) / 100;
      return `<div class="profile-item-upgrade-row"><span>${statLabel(stat)}</span><b>${formatValue(stat, now)}</b><em>→ ${formatValue(stat, after)}</em><strong>+${delta}${statSuffix(stat)}</strong></div>`;
    }).join("");
  }

  function renderCandidateList() {
    const currentId = equippedItemId();
    const list = candidates();
    const cards = [];

    if (currentId) {
      const current = window.GameInventoryData.getItem(currentId);
      if (current) {
        const rarityClass = window.GameEquipmentRarity?.rarityClass?.(current) || "";
        cards.push(`<button type="button" class="profile-item-candidate is-equipped ${rarityClass}" data-profile-select-item="${current.id}">
        <img src="${current.profileIcon}" alt=""><span><small>${t("profile.equipmentPicker.current", "Зараз екіпіровано")}</small><strong>${t(`items.${current.id}`, current.id)}</strong></span><b>✓</b>
      </button>`);
      }
    }

    list.forEach(({ item, qty }) => {
      const rarityClass = window.GameEquipmentRarity?.rarityClass?.(item) || "";
      cards.push(`<button type="button" class="profile-item-candidate ${rarityClass}" data-profile-select-item="${item.id}">
        <img src="${item.profileIcon}" alt=""><span><small>${t("profile.equipmentPicker.inBackpack", "У рюкзаку")} ×${qty}</small><strong>${t(`items.${item.id}`, item.id)}</strong></span><b>›</b>
      </button>`);
    });

    if (!cards.length) {
      return `<div class="profile-equipment-picker__empty compact">
        <strong>${t("profile.itemPopup.emptySlot", "Слот порожній")}</strong>
        <span>${t("profile.equipmentPicker.emptyHint", "Знайдіть або отримайте відповідне спорядження, після чого воно з’явиться тут.")}</span>
      </div>`;
    }

    return `<div class="profile-item-popup__chooser"><div class="profile-item-popup__chooser-title">${t("profile.itemPopup.chooseItem", "Оберіть предмет")}</div>${cards.join("")}</div>`;
  }

  function renderItem(item) {
    const equipped = equippedItemId() === item.id;
    const level = window.GameEquipmentUpgrades?.getLevel?.(item.id) || 1;
    const max = window.GameEquipmentUpgrades?.MAX_LEVEL || 25;
    const next = window.GameEquipmentUpgrades?.nextLevel?.(item.id);
    const recipe = window.GameEquipmentUpgrades?.cost?.(item.id);
    const canUpgrade = window.GameEquipmentUpgrades?.canUpgrade?.(item.id);
    const promotion = window.GameEquipmentPromotion?.preview?.(item);
    const canPromote = window.GameEquipmentPromotion?.canPromote?.(item);
    const qty = window.GameInventory?.getQuantity?.(item.id) || 0;
    const description = t(`itemDescriptions.${item.id}`, t("inventory.defaultItemDescription", "Предмет із Зони."));
    const slotName = t(`slots.${item.slot}`, item.slot);
    const tier = window.GameEquipmentRarity?.getTier?.(item.testSet || item.rarityTier || item.rarity) || { id: "white", label: "Білий", statCount: 2 };
    const rarityClass = `rarity-${tier.id}`;
    const statCount = Array.isArray(item.rolledStats) ? item.rolledStats.length : Object.keys(window.GameEquipment?.getItemBonuses?.(item) || {}).length;
    const costHtml = recipe ? Object.entries(recipe).map(([id, amount]) => {
      const have = window.GameInventory?.getQuantity?.(id) || 0;
      return `<span class="${have >= amount ? "enough" : "missing"}">${t(`items.${id}`, id)} <b>${have}/${amount}</b></span>`;
    }).join("") : "";
    const promotionCostHtml = promotion?.recipe ? Object.entries(promotion.recipe).map(([id, amount]) => {
      const have = window.GameInventory?.getQuantity?.(id) || 0;
      return `<span class="${have >= amount ? "enough" : "missing"}">${t(`items.${id}`, id)} <b>${have}/${amount}</b></span>`;
    }).join("") : "";
    const promotionStatsHtml = promotion ? promotion.nextStats.map((stat) => {
      const value = promotion.bonuses?.[stat] || 0;
      const added = promotion.addedStats.includes(stat);
      return `<div class="${added ? "is-new-stat" : ""}"><span>${statLabel(stat)}${added ? ` <em>${t("profile.itemPopup.newStat", "НОВА")}</em>` : ""}</span><b>${formatValue(stat, value)}</b></div>`;
    }).join("") : "";

    return `<article class="profile-item-popup profile-rpg-tooltip ${rarityClass}">
      <div class="profile-item-popup__hero">
        <div class="profile-item-popup__art"><img src="${item.profileIcon}" alt=""></div>
        <div class="profile-item-popup__title">
          <small>${slotName}</small>
          <h4>${t(`items.${item.id}`, item.id)}</h4>
          <div class="profile-item-popup__badges">
            <span class="profile-item-popup__rarity">${tier.label} · ${statCount} ${statCount === 1 ? "характеристика" : "характеристики"}</span>
            <span>+${level} / +${max}</span>
            ${equipped ? `<b>${t("inventory.details.equipped", "Екіпіровано")}</b>` : qty ? `<b>${t("profile.equipmentPicker.inBackpack", "У рюкзаку")} ×${qty}</b>` : ""}
          </div>
        </div>
      </div>

      <div class="profile-item-popup__meta profile-item-popup__meta--compact">
        <div><span>${t("inventory.unitWeight", "Вага")}</span><b>${(Number(item.weight)||0).toFixed(2)} кг</b></div>
        <div><span>${t("profile.itemPopup.upgradeLevel", "Покращення")}</span><b>+${level}</b></div>
      </div>

      <p class="profile-item-popup__description">${description}</p>

      <section class="profile-item-popup__section">
        <div class="profile-item-popup__section-head"><strong>${t("profile.itemPopup.currentStats", "Поточні характеристики")}</strong><span>${statCount}/${window.GameEquipmentRarity?.STATS?.length || 9}</span></div>
        <div class="profile-item-popup__stats">${renderStatRows(item, level)}</div>
      </section>

      ${next ? `<section class="profile-item-popup__section next-upgrade compact-upgrade">
        <div class="profile-item-popup__section-head"><strong>${t("profile.itemPopup.nextUpgrade", "Наступне покращення")}</strong><span>+${next}</span></div>
        <div class="profile-item-popup__upgrade-table">${renderUpgradeRows(item, level, next)}</div>
        <div class="profile-item-popup__materials">${costHtml}</div>
      </section>` : promotion ? `<section class="profile-item-popup__section rarity-promotion ${`rarity-${promotion.to.id}`}">
        <div class="profile-item-popup__section-head"><strong>${t("profile.itemPopup.raiseRarity", "Підвищення рідкості")}</strong><span>${promotion.from.label} → ${promotion.to.label}</span></div>
        <p>${t("profile.itemPopup.raiseRarityHint", "Після +25 річ переходить у наступну рідкість та починає з +1. Старі характеристики зберігаються, нові додаються.")}</p>
        <div class="profile-item-popup__stats promotion-preview">${promotionStatsHtml}</div>
        <div class="profile-item-popup__materials">${promotionCostHtml}</div>
      </section>` : `<div class="profile-item-popup__max">${t("profile.itemPopup.maxed", "Предмет уже має максимальний рівень.")}</div>`}

      ${statusMessage ? `<div class="profile-item-popup__status">${statusMessage}</div>` : ""}

      <div class="profile-item-popup__actions old-style-actions">
        ${next
          ? `<button type="button" class="primary" data-profile-upgrade="${item.id}" ${canUpgrade ? "" : "disabled"}>${t("profile.itemPopup.upgrade", "Покращити")}</button>`
          : promotion
            ? `<button type="button" class="primary promote-rarity" data-profile-promote="${item.id}" ${canPromote ? "" : "disabled"}>${t("profile.itemPopup.promote", "Підвищити рідкість")}</button>`
            : `<button type="button" class="primary" disabled>${t("profile.itemPopup.maxRarity", "Максимум")}</button>`}
        ${equipped
          ? `<button type="button" data-profile-unequip="${activeSlot}">${t("inventory.actions.unequip", "Зняти")}</button>`
          : `<button type="button" data-profile-equip="${item.id}" ${qty > 0 ? "" : "disabled"}>${t("inventory.actions.equip", "Екіпірувати")}</button>`}
        <button type="button" class="ghost" data-profile-back>${t("profile.itemPopup.back", "Назад")}</button>
      </div>
    </article>`;
  }

  function bindDynamic(host) {
    host.querySelectorAll("[data-profile-select-item]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedItemId = button.dataset.profileSelectItem;
        statusMessage = "";
        render();
      });
    });
    host.querySelectorAll("[data-profile-equip]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = window.GameEquipment.equip(button.dataset.profileEquip);
        statusMessage = result?.message || "";
        selectedItemId = equippedItemId() || button.dataset.profileEquip;
        render();
      });
    });
    host.querySelectorAll("[data-profile-unequip]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = window.GameEquipment.unequip(button.dataset.profileUnequip);
        statusMessage = result?.message || "";
        selectedItemId = "";
        render();
      });
    });
    host.querySelectorAll("[data-profile-upgrade]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = window.GameEquipmentUpgrades.upgrade(button.dataset.profileUpgrade);
        statusMessage = result?.message || "";
        render();
      });
    });
    host.querySelectorAll("[data-profile-promote]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = window.GameEquipmentPromotion.promote(button.dataset.profilePromote);
        statusMessage = result?.message || "";
        if (result?.ok && result.targetId) selectedItemId = result.targetId;
        render();
      });
    });
    host.querySelectorAll("[data-profile-back]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedItemId = "";
        statusMessage = "";
        render();
      });
    });
  }

  function render() {
    const host = bodyHost();
    if (!host || !activeSlot) return;
    const slotName = t(`slots.${activeSlot}`, activeSlot);
    const title = document.getElementById("profileEquipmentPickerTitle");
    const hint = document.getElementById("profileEquipmentPickerHint");
    if (title) title.textContent = selectedItemId ? t("profile.itemPopup.title", "Інформація про предмет") : `${t("profile.equipmentPicker.title", "Спорядження")} · ${slotName}`;
    if (hint) hint.textContent = selectedItemId
      ? t("profile.itemPopup.hint", "Перегляньте характеристики, покращіть, одягніть або зніміть предмет.")
      : t("profile.equipmentPicker.slotHint", "Натисніть на предмет, щоб відкрити повну інформацію.");

    const item = selectedItem();
    modal()?.querySelector(".profile-equipment-picker__dialog")?.classList.toggle("is-item-mode", Boolean(item));
    host.innerHTML = item ? renderItem(item) : renderCandidateList();
    bindDynamic(host);
  }

  function open(slot) {
    if (!slot || slot === "ammo") return;
    activeSlot = slot;
    selectedItemId = equippedItemId() || "";
    statusMessage = "";
    lastFocused = document.activeElement;
    render();
    modal().hidden = false;
    document.getElementById("profileEquipmentPickerClose")?.focus?.({ preventScroll: true });
  }

  function close() {
    if (!modal() || modal().hidden) return;
    modal().hidden = true;
    activeSlot = "";
    selectedItemId = "";
    statusMessage = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus({ preventScroll: true });
  }

  function bindSlots() {
    document.querySelectorAll('.equipment-slot[data-slot]').forEach((slot) => {
      if (slot.dataset.slot === "ammo") return;
      slot.classList.add("is-interactive");
      slot.setAttribute("role", "button");
      slot.setAttribute("tabindex", "0");
      slot.setAttribute("aria-label", `${t("profile.equipmentPicker.openSlot", "Відкрити спорядження")}: ${t(`slots.${slot.dataset.slot}`, slot.dataset.slot)}`);
      slot.addEventListener("click", () => open(slot.dataset.slot));
      slot.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(slot.dataset.slot);
        }
      });
    });
  }

  function bind() {
    bindSlots();
    document.getElementById("profileEquipmentPickerClose")?.addEventListener("click", close);
    document.getElementById("profileEquipmentPickerBackdrop")?.addEventListener("click", close);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal()?.hidden === false) {
        event.stopPropagation();
        close();
      }
    });
    window.addEventListener("game:state-changed", () => {
      if (modal()?.hidden === false) render();
    });
  }

  window.GameProfileEquipmentPicker = { bind, open, close, render };
})();

(function () {
  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;
  const SLOT_ORDER = ["head", "mask", "body", "cloak", "pants", "boots", "gloves", "melee", "ranged", "dosimeter", "talisman", "artifact"];
  const PLACEHOLDERS = Object.freeze({
    head: "assets/equipment/placeholders-png/head.webp",
    mask: "assets/equipment/placeholders-png/mask.webp",
    body: "assets/equipment/placeholders-png/body.webp",
    cloak: "assets/equipment/placeholders-png/cloak.webp",
    pants: "assets/equipment/placeholders-png/pants.webp",
    boots: "assets/equipment/placeholders-png/boots.webp",
    gloves: "assets/equipment/placeholders-png/gloves.webp",
    melee: "assets/equipment/placeholders-png/melee.webp",
    ranged: "assets/equipment/placeholders-png/ranged.webp",
    dosimeter: "assets/equipment/placeholders-png/dosimeter.webp"
  });

  function getItemBonuses(itemOrId) {
    const item = typeof itemOrId === "string" ? window.GameInventoryData.getItem(itemOrId) : itemOrId;
    if (!item) return {};
    if (window.GameEquipmentUpgrades?.scaleBonuses) return window.GameEquipmentUpgrades.scaleBonuses(item);
    return item?.bonuses && typeof item.bonuses === "object" ? item.bonuses : {};
  }

  function getBonuses() {
    const totals = {};
    Object.values(window.GameState.equipment || {}).forEach((itemId) => {
      const bonus = getItemBonuses(itemId);
      Object.entries(bonus).forEach(([key, value]) => {
        totals[key] = (totals[key] || 0) + Number(value || 0);
      });
    });
    return totals;
  }

  function getEquipped(slot) {
    return window.GameState.equipment?.[slot] || null;
  }

  function availableForSlot(slot) {
    return window.GameInventoryData.allItems()
      .filter((item) => item.type === "equipment" && item.slot === slot)
      .map((item) => ({ item, qty: window.GameInventory?.getQuantity?.(item.id) || 0 }))
      .filter((entry) => entry.qty > 0);
  }

  function equip(itemId) {
    const item = window.GameInventoryData.getItem(itemId);
    if (!item || item.type !== "equipment" || !item.slot) {
      return { ok: false, message: t("inventory.messages.cannotEquip", "Цей предмет не можна екіпірувати.") };
    }
    if (!window.GameInventory?.getQuantity?.(itemId)) {
      return { ok: false, message: t("inventory.messages.itemMissing", "Предмета немає в рюкзаку.") };
    }

    const current = getEquipped(item.slot);
    if (current === itemId) {
      return { ok: true, message: t("inventory.messages.alreadyEquipped", "Цей предмет уже екіпіровано.") };
    }

    const removedNew = window.GameInventory.removeItem(itemId, 1, { silent: true });
    if (!removedNew) {
      return { ok: false, message: t("inventory.messages.itemMissing", "Предмета немає в рюкзаку.") };
    }

    if (current) {
      const returned = window.GameInventory.addItem(current, 1, { overflowToStorage: false, silent: true });
      if (returned.added < 1) {
        window.GameInventory.addItem(itemId, 1, { overflowToStorage: false, silent: true });
        return { ok: false, message: t("inventory.messages.cannotReplaceEquipped", "У рюкзаку недостатньо місця, щоб зняти поточний предмет.") };
      }
    }

    window.GameState.equipment[item.slot] = itemId;
    window.GameProgression?.syncPlayerStats?.();
    window.GameStateStore.save();
    renderProfile();
    window.GameHud?.render?.();
    window.GameProfile?.renderAll?.();
    window.GameInventoryUi?.render?.();
    return { ok: true, message: t("inventory.messages.equipped", "Предмет екіпіровано.") };
  }

  function unequip(slot) {
    const itemId = getEquipped(slot);
    if (!itemId) return { ok: false, message: t("inventory.messages.emptySlot", "Слот порожній.") };
    const result = window.GameInventory.addItem(itemId, 1, { overflowToStorage: false, silent: true });
    if (result.added < 1) return { ok: false, message: t("inventory.messages.cannotUnequip", "У рюкзаку немає місця.") };
    delete window.GameState.equipment[slot];
    window.GameProgression?.syncPlayerStats?.();
    window.GameStateStore.save();
    renderProfile();
    window.GameHud?.render?.();
    window.GameProfile?.renderAll?.();
    window.GameInventoryUi?.render?.();
    return { ok: true, message: t("inventory.messages.unequipped", "Предмет знято.") };
  }

  function emptyMarkup(slot) {
    const placeholder = PLACEHOLDERS[slot];
    if (placeholder) return `<img src="${placeholder}" alt="">`;
    return `<span aria-hidden="true">${slot === "artifact" ? "◈" : "◇"}</span>`;
  }

  function renderProfile() {
    SLOT_ORDER.forEach((slot) => {
      const host = document.querySelector(`.equipment-slot[data-slot="${slot}"]`);
      if (!host) return;
      const holder = host.querySelector("div");
      if (!holder) return;
      const itemId = getEquipped(slot);
      const item = itemId ? window.GameInventoryData.getItem(itemId) : null;
      host.classList.toggle("is-equipped", Boolean(item));
      host.classList.toggle("is-empty", !item);
      ["white", "green", "blue", "purple", "gold", "red"].forEach((tier) => host.classList.remove(`rarity-${tier}`));
      if (item) {
        const rarityClass = window.GameEquipmentRarity?.rarityClass?.(item);
        if (rarityClass) host.classList.add(rarityClass);
      }
      if (item?.profileIcon) {
        holder.classList.remove("equipment-slot__empty");
        const upgradeLevel = window.GameEquipmentUpgrades?.getLevel?.(item.id) || 1;
        holder.innerHTML = `<img src="${item.profileIcon}" alt="${t(`items.${item.id}`, item.id)}"><b class="equipment-slot__level" aria-label="${t("profile.itemPopup.upgradeLevel", "Покращення")} +${upgradeLevel}">+${upgradeLevel}</b>`;
      } else {
        holder.classList.add("equipment-slot__empty");
        holder.innerHTML = emptyMarkup(slot);
      }
    });

    const ammoCount = window.GameInventory?.getQuantity?.("ammo") || 0;
    const ammoHost = document.querySelector('.equipment-slot[data-slot="ammo"]');
    if (ammoHost) {
      const holder = ammoHost.querySelector("div");
      if (holder) {
        holder.innerHTML = `<img src="assets/inventory-items/item_ammo.webp" alt=""><b class="equipment-slot__count">×${ammoCount}</b>`;
      }
    }
  }

  const BONUSES = new Proxy({}, {
    get(_target, prop) {
      return getItemBonuses(String(prop));
    }
  });

  window.GameEquipment = {
    SLOT_ORDER,
    PLACEHOLDERS,
    BONUSES,
    getItemBonuses,
    getBonuses,
    getEquipped,
    availableForSlot,
    equip,
    unequip,
    renderProfile
  };
})();

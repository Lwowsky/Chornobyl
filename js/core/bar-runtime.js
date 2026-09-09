(function () {
  const {
    BAR_STATE_KEY,
    BAR_MENU_REFRESH_MS,
    BAR_DAILY_REFRESH_MS,
    BAR_RUMOR_REFRESH_MS,
    BAR_RUMOR_DURATION_MS,
    BAR_NPC_RUMOR_REFRESH_MS,
    BAR_NPC_RUMOR_DURATION_MS,
    BAR_BARTENDER_JOB_REFRESH_MS,
    BAR_BARTENDER_SPECIAL_DURATION_MS,
    BAR_RUMOR_JOURNAL_LIMIT,
    BAR_TICK_MS,
    BAR_MENU_ITEMS,
    BAR_DAILY_OFFERS,
    BAR_RUMORS,
    BAR_NPC_RUMORS,
    BAR_BARTENDER_SPECIAL,
    BAR_BARTENDER_JOBS,
    BAR_BARTENDER_JOB_VARIANTS
  } = window.GameBarData;

  let barState = loadBarState();

  function createDefaultBarState() {
    return {
      activeFood: null,
      activeDrink: null,
      activeDaily: null,
      menuPurchaseSlot: null,
      purchasedMenuItems: [],
      dailyPurchaseSlot: null,
      dailyPurchased: false,
      rumorListenSlot: null,
      rumorHeardThisSlot: false,
      activeRumor: null,
      npcRumorSlot: null,
      npcRumorUsed: false,
      activeNpcRumor: null,
      bartenderJobSlot: null,
      bartenderJobUsed: false,
      bartenderQuestLead: null,
      bartenderSpecialSlot: null,
      bartenderSpecialPurchased: false,
      rumorJournal: []
    };
  }

  function loadBarState() {
    try {
      const saved = JSON.parse(localStorage.getItem(BAR_STATE_KEY) || "null");
      if (!saved || typeof saved !== "object") return createDefaultBarState();
      return {
        ...createDefaultBarState(),
        ...saved,
        purchasedMenuItems: Array.isArray(saved.purchasedMenuItems) ? saved.purchasedMenuItems : [],
        rumorJournal: Array.isArray(saved.rumorJournal) ? saved.rumorJournal.slice(0, BAR_RUMOR_JOURNAL_LIMIT) : []
      };
    } catch {
      return createDefaultBarState();
    }
  }

  function saveBarState() {
    localStorage.setItem(BAR_STATE_KEY, JSON.stringify(barState));
  }

  function syncBarPurchaseLocks() {
    const menuSlot = getRefreshSlot(BAR_MENU_REFRESH_MS);
    const dailySlot = getRefreshSlot(BAR_DAILY_REFRESH_MS);
    const rumorSlot = getRefreshSlot(BAR_RUMOR_REFRESH_MS);
    const npcRumorSlot = getRefreshSlot(BAR_NPC_RUMOR_REFRESH_MS);
    const bartenderJobSlot = getRefreshSlot(BAR_BARTENDER_JOB_REFRESH_MS);
    let changed = false;

    if (barState.menuPurchaseSlot !== menuSlot) {
      barState.menuPurchaseSlot = menuSlot;
      barState.purchasedMenuItems = [];
      changed = true;
    }

    if (barState.dailyPurchaseSlot !== dailySlot) {
      barState.dailyPurchaseSlot = dailySlot;
      barState.dailyPurchased = false;
      changed = true;
    }

    if (barState.rumorListenSlot !== rumorSlot) {
      barState.rumorListenSlot = rumorSlot;
      barState.rumorHeardThisSlot = false;
      changed = true;
    }

    if (barState.npcRumorSlot !== npcRumorSlot) {
      barState.npcRumorSlot = npcRumorSlot;
      barState.npcRumorUsed = false;
      changed = true;
    }

    if (barState.bartenderJobSlot !== bartenderJobSlot) {
      barState.bartenderJobSlot = bartenderJobSlot;
      if (!barState.bartenderQuestLead) barState.bartenderJobUsed = false;
      changed = true;
    }

    if (barState.bartenderSpecialSlot !== menuSlot) {
      barState.bartenderSpecialSlot = menuSlot;
      barState.bartenderSpecialPurchased = false;
      changed = true;
    }

    if (changed) saveBarState();
  }

  function hasPurchasedMenuItem(itemId) {
    syncBarPurchaseLocks();
    return barState.purchasedMenuItems.includes(itemId);
  }

  function seededRandom(seed) {
    let value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function getPriceMultiplier(level = window.GameState?.player?.level || 1) {
    return 1 + Math.min(5, Math.floor(Math.max(0, level - 1) / 10)) * 0.25;
  }

  function getBarPrice(basePrice) {
    const level = window.GameState?.player?.level || 1;
    return Math.round((basePrice * getPriceMultiplier(level)) / 5) * 5;
  }

  function getRefreshSlot(ms) {
    return Math.floor(Date.now() / ms);
  }

  function getTimeUntilNext(ms) {
    const remainder = ms - (Date.now() % ms);
    return Math.max(0, remainder);
  }

  function formatCountdown(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatEffect(effect) {
    const value = Number(effect.value) || 0;
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${effect.label} ${sign}${Math.abs(value)}%`;
  }

  function rarityLabel(rarity) {
    return ({ common: "Звичайна", improved: "Покращена", rare: "Рідкісна", special: "Особлива" })[rarity] || rarity;
  }

  function getMenuItems() {
    const level = window.GameState?.player?.level || 1;
    const slot = getRefreshSlot(BAR_MENU_REFRESH_MS);
    const eligible = BAR_MENU_ITEMS.filter((item) => item.minLevel <= level);
    const foods = eligible.filter((item) => item.category === "food");
    const drinks = eligible.filter((item) => item.category === "drink");
    const pick = (pool, count, salt) => {
      const copy = [...pool];
      const result = [];
      for (let i = 0; i < count && copy.length; i += 1) {
        const index = Math.floor(seededRandom(slot + salt + i * 17.31) * copy.length);
        result.push(copy.splice(index, 1)[0]);
      }
      return result;
    };
    return [...pick(foods, 2, 11), ...pick(drinks, 2, 97)];
  }

  function getDailyOffer() {
    const slot = getRefreshSlot(BAR_DAILY_REFRESH_MS);
    return BAR_DAILY_OFFERS[Math.floor(seededRandom(slot + 301) * BAR_DAILY_OFFERS.length)];
  }

  function cleanupExpiredBuffs() {
    const now = Date.now();
    let changed = false;
    ["activeFood", "activeDrink", "activeDaily"].forEach((key) => {
      if (barState[key]?.expiresAt && barState[key].expiresAt <= now) {
        barState[key] = null;
        changed = true;
      }
    });
    if (barState.activeRumor?.expiresAt && barState.activeRumor.expiresAt <= now) {
      barState.activeRumor = null;
      changed = true;
    }
    if (barState.activeNpcRumor?.expiresAt && barState.activeNpcRumor.expiresAt <= now) {
      barState.activeNpcRumor = null;
      changed = true;
    }
    if (changed) saveBarState();
  }

  function getActiveBarBuffs() {
    cleanupExpiredBuffs();
    return [barState.activeFood, barState.activeDrink, barState.activeDaily].filter(Boolean);
  }

  function getActiveRumor() {
    cleanupExpiredBuffs();
    return barState.activeRumor || null;
  }

  function getActiveNpcRumor() {
    cleanupExpiredBuffs();
    return barState.activeNpcRumor || null;
  }

  function getActiveRumors() {
    cleanupExpiredBuffs();
    return [
      barState.activeRumor ? { ...barState.activeRumor, sourceType: "bar", sourceLabel: "Бар" } : null,
      barState.activeNpcRumor ? { ...barState.activeNpcRumor, sourceType: "npc", sourceLabel: "Інформатор" } : null
    ].filter(Boolean);
  }

  function getRumorModifier(key, locationId = "") {
    if (!locationId) return 0;
    const values = getActiveRumors()
      .filter((rumor) => rumor.locationId === locationId)
      .flatMap((rumor) => rumor.effects || [])
      .filter((effect) => effect.key === key)
      .map((effect) => Number(effect.value) || 0);
    if (!values.length) return 0;
    return values.reduce((strongest, value) => Math.abs(value) > Math.abs(strongest) ? value : strongest, values[0]);
  }

  function getBarModifier(key, context = {}) {
    const buffTotal = getActiveBarBuffs().reduce((sum, buff) => {
      return sum + buff.effects.filter((effect) => effect.key === key).reduce((sub, effect) => sub + effect.value, 0);
    }, 0);
    const locationId = typeof context === "string" ? context : context?.locationId || "";
    return buffTotal + (locationId ? getRumorModifier(key, locationId) : 0);
  }

  function buyBarItem(itemId) {
    syncBarPurchaseLocks();
    const item = BAR_MENU_ITEMS.find((candidate) => candidate.id === itemId);
    const player = window.GameState?.player;
    if (!item || !player) return { ok: false, message: "Не вдалося знайти позицію меню." };
    if (player.level < item.minLevel) return { ok: false, message: `Потрібен рівень ${item.minLevel}.` };
    if (hasPurchasedMenuItem(item.id)) {
      return { ok: false, message: `Цю позицію вже куплено. Повторна покупка стане доступна після оновлення меню через ${formatCountdown(getTimeUntilNext(BAR_MENU_REFRESH_MS))}.` };
    }
    const price = getBarPrice(item.basePrice);
    if (player.money < price) return { ok: false, message: `Недостатньо грошей. Потрібно ₴ ${price}.` };
    player.money = Math.round((player.money - price) * 100) / 100;
    const buff = { id: item.id, name: item.name, category: item.category, effects: item.effects, expiresAt: Date.now() + item.duration * 60 * 1000 };
    if (item.category === "food") barState.activeFood = buff;
    else barState.activeDrink = buff;
    barState.purchasedMenuItems.push(item.id);
    saveBarState();
    window.GameStateStore?.save?.();
    window.GameHud?.render?.();
    window.GameBarUi?.renderSideCards?.();
    return { ok: true, message: `${item.name}: бонус активний ${item.duration} хв. Цю позицію вже не можна купити до наступного оновлення меню.` };
  }

  function buyDailyOffer() {
    syncBarPurchaseLocks();
    const offer = getDailyOffer();
    const player = window.GameState?.player;
    if (!player) return { ok: false, message: "Гравця не знайдено." };
    if (barState.dailyPurchased) {
      return { ok: false, message: `Пропозицію дня вже куплено. Наступна стане доступна через ${formatCountdown(getTimeUntilNext(BAR_DAILY_REFRESH_MS))}.` };
    }
    const price = getBarPrice(offer.basePrice);
    if (player.money < price) return { ok: false, message: `Недостатньо грошей. Потрібно ₴ ${price}.` };
    player.money = Math.round((player.money - price) * 100) / 100;
    barState.activeFood = null;
    barState.activeDrink = null;
    barState.activeDaily = { id: offer.id, name: offer.name, category: "daily", effects: offer.effects, expiresAt: Date.now() + offer.duration * 60 * 1000 };
    barState.dailyPurchased = true;
    saveBarState();
    window.GameStateStore?.save?.();
    window.GameHud?.render?.();
    window.GameBarUi?.renderSideCards?.();
    return { ok: true, message: `${offer.name}: комплект активний ${offer.duration} хв. Пропозицію дня вже не можна купити повторно до її оновлення.` };
  }

  function getRumorForCurrentSlot() {
    const slot = getRefreshSlot(BAR_RUMOR_REFRESH_MS);
    const level = window.GameState?.player?.level || 1;
    const seed = slot + level * 0.173 + 1037;
    return BAR_RUMORS[Math.floor(seededRandom(seed) * BAR_RUMORS.length)];
  }

  function listenToBarRumor() {
    syncBarPurchaseLocks();
    if (barState.rumorHeardThisSlot) {
      return { ok: false, message: `Ти вже підслухав розмови в цьому циклі. Наступна чутка через ${formatCountdown(getTimeUntilNext(BAR_RUMOR_REFRESH_MS))}.` };
    }

    const rumor = getRumorForCurrentSlot();
    const now = Date.now();
    const activeRumor = {
      ...rumor,
      sourceType: "bar",
      sourceLabel: "Бар",
      heardAt: now,
      expiresAt: now + BAR_RUMOR_DURATION_MS
    };

    barState.activeRumor = activeRumor;
    barState.rumorHeardThisSlot = true;
    barState.rumorJournal = [
      { ...activeRumor },
      ...barState.rumorJournal.filter((entry) => entry.heardAt !== activeRumor.heardAt)
    ].slice(0, BAR_RUMOR_JOURNAL_LIMIT);
    saveBarState();
    window.GameBarUi?.renderSideCards?.();
    return { ok: true, message: `${rumor.location}: чутка активна 2 години. ${rumor.effects.map(formatEffect).join(" · ")}.` };
  }

  function getNpcRumorForCurrentSlot() {
    const slot = getRefreshSlot(BAR_NPC_RUMOR_REFRESH_MS);
    const level = window.GameState?.player?.level || 1;
    const seed = slot + level * 0.271 + 4517;
    return BAR_NPC_RUMORS[Math.floor(seededRandom(seed) * BAR_NPC_RUMORS.length)];
  }

  function talkToInformant() {
    syncBarPurchaseLocks();
    if (barState.npcRumorUsed) {
      return { ok: false, message: `Інформатор уже поділився інформацією. Нова рідкісна чутка буде доступна через ${formatCountdown(getTimeUntilNext(BAR_NPC_RUMOR_REFRESH_MS))}.` };
    }

    const rumor = getNpcRumorForCurrentSlot();
    const now = Date.now();
    const activeRumor = {
      ...rumor,
      sourceType: "npc",
      sourceLabel: "Інформатор",
      heardAt: now,
      expiresAt: now + BAR_NPC_RUMOR_DURATION_MS
    };

    barState.activeNpcRumor = activeRumor;
    barState.npcRumorUsed = true;
    barState.rumorJournal = [
      { ...activeRumor },
      ...barState.rumorJournal.filter((entry) => entry.heardAt !== activeRumor.heardAt)
    ].slice(0, BAR_RUMOR_JOURNAL_LIMIT);
    saveBarState();
    window.GameBarUi?.renderSideCards?.();
    return { ok: true, message: `${rumor.location}: Інформатор дав рідкісну чутку на 1 годину. ${rumor.effects.map(formatEffect).join(" · ")}.` };
  }


  window.GameBarCore = {
    state: barState,
    saveBarState,
    syncBarPurchaseLocks,
    hasPurchasedMenuItem,
    seededRandom,
    getPriceMultiplier,
    getBarPrice,
    getRefreshSlot,
    getTimeUntilNext,
    formatCountdown,
    formatEffect,
    rarityLabel,
    getMenuItems,
    getDailyOffer,
    cleanupExpiredBuffs,
    getActiveBarBuffs,
    getActiveRumor,
    getActiveNpcRumor,
    getActiveRumors,
    getRumorModifier,
    getBarModifier,
    buyBarItem,
    buyDailyOffer,
    getRumorForCurrentSlot,
    listenToBarRumor,
    getNpcRumorForCurrentSlot,
    talkToInformant
  };
})();

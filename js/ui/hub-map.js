(function () {
  const mainModalPoints = new Set([
    "shop",
    "hospital",
    "workshop",
    "storage",
    "arena",
    "expeditions",
    "questBoard"
  ]);

  const barModalPoints = new Set();
  const casinoGames = new Set(["slots", "blackjack", "poker", "dice"]);
  const panSurfaces = new Map();

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function t(key, fallback = "") {
    return window.GameI18n?.resolve(key) || fallback;
  }

  function readMinimumWidth(viewport) {
    const width = window.innerWidth;
    if (width <= 380) return Number(viewport.dataset.panMinSmall || 0);
    if (width <= 767) return Number(viewport.dataset.panMinMobile || 0);
    if (width <= 1023) return Number(viewport.dataset.panMinTablet || 0);
    return Number(viewport.dataset.panMinDesktop || 0);
  }

  function getBounds(state) {
    const minX = Math.min(0, state.viewportWidth - state.canvasWidth);

    if (state.lockVerticalPan) {
      return {
        minX,
        maxX: 0,
        minY: 0,
        maxY: 0
      };
    }

    return {
      minX,
      maxX: 0,
      minY: Math.min(0, state.viewportHeight - state.canvasHeight),
      maxY: 0
    };
  }

  function syncBarStageUi(state) {
    if (state.viewport.id !== "barCasinoStage") return;

    const bounds = getBounds(state);
    const hasHorizontalPan = state.canvasWidth > state.viewportWidth + 1;
    const canRevealLeft = hasHorizontalPan && state.x < bounds.maxX - 1;
    const canRevealRight = hasHorizontalPan && state.x > bounds.minX + 1;

    state.leftEdge?.classList.toggle("is-visible", canRevealLeft);
    state.rightEdge?.classList.toggle("is-visible", canRevealRight);
  }

  function applyPan(state) {
    const bounds = getBounds(state);
    state.x = clamp(state.x, bounds.minX, bounds.maxX);
    state.y = clamp(state.y, bounds.minY, bounds.maxY);
    state.canvas.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
    syncBarStageUi(state);
  }

  function centerPan(state) {
    state.x = (state.viewportWidth - state.canvasWidth) / 2;
    state.y = (state.viewportHeight - state.canvasHeight) / 2;
    applyPan(state);
  }

  function resetPan(state) {
    if (state.viewport.dataset.panStart === "top") {
      state.x = (state.viewportWidth - state.canvasWidth) / 2;
      state.y = 0;
      applyPan(state);
      return;
    }

    centerPan(state);
  }

  function resizePanSurface(state, preserveCenter = true) {
    const viewportWidth = state.viewport.clientWidth;
    const viewportHeight = state.viewport.clientHeight;
    if (!viewportWidth || !viewportHeight) return;

    let centerX = 0.5;
    let centerY = 0.5;

    if (preserveCenter && state.canvasWidth && state.canvasHeight) {
      centerX = (viewportWidth / 2 - state.x) / state.canvasWidth;
      centerY = (viewportHeight / 2 - state.y) / state.canvasHeight;
      centerX = clamp(centerX, 0, 1);
      centerY = clamp(centerY, 0, 1);
    }

    const fitMode = state.viewport.dataset.panFit;
    const useCover = state.viewport.id === "barCasinoStage";
    const scale = useCover
      ? Math.max(
          viewportWidth / state.naturalWidth,
          viewportHeight / state.naturalHeight
        )
      : fitMode === "width"
        ? viewportWidth / state.naturalWidth
        : Math.max(
            viewportWidth / state.naturalWidth,
            viewportHeight / state.naturalHeight,
            readMinimumWidth(state.viewport) / state.naturalWidth
          );

    state.viewportWidth = viewportWidth;
    state.viewportHeight = viewportHeight;
    state.canvasWidth = Math.round(state.naturalWidth * scale);
    state.canvasHeight = Math.round(state.naturalHeight * scale);

    state.canvas.style.width = `${state.canvasWidth}px`;
    state.canvas.style.height = `${state.canvasHeight}px`;

    if (preserveCenter) {
      state.x = viewportWidth / 2 - centerX * state.canvasWidth;
      state.y = viewportHeight / 2 - centerY * state.canvasHeight;
      applyPan(state);
    } else {
      resetPan(state);
    }


    syncBarStageUi(state);
  }

  function setupPanSurface(viewportId, canvasId, resetId, hintId) {
    if (panSurfaces.has(viewportId)) return panSurfaces.get(viewportId);

    const viewport = document.getElementById(viewportId);
    const canvas = document.getElementById(canvasId);
    if (!viewport || !canvas) return null;

    const state = {
      viewport,
      canvas,
      naturalWidth: Number(viewport.dataset.panWidth),
      naturalHeight: Number(viewport.dataset.panHeight),
      viewportWidth: 0,
      viewportHeight: 0,
      canvasWidth: 0,
      canvasHeight: 0,
      x: 0,
      y: 0,
      pointerId: null,
      startPointerX: 0,
      startPointerY: 0,
      startX: 0,
      startY: 0,
      moved: false,
      startedOnHotspot: false,
      suppressClickUntil: 0,
      lockVerticalPan: viewportId === "barCasinoStage",
      leftEdge: viewport.querySelector(".bar-pan-edge--left"),
      rightEdge: viewport.querySelector(".bar-pan-edge--right"),
      hint: document.getElementById(hintId)
    };

    function hideHint() {
      state.hint?.classList.add("is-hidden");
    }

    function onPointerDown(event) {
      if (!event.isPrimary || event.button > 0) return;
      if (event.target.closest(".map-pan-reset, .zone-map-back")) return;

      state.pointerId = event.pointerId;
      state.startPointerX = event.clientX;
      state.startPointerY = event.clientY;
      state.startX = state.x;
      state.startY = state.y;
      state.moved = false;
      state.startedOnHotspot = Boolean(
        event.target.closest("[data-hub-point], [data-bar-point]")
      );

      if (!state.startedOnHotspot) {
        viewport.setPointerCapture?.(event.pointerId);
      }

      viewport.classList.add("is-pointer-down");
    }

    function onPointerMove(event) {
      if (event.pointerId !== state.pointerId) return;

      const dx = event.clientX - state.startPointerX;
      const dy = event.clientY - state.startPointerY;

      if (!state.moved && Math.hypot(dx, dy) >= 7) {
        state.moved = true;

        if (!viewport.hasPointerCapture?.(event.pointerId)) {
          viewport.setPointerCapture?.(event.pointerId);
        }

        viewport.classList.add("is-panning");
        hideHint();
      }

      if (!state.moved) return;

      event.preventDefault();
      state.x = state.startX + dx;
      state.y = state.startY + dy;
      applyPan(state);
    }

    function finishPointer(event) {
      if (event.pointerId !== state.pointerId) return;

      if (state.moved) {
        state.suppressClickUntil = performance.now() + 350;
      }

      if (viewport.hasPointerCapture?.(event.pointerId)) {
        viewport.releasePointerCapture?.(event.pointerId);
      }

      viewport.classList.remove("is-pointer-down", "is-panning");
      state.pointerId = null;
      state.startedOnHotspot = false;
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", finishPointer);
    viewport.addEventListener("pointercancel", finishPointer);

    viewport.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 80 : 32;
      let handled = true;

      if (event.key === "ArrowLeft") state.x += step;
      else if (event.key === "ArrowRight") state.x -= step;
      else if (event.key === "ArrowUp") state.y += step;
      else if (event.key === "ArrowDown") state.y -= step;
      else handled = false;

      if (!handled) return;

      event.preventDefault();
      hideHint();
      applyPan(state);
    });

    document.getElementById(resetId)?.addEventListener("click", (event) => {
      event.stopPropagation();
      resetPan(state);
    });

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => resizePanSurface(state, true));
      observer.observe(viewport);
      state.resizeObserver = observer;
    } else {
      const resizeHandler = () => resizePanSurface(state, true);
      window.addEventListener("resize", resizeHandler);
      state.resizeHandler = resizeHandler;
    }

    resizePanSurface(state, false);
    panSurfaces.set(viewportId, state);
    return state;
  }

  function wasRecentDrag(button) {
    const viewport = button.closest(".map-pan-viewport");
    if (!viewport) return false;

    const state = panSurfaces.get(viewport.id);
    return Boolean(state && performance.now() < state.suppressClickUntil);
  }

  function showScreen(screenId) {
    document.querySelectorAll("[data-game-screen]").forEach((screen) => {
      const active = screen.id === screenId;
      screen.classList.toggle("is-active", active);
      screen.setAttribute("aria-hidden", active ? "false" : "true");
    });

    const gameShell = document.getElementById("gameApp");
    gameShell?.classList.toggle("is-bar-casino-screen", screenId === "barCasinoView");
    gameShell?.classList.toggle("is-rest-room-screen", screenId === "restRoomView");
  }

  function refreshPan(viewportId, center = false) {
    requestAnimationFrame(() => {
      const state = panSurfaces.get(viewportId);
      if (!state) return;
      resizePanSurface(state, !center);
      if (center) resetPan(state);
    });
  }

  function clearActivePoint() {
    document.querySelectorAll(".hub-hotspot.is-active").forEach((node) => {
      node.classList.remove("is-active");
    });
  }

  function closeModal() {
    const modal = document.getElementById("hubModal");
    if (!modal) return;
    modal.hidden = true;
    delete modal.dataset.mode;
    clearActivePoint();
  }

  function buildModalExtra(pointId) {

    if (pointId === "barRoom") {
      return `
        <div class="hub-modal__grid">
          <div class="hub-modal__card"><strong>${t("barCasinoView.bar.item1.title", "Гаряча їжа")}</strong><span>${t("barCasinoView.bar.item1.text", "Невелике відновлення енергії та ситості.")}</span></div>
          <div class="hub-modal__card"><strong>${t("barCasinoView.bar.item2.title", "Чутки")}</strong><span>${t("barCasinoView.bar.item2.text", "Підказки про квести, лут і небезпечні місця.")}</span></div>
          <div class="hub-modal__card"><strong>${t("barCasinoView.bar.item3.title", "Тимчасовий баф")}</strong><span>${t("barCasinoView.bar.item3.text", "Їжа та напої можуть дати короткий бонус.")}</span></div>
          <div class="hub-modal__card"><strong>${t("barCasinoView.bar.item4.title", "Контакти")}</strong><span>${t("barCasinoView.bar.item4.text", "Деякі NPC і завдання будуть доступні лише тут.")}</span></div>
        </div>`;
    }

    if (pointId === "casinoRoom") {
      return `
        <div class="hub-modal__actions">
          <div class="hub-modal__action">${t("barCasinoView.casino.game1.title", "Покер")}<small>${t("barCasinoView.casino.game1.text", "Гра за столом")}</small></div>
          <div class="hub-modal__action">${t("barCasinoView.casino.game2.title", "21")}<small>${t("barCasinoView.casino.game2.text", "Класична карткова гра")}</small></div>
          <div class="hub-modal__action">${t("barCasinoView.casino.game3.title", "Слоти")}<small>${t("barCasinoView.casino.game3.text", "Швидка азартна сесія")}</small></div>
        </div>
        <div class="hub-modal__grid">
          <div class="hub-modal__card"><strong>${t("barCasinoView.casino.rewardTitle", "Що можна виграти")}</strong><span>${t("barCasinoView.casino.rewardText", "Жетони, гроші, рідкісні дрібні нагороди або тимчасовий баф удачі.")}</span></div>
          <div class="hub-modal__card"><strong>${t("barCasinoView.casino.riskTitle", "Ризик")}</strong><span>${t("barCasinoView.casino.riskText", "Можна як виграти, так і програти частину грошей або жетонів.")}</span></div>
        </div>`;
    }

    return "";
  }

  function getModalContent(pointId) {

    if (pointId === "barRoom") {
      return {
        title: t("barCasinoView.bar.title", "Бар"),
        description: t("barCasinoView.bar.description", "Місце їжі, напоїв, діалогів і корисних чуток від NPC."),
        status: t("barCasinoView.bar.status", "Пізніше тут підключимо повне меню бару, NPC та бонуси від їжі / напоїв."),
        extra: buildModalExtra(pointId)
      };
    }

    if (pointId === "casinoRoom") {
      return {
        title: t("barCasinoView.casino.title", "Казино"),
        description: t("barCasinoView.casino.description", "Окрема зона з азартними мінііграми та ризиком заради винагород."),
        status: t("barCasinoView.casino.status", "Наступним етапом підключимо першу мінігру, а далі — покер, 21 і слоти."),
        extra: buildModalExtra(pointId)
      };
    }

    if (casinoGames.has(pointId)) {
      return {
        title: t(`casinoView.games.${pointId}.title`, pointId),
        description: t(`casinoView.games.${pointId}.modalDescription`, t(`casinoView.games.${pointId}.description`, "")),
        status: t("casinoView.gameStatus", "Механіку цієї гри підключимо наступним етапом."),
        extra: ""
      };
    }

    return {
      title: t(`hub.${pointId}.title`, pointId),
      description: t(`hub.${pointId}.description`, ""),
      status: t("hub.modalStatus", "Функціонал точки буде підключено наступним етапом."),
      extra: ""
    };
  }

  const BAR_STATE_KEY = "the1037.bar.v1";
  const BAR_MENU_REFRESH_MS = 4 * 60 * 60 * 1000;
  const BAR_DAILY_REFRESH_MS = 24 * 60 * 60 * 1000;
  const BAR_TICK_MS = 1000;

  const BAR_MENU_ITEMS = [
    { id: "stew", category: "food", rarity: "common", minLevel: 1, name: "Тушонка", icon: "🥫", basePrice: 70, duration: 45, description: "Проста гаряча їжа перед короткою вилазкою.", effects: [{ key: "hpRegen", label: "Відновлення HP", value: 8 }] },
    { id: "porridge", category: "food", rarity: "common", minLevel: 1, name: "Гаряча каша", icon: "🍲", basePrice: 80, duration: 45, description: "Ситна порція, що допомагає довше тримати темп.", effects: [{ key: "energyRegen", label: "Відновлення енергії", value: 10 }] },
    { id: "coffee", category: "drink", rarity: "common", minLevel: 1, name: "Міцна кава", icon: "☕", basePrice: 55, duration: 45, description: "Швидкий заряд перед виходом із безпечної зони.", effects: [{ key: "energyRegen", label: "Відновлення енергії", value: 10 }] },
    { id: "herbalTea", category: "drink", rarity: "common", minLevel: 1, name: "Чай з травами", icon: "🍵", basePrice: 90, duration: 60, description: "Теплий настій, який трохи полегшує вплив Зони.", effects: [{ key: "radiationTaken", label: "Отримана радіація", value: -7 }] },
    { id: "meatPlate", category: "food", rarity: "improved", minLevel: 10, name: "М'ясна тарілка", icon: "🍖", basePrice: 130, duration: 60, description: "Більш поживна страва для довгих боїв.", effects: [{ key: "attack", label: "Атака", value: 5 }] },
    { id: "fieldSoup", category: "food", rarity: "improved", minLevel: 10, name: "Польовий суп", icon: "🥣", basePrice: 120, duration: 60, description: "Гаряча їжа з медичними травами.", effects: [{ key: "medkit", label: "Ефективність аптечок", value: 8 }] },
    { id: "blackTea", category: "drink", rarity: "improved", minLevel: 10, name: "Чорний чай", icon: "🫖", basePrice: 85, duration: 60, description: "Підтримує концентрацію та витривалість.", effects: [{ key: "energyCost", label: "Витрати енергії", value: -5 }] },
    { id: "stalkerDinner", category: "food", rarity: "rare", minLevel: 20, name: "Вечеря сталкера", icon: "🍛", basePrice: 190, duration: 60, description: "Рідкісна ситна страва з двома помірними бонусами.", effects: [{ key: "attack", label: "Атака", value: 4 }, { key: "radiationTaken", label: "Отримана радіація", value: -5 }] },
    { id: "zoneCoffee", category: "drink", rarity: "rare", minLevel: 20, name: "Кава «Зона»", icon: "☕", basePrice: 155, duration: 60, description: "Міцний напій для тих, хто полює за досвідом.", effects: [{ key: "exp", label: "EXP", value: 5 }, { key: "energyRegen", label: "Відновлення енергії", value: 6 }] },
    { id: "hunterMeal", category: "food", rarity: "rare", minLevel: 30, name: "Обід мисливця", icon: "🥘", basePrice: 230, duration: 60, description: "Для тих, хто йде в Зону за здобиччю.", effects: [{ key: "materials", label: "Шанс матеріалів", value: 6 }, { key: "money", label: "Гроші з боїв", value: 5 }] },
    { id: "focusBrew", category: "drink", rarity: "rare", minLevel: 30, name: "Настій концентрації", icon: "🧉", basePrice: 210, duration: 60, description: "Гіркий напій перед складною сутичкою.", effects: [{ key: "crit", label: "Крит. шанс", value: 3 }, { key: "attack", label: "Атака", value: 3 }] },
    { id: "veteranDinner", category: "food", rarity: "special", minLevel: 40, name: "Вечеря ветерана", icon: "🍽️", basePrice: 300, duration: 60, description: "Сильна комбінація без надмірного росту відсотків.", effects: [{ key: "attack", label: "Атака", value: 5 }, { key: "radiationTaken", label: "Отримана радіація", value: -5 }] },
    { id: "scavengerPlate", category: "food", rarity: "special", minLevel: 50, name: "Тарілка шукача", icon: "🥩", basePrice: 340, duration: 60, description: "Елітна страва для високорівневих вилазок.", effects: [{ key: "materials", label: "Шанс матеріалів", value: 7 }, { key: "money", label: "Гроші з боїв", value: 6 }] },
    { id: "signalBrew", category: "drink", rarity: "special", minLevel: 50, name: "Напій «1037»", icon: "🥤", basePrice: 320, duration: 60, description: "Фірмовий напій бару для досвідчених сталкерів.", effects: [{ key: "exp", label: "EXP", value: 6 }, { key: "crit", label: "Крит. шанс", value: 3 }] }
  ];

  const BAR_DAILY_OFFERS = [
    { id: "dailyStalker", name: "Тушонка + міцна кава", description: "Класичний комплект перед довгою вилазкою.", basePrice: 180, duration: 90, effects: [{ key: "hpRegen", label: "Відновлення HP", value: 10 }, { key: "energyRegen", label: "Відновлення енергії", value: 12 }, { key: "exp", label: "EXP", value: 5 }] },
    { id: "dailyHunter", name: "Вечеря мисливця", description: "Для фарму матеріалів і грошей у небезпечних зонах.", basePrice: 230, duration: 90, effects: [{ key: "materials", label: "Шанс матеріалів", value: 6 }, { key: "money", label: "Гроші з боїв", value: 6 }] },
    { id: "dailyGuard", name: "Гаряча страва + трав'яний чай", description: "Збалансований комплект для важких радіаційних маршрутів.", basePrice: 210, duration: 90, effects: [{ key: "radiationTaken", label: "Отримана радіація", value: -8 }, { key: "medkit", label: "Ефективність аптечок", value: 8 }] },
    { id: "dailyVeteran", name: "Комплект ветерана", description: "Рідкісна пропозиція з двома бойовими бонусами.", basePrice: 280, duration: 90, effects: [{ key: "attack", label: "Атака", value: 5 }, { key: "crit", label: "Крит. шанс", value: 3 }] }
  ];

  let barState = loadBarState();
  let barTimerId = null;

  function createDefaultBarState() {
    return {
      activeFood: null,
      activeDrink: null,
      activeDaily: null,
      menuPurchaseSlot: null,
      purchasedMenuItems: [],
      dailyPurchaseSlot: null,
      dailyPurchased: false
    };
  }

  function loadBarState() {
    try {
      const saved = JSON.parse(localStorage.getItem(BAR_STATE_KEY) || "null");
      if (!saved || typeof saved !== "object") return createDefaultBarState();
      return {
        ...createDefaultBarState(),
        ...saved,
        purchasedMenuItems: Array.isArray(saved.purchasedMenuItems) ? saved.purchasedMenuItems : []
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
    if (changed) saveBarState();
  }

  function getActiveBarBuffs() {
    cleanupExpiredBuffs();
    return [barState.activeFood, barState.activeDrink, barState.activeDaily].filter(Boolean);
  }

  function getBarModifier(key) {
    return getActiveBarBuffs().reduce((sum, buff) => {
      return sum + buff.effects.filter((effect) => effect.key === key).reduce((sub, effect) => sub + effect.value, 0);
    }, 0);
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
    window.GameHud?.render?.();
    renderBarSideCards();
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
    window.GameHud?.render?.();
    renderBarSideCards();
    return { ok: true, message: `${offer.name}: комплект активний ${offer.duration} хв. Пропозицію дня вже не можна купити повторно до її оновлення.` };
  }

  function renderBarSideCards() {
    cleanupExpiredBuffs();
    syncBarPurchaseLocks();
    const offer = getDailyOffer();
    const dailyName = document.getElementById("barDailyName");
    const dailyDescription = document.getElementById("barDailyDescription");
    const dailyEffects = document.getElementById("barDailyEffects");
    const dailyTimer = document.getElementById("barDailyTimer");
    const dailyBuy = document.getElementById("barDailyBuy");
    if (dailyName) dailyName.textContent = offer.name;
    if (dailyDescription) dailyDescription.textContent = `${offer.description} · ${offer.duration} хв`;
    if (dailyEffects) dailyEffects.innerHTML = offer.effects.map((effect) => `<li>${formatEffect(effect)}</li>`).join("");
    if (dailyTimer) dailyTimer.textContent = `оновиться через ${formatCountdown(getTimeUntilNext(BAR_DAILY_REFRESH_MS))}`;
    if (dailyBuy) {
      dailyBuy.disabled = Boolean(barState.dailyPurchased);
      dailyBuy.classList.toggle("is-purchased", Boolean(barState.dailyPurchased));
      dailyBuy.textContent = barState.dailyPurchased ? "Куплено · до оновлення" : `Купити · ₴ ${getBarPrice(offer.basePrice)}`;
    }

    const buffs = getActiveBarBuffs();
    const body = document.getElementById("barActiveBuffBody");
    const timer = document.getElementById("barBuffTimer");
    if (!body || !timer) return;
    if (!buffs.length) {
      timer.textContent = "немає";
      body.innerHTML = `<h3>Немає активних бонусів</h3><p>Купи їжу або напій у меню бару. Одночасно працює одна їжа та один напій.</p>`;
      return;
    }
    const nearest = Math.min(...buffs.map((buff) => buff.expiresAt));
    timer.textContent = `мін. ${formatCountdown(nearest - Date.now())}`;
    body.innerHTML = `<div class="bar-active-buffs">${buffs.map((buff) => `
      <div class="bar-active-buff">
        <div><strong>${buff.name}</strong><span>${formatCountdown(buff.expiresAt - Date.now())}</span></div>
        <small>${buff.effects.map(formatEffect).join(" · ")}</small>
      </div>`).join("")}</div>`;
  }

  function renderBarMenuModal(message = "") {
    syncBarPurchaseLocks();
    const title = document.getElementById("hubModalTitle");
    const description = document.getElementById("hubModalDescription");
    const status = document.getElementById("hubModalStatus");
    const extra = document.getElementById("hubModalExtra");
    if (!title || !description || !status || !extra) return;
    const level = window.GameState?.player?.level || 1;
    const items = getMenuItems();
    title.textContent = "Меню бару";
    description.textContent = `4 позиції оновлюються кожні 4 години. Кожну позицію можна купити лише 1 раз за поточну ротацію. Одночасно активна 1 їжа + 1 напій.`;
    status.textContent = message || `Нове меню через ${formatCountdown(getTimeUntilNext(BAR_MENU_REFRESH_MS))} · Рівень героя ${level} · ціни масштабуються кожні 10 рівнів.`;
    extra.innerHTML = `
      <div class="bar-menu-toolbar">
        <span>Нове меню через <strong>${formatCountdown(getTimeUntilNext(BAR_MENU_REFRESH_MS))}</strong></span>
        <span>1 покупка кожної позиції · Їжа 1/1 · Напій 1/1</span>
      </div>
      <div class="bar-menu-grid">
        ${items.map((item) => {
          const purchased = hasPurchasedMenuItem(item.id);
          return `
          <article class="bar-menu-item bar-menu-item--${item.rarity}${purchased ? " is-purchased" : ""}">
            <div class="bar-menu-item__top">
              <span class="bar-menu-item__icon">${item.icon}</span>
              <div><span class="bar-menu-item__rarity">${rarityLabel(item.rarity)}</span><h3>${item.name}</h3></div>
              <span class="bar-menu-item__duration">${item.duration} хв</span>
            </div>
            <p>${item.description}</p>
            <ul>${item.effects.map((effect) => `<li>${formatEffect(effect)}</li>`).join("")}</ul>
            <button class="bar-menu-item__buy${purchased ? " is-purchased" : ""}" type="button" data-bar-buy="${item.id}" ${purchased ? "disabled" : ""}>${purchased ? "Куплено · до оновлення" : `Купити · ₴ ${getBarPrice(item.basePrice)}`}</button>
          </article>`;
        }).join("")}
      </div>
      <div class="bar-menu-unlocks">
        <strong>Прогрес меню</strong>
        <span>10 рівень — покращені страви · 20 — рідкісні комбінації · 30 — фарм/крит · 40 — ветеранські · 50+ — елітні позиції.</span>
      </div>`;
    extra.classList.add("is-visible");
    extra.querySelectorAll("[data-bar-buy]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = buyBarItem(button.dataset.barBuy);
        renderBarMenuModal(result.message);
      });
    });
  }

  function getBarActionContent(actionId) {
    if (actionId === "rumors") {
      return {
        title: "Чутки",
        description: "Чутки тимчасово підсилюють конкретну локацію або тип знахідок. Одночасно активна одна свіжа чутка.",
        status: "Сьогодні: Рудий ліс · підвищений шанс матеріалів на 2 години.",
        extra: `
          <div class="hub-modal__grid">
            <div class="hub-modal__card"><strong>Рудий ліс</strong><span>+10% шанс матеріалів на 2 год</span></div>
            <div class="hub-modal__card"><strong>Янів</strong><span>Наступна чутка може відкрити бонус до технічного луту.</span></div>
          </div>`
      };
    }

    return {
      title: "Контакти",
      description: "Тут з’являтимуться NPC, короткі діалоги, персональні квести й особливі пропозиції.",
      status: "Першими можна додати медика, механіка та контрабандиста.",
      extra: `
        <div class="hub-modal__actions">
          <div class="hub-modal__action">Медик<small>лікування та медичні завдання</small></div>
          <div class="hub-modal__action">Механік<small>ремонт і технічні квести</small></div>
          <div class="hub-modal__action">Контрабандист<small>рідкісні пропозиції</small></div>
        </div>`
    };
  }

  function openBarAction(actionId) {
    const modal = document.getElementById("hubModal");
    const title = document.getElementById("hubModalTitle");
    const description = document.getElementById("hubModalDescription");
    const status = document.getElementById("hubModalStatus");
    const extra = document.getElementById("hubModalExtra");
    if (!modal || !title || !description || !status || !extra) return;

    modal.dataset.mode = actionId === "menu" ? "bar-menu" : "bar-action";
    modal.hidden = false;
    if (actionId === "menu") {
      renderBarMenuModal();
      return;
    }

    const content = getBarActionContent(actionId);
    title.textContent = content.title;
    description.textContent = content.description;
    status.textContent = content.status;
    extra.innerHTML = content.extra;
    extra.classList.add("is-visible");
  }

  function openModal(pointId) {
    const modal = document.getElementById("hubModal");
    const title = document.getElementById("hubModalTitle");
    const description = document.getElementById("hubModalDescription");
    const status = document.getElementById("hubModalStatus");
    const extra = document.getElementById("hubModalExtra");
    if (!modal || !title || !description || !status || !extra) return;

    delete modal.dataset.mode;
    const content = getModalContent(pointId);
    title.textContent = content.title;
    description.textContent = content.description;
    status.textContent = content.status;
    extra.innerHTML = content.extra;
    extra.classList.toggle("is-visible", Boolean(content.extra));
    modal.hidden = false;
  }

  function openZoneMap() {
    showScreen("zoneMapView");
    refreshPan("zoneMapStage", true);
  }

  function closeZoneMap() {
    showScreen("hubScreen");
    clearActivePoint();
    refreshPan("hubStage", false);
  }

  function openBarCasino() {
    showScreen("barCasinoView");
    refreshPan("barCasinoStage", true);
  }

  function closeBarCasino() {
    showScreen("hubScreen");
    clearActivePoint();
    refreshPan("hubStage", false);
  }

  function openBarView() {
    showScreen("barView");
    clearActivePoint();
    renderBarSideCards();
  }

  function closeBarView() {
    showScreen("barCasinoView");
    clearActivePoint();
    refreshPan("barCasinoStage", false);
  }

  function openCasino() {
    showScreen("casinoView");
    clearActivePoint();
  }

  function closeCasino() {
    showScreen("barCasinoView");
    clearActivePoint();
    refreshPan("barCasinoStage", false);
  }


  function openRestRoom() {
    showScreen("restRoomView");
    clearActivePoint();
    window.GameRestRoom?.refresh();
  }

  function closeRestRoom() {
    window.GameRestRoom?.closeLevels();
    showScreen("barCasinoView");
    clearActivePoint();
    refreshPan("barCasinoStage", false);
  }

  function activateMainPoint(button) {
    if (wasRecentDrag(button)) return;

    const pointId = button.dataset.hubPoint;
    if (!pointId) return;

    clearActivePoint();
    button.classList.add("is-active");

    if (pointId === "barCasino") {
      openBarCasino();
      return;
    }

    if (pointId === "cordon") {
      openZoneMap();
      return;
    }

    if (mainModalPoints.has(pointId)) {
      openModal(pointId);
    }
  }

  function activateBarPoint(button) {
    if (wasRecentDrag(button)) return;

    const pointId = button.dataset.barPoint;
    if (!pointId) return;

    clearActivePoint();
    button.classList.add("is-active");

    if (pointId === "barRoom") {
      openBarView();
      return;
    }

    if (pointId === "casinoRoom") {
      openCasino();
      return;
    }

    if (pointId === "restRoom") {
      openRestRoom();
      return;
    }

    if (barModalPoints.has(pointId)) {
      openModal(pointId);
    }
  }

  function activateCasinoGame(button) {
    const gameId = button.dataset.casinoGame;
    if (!gameId || !casinoGames.has(gameId)) return;
    openModal(gameId);
  }

  function bindHotspots() {
    document.querySelectorAll("[data-hub-point]").forEach((button) => {
      button.addEventListener("click", () => activateMainPoint(button));
    });

    document.querySelectorAll("[data-bar-point]").forEach((button) => {
      button.addEventListener("click", () => activateBarPoint(button));
    });

    document.querySelectorAll("[data-casino-game]").forEach((button) => {
      button.addEventListener("click", () => activateCasinoGame(button));
    });


    document.querySelectorAll("[data-bar-action]").forEach((button) => {
      button.addEventListener("click", () => openBarAction(button.dataset.barAction));
    });
    document.getElementById("barDailyBuy")?.addEventListener("click", () => {
      const result = buyDailyOffer();
      const status = document.getElementById("hubModalStatus");
      if (!result.ok) {
        openBarAction("menu");
        if (status) status.textContent = result.message;
      }
    });
    renderBarSideCards();
    if (!barTimerId) barTimerId = window.setInterval(() => {
      renderBarSideCards();
      const modal = document.getElementById("hubModal");
      if (modal && !modal.hidden && modal.dataset.mode === "bar-menu") renderBarMenuModal();
    }, BAR_TICK_MS);
  }

  function bind() {
    setupPanSurface("hubStage", "hubMapCanvas", "hubPanReset", "hubPanHint");
    setupPanSurface("zoneMapStage", "zoneMapCanvas", "zonePanReset", "zonePanHint");
    setupPanSurface("barCasinoStage", "barCasinoCanvas", "barCasinoPanReset", "");

    bindHotspots();

    document.getElementById("hubModalClose")?.addEventListener("click", closeModal);
    document.getElementById("hubModalBackdrop")?.addEventListener("click", closeModal);
    document.getElementById("zoneMapBack")?.addEventListener("click", closeZoneMap);
    document.getElementById("barCasinoBack")?.addEventListener("click", closeBarCasino);
    document.getElementById("barViewBack")?.addEventListener("click", closeBarView);
    document.getElementById("casinoBack")?.addEventListener("click", closeCasino);
    document.getElementById("restRoomBack")?.addEventListener("click", closeRestRoom);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      const modal = document.getElementById("hubModal");
      if (modal && !modal.hidden) {
        closeModal();
        return;
      }

      if (document.getElementById("restRoomView")?.classList.contains("is-active")) {
        const levelsPanel = document.getElementById("restRoomLevelsPanel");
        if (levelsPanel && !levelsPanel.hidden) {
          window.GameRestRoom?.closeLevels();
        } else {
          closeRestRoom();
        }
        return;
      }

      if (document.getElementById("casinoView")?.classList.contains("is-active")) {
        closeCasino();
        return;
      }

      if (document.getElementById("barView")?.classList.contains("is-active")) {
        closeBarView();
        return;
      }

      if (document.getElementById("barCasinoView")?.classList.contains("is-active")) {
        closeBarCasino();
        return;
      }

      if (document.getElementById("zoneMapView")?.classList.contains("is-active")) {
        closeZoneMap();
      }
    });
  }


  window.GameBar = {
    getActiveBuffs: getActiveBarBuffs,
    getModifier: getBarModifier,
    getMenuItems,
    getDailyOffer,
    hasPurchasedMenuItem,
    render: renderBarSideCards
  };

  window.GameHub = {
    bind,
    openBarCasino,
    closeBarCasino,
    openBarView,
    closeBarView,
    openCasino,
    closeCasino,
    openZoneMap,
    closeZoneMap
  };
})();

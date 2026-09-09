(function () {
  const mainModalPoints = new Set([
    "shop",
    "workshop",
    "arena",
    "expeditions"
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
    window.GameBar?.render?.();
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

    if (pointId === "storage") {
      window.GameWarehouse?.open?.();
      return;
    }

    if (pointId === "hospital") {
      window.GameHospital?.open?.();
      return;
    }

    if (pointId === "questBoard") {
      window.GameQuestBoard?.open?.();
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


    window.GameBar?.bind?.();
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

      const warehouse = document.getElementById("warehouseModal");
      if (warehouse && !warehouse.hidden) {
        window.GameWarehouse?.close?.();
        return;
      }

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

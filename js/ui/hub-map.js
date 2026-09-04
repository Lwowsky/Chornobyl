(function () {
  const modalPoints = new Set([
    "shop",
    "hospital",
    "workshop",
    "storage",
    "arena",
    "expeditions",
    "questBoard",
    "barCasino"
  ]);

  const panSurfaces = new Map();
  let activePoint = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function readMinimumWidth(viewport) {
    const width = window.innerWidth;
    if (width <= 380) return Number(viewport.dataset.panMinSmall || 0);
    if (width <= 767) return Number(viewport.dataset.panMinMobile || 0);
    if (width <= 1023) return Number(viewport.dataset.panMinTablet || 0);
    return Number(viewport.dataset.panMinDesktop || 0);
  }

  function getBounds(state) {
    return {
      minX: Math.min(0, state.viewportWidth - state.canvasWidth),
      maxX: 0,
      minY: Math.min(0, state.viewportHeight - state.canvasHeight),
      maxY: 0
    };
  }

  function applyPan(state) {
    const bounds = getBounds(state);
    state.x = clamp(state.x, bounds.minX, bounds.maxX);
    state.y = clamp(state.y, bounds.minY, bounds.maxY);
    state.canvas.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
  }

  function centerPan(state) {
    state.x = (state.viewportWidth - state.canvasWidth) / 2;
    state.y = (state.viewportHeight - state.canvasHeight) / 2;
    applyPan(state);
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

    const naturalWidth = state.naturalWidth;
    const naturalHeight = state.naturalHeight;
    const minWidth = readMinimumWidth(state.viewport);

    // Cover the viewport without stretching, then enforce a readable minimum map size.
    // If the map becomes larger than the viewport, the excess area is reachable by drag.
    const scale = Math.max(
      viewportWidth / naturalWidth,
      viewportHeight / naturalHeight,
      minWidth / naturalWidth
    );

    state.viewportWidth = viewportWidth;
    state.viewportHeight = viewportHeight;
    state.canvasWidth = Math.round(naturalWidth * scale);
    state.canvasHeight = Math.round(naturalHeight * scale);

    state.canvas.style.width = `${state.canvasWidth}px`;
    state.canvas.style.height = `${state.canvasHeight}px`;

    if (preserveCenter) {
      state.x = viewportWidth / 2 - centerX * state.canvasWidth;
      state.y = viewportHeight / 2 - centerY * state.canvasHeight;
      applyPan(state);
    } else {
      centerPan(state);
    }

    state.viewport.classList.toggle(
      "is-pan-enabled",
      state.canvasWidth > viewportWidth + 1 || state.canvasHeight > viewportHeight + 1
    );
  }

  function setupPanSurface(viewportId, canvasId, resetId, hintId) {
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
      hint: document.getElementById(hintId)
    };

    function hideHint() {
      if (state.hint) state.hint.classList.add("is-hidden");
    }

    function onPointerDown(event) {
      if (!event.isPrimary || event.button > 0) return;

      // Reset/back are real UI controls and must never start map dragging.
      if (event.target.closest(".map-pan-reset, .zone-map-back")) return;

      state.pointerId = event.pointerId;
      state.startPointerX = event.clientX;
      state.startPointerY = event.clientY;
      state.startX = state.x;
      state.startY = state.y;
      state.moved = false;
      state.startedOnHotspot = Boolean(event.target.closest("[data-hub-point]"));

      // Important: do not capture immediately when starting on a hotspot.
      // This preserves a normal desktop click if the pointer does not move.
      // Capture is enabled only after the drag threshold is crossed.
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

        // Once movement clearly becomes a pan, capture the pointer even if
        // the gesture started directly on a building/hotspot.
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
        state.suppressClickUntil = performance.now() + 280;
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

    // A drag that started on a hotspot must never accidentally open its modal.
    viewport.addEventListener("click", (event) => {
      if (performance.now() < state.suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    viewport.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 80 : 32;
      let handled = true;
      if (event.key === "ArrowLeft") state.x += step;
      else if (event.key === "ArrowRight") state.x -= step;
      else if (event.key === "ArrowUp") state.y += step;
      else if (event.key === "ArrowDown") state.y -= step;
      else handled = false;

      if (handled) {
        event.preventDefault();
        hideHint();
        applyPan(state);
      }
    });

    document.getElementById(resetId)?.addEventListener("click", (event) => {
      event.stopPropagation();
      centerPan(state);
    });

    const resizeObserver = new ResizeObserver(() => resizePanSurface(state, true));
    resizeObserver.observe(viewport);
    state.resizeObserver = resizeObserver;

    resizePanSurface(state, false);
    panSurfaces.set(viewportId, state);
    return state;
  }

  function clearActivePoint() {
    document.querySelectorAll(".hub-hotspot.is-active").forEach((node) => {
      node.classList.remove("is-active");
    });
    activePoint = null;
  }

  function closeModal() {
    const modal = document.getElementById("hubModal");
    if (!modal) return;
    modal.hidden = true;
    clearActivePoint();
  }

  function openModal(pointId) {
    const modal = document.getElementById("hubModal");
    const title = document.getElementById("hubModalTitle");
    const description = document.getElementById("hubModalDescription");
    if (!modal || !title || !description) return;

    title.textContent = window.GameI18n.resolve(`hub.${pointId}.title`) || pointId;
    description.textContent = window.GameI18n.resolve(`hub.${pointId}.description`) || "";
    modal.hidden = false;
  }

  function openZoneMap() {
    const hubScreen = document.getElementById("hubScreen");
    const zoneMap = document.getElementById("zoneMapView");
    if (!hubScreen || !zoneMap) return;

    hubScreen.hidden = true;
    zoneMap.hidden = false;

    requestAnimationFrame(() => {
      const state = panSurfaces.get("zoneMapStage");
      if (state) resizePanSurface(state, false);
    });
  }

  function closeZoneMap() {
    const hubScreen = document.getElementById("hubScreen");
    const zoneMap = document.getElementById("zoneMapView");
    if (!hubScreen || !zoneMap) return;

    zoneMap.hidden = true;
    hubScreen.hidden = false;
    clearActivePoint();

    requestAnimationFrame(() => {
      const state = panSurfaces.get("hubStage");
      if (state) resizePanSurface(state, true);
    });
  }

  function activatePoint(button) {
    clearActivePoint();
    button.classList.add("is-active");
    activePoint = button.dataset.hubPoint;

    if (activePoint === "cordon") {
      window.setTimeout(openZoneMap, 160);
      return;
    }

    if (modalPoints.has(activePoint)) {
      window.setTimeout(() => openModal(activePoint), 120);
    }
  }

  function bind() {
    setupPanSurface("hubStage", "hubMapCanvas", "hubPanReset", "hubPanHint");
    setupPanSurface("zoneMapStage", "zoneMapCanvas", "zonePanReset", "zonePanHint");

    document.querySelectorAll("[data-hub-point]").forEach((button) => {
      button.addEventListener("click", () => activatePoint(button));
    });

    document.getElementById("hubModalClose")?.addEventListener("click", closeModal);
    document.getElementById("hubModalBackdrop")?.addEventListener("click", closeModal);
    document.getElementById("zoneMapBack")?.addEventListener("click", closeZoneMap);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      const modal = document.getElementById("hubModal");
      const zoneMap = document.getElementById("zoneMapView");

      if (modal && !modal.hidden) {
        closeModal();
      } else if (zoneMap && !zoneMap.hidden) {
        closeZoneMap();
      }
    });
  }

  window.GameHub = { bind };
})();
(function () {
  let lastFocused = null;

  const statConfig = [
    ["health", "profile.stats.health", ""],
    ["attack", "profile.stats.attack", ""],
    ["defense", "profile.stats.defense", ""],
    ["stamina", "profile.stats.stamina", ""],
    ["radiationResistance", "profile.stats.radiationResistance", "%"],
    ["critChance", "profile.stats.critChance", "%"],
    ["critDamage", "profile.stats.critDamage", "%"],
    ["carryWeight", "profile.stats.carryWeight", " кг"]
  ];

  const summaryConfig = [
    ["health", "profile.stats.health", "", "hp"],
    ["attack", "profile.stats.attack", "", "attack"],
    ["defense", "profile.stats.defense", "", "defense"],
    ["stamina", "profile.stats.stamina", "", "stamina"],
    ["radiationResistance", "profile.stats.radiationResistance", "%", "radiation"],
    ["critChance", "profile.stats.critChance", "%", "crit"],
    ["critDamage", "profile.stats.critDamage", "%", "burst"],
    ["carryWeight", "profile.stats.carryWeight", " кг", "bag"]
  ];

  function modal() { return document.getElementById("profileModal"); }

  function fitProfile() {
    const stage = document.getElementById("profileStage");
    const dialog = stage?.querySelector(".profile-dialog");
    if (!stage || !dialog) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const baseWidth = parseFloat(rootStyles.getPropertyValue("--profile-dialog-width")) || 520;
    const baseHeight = parseFloat(rootStyles.getPropertyValue("--profile-dialog-height")) || 740;
    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width || window.innerWidth;
    const viewportHeight = viewport?.height || window.innerHeight;
    const safeGap = 12;

    const availableWidth = Math.max(1, viewportWidth - safeGap * 2);
    const availableHeight = Math.max(1, viewportHeight - safeGap * 2);

    // The profile keeps one fixed 520×740 design canvas.
    // Only the whole canvas scales down when the viewport cannot contain it.
    const scaleByWidth = availableWidth / baseWidth;
    const scaleByHeight = availableHeight / baseHeight;
    const scale = Math.min(1, scaleByWidth, scaleByHeight);

    dialog.style.setProperty("--profile-scale", scale.toFixed(4));
    stage.style.width = `${(baseWidth * scale).toFixed(2)}px`;
    stage.style.height = `${(baseHeight * scale).toFixed(2)}px`;
  }

  function renderStats() {
    const p = window.GameState.player;
    const host = document.getElementById("profileStatsGrid");
    if (!host) return;

    host.innerHTML = statConfig.map(([key, labelKey, suffix]) => {
      const label = window.GameI18n.resolve(labelKey) || key;
      const value = p.stats[key] ?? 0;
      return `<article class="stat-card"><span>${label}</span><strong>${value}${suffix}</strong><em>Базове значення</em></article>`;
    }).join("");
  }


  function renderSummary() {
    const p = window.GameState.player;
    const host = document.getElementById("profileSummaryGrid");
    if (!host) return;

    host.innerHTML = summaryConfig.map(([key, labelKey, suffix, tone]) => {
      const label = window.GameI18n.resolve(labelKey) || key;
      const value = p.stats[key] ?? 0;
      return `
        <div class="summary-row summary-row--${tone}">
          <span class="summary-row__label">${label}</span>
          <strong class="summary-row__value">${value}${suffix}</strong>
        </div>
      `;
    }).join("");
  }

  function setTab(name) {
    document.querySelectorAll("[data-profile-tab]").forEach((button) => {
      const active = button.dataset.profileTab === name;
      button.classList.toggle("is-active", active);
    });

    document.querySelectorAll("[data-profile-panel]").forEach((panel) => {
      const active = panel.dataset.profilePanel === name;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  function open() {
    lastFocused = document.activeElement;
    renderStats();
    renderSummary();
    setTab("hero");
    modal().hidden = false;
    fitProfile();
    document.getElementById("profileCloseButton")?.focus({ preventScroll: true });
  }

  function close() {
    modal().hidden = true;
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus({ preventScroll: true });
  }

  function bind() {
    document.getElementById("profileAvatarButton")?.addEventListener("click", open);
    document.getElementById("profileCloseButton")?.addEventListener("click", close);

    modal()?.addEventListener("click", (event) => {
      if (event.target === modal()) close();
    });

    document.querySelectorAll("[data-profile-tab]").forEach((button) => {
      button.addEventListener("click", () => setTab(button.dataset.profileTab));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal().hidden) close();
    });

    const refit = () => {
      if (!modal().hidden) fitProfile();
    };

    window.addEventListener("resize", refit);
    window.visualViewport?.addEventListener("resize", refit);
  }

  window.GameProfile = { bind, open, close, renderStats, renderSummary, fitProfile };
})();

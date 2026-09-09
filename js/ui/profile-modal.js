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

  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;
  const tf = (key, vars = {}, fallback = "") => window.GameI18n?.format?.(key, vars, fallback) || fallback;

  function modal() {
    return document.getElementById("profileModal");
  }

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
    const scale = Math.min(1, availableWidth / baseWidth, availableHeight / baseHeight);

    dialog.style.setProperty("--profile-scale", scale.toFixed(4));
    stage.style.width = `${(baseWidth * scale).toFixed(2)}px`;
    stage.style.height = `${(baseHeight * scale).toFixed(2)}px`;
  }

  function signed(value, suffix = "") {
    const num = Math.round((Number(value) || 0) * 100) / 100;
    if (!num) return `0${suffix}`;
    return `${num > 0 ? "+" : ""}${num}${suffix}`;
  }

  function renderStats() {
    const p = window.GameState.player;
    const breakdown = window.GameProgression?.getStatBreakdown?.() || {};
    const host = document.getElementById("profileStatsGrid");
    if (!host) return;

    host.innerHTML = statConfig.map(([key, labelKey, suffix]) => {
      const label = t(labelKey, key);
      const value = p.stats[key] ?? 0;
      const row = breakdown[key] || { base: value, level: 0, equipment: 0 };
      return `<article class="stat-card">
        <span>${label}</span>
        <strong>${value}${suffix}</strong>
        <em>${t("profile.statBreakdown.base", "База")}: ${row.base}${suffix} · ${t("profile.statBreakdown.level", "Рівень")}: ${signed(row.level, suffix)} · ${t("profile.statBreakdown.equipment", "Речі")}: ${signed(row.equipment, suffix)}</em>
      </article>`;
    }).join("");
  }

  function renderSummary() {
    const p = window.GameState.player;
    const host = document.getElementById("profileSummaryGrid");
    if (!host) return;

    host.innerHTML = summaryConfig.map(([key, labelKey, suffix, tone]) => {
      const label = t(labelKey, key);
      const value = p.stats[key] ?? 0;
      return `<div class="summary-row summary-row--${tone}">
        <span class="summary-row__label">${label}</span>
        <strong class="summary-row__value">${value}${suffix}</strong>
      </div>`;
    }).join("");
  }

  function renderProgression() {
    const host = document.getElementById("profileProgressionCard");
    if (!host) return;
    const p = window.GameState.player;
    const progress = window.GameProgression?.getProgress?.() || { level: p.level, xp: p.xp, xpNext: p.xpNext, percent: 0, isMaxLevel: false };
    const hpPercent = p.hpMax ? Math.max(0, Math.min(100, p.hp / p.hpMax * 100)) : 0;
    const energyPercent = p.energyMax ? Math.max(0, Math.min(100, p.energy / p.energyMax * 100)) : 0;

    host.innerHTML = `<div class="profile-progression-card__head">
      <div><span>${t("progression.level", "Рівень")}</span><strong>${progress.level}</strong></div>
      <div><span>${t("profile.power", "Бойова міць")}</span><strong>${p.power}</strong></div>
    </div>
    <div class="profile-progress-row">
      <span>${t("progression.experience", "Досвід")}</span>
      <b>${progress.isMaxLevel ? t("progression.maxLevel", "Максимальний рівень") : `${progress.xp} / ${progress.xpNext}`}</b>
      <i><u style="width:${progress.percent}%"></u></i>
    </div>
    <div class="profile-vitals-grid">
      <div><span>${t("profile.stats.health", "Здоров’я")}</span><b>${p.hp}/${p.hpMax}</b><i><u style="width:${hpPercent}%"></u></i></div>
      <div><span>${t("hud.energy", "Енергія")}</span><b>${p.energy}/${p.energyMax}</b><i><u style="width:${energyPercent}%"></u></i></div>
      <div><span>${t("hud.radiation", "Радіація")}</span><b>${p.radiation}/${p.radiationMax}</b></div>
    </div>`;
  }

  function renderAll() {
    renderProgression();
    renderStats();
    renderSummary();
    window.GameEquipment?.renderProfile?.();
  }

  function setTab(name) {
    document.querySelectorAll("[data-profile-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.profileTab === name);
    });

    document.querySelectorAll("[data-profile-panel]").forEach((panel) => {
      const active = panel.dataset.profilePanel === name;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  function open() {
    lastFocused = document.activeElement;
    renderAll();
    setTab("hero");
    modal().hidden = false;
    fitProfile();
    document.getElementById("profileCloseButton")?.focus({ preventScroll: true });
  }

  function close() {
    window.GameProfileEquipmentPicker?.close?.();
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
      if (event.key === "Escape" && !modal().hidden && document.getElementById("profileEquipmentPicker")?.hidden !== false) close();
    });

    const refit = () => {
      if (!modal().hidden) fitProfile();
    };
    window.addEventListener("resize", refit);
    window.visualViewport?.addEventListener("resize", refit);
    window.addEventListener("game:state-changed", () => {
      if (!modal()?.hidden) renderAll();
    });
  }

  window.GameProfile = {
    bind,
    open,
    close,
    renderStats,
    renderSummary,
    renderProgression,
    renderAll,
    fitProfile
  };
})();

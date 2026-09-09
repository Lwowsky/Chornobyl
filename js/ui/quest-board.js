(function () {
  const PAGE_SIZE = 40;
  const TABS = ["daily", "contract", "story", "completed"];
  const FILTERS = ["all", "new", "active", "ready"];
  const TYPE_ICONS = { daily: "☀", contract: "▤", story: "△", special: "✦" };
  const RARITY_CLASS = { common: "common", rare: "rare", epic: "epic", story: "story" };

  let activeTab = "daily";
  let activeFilter = "all";
  let searchQuery = "";
  let selectedId = "";
  let visibleLimit = PAGE_SIZE;
  let timerId = null;
  let lastFocused = null;
  let message = "";

  const $ = (id) => document.getElementById(id);
  const t = (key, fallback = "") => window.GameI18n?.resolve?.(key) || fallback;
  const tf = (key, vars = {}, fallback = "") => window.GameI18n?.format?.(key, vars, fallback) || fallback;

  function formatNumber(value) {
    return new Intl.NumberFormat("uk-UA").format(Math.max(0, Number(value) || 0));
  }

  function formatCountdown(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function questText(quest, field, fallback = "") {
    return t(quest?.[`${field}Key`], fallback);
  }

  function itemName(id) {
    return t(`items.${id}`, id);
  }

  function statusLabel(quest, status) {
    if (status === "locked") return tf("questBoard.statuses.locked", { level: quest.minLevel }, `Потрібен рівень ${quest.minLevel}`);
    return t(`questBoard.statuses.${status}`, status);
  }

  function rarityLabel(quest) {
    return t(`questBoard.rarities.${quest.rarity}`, quest.rarity);
  }

  function filteredQuests() {
    const source = window.GameQuests.list(activeTab);
    const query = searchQuery.trim().toLocaleLowerCase("uk");
    return source.filter((quest) => {
      const status = window.GameQuests.status(quest);
      if (activeFilter === "new" && status !== "available") return false;
      if (activeFilter === "active" && status !== "active") return false;
      if (activeFilter === "ready" && status !== "ready") return false;
      if (!query) return true;
      const haystack = [
        questText(quest, "title"),
        questText(quest, "description"),
        t(quest.locationKey, ""),
        ...(quest.tags || [])
      ].join(" ").toLocaleLowerCase("uk");
      return haystack.includes(query);
    }).sort((a, b) => {
      const order = { ready: 0, active: 1, available: 2, locked: 3, completed: 4 };
      const sa = window.GameQuests.status(a);
      const sb = window.GameQuests.status(b);
      return (order[sa] ?? 9) - (order[sb] ?? 9) || a.minLevel - b.minLevel || questText(a, "title").localeCompare(questText(b, "title"), "uk");
    });
  }

  function ensureSelection(quests) {
    if (selectedId && quests.some((quest) => quest.id === selectedId)) return;
    selectedId = quests[0]?.id || "";
  }

  function renderTabs() {
    TABS.forEach((type) => {
      const button = document.querySelector(`[data-quest-tab="${type}"]`);
      if (!button) return;
      const active = type === activeTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      const count = button.querySelector("[data-quest-tab-count]");
      if (count) count.textContent = String(window.GameQuests.list(type).length);
    });
  }

  function renderFilters() {
    const root = $("questBoardFilters");
    if (root) root.style.gridTemplateColumns = activeTab === "completed" ? "1fr" : "";
    FILTERS.forEach((filter) => {
      const button = document.querySelector(`[data-quest-filter="${filter}"]`);
      if (!button) return;
      button.hidden = activeTab === "completed" && filter !== "all";
      const active = filter === activeFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function objectivePercent(quest) {
    const state = window.GameQuests.progress(quest);
    return state.target ? Math.min(100, Math.round(state.current / state.target * 100)) : 0;
  }

  function questCard(quest) {
    const status = window.GameQuests.status(quest);
    const progress = window.GameQuests.progress(quest);
    const selected = quest.id === selectedId;
    const icon = TYPE_ICONS[quest.type] || "▤";
    const pct = objectivePercent(quest);
    const location = t(quest.locationKey, "");
    return `<button class="quest-board-item ${selected ? "is-selected" : ""} is-${status}" type="button" data-quest-id="${quest.id}" aria-pressed="${selected ? "true" : "false"}">
      <span class="quest-board-item__thumb"><img src="${quest.image || "assets/hub/safe-zone-hub.webp"}" alt="" draggable="false"></span>
      <span class="quest-board-item__copy">
        <span class="quest-board-item__topline"><strong>${questText(quest, "title", quest.id)}</strong><em class="quest-rarity quest-rarity--${RARITY_CLASS[quest.rarity] || "common"}">${rarityLabel(quest)}</em></span>
        <span class="quest-board-item__meta"><i>${icon}</i>${t(`questBoard.tabs.${quest.type}`, quest.type)}${location ? ` · ${location}` : ""}</span>
        <span class="quest-board-item__progress"><i style="width:${pct}%"></i></span>
        <span class="quest-board-item__footer"><small>${progress.current}/${progress.target}</small><b>${statusLabel(quest, status)}</b></span>
      </span>
    </button>`;
  }

  function renderList() {
    const root = $("questBoardList");
    const empty = $("questBoardEmpty");
    const more = $("questBoardLoadMore");
    const count = $("questBoardShownCount");
    if (!root) return;
    const all = filteredQuests();
    ensureSelection(all);
    const shown = all.slice(0, visibleLimit);
    root.innerHTML = shown.map(questCard).join("");
    if (empty) empty.hidden = all.length > 0;
    if (more) more.hidden = shown.length >= all.length;
    if (count) count.textContent = tf("questBoard.countShown", { shown: shown.length, total: all.length }, `Показано ${shown.length} з ${all.length}`);
  }

  function objectiveMarkup(quest) {
    return window.GameQuests.progress(quest).objectives.map((objective) => {
      const checked = objective.complete ? "is-complete" : "";
      const label = t(objective.labelKey, objective.id);
      return `<li class="quest-objective ${checked}"><span class="quest-objective__check">${objective.complete ? "✓" : ""}</span><span>${label}</span><b>${objective.current}/${objective.target}</b></li>`;
    }).join("");
  }

  function rewardItemsMarkup(rewards) {
    return (rewards?.items || []).map((entry) => {
      const item = window.GameInventoryData?.getItem?.(entry.id);
      const icon = item?.profileIcon ? `<img src="${item.profileIcon}" alt="">` : `<span>${item?.icon || "□"}</span>`;
      return `<div class="quest-reward"><span class="quest-reward__icon">${icon}</span><span><small>${t("questBoard.rewardLabels.item", "Предмет")}</small><strong>${itemName(entry.id)} ×${entry.qty}</strong></span></div>`;
    }).join("");
  }

  function rewardsMarkup(quest) {
    const rewards = quest.rewards || {};
    const parts = [];
    if (rewards.money) parts.push(`<div class="quest-reward"><span class="quest-reward__icon">₴</span><span><small>${t("questBoard.rewardLabels.money", "Кредити")}</small><strong>+ ${formatNumber(rewards.money)}</strong></span></div>`);
    if (rewards.xp) parts.push(`<div class="quest-reward"><span class="quest-reward__icon">XP</span><span><small>${t("questBoard.rewardLabels.xp", "Досвід")}</small><strong>+ ${formatNumber(rewards.xp)}</strong></span></div>`);
    if (rewards.reputation) parts.push(`<div class="quest-reward"><span class="quest-reward__icon">★</span><span><small>${t("questBoard.rewardLabels.reputation", "Репутація")}</small><strong>+ ${formatNumber(rewards.reputation)}</strong></span></div>`);
    return parts.join("") + rewardItemsMarkup(rewards);
  }

  function detailActions(quest, status) {
    const tracked = window.GameQuests.summary().trackedId === quest.id;
    if (status === "available") return `<button class="quest-action quest-action--primary" type="button" data-quest-action="accept">✓ ${t("questBoard.actions.accept", "Прийняти")}</button>`;
    if (status === "locked") return `<button class="quest-action quest-action--primary" type="button" disabled>${statusLabel(quest, status)}</button>`;
    if (status === "ready") return `<button class="quest-action quest-action--primary" type="button" data-quest-action="claim">▣ ${t("questBoard.actions.claim", "Забрати нагороду")}</button><button class="quest-action" type="button" data-quest-action="track">◎ ${t(tracked ? "questBoard.actions.untrack" : "questBoard.actions.track", tracked ? "Не відстежувати" : "Відстежувати")}</button>`;
    if (status === "active") return `<button class="quest-action quest-action--primary" type="button" data-quest-action="track">◎ ${t(tracked ? "questBoard.actions.untrack" : "questBoard.actions.track", tracked ? "Не відстежувати" : "Відстежувати")}</button>`;
    return `<button class="quest-action" type="button" disabled>✓ ${t("questBoard.actions.completed", "Виконано")}</button>`;
  }

  function renderDetails() {
    const detail = $("questBoardDetail");
    const rewards = $("questBoardRewards");
    const quest = window.GameQuestRegistry.get(selectedId);
    if (!detail || !rewards) return;
    if (!quest) {
      detail.innerHTML = `<div class="quest-board-placeholder">${t("questBoard.noSelection", "Оберіть завдання зі списку.")}</div>`;
      rewards.innerHTML = "";
      return;
    }
    const status = window.GameQuests.status(quest);
    const p = window.GameQuests.progress(quest);
    const stars = "★".repeat(quest.difficulty) + "☆".repeat(Math.max(0, 3 - quest.difficulty));
    const time = quest.durationHours ? `${quest.durationHours} год` : "—";
    detail.innerHTML = `
      <article class="quest-detail-card">
        <header class="quest-detail-card__header">
          <img src="${quest.image || "assets/hub/safe-zone-hub.webp"}" alt="" draggable="false">
          <div><span>${t(`questBoard.tabs.${quest.type}`, quest.type)}</span><h3>${questText(quest, "title", quest.id)}</h3><div class="quest-detail-card__badges"><em class="quest-rarity quest-rarity--${RARITY_CLASS[quest.rarity] || "common"}">${rarityLabel(quest)}</em><b>${stars}</b></div></div>
        </header>
        <p class="quest-detail-card__description">${questText(quest, "description", "")}</p>
        <div class="quest-detail-facts">
          <div><small>${t("questBoard.recommendedLevel", "Рекомендований рівень")}</small><strong>${quest.minLevel}+</strong></div>
          <div><small>${t("questBoard.location", "Локація")}</small><strong>${t(quest.locationKey, "—")}</strong></div>
          <div><small>${t("questBoard.timeLimit", "Час")}</small><strong>${time}</strong></div>
          <div><small>${t("questBoard.progress", "Прогрес")}</small><strong>${p.current}/${p.target}</strong></div>
        </div>
        <section class="quest-detail-objectives"><div class="quest-section-title"><span>${t("questBoard.objectivesTitle", "Цілі завдання")}</span><b>${p.current}/${p.target}</b></div><ul>${objectiveMarkup(quest)}</ul></section>
        <footer class="quest-detail-actions">${detailActions(quest, status)}</footer>
      </article>`;

    const summary = window.GameQuests.summary();
    const repTarget = Math.max(1000, Math.ceil((summary.factionRep + 1) / 1000) * 1000);
    const repPct = Math.min(100, summary.factionRep / repTarget * 100);
    rewards.innerHTML = `
      <div class="quest-board-rewards__title">${t("questBoard.rewardsTitle", "Нагороди")}</div>
      <div class="quest-reward-list">${rewardsMarkup(quest)}</div>
      <section class="quest-faction-progress"><span>${t("questBoard.factionProgress", "Репутація Безпечної зони")}</span><strong>${formatNumber(summary.factionRep)} / ${formatNumber(repTarget)}</strong><div><i style="width:${repPct}%"></i></div></section>
      <section class="quest-contract-limit"><div><span>${t("questBoard.contractLimit", "Ліміт контрактів")}</span><strong>${summary.activeContracts}/${summary.contractLimit}</strong></div><p>${tf("questBoard.contractLimitText", { limit: summary.contractLimit }, `Одночасно можна мати не більше ${summary.contractLimit} активних контрактів.`)}</p></section>`;
  }

  function renderTopStatus() {
    const summary = window.GameQuests.summary();
    const active = Object.keys(window.GameState.questBoard?.entries || {}).filter((id) => {
      const quest = window.GameQuestRegistry.get(id);
      return quest && ["active", "ready"].includes(window.GameQuests.status(quest));
    }).length;
    const activeNode = $("questBoardActiveCount");
    const timerNode = $("questBoardDailyTimer");
    if (activeNode) activeNode.textContent = `${active}`;
    if (timerNode) timerNode.textContent = formatCountdown(summary.dailyResetMs);
    const msg = $("questBoardMessage");
    if (msg) msg.textContent = message;
  }

  function render() {
    window.GameQuests.resetDailyIfNeeded();
    renderTabs();
    renderFilters();
    renderList();
    renderDetails();
    renderTopStatus();
  }

  function setTab(type) {
    if (!TABS.includes(type)) return;
    activeTab = type;
    activeFilter = "all";
    visibleLimit = PAGE_SIZE;
    selectedId = "";
    message = "";
    render();
  }

  function setFilter(filter) {
    if (!FILTERS.includes(filter)) return;
    activeFilter = filter;
    visibleLimit = PAGE_SIZE;
    selectedId = "";
    message = "";
    render();
  }

  function handleAction(action) {
    const quest = window.GameQuestRegistry.get(selectedId);
    if (!quest) return;
    let result = null;
    if (action === "accept") {
      result = window.GameQuests.accept(quest.id);
      message = result.ok ? t("questBoard.messages.accepted", "Завдання прийнято.") : result.code === "contractLimit" ? t("questBoard.messages.contractLimit", "Досягнуто ліміт активних контрактів.") : t("questBoard.messages.unavailable", "Це завдання зараз недоступне.");
    } else if (action === "track") {
      result = window.GameQuests.track(quest.id);
      message = result.tracked ? t("questBoard.messages.tracked", "Завдання відстежується.") : t("questBoard.messages.untracked", "Відстеження вимкнено.");
    } else if (action === "claim") {
      result = window.GameQuests.claim(quest.id);
      message = result.ok ? t("questBoard.messages.claimed", "Нагороду отримано.") : t("questBoard.messages.unavailable", "Це завдання зараз недоступне.");
    }
    render();
  }

  function open() {
    const modal = $("questBoardModal");
    if (!modal) return;
    lastFocused = document.activeElement;
    activeTab = "daily";
    activeFilter = "all";
    searchQuery = "";
    selectedId = "";
    visibleLimit = PAGE_SIZE;
    message = "";
    const search = $("questBoardSearch");
    if (search) search.value = "";
    modal.hidden = false;
    document.body.classList.add("is-quest-board-open");
    window.GameI18n?.applyTranslations?.(modal);
    render();
    clearInterval(timerId);
    timerId = window.setInterval(renderTopStatus, 1000);
    requestAnimationFrame(() => $("questBoardClose")?.focus());
  }

  function close() {
    const modal = $("questBoardModal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("is-quest-board-open");
    document.querySelector('[data-hub-point="questBoard"]')?.classList.remove("is-active");
    clearInterval(timerId);
    timerId = null;
    lastFocused?.focus?.();
  }

  function bind() {
    $("questBoardClose")?.addEventListener("click", close);
    $("questBoardBackdrop")?.addEventListener("click", close);
    $("questBoardTabs")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quest-tab]");
      if (button) setTab(button.dataset.questTab);
    });
    $("questBoardFilters")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quest-filter]");
      if (button) setFilter(button.dataset.questFilter);
    });
    $("questBoardList")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quest-id]");
      if (!button) return;
      selectedId = button.dataset.questId || "";
      message = "";
      render();
    });
    $("questBoardDetail")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quest-action]");
      if (button) handleAction(button.dataset.questAction);
    });
    $("questBoardSearch")?.addEventListener("input", (event) => {
      searchQuery = event.target.value || "";
      visibleLimit = PAGE_SIZE;
      selectedId = "";
      renderList();
      renderDetails();
    });
    $("questBoardLoadMore")?.addEventListener("click", () => {
      visibleLimit += PAGE_SIZE;
      renderList();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("questBoardModal")?.hidden) close();
    });
    window.addEventListener("game:state-changed", () => {
      if (!$("questBoardModal")?.hidden) render();
    });
  }

  window.GameQuestBoard = { bind, open, close, render };
})();

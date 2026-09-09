(function () {
  const {
    BAR_MENU_REFRESH_MS, BAR_DAILY_REFRESH_MS, BAR_RUMOR_REFRESH_MS,
    BAR_NPC_RUMOR_REFRESH_MS, BAR_TICK_MS, BAR_MENU_ITEMS,
    BAR_BARTENDER_SPECIAL
  } = window.GameBarData;
  const core = window.GameBarCore;
  const barState = core.state;
  const {
    syncBarPurchaseLocks, hasPurchasedMenuItem, getBarPrice, getTimeUntilNext,
    formatCountdown, formatEffect, rarityLabel, getMenuItems, getDailyOffer,
    cleanupExpiredBuffs, getActiveBarBuffs, getActiveRumor, getActiveNpcRumor,
    getActiveRumors, getRumorModifier, getBarModifier, buyBarItem, buyDailyOffer,
    listenToBarRumor, talkToInformant
  } = core;
  let barTimerId = null;
  let barRumorModalTab = "listen";

  function renderBartenderDialogueModal() {
    return window.GameBarDialogue?.render?.();
  }

  function resetBartenderDialogue() {
    return window.GameBarDialogue?.reset?.();
  }

  function rumorJournalStatus(entry) {
    if (entry?.entryType === "quest") return "Квестова";
    const active = getActiveRumors().some((rumor) =>
      rumor.heardAt === entry?.heardAt && rumor.expiresAt > Date.now()
    );
    return active ? "Активна" : "Завершена";
  }
  function renderBarRumorCard() {
    syncBarPurchaseLocks();
    cleanupExpiredBuffs();
    const timer = document.getElementById("barRumorTimer");
    const title = document.getElementById("barRumorTitle");
    const description = document.getElementById("barRumorDescription");
    const bonus = document.getElementById("barRumorBonus");
    if (!timer || !title || !description || !bonus) return;

    const activeRumors = getActiveRumors();
    if (activeRumors.length > 1) {
      const nearest = Math.min(...activeRumors.map((rumor) => rumor.expiresAt));
      timer.textContent = `2 активні · мін. ${formatCountdown(nearest - Date.now())}`;
      title.textContent = "Активні чутки · 2";
      description.textContent = activeRumors.map((rumor) => `${rumor.sourceLabel}: ${rumor.location} · ${rumor.title}`).join(" | ");
      bonus.textContent = activeRumors.map((rumor) => `${rumor.sourceLabel}: ${rumor.effects.map(formatEffect).join(", ")}`).join(" · ");
      return;
    }

    const active = activeRumors[0];
    if (active) {
      timer.textContent = `активна ${formatCountdown(active.expiresAt - Date.now())}`;
      title.textContent = `${active.icon} ${active.location} · ${active.title}`;
      description.textContent = `${active.sourceLabel}: ${active.text}`;
      bonus.textContent = `${active.effects.map(formatEffect).join(" · ")} · ${active.sourceType === "npc" ? "1 год" : "2 год"}`;
      return;
    }

    if (barState.rumorHeardThisSlot) {
      timer.textContent = `нова через ${formatCountdown(getTimeUntilNext(BAR_RUMOR_REFRESH_MS))}`;
      title.textContent = "Чутку вже перевірено";
      description.textContent = "Повернись після оновлення розмов у барі. Попередній запис залишився в журналі.";
      bonus.textContent = "1 чутка за цикл · використано";
      return;
    }

    timer.textContent = "можна підслухати";
    title.textContent = "Підслухати розмови";
    description.textContent = "Раз на 6 годин можна безкоштовно почути одну випадкову чутку з тимчасовим бонусом для конкретної зони.";
    bonus.textContent = "Безкоштовно · 1 раз / 6 год";
  }

  function renderBarRumorsModal(message = "") {
    syncBarPurchaseLocks();
    cleanupExpiredBuffs();
    const modal = document.getElementById("hubModal");
    const title = document.getElementById("hubModalTitle");
    const description = document.getElementById("hubModalDescription");
    const status = document.getElementById("hubModalStatus");
    const extra = document.getElementById("hubModalExtra");
    if (!modal || !title || !description || !status || !extra) return;

    const activeRumors = getActiveRumors();
    const ready = !barState.rumorHeardThisSlot;
    const journal = barState.rumorJournal.slice(0, 10);
    modal.dataset.mode = "bar-rumors";
    title.textContent = "Чутки бару";
    description.textContent = "Тут зібрані звичайні розмови, активні бонуси та квестові зачіпки. Для конкретних запитань використовуй «Контакти» → Бармен або Інформатор.";
    status.textContent = message || (ready ? "Є свіжа розмова: можна отримати 1 звичайну чутку." : `Нова звичайна чутка через ${formatCountdown(getTimeUntilNext(BAR_RUMOR_REFRESH_MS))}.`);

    const listenPanel = `
      <div class="bar-rumors-listen">
        <div><span class="bar-rumors-listen__eyebrow">Підслухати розмови</span><h3>${ready ? "У барі є щось нове" : "Свіжу розмову вже використано"}</h3><p>${ready ? "Випадкова чутка дає локальний бонус на 2 години. Якщо хочеш вибрати тему — поговори з Мареком." : `Повернись через ${formatCountdown(getTimeUntilNext(BAR_RUMOR_REFRESH_MS))}.`}</p></div>
        <button class="bar-rumors-listen__button" type="button" data-rumor-listen ${ready ? "" : "disabled"}>${ready ? "Підслухати безкоштовно" : "Вже використано"}</button>
      </div>
      <div class="bar-rumors-shortcuts">
        <button type="button" data-rumor-open-bartender><span>🍺</span><strong>Поговорити з Барменом</strong><small>Сам обери, про що розпитати</small></button>
        <button type="button" data-rumor-open-contacts><span>👥</span><strong>Відкрити Контакти</strong><small>Інформатор та інші NPC</small></button>
      </div>`;

    const activePanel = `
      <div class="bar-rumor-active-list">
        ${activeRumors.length ? activeRumors.map((active) => `
          <article class="bar-rumor-active bar-rumor-active--${active.sourceType}">
            <div class="bar-rumor-active__icon">${active.icon}</div>
            <div class="bar-rumor-active__content"><span>${active.sourceLabel} · ${active.location} · ${formatCountdown(active.expiresAt - Date.now())}</span><h3>${active.title}</h3><p>${active.text}</p><strong>${active.effects.map(formatEffect).join(" · ")}</strong></div>
          </article>`).join("") : `<div class="bar-rumors-empty">Немає активних чуток. Підслухай розмову або поговори з NPC.</div>`}
      </div>
      <p class="bar-rumors-note">Максимум: 1 звичайна + 1 рідкісна NPC-чутка. Однаковий бонус в одній локації не складається — працює сильніший.</p>`;

    const journalPanel = `
      <div class="bar-rumor-journal">
        ${journal.length ? journal.map((entry) => `
          <article class="bar-rumor-journal__item ${entry.entryType === "quest" ? "is-quest" : ""}">
            <span class="bar-rumor-journal__icon">${entry.icon || "💬"}</span>
            <div><div class="bar-rumor-journal__top"><strong>${entry.location} · ${entry.title}</strong><span>${rumorJournalStatus(entry)}</span></div><p>${entry.entryType === "quest" ? `${entry.sourceLabel || "NPC"} · ${entry.rewardLabel || "Квестова зачіпка"}` : `${entry.sourceLabel || (entry.sourceType === "npc" ? "Інформатор" : "Бар")} · ${(entry.effects || []).map(formatEffect).join(" · ")}`}</p></div>
          </article>`).join("") : `<div class="bar-rumors-empty">Журнал порожній.</div>`}
      </div>`;

    const panels = { listen: listenPanel, active: activePanel, journal: journalPanel };
    extra.innerHTML = `
      <div class="bar-rumors-shell">
        <nav class="bar-rumors-tabs" aria-label="Розділи чуток">
          <button type="button" data-rumor-tab="listen" class="${barRumorModalTab === "listen" ? "is-active" : ""}">💬 Розпитати</button>
          <button type="button" data-rumor-tab="active" class="${barRumorModalTab === "active" ? "is-active" : ""}">★ Активні <span>${activeRumors.length}</span></button>
          <button type="button" data-rumor-tab="journal" class="${barRumorModalTab === "journal" ? "is-active" : ""}">📖 Журнал <span>${barState.rumorJournal.length}</span></button>
        </nav>
        <section class="bar-rumors-tabpanel">${panels[barRumorModalTab] || listenPanel}</section>
      </div>`;
    extra.classList.add("is-visible");

    extra.querySelectorAll("[data-rumor-tab]").forEach((button) => button.addEventListener("click", () => {
      barRumorModalTab = button.dataset.rumorTab || "listen";
      renderBarRumorsModal();
    }));
    extra.querySelector("[data-rumor-listen]")?.addEventListener("click", () => {
      const result = listenToBarRumor();
      barRumorModalTab = result.ok ? "active" : "listen";
      renderBarRumorsModal(result.message);
    });
    extra.querySelector("[data-rumor-open-bartender]")?.addEventListener("click", () => {
      resetBartenderDialogue();
      renderBartenderDialogueModal();
    });
    extra.querySelector("[data-rumor-open-contacts]")?.addEventListener("click", () => {
      modal.dataset.mode = "bar-contacts";
      renderBarContactsModal();
    });
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

    renderBarRumorCard();

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

  function renderBarContactsModal(message = "") {
    syncBarPurchaseLocks();
    cleanupExpiredBuffs();
    const modal = document.getElementById("hubModal");
    const title = document.getElementById("hubModalTitle");
    const description = document.getElementById("hubModalDescription");
    const status = document.getElementById("hubModalStatus");
    const extra = document.getElementById("hubModalExtra");
    if (!modal || !title || !description || !status || !extra) return;

    const npcReady = !barState.npcRumorUsed;
    const activeNpcRumor = getActiveNpcRumor();
    title.textContent = "Контакти бару";
    description.textContent = "NPC на фоні залишаються атмосферою. Усі взаємодії працюють через цей список, тому інтерфейс не залежить від розміру або обрізання картинки.";
    status.textContent = message || "Зараз повністю підключені Бармен та Інформатор. Торговець і Мандрівник підготовлені для наступних механік.";
    extra.innerHTML = `
      <div class="bar-contacts-grid">
        <article class="bar-contact-card is-active">
          <div class="bar-contact-card__avatar">🍺</div>
          <div class="bar-contact-card__content">
            <div class="bar-contact-card__top"><span>Постійно доступний</span><strong>Бармен · Марек</strong></div>
            <p>Повноцінний діалог: чутки за обраною темою, квестові зачіпки з різними умовами, лор та особлива пропозиція.</p>
            <button type="button" data-contact-action="bartender">Поговорити</button>
          </div>
        </article>

        <article class="bar-contact-card ${npcReady ? "is-ready" : "is-used"}">
          <div class="bar-contact-card__avatar">🕵️</div>
          <div class="bar-contact-card__content">
            <div class="bar-contact-card__top"><span>${activeNpcRumor ? `Чутка активна · ${formatCountdown(activeNpcRumor.expiresAt - Date.now())}` : npcReady ? "Є нова інформація" : `Нова через ${formatCountdown(getTimeUntilNext(BAR_NPC_RUMOR_REFRESH_MS))}`}</span><strong>Інформатор</strong></div>
            <p>Раз на 12 годин дає рідкісну локальну чутку на 1 годину. Вона може працювати одночасно зі звичайною чуткою бару.</p>
            <button type="button" data-contact-action="informant" ${npcReady ? "" : "disabled"}>${npcReady ? "Розпитати" : "Інформацію отримано"}</button>
          </div>
        </article>

        <article class="bar-contact-card is-locked">
          <div class="bar-contact-card__avatar">🎒</div>
          <div class="bar-contact-card__content">
            <div class="bar-contact-card__top"><span>Наступний етап</span><strong>Торговець</strong></div>
            <p>Рідкісні товари, обмін матеріалів та спеціальні пропозиції після виконання його доручень.</p>
            <button type="button" disabled>Ще недоступно</button>
          </div>
        </article>

        <article class="bar-contact-card is-locked">
          <div class="bar-contact-card__avatar">🥾</div>
          <div class="bar-contact-card__content">
            <div class="bar-contact-card__top"><span>Наступний етап</span><strong>Мандрівник</strong></div>
            <p>Історії, випадкові мініквести та квестові чутки, які можуть вести у вже відкриті локації.</p>
            <button type="button" disabled>Ще недоступно</button>
          </div>
        </article>
      </div>
      <div class="bar-contacts-rule">
        <strong>Правило чуток</strong>
        <span>1 звичайна чутка з бару + 1 рідкісна від Інформатора можуть бути активні одночасно. Однакові характеристики не сумуються — використовується сильніший відсоток.</span>
      </div>`;
    extra.classList.add("is-visible");

    extra.querySelector('[data-contact-action="bartender"]')?.addEventListener("click", () => {
      resetBartenderDialogue();
      renderBartenderDialogueModal();
    });
    extra.querySelector('[data-contact-action="informant"]')?.addEventListener("click", () => {
      const result = talkToInformant();
      renderBarContactsModal(result.message);
    });
  }

  function getBarActionContent(actionId) {
    return {
      title: "Бар",
      description: "Розділ бару.",
      status: "Функціонал буде розширено наступним етапом.",
      extra: ""
    };
  }

  function openBarAction(actionId) {
    const modal = document.getElementById("hubModal");
    const title = document.getElementById("hubModalTitle");
    const description = document.getElementById("hubModalDescription");
    const status = document.getElementById("hubModalStatus");
    const extra = document.getElementById("hubModalExtra");
    if (!modal || !title || !description || !status || !extra) return;

    modal.dataset.mode = actionId === "menu" ? "bar-menu" : actionId === "rumors" ? "bar-rumors" : actionId === "contacts" ? "bar-contacts" : "bar-action";
    modal.hidden = false;
    if (actionId === "menu") {
      renderBarMenuModal();
      return;
    }
    if (actionId === "rumors") {
      renderBarRumorsModal();
      return;
    }
    if (actionId === "contacts") {
      renderBarContactsModal();
      return;
    }

    const content = getBarActionContent(actionId);
    title.textContent = content.title;
    description.textContent = content.description;
    status.textContent = content.status;
    extra.innerHTML = content.extra;
    extra.classList.add("is-visible");
  }


  function bind() {
    document.querySelectorAll("[data-bar-action]").forEach((button) => {
      if (button.dataset.barBound === "1") return;
      button.dataset.barBound = "1";
      button.addEventListener("click", () => openBarAction(button.dataset.barAction));
    });
    const daily = document.getElementById("barDailyBuy");
    if (daily && daily.dataset.barBound !== "1") {
      daily.dataset.barBound = "1";
      daily.addEventListener("click", () => {
        const result = buyDailyOffer();
        const status = document.getElementById("hubModalStatus");
        if (!result.ok) { openBarAction("menu"); if (status) status.textContent = result.message; }
      });
    }
    renderBarSideCards();
    if (!barTimerId) barTimerId = window.setInterval(() => {
      renderBarSideCards();
      const modal = document.getElementById("hubModal");
      if (modal && !modal.hidden && modal.dataset.mode === "bar-menu") renderBarMenuModal();
      if (modal && !modal.hidden && modal.dataset.mode === "bar-rumors") renderBarRumorsModal();
      if (modal && !modal.hidden && modal.dataset.mode === "bar-contacts") renderBarContactsModal();
    }, BAR_TICK_MS);
  }

  window.GameBarUi = { renderSideCards: renderBarSideCards, openAction: openBarAction };
  window.GameBar = {
    bind,
    getActiveBuffs: getActiveBarBuffs,
    getModifier: getBarModifier,
    getMenuItems,
    getDailyOffer,
    hasPurchasedMenuItem,
    getActiveRumor,
    getActiveNpcRumor,
    getActiveRumors,
    getRumorModifier,
    listenToRumor: listenToBarRumor,
    talkToInformant,
    talkToBartender: renderBartenderDialogueModal,
    getBartenderQuestLead: () => barState.bartenderQuestLead,
    render: renderBarSideCards
  };
})();

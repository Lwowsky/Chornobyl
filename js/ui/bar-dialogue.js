(function () {
  const {
    BAR_MENU_REFRESH_MS, BAR_RUMOR_REFRESH_MS, BAR_RUMOR_DURATION_MS, BAR_RUMOR_JOURNAL_LIMIT, BAR_BARTENDER_JOB_REFRESH_MS,
    BAR_BARTENDER_SPECIAL_DURATION_MS, BAR_BARTENDER_SPECIAL,
    BAR_BARTENDER_JOBS, BAR_BARTENDER_JOB_VARIANTS, BAR_RUMORS
  } = window.GameBarData;
  const core = window.GameBarCore;
  const barState = core.state;
  const {
    saveBarState, syncBarPurchaseLocks, seededRandom, getBarPrice, getRefreshSlot,
    getTimeUntilNext, formatCountdown, formatEffect, cleanupExpiredBuffs,
    getActiveRumor, getActiveRumors
  } = core;
  let bartenderDialogueState = createBartenderDialogueState();
  function closeModal() {
    const modal = document.getElementById("hubModal");
    if (!modal) return;
    modal.hidden = true;
    delete modal.dataset.mode;
  }
  function renderBarSideCards() { window.GameBarUi?.renderSideCards?.(); }
  function createBartenderDialogueState() {
    return {
      view: "home",
      messages: [
        { speaker: "Марек", type: "npc", text: "Ну що, сталкере? Чого шукаєш сьогодні?" }
      ],
      jobVariant: null,
      notice: ""
    };
  }

  function resetBartenderDialogue() {
    bartenderDialogueState = createBartenderDialogueState();
  }

  function pushBartenderMessage(speaker, textValue, type = "npc") {
    bartenderDialogueState.messages.push({ speaker, type, text: textValue });
    bartenderDialogueState.messages = bartenderDialogueState.messages.slice(-9);
  }

  function getBartenderRumorForTopic(topic) {
    const topicKeys = {
      mutants: ["exp", "attack"],
      supplies: ["materials", "technicalLoot", "medicalLoot", "rareFind"],
      radiation: ["radiationTaken", "energyCost"],
      money: ["money"]
    };
    const wanted = topicKeys[topic] || [];
    const candidates = BAR_RUMORS.filter((rumor) => rumor.effects.some((effect) => wanted.includes(effect.key)));
    const pool = candidates.length ? candidates : BAR_RUMORS;
    const slot = getRefreshSlot(BAR_RUMOR_REFRESH_MS);
    const level = window.GameState?.player?.level || 1;
    const salt = ({ mutants: 17, supplies: 29, radiation: 43, money: 71 })[topic] || 101;
    return pool[Math.floor(seededRandom(slot + level * 0.197 + salt) * pool.length)];
  }

  function activateBartenderRumor(topic) {
    syncBarPurchaseLocks();
    if (barState.rumorHeardThisSlot) {
      return { ok: false, message: `Свіжу інформацію в цьому циклі вже використано. Нова звичайна чутка через ${formatCountdown(getTimeUntilNext(BAR_RUMOR_REFRESH_MS))}.` };
    }
    const rumor = getBartenderRumorForTopic(topic);
    const now = Date.now();
    const activeRumor = {
      ...rumor,
      sourceType: "bar",
      sourceLabel: "Бармен",
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
    renderBarSideCards();
    return { ok: true, rumor: activeRumor };
  }

  function getBartenderJobOffer() {
    const slot = getRefreshSlot(BAR_BARTENDER_JOB_REFRESH_MS);
    const level = window.GameState?.player?.level || 1;
    return BAR_BARTENDER_JOBS[Math.floor(seededRandom(slot + level * 0.313 + 813) * BAR_BARTENDER_JOBS.length)];
  }

  function acceptBartenderJob() {
    syncBarPurchaseLocks();
    if (barState.bartenderQuestLead) return { ok: false, message: "У тебе вже є активна квестова зачіпка від Марека." };
    if (barState.bartenderJobUsed) return { ok: false, message: `Нову роботу Марек запропонує через ${formatCountdown(getTimeUntilNext(BAR_BARTENDER_JOB_REFRESH_MS))}.` };
    const offer = getBartenderJobOffer();
    const variant = BAR_BARTENDER_JOB_VARIANTS[bartenderDialogueState.jobVariant || "pay"];
    const now = Date.now();
    const lead = {
      ...offer,
      variantId: variant.id,
      rewardMoney: variant.money,
      rewardExp: variant.exp,
      rewardExtra: variant.extra,
      acceptedAt: now,
      entryType: "quest"
    };
    barState.bartenderQuestLead = lead;
    barState.bartenderJobUsed = true;
    barState.rumorJournal = [
      {
        id: `quest-${offer.id}-${now}`,
        icon: offer.icon,
        locationId: offer.locationId,
        location: offer.location,
        title: offer.title,
        text: offer.intro,
        sourceType: "quest",
        sourceLabel: "Бармен",
        entryType: "quest",
        rewardLabel: `₴${variant.money} + ${variant.exp} EXP · ${variant.extra}`,
        heardAt: now,
        expiresAt: 0,
        effects: []
      },
      ...barState.rumorJournal
    ].slice(0, BAR_RUMOR_JOURNAL_LIMIT);
    saveBarState();
    return { ok: true, lead };
  }

  function abandonBartenderJob() {
    if (!barState.bartenderQuestLead) return;
    barState.bartenderQuestLead = null;
    saveBarState();
  }

  function buyBartenderSpecial() {
    syncBarPurchaseLocks();
    const player = window.GameState?.player;
    if (!player) return { ok: false, message: "Не вдалося прочитати стан героя." };
    if (barState.bartenderSpecialPurchased) {
      return { ok: false, message: `Особливу пропозицію вже куплено. Нова буде доступна з наступною ротацією меню через ${formatCountdown(getTimeUntilNext(BAR_MENU_REFRESH_MS))}.` };
    }
    const price = getBarPrice(BAR_BARTENDER_SPECIAL.basePrice);
    if (player.money < price) return { ok: false, message: `Недостатньо грошей. Потрібно ₴ ${price}.` };
    player.money = Math.round((player.money - price) * 100) / 100;
    barState.activeDrink = {
      id: BAR_BARTENDER_SPECIAL.id,
      name: BAR_BARTENDER_SPECIAL.name,
      category: "drink",
      effects: BAR_BARTENDER_SPECIAL.effects,
      expiresAt: Date.now() + BAR_BARTENDER_SPECIAL_DURATION_MS
    };
    barState.bartenderSpecialPurchased = true;
    saveBarState();
    window.GameStateStore?.save?.();
    window.GameHud?.render?.();
    renderBarSideCards();
    return { ok: true, message: `${BAR_BARTENDER_SPECIAL.name} активна ${BAR_BARTENDER_SPECIAL.duration} хв.` };
  }

  function rumorJournalStatus(entry) {
    if (entry.entryType === "quest") return "Квестова";
    const active = getActiveRumors().some((rumor) => rumor.heardAt === entry.heardAt && rumor.expiresAt > Date.now());
    return active ? "Активна" : "Завершена";
  }

  function renderBartenderTranscript() {
    return bartenderDialogueState.messages.map((message) => `
      <div class="bar-dialogue-message bar-dialogue-message--${message.type}">
        <span>${message.speaker}</span>
        <p>${message.text}</p>
      </div>`).join("");
  }

  function renderBartenderConsequences() {
    const rumor = getActiveRumor();
    const quest = barState.bartenderQuestLead;
    const special = barState.activeDrink?.id === BAR_BARTENDER_SPECIAL.id ? barState.activeDrink : null;
    const cards = [];
    if (rumor) cards.push(`
      <article class="bar-dialogue-result bar-dialogue-result--rumor">
        <span>Активна чутка</span><strong>${rumor.location} · ${rumor.title}</strong>
        <p>${rumor.effects.map(formatEffect).join(" · ")}</p><small>${formatCountdown(rumor.expiresAt - Date.now())}</small>
      </article>`);
    if (quest) cards.push(`
      <article class="bar-dialogue-result bar-dialogue-result--quest">
        <span>Квестова зачіпка</span><strong>${quest.title}</strong>
        <p>${quest.location} · ₴${quest.rewardMoney} + ${quest.rewardExp} EXP</p><small>${quest.rewardExtra}</small>
      </article>`);
    if (special) cards.push(`
      <article class="bar-dialogue-result bar-dialogue-result--special">
        <span>Особливий баф</span><strong>${special.name}</strong>
        <p>${special.effects.map(formatEffect).join(" · ")}</p><small>${formatCountdown(special.expiresAt - Date.now())}</small>
      </article>`);
    return cards.length ? cards.join("") : `<div class="bar-dialogue-empty">Поки що вибір не дав активних наслідків.</div>`;
  }

  function renderBartenderOptions() {
    const view = bartenderDialogueState.view;
    if (view === "info") {
      const locked = barState.rumorHeardThisSlot;
      return `
        <div class="bar-dialogue-choice-title">Уточнити інформацію</div>
        <div class="bar-dialogue-choices bar-dialogue-choices--grid">
          <button type="button" data-bartender-info="mutants" ${locked ? "disabled" : ""}>🐾 Що з мутантами?</button>
          <button type="button" data-bartender-info="supplies" ${locked ? "disabled" : ""}>📦 А з припасами як?</button>
          <button type="button" data-bartender-info="radiation" ${locked ? "disabled" : ""}>☢ Радіація сильна?</button>
          <button type="button" data-bartender-info="money" ${locked ? "disabled" : ""}>🪙 Де краще платять?</button>
        </div>
        ${locked ? `<p class="bar-dialogue-cooldown">Нову звичайну чутку можна отримати через ${formatCountdown(getTimeUntilNext(BAR_RUMOR_REFRESH_MS))}.</p>` : ""}
        <button class="bar-dialogue-back" type="button" data-bartender-back>← Змінити тему</button>`;
    }

    if (view === "job") {
      const offer = getBartenderJobOffer();
      const current = bartenderDialogueState.jobVariant ? BAR_BARTENDER_JOB_VARIANTS[bartenderDialogueState.jobVariant] : null;
      const blocked = Boolean(barState.bartenderQuestLead || barState.bartenderJobUsed);
      return `
        <div class="bar-dialogue-job-summary"><span>${offer.icon} ${offer.location}</span><strong>${offer.title}</strong><p>${offer.intro}</p></div>
        <div class="bar-dialogue-choice-title">Що запитати?</div>
        <div class="bar-dialogue-choices bar-dialogue-choices--grid">
          <button type="button" data-bartender-job="contents" ${blocked ? "disabled" : ""}>Що там усередині?</button>
          <button type="button" data-bartender-job="pay" ${blocked ? "disabled" : ""}>Скільки платять?</button>
          <button type="button" data-bartender-job="risk" ${blocked ? "disabled" : ""}>Наскільки небезпечно?</button>
          <button type="button" data-bartender-back>Не цікаво</button>
        </div>
        ${current && !blocked ? `<div class="bar-dialogue-reward"><span>Обрані умови</span><strong>₴${current.money} + ${current.exp} EXP</strong><p>${current.extra}</p><button type="button" data-bartender-accept-job>Взяти доручення</button></div>` : ""}
        ${barState.bartenderQuestLead ? `<div class="bar-dialogue-cooldown">У тебе вже є активна зачіпка «${barState.bartenderQuestLead.title}». <button type="button" data-bartender-abandon-job>Відмовитися</button></div>` : barState.bartenderJobUsed ? `<p class="bar-dialogue-cooldown">Нова робота з'явиться через ${formatCountdown(getTimeUntilNext(BAR_BARTENDER_JOB_REFRESH_MS))}.</p>` : ""}
        <button class="bar-dialogue-back" type="button" data-bartender-back>← Змінити тему</button>`;
    }

    if (view === "special") {
      const price = getBarPrice(BAR_BARTENDER_SPECIAL.basePrice);
      return `
        <div class="bar-dialogue-special">
          <div class="bar-dialogue-special__icon">${BAR_BARTENDER_SPECIAL.icon}</div>
          <div><span>Не з основного меню</span><strong>${BAR_BARTENDER_SPECIAL.name}</strong><p>${BAR_BARTENDER_SPECIAL.description}</p><b>${BAR_BARTENDER_SPECIAL.effects.map(formatEffect).join(" · ")} · ${BAR_BARTENDER_SPECIAL.duration} хв</b></div>
          <button type="button" data-bartender-buy-special ${barState.bartenderSpecialPurchased ? "disabled" : ""}>${barState.bartenderSpecialPurchased ? "Куплено · до оновлення" : `Купити · ₴ ${price}`}</button>
        </div>
        <p class="bar-dialogue-cooldown">Особлива позиція оновлюється разом із меню бару: ${formatCountdown(getTimeUntilNext(BAR_MENU_REFRESH_MS))}.</p>
        <button class="bar-dialogue-back" type="button" data-bartender-back>← Змінити тему</button>`;
    }

    if (view === "lore") {
      return `
        <div class="bar-dialogue-choice-title">Про що розпитати Марека?</div>
        <div class="bar-dialogue-choices">
          <button type="button" data-bartender-lore="bar">Як давно існує цей бар?</button>
          <button type="button" data-bartender-lore="people">Хто сюди приходить?</button>
          <button type="button" data-bartender-lore="signal">Що ти знаєш про сигнал 1037?</button>
        </div>
        <button class="bar-dialogue-back" type="button" data-bartender-back>← Змінити тему</button>`;
    }

    return `
      <div class="bar-dialogue-choice-title">Що запитати?</div>
      <div class="bar-dialogue-topics">
        <button type="button" data-bartender-topic="info"><span>💬</span><strong>Що нового в Зоні?</strong><small>Чутка та локальний бонус</small></button>
        <button type="button" data-bartender-topic="job"><span>📋</span><strong>Є якась робота?</strong><small>Умови та квестова зачіпка</small></button>
        <button type="button" data-bartender-topic="special"><span>☕</span><strong>Є щось особливе?</strong><small>Унікальний тимчасовий баф</small></button>
        <button type="button" data-bartender-topic="lore"><span>📖</span><strong>Розкажи про це місце</strong><small>Лор і додаткова інформація</small></button>
        <button type="button" data-bartender-close><span>👋</span><strong>Бувай</strong><small>Завершити розмову</small></button>
      </div>`;
  }

  function bindBartenderDialogueEvents(extra) {
    extra.querySelectorAll("[data-bartender-topic]").forEach((button) => {
      button.addEventListener("click", () => {
        const topic = button.dataset.bartenderTopic;
        bartenderDialogueState.view = topic;
        if (topic === "info") {
          pushBartenderMessage("Ви", "Що нового в Зоні?", "player");
          pushBartenderMessage("Марек", barState.rumorHeardThisSlot ? "Свіжу розмову ти вже сьогодні використав. Якщо хочеш — повернись після оновлення." : "Чуток вистачає. Питай конкретніше — про мутантів, припаси, фон або гроші.");
        } else if (topic === "job") {
          const offer = getBartenderJobOffer();
          pushBartenderMessage("Ви", "Є якась робота?", "player");
          pushBartenderMessage("Марек", barState.bartenderQuestLead ? `Спершу розберися з «${barState.bartenderQuestLead.title}».` : offer.intro);
        } else if (topic === "special") {
          pushBartenderMessage("Ви", "Є щось особливе?", "player");
          pushBartenderMessage("Марек", "Для тих, хто питає правильно, я іноді тримаю дещо не з основного меню.");
        } else if (topic === "lore") {
          pushBartenderMessage("Ви", "Розкажи про це місце.", "player");
          pushBartenderMessage("Марек", "Бар пережив більше вилазок, ніж половина людей у цьому бункері. Питай, що саме цікавить.");
        }
        renderBartenderDialogueModal();
      });
    });

    extra.querySelectorAll("[data-bartender-info]").forEach((button) => {
      button.addEventListener("click", () => {
        const labels = { mutants: "Що з мутантами?", supplies: "А з припасами як?", radiation: "Радіація сильна?", money: "Де зараз краще платять?" };
        const topic = button.dataset.bartenderInfo;
        pushBartenderMessage("Ви", labels[topic], "player");
        const result = activateBartenderRumor(topic);
        if (result.ok) {
          pushBartenderMessage("Марек", result.rumor.text);
          bartenderDialogueState.notice = `Отримано чутку: ${result.rumor.location} · ${result.rumor.effects.map(formatEffect).join(" · ")}`;
        } else {
          pushBartenderMessage("Марек", result.message);
          bartenderDialogueState.notice = result.message;
        }
        renderBartenderDialogueModal();
      });
    });

    extra.querySelectorAll("[data-bartender-job]").forEach((button) => {
      button.addEventListener("click", () => {
        const variant = BAR_BARTENDER_JOB_VARIANTS[button.dataset.bartenderJob];
        if (!variant) return;
        bartenderDialogueState.jobVariant = variant.id;
        pushBartenderMessage("Ви", variant.question, "player");
        pushBartenderMessage("Марек", variant.answer);
        bartenderDialogueState.notice = `Умови змінено: ₴${variant.money} + ${variant.exp} EXP · ${variant.extra}`;
        renderBartenderDialogueModal();
      });
    });

    extra.querySelector("[data-bartender-accept-job]")?.addEventListener("click", () => {
      const result = acceptBartenderJob();
      if (result.ok) {
        pushBartenderMessage("Марек", `Домовились. «${result.lead.title}» записав за тобою. Не затягуй.`);
        bartenderDialogueState.notice = `Квестова зачіпка збережена: ${result.lead.title}.`;
      } else {
        pushBartenderMessage("Марек", result.message);
        bartenderDialogueState.notice = result.message;
      }
      renderBartenderDialogueModal();
    });

    extra.querySelector("[data-bartender-abandon-job]")?.addEventListener("click", () => {
      const title = barState.bartenderQuestLead?.title || "доручення";
      abandonBartenderJob();
      pushBartenderMessage("Ви", `Я відмовляюсь від «${title}».`, "player");
      pushBartenderMessage("Марек", "Твоя справа. Але нову роботу доведеться чекати до наступного циклу.");
      bartenderDialogueState.notice = "Квестову зачіпку скасовано.";
      renderBartenderDialogueModal();
    });

    extra.querySelector("[data-bartender-buy-special]")?.addEventListener("click", () => {
      const result = buyBartenderSpecial();
      pushBartenderMessage("Ви", "Наливай фірмову.", "player");
      pushBartenderMessage("Марек", result.ok ? "Тримай. Міцна — не витрачай ефект сидячи в бункері." : result.message);
      bartenderDialogueState.notice = result.message;
      renderBartenderDialogueModal();
    });

    extra.querySelectorAll("[data-bartender-lore]").forEach((button) => {
      button.addEventListener("click", () => {
        const lore = {
          bar: ["Як давно існує цей бар?", "Достатньо давно, щоб я перестав рахувати ремонти після вилазок. Тут мінялися люди, але стійка стоїть."],
          people: ["Хто сюди приходить?", "Всі, хто повернувся живим: новачки, торговці, ветерани. А найцікавіші люди зазвичай мовчать."],
          signal: ["Що ти знаєш про сигнал 1037?", "Менше, ніж хотів би. Деякі чують цифри в ефірі, інші — просто шум. Якщо копатимеш глибше, поговори з Інформатором."]
        }[button.dataset.bartenderLore];
        if (!lore) return;
        pushBartenderMessage("Ви", lore[0], "player");
        pushBartenderMessage("Марек", lore[1]);
        renderBartenderDialogueModal();
      });
    });

    extra.querySelectorAll("[data-bartender-back]").forEach((button) => button.addEventListener("click", () => {
      bartenderDialogueState.view = "home";
      bartenderDialogueState.jobVariant = null;
      pushBartenderMessage("Марек", "Ще щось?", "npc");
      renderBartenderDialogueModal();
    }));
    extra.querySelectorAll("[data-bartender-close]").forEach((button) => button.addEventListener("click", closeModal));
  }

  function renderBartenderDialogueModal() {
    syncBarPurchaseLocks();
    cleanupExpiredBuffs();
    const modal = document.getElementById("hubModal");
    const title = document.getElementById("hubModalTitle");
    const description = document.getElementById("hubModalDescription");
    const status = document.getElementById("hubModalStatus");
    const extra = document.getElementById("hubModalExtra");
    if (!modal || !title || !description || !status || !extra) return;
    modal.dataset.mode = "bar-bartender";
    title.textContent = "Бармен — Марек";
    description.textContent = "Розмова має наслідки: тема визначає інформацію, умови доручення — нагороду, а особливі товари мають власний ліміт.";
    status.textContent = bartenderDialogueState.notice || `Звичайна інформація: 1 раз / 6 год · Робота: 1 раз / 12 год · Особливе: 1 раз / ротацію меню.`;
    extra.innerHTML = `
      <div class="bar-dialogue-layout">
        <section class="bar-dialogue-main">
          <div class="bar-dialogue-log">${renderBartenderTranscript()}</div>
          <div class="bar-dialogue-options">${renderBartenderOptions()}</div>
        </section>
        <aside class="bar-dialogue-consequences">
          <div class="bar-dialogue-choice-title">Наслідки вибору</div>
          ${renderBartenderConsequences()}
        </aside>
      </div>`;
    extra.classList.add("is-visible");
    bindBartenderDialogueEvents(extra);
    requestAnimationFrame(() => {
      const log = extra.querySelector(".bar-dialogue-log");
      if (log) log.scrollTop = log.scrollHeight;
    });
  }


  window.GameBarDialogue = {
    reset: resetBartenderDialogue,
    render: renderBartenderDialogueModal,
    getQuestLead: () => barState.bartenderQuestLead
  };
})();

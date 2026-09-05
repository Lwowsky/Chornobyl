(function () {
  const RENT_PRICE = 10;
  const BUY_PRICE = RENT_PRICE * 100;
  const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const STORAGE_KEY = 'the1037.restRoom.v2';

  const DAILY_BASE_MONEY = {
    1: 25,
    2: 35,
    3: 50,
    4: 70,
    5: 90,
    6: 120,
    7: 150,
    8: 190,
    9: 240,
    10: 300
  };

  const RESOURCE_LABELS = {
    bandage: 'бинт',
    iodine: 'йод',
    materials: 'матеріали',
    ammo: 'набої',
    medkit: 'аптечка',
    rareMaterials: 'рідкісні матеріали',
    eliteCrate: 'Елітний ящик'
  };

  const ROOM_LEVELS = [
    {
      level: 1,
      name: 'Базова кімната',
      description: 'Чистіша кімната, постійний доступ і стартові бонуси.',
      hp: '×1.2',
      energy: '×1.2',
      radiation: '−5%',
      price: BUY_PRICE,
      scene: 'assets/hub/rest-room/room-level-1.webp',
      thumb: 'assets/hub/rest-room/room-thumb-1.webp'
    },
    {
      level: 2,
      name: 'Прибрана кімната',
      description: 'Краще ліжко, акуратніший інтер’єр і більше світла.',
      hp: '×1.25',
      energy: '×1.25',
      radiation: '−6%',
      price: 250,
      scene: 'assets/hub/rest-room/room-level-2.webp',
      thumb: 'assets/hub/rest-room/room-thumb-2.webp'
    },
    {
      level: 3,
      name: 'Обжита кімната',
      description: 'Зручні меблі, тепліше світло й комфортніший відпочинок.',
      hp: '×1.3',
      energy: '×1.3',
      radiation: '−7%',
      price: 350,
      scene: 'assets/hub/rest-room/room-level-3.webp',
      thumb: 'assets/hub/rest-room/room-thumb-3.webp'
    },
    {
      level: 4,
      name: 'Посилений притулок',
      description: 'Краще оснащення, більше місця для речей і сильніші бонуси.',
      hp: '×1.35',
      energy: '×1.35',
      radiation: '−8%',
      price: 500,
      scene: 'assets/hub/rest-room/room-level-4.webp',
      thumb: 'assets/hub/rest-room/room-thumb-4.webp'
    },
    {
      level: 5,
      name: 'Простора кімната',
      description: 'Кімната стає більшою, додається зона зберігання.',
      hp: '×1.4',
      energy: '×1.4',
      radiation: '−10%',
      price: 700,
      scene: 'assets/hub/rest-room/room-level-5.webp',
      thumb: 'assets/hub/rest-room/room-thumb-5.webp'
    },
    {
      level: 6,
      name: 'Укріплена кімната',
      description: 'Більше простору, стабільне освітлення та кращий захист.',
      hp: '×1.45',
      energy: '×1.45',
      radiation: '−12%',
      price: 900,
      scene: 'assets/hub/rest-room/room-level-6.webp',
      thumb: 'assets/hub/rest-room/room-thumb-6.webp'
    },
    {
      level: 7,
      name: 'Майстерня відпочинку',
      description: 'Персональні зручності, якісний інтер’єр і вищий комфорт.',
      hp: '×1.5',
      energy: '×1.5',
      radiation: '−14%',
      price: 1200,
      scene: 'assets/hub/rest-room/room-level-7.webp',
      thumb: 'assets/hub/rest-room/room-thumb-7.webp'
    },
    {
      level: 8,
      name: 'Персональний бункер',
      description: 'Повноцінна житлова зона з великим набором зручностей.',
      hp: '×1.55',
      energy: '×1.55',
      radiation: '−16%',
      price: 1600,
      scene: 'assets/hub/rest-room/room-level-8.webp',
      thumb: 'assets/hub/rest-room/room-thumb-8.webp'
    },
    {
      level: 9,
      name: 'Командирська кімната',
      description: 'Великий та дорогий особистий притулок з високими бонусами.',
      hp: '×1.6',
      energy: '×1.6',
      radiation: '−18%',
      price: 2100,
      scene: 'assets/hub/rest-room/room-level-9.webp',
      thumb: 'assets/hub/rest-room/room-thumb-9.webp'
    },
    {
      level: 10,
      name: 'Елітний притулок',
      description: 'Максимальний рівень кімнати з найкращими бонусами.',
      hp: '×1.7',
      energy: '×1.7',
      radiation: '−20%',
      price: 2800,
      scene: 'assets/hub/rest-room/room-level-10.webp',
      thumb: 'assets/hub/rest-room/room-thumb-10.webp'
    }
  ];

  const room = {
    level: 0,
    owned: false,
    rented: false,
    dailyLastClaimAt: 0,
    dailyChoice: 'medical',
    supplies: {
      bandage: 0,
      iodine: 0,
      materials: 0,
      ammo: 0,
      medkit: 0,
      rareMaterials: 0,
      eliteCrate: 0
    }
  };

  let dailyTimerId = null;
  let dailyMessage = '';

  const FIRST_LEVEL = ROOM_LEVELS[0];
  const LAST_LEVEL = ROOM_LEVELS[ROOM_LEVELS.length - 1];

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function findLevel(level) {
    return ROOM_LEVELS.find((item) => item.level === level) || null;
  }

  function getCurrentRoomData() {
    return room.owned ? findLevel(room.level) || FIRST_LEVEL : FIRST_LEVEL;
  }

  function getNextRoomData() {
    if (!room.owned) return FIRST_LEVEL;
    return findLevel(room.level + 1);
  }

  function formatMoney(amount) {
    return `₴ ${amount}`;
  }

  function formatLevelName(item) {
    return `${item.level} · ${item.name}`;
  }

  function loadRoomState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;

      room.level = Number.isInteger(saved.level) ? Math.max(0, Math.min(10, saved.level)) : room.level;
      room.owned = Boolean(saved.owned);
      room.rented = Boolean(saved.rented);
      room.dailyLastClaimAt = Number.isFinite(saved.dailyLastClaimAt) ? saved.dailyLastClaimAt : 0;
      room.dailyChoice = ['medical', 'technical', 'trade'].includes(saved.dailyChoice) ? saved.dailyChoice : 'medical';

      if (saved.supplies && typeof saved.supplies === 'object') {
        Object.keys(room.supplies).forEach((key) => {
          const value = Number(saved.supplies[key]);
          room.supplies[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
        });
      }
    } catch (error) {
      console.warn('Rest room state could not be loaded.', error);
    }
  }

  function saveRoomState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(room));
    } catch (error) {
      console.warn('Rest room state could not be saved.', error);
    }
  }

  function setDailyText(field, value) {
    document.querySelectorAll(`[data-daily-field="${field}"]`).forEach((node) => {
      node.textContent = value;
    });
  }

  function getFixedDailyReward(level) {
    const base = DAILY_BASE_MONEY[level] || DAILY_BASE_MONEY[1];
    const fixed = {
      1: { money: base, supplies: { bandage: 1 } },
      2: { money: base, supplies: { bandage: 1, materials: 1 } },
      3: { money: base, supplies: { materials: 2 } },
      4: { money: base, supplies: { bandage: 1, iodine: 1 } }
    };
    return fixed[level] || null;
  }

  function getChoiceDailyReward(level, choice) {
    const money = DAILY_BASE_MONEY[level] || DAILY_BASE_MONEY[5];
    const elite = level === 10 ? { eliteCrate: 1 } : {};

    if (choice === 'technical') {
      return {
        money,
        supplies: {
          materials: 2 + Math.max(0, level - 4),
          ammo: 10 + (level - 5) * 5,
          ...(level >= 8 ? { rareMaterials: level - 7 } : {}),
          ...elite
        }
      };
    }

    if (choice === 'trade') {
      return {
        money: Math.round(money * 1.65),
        supplies: {
          ...(level >= 8 ? { materials: 1 } : {}),
          ...elite
        }
      };
    }

    return {
      money,
      supplies: {
        bandage: level >= 8 ? 2 : 1,
        iodine: Math.max(1, Math.floor((level - 3) / 2)),
        ...(level >= 6 ? { medkit: Math.max(1, Math.floor((level - 4) / 2)) } : {}),
        ...elite
      }
    };
  }

  function getDailyReward(level = Math.max(1, room.level)) {
    return level < 5
      ? getFixedDailyReward(level)
      : getChoiceDailyReward(level, room.dailyChoice);
  }

  function formatResourceAmount(key, amount) {
    if (!amount) return '';
    const label = RESOURCE_LABELS[key] || key;
    if (key === 'eliteCrate') return `${amount}× ${label}`;
    return `${amount}× ${label}`;
  }

  function formatDailyReward(reward) {
    if (!reward) return '—';
    const parts = [`${formatMoney(reward.money)}`];
    Object.entries(reward.supplies || {}).forEach(([key, amount]) => {
      if (amount > 0) parts.push(formatResourceAmount(key, amount));
    });
    return parts.join(' + ');
  }

  function getStoredSuppliesText() {
    const parts = Object.entries(room.supplies)
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => formatResourceAmount(key, amount));
    return parts.length ? `Запаси кімнати: ${parts.join(' · ')}` : 'Запаси кімнати: порожньо';
  }

  function getDailyReadyAt() {
    return room.dailyLastClaimAt ? room.dailyLastClaimAt + DAILY_COOLDOWN_MS : 0;
  }

  function isDailyReady() {
    if (!room.owned) return false;
    const readyAt = getDailyReadyAt();
    return !readyAt || Date.now() >= readyAt;
  }

  function formatCountdown(ms) {
    const safe = Math.max(0, ms);
    const totalSeconds = Math.ceil(safe / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function getDailyChoiceLabel() {
    if (room.dailyChoice === 'technical') return 'Технічний запас';
    if (room.dailyChoice === 'trade') return 'Торговий запас';
    return 'Медичний запас';
  }

  function renderDailyReward() {
    const level = Math.max(1, room.level || 1);
    const reward = getDailyReward(level);
    const choiceUnlocked = room.owned && level >= 5;
    const readyAt = getDailyReadyAt();
    const ready = isDailyReady();

    setDailyText('title', level >= 10 ? 'Елітний щоденний запас' : `Щоденний запас · Рівень ${level}`);
    setDailyText('description', room.owned
      ? (choiceUnlocked
        ? `Раз на 24 години. З 5 рівня можна обрати тип нагороди. Зараз: ${getDailyChoiceLabel()}.`
        : 'Раз на 24 години. З кожним рівнем кімнати нагорода стає більшою.')
      : 'Викупіть кімнату, щоб отримувати нагороду раз на 24 години.');
    setDailyText('reward', formatDailyReward(reward));
    setDailyText('storage', getStoredSuppliesText());
    setDailyText('message', dailyMessage);

    document.querySelectorAll('[data-daily-choice-wrap]').forEach((wrap) => {
      wrap.hidden = !choiceUnlocked;
    });

    document.querySelectorAll('[data-daily-choice]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.dailyChoice === room.dailyChoice);
      button.disabled = !choiceUnlocked;
    });

    document.querySelectorAll('[data-rest-room-daily-claim]').forEach((button) => {
      if (!room.owned) {
        button.disabled = true;
        button.textContent = 'Спочатку викупити';
      } else if (ready) {
        button.disabled = false;
        button.textContent = level >= 10 ? 'Забрати елітний запас' : 'Забрати запас';
      } else {
        button.disabled = true;
        button.textContent = 'Забрано сьогодні';
      }
    });

    if (!room.owned) {
      setDailyText('timer', 'Після викупу');
    } else if (ready) {
      setDailyText('timer', 'Доступно зараз');
    } else {
      setDailyText('timer', `Через ${formatCountdown(readyAt - Date.now())}`);
    }
  }

  function claimDailyReward() {
    if (!room.owned || !isDailyReady()) return;

    const reward = getDailyReward(Math.max(1, room.level));
    const player = window.GameState?.player;
    if (!player || !reward) return;

    player.money += reward.money;
    Object.entries(reward.supplies || {}).forEach(([key, amount]) => {
      if (!(key in room.supplies)) room.supplies[key] = 0;
      room.supplies[key] += amount;
    });

    room.dailyLastClaimAt = Date.now();
    dailyMessage = `Отримано: ${formatDailyReward(reward)}`;
    saveRoomState();
    window.GameHud?.render();
    renderDailyReward();
  }

  function selectDailyChoice(choice) {
    if (!room.owned || room.level < 5 || !['medical', 'technical', 'trade'].includes(choice)) return;
    room.dailyChoice = choice;
    dailyMessage = `Наступний запас: ${getDailyChoiceLabel()}`;
    saveRoomState();
    renderDailyReward();
  }

  function startDailyTimer() {
    if (dailyTimerId) return;
    dailyTimerId = window.setInterval(renderDailyReward, 1000);
  }

  function spend(amount) {
    const player = window.GameState?.player;
    if (!player || player.money < amount) return false;
    player.money -= amount;
    window.GameHud?.render();
    return true;
  }

  function getOwnershipStatusText() {
    if (room.owned) {
      return `Кімната викуплена. Активний рівень ${room.level} з 10. Можна покращувати далі, якщо рівень ще не максимальний.`;
    }

    if (room.rented) {
      return 'Оренда активна на поточну ігрову добу. Можна відпочивати вже зараз або одразу викупити кімнату.';
    }

    return 'Кімната ще не викуплена. Можна орендувати або одразу купити.';
  }

  function getLevelsStatusText() {
    if (room.owned) {
      return room.level >= LAST_LEVEL.level ? 'Максимальний рівень' : `Викуплена · доступне покращення до рівня ${room.level + 1}`;
    }

    return room.rented ? 'Орендована на 1 добу' : 'Можна орендувати або викупити';
  }

  function getCurrentSummaryText() {
    if (!room.owned) return 'Не викуплена';
    const current = getCurrentRoomData();
    return formatLevelName(current);
  }

  function getCurrentTitleText() {
    return room.owned ? `Твоя кімната · Рівень ${room.level}` : 'Доступна кімната';
  }

  function getPrimaryButtonLabel() {
    return !room.owned && !room.rented ? `Орендувати · ${formatMoney(RENT_PRICE)}` : 'Відпочити';
  }

  function getSubtitleText() {
    if (room.owned) {
      return 'Кімната вже викуплена. Відновлюй сили та покращуй її до 10 рівня. У таблиці нижче показані всі кімнати, ціни та точні бонуси.';
    }

    if (room.rented) {
      return 'Оренда вже активна на поточну ігрову добу. Можна відпочивати зараз або одразу викупити кімнату для постійного доступу.';
    }

    return 'Орендуй кімнату на 1 добу або викупи її та прокачуй до 10 рівня. У таблиці нижче показані всі кімнати, ціни та точні бонуси.';
  }

  function getSecondaryButtonLabel(nextRoom) {
    if (!room.owned) return `Викупити кімнату · ${formatMoney(BUY_PRICE)}`;
    if (!nextRoom) return 'Максимальний рівень';
    return `Покращити кімнату · ${formatMoney(nextRoom.price)}`;
  }

  function renderMainInfo(currentRoom, nextRoom) {
    const scene = $('restRoomSceneImage');
    if (scene) scene.src = currentRoom.scene;

    setText('restRoomSubtitle', getSubtitleText());
    setText('restRoomSceneCaptionLabel', room.owned ? 'Твоя кімната' : 'Доступна кімната');
    setText('restRoomCurrentTierTitle', getCurrentTitleText());
    setText('restRoomCurrentTierName', formatLevelName(currentRoom));
    setText('restRoomCurrentTierDescription', currentRoom.description);
    setText('restRoomCurrentTierNameMobile', formatLevelName(currentRoom));
    setText('restRoomCurrentTierDescriptionMobile', currentRoom.description);
    setText('restRoomCurrentNameOverlay', currentRoom.name);
    setText('restRoomCurrentDescriptionOverlay', currentRoom.description);

    setText('restRoomHpBonus', currentRoom.hp);
    setText('restRoomEnergyBonus', currentRoom.energy);
    setText('restRoomRadiationBonus', currentRoom.radiation);
    setText('restRoomHpBonusMobile', currentRoom.hp);
    setText('restRoomEnergyBonusMobile', currentRoom.energy);
    setText('restRoomRadiationBonusMobile', currentRoom.radiation);

    const statusText = getOwnershipStatusText();
    setText('restRoomOwnershipStatus', statusText);
    setText('restRoomOwnershipStatusMobile', statusText);

    const rentOffer = $('restRoomRentOffer');
    const buyOffer = $('restRoomBuyOffer');
    const rentMobileRow = $('restRoomRentMobileRow');
    const buyMobileRow = $('restRoomBuyMobileRow');

    if (room.owned) {
      if (rentOffer) rentOffer.hidden = true;
      if (rentMobileRow) rentMobileRow.hidden = true;
      if (buyOffer) buyOffer.hidden = false;
      if (buyMobileRow) buyMobileRow.hidden = false;

      if (nextRoom) {
        setText('restRoomBuyOfferTitle', 'Покращення кімнати');
        setText('restRoomBuyOfferDescription', `Наступний крок — ${formatLevelName(nextRoom)}. Прокачування відкриває новий вигляд кімнати та кращі бонуси.`);
        setText('restRoomBuyPrice', formatMoney(nextRoom.price));
        setText('restRoomBuyLabelMobile', 'Покращення:');
        setText('restRoomBuyPriceMobile', formatMoney(nextRoom.price));
      } else {
        setText('restRoomBuyOfferTitle', 'Максимальний рівень');
        setText('restRoomBuyOfferDescription', 'Кімната повністю покращена. Нових рівнів більше немає.');
        setText('restRoomBuyPrice', 'MAX');
        setText('restRoomBuyLabelMobile', 'Статус:');
        setText('restRoomBuyPriceMobile', 'MAX');
      }
    } else {
      if (rentOffer) rentOffer.hidden = false;
      if (rentMobileRow) rentMobileRow.hidden = false;
      if (buyOffer) buyOffer.hidden = false;
      if (buyMobileRow) buyMobileRow.hidden = false;

      setText('restRoomRentOfferTitle', 'Оренда на 1 добу');
      setText('restRoomRentOfferDescription', 'Дає доступ до кнопки «Відпочити» на поточну ігрову добу. HP та енергія відновлюються до максимуму.');
      setText('restRoomRentPrice', formatMoney(RENT_PRICE));
      setText('restRoomBuyOfferTitle', 'Викуп кімнати');
      setText('restRoomBuyOfferDescription', 'Назавжди відкриває Базову кімнату і дає доступ до покращень 2–10 рівня.');
      setText('restRoomBuyPrice', formatMoney(BUY_PRICE));
      setText('restRoomRentLabelMobile', 'Оренда:');
      setText('restRoomRentPriceMobile', formatMoney(RENT_PRICE));
      setText('restRoomBuyLabelMobile', 'Викуп:');
      setText('restRoomBuyPriceMobile', formatMoney(BUY_PRICE));
    }

    if (nextRoom) {
      setText('restRoomNextTier', formatLevelName(nextRoom));
      setText('restRoomNextTierDescription', nextRoom.description);
      setText('restRoomNextHp', nextRoom.hp);
      setText('restRoomNextEnergy', nextRoom.energy);
      setText('restRoomNextRadiation', nextRoom.radiation);
      setText('restRoomNextTierCost', room.owned ? formatMoney(nextRoom.price) : `Викуп · ${formatMoney(BUY_PRICE)}`);

      setText('restRoomNextTierMobile', formatLevelName(nextRoom));
      setText('restRoomNextTierDescriptionMobile', nextRoom.description);
      setText('restRoomNextTierBonusesMobile', `HP ${nextRoom.hp} · Енергія ${nextRoom.energy} · Радіація ${nextRoom.radiation}`);
      setText('restRoomNextTierCostMobile', room.owned ? formatMoney(nextRoom.price) : `Викуп · ${formatMoney(BUY_PRICE)}`);
    } else {
      setText('restRoomNextTier', 'Максимальний рівень');
      setText('restRoomNextTierDescription', 'Кімната повністю покращена. Нових рівнів більше немає.');
      setText('restRoomNextHp', 'MAX');
      setText('restRoomNextEnergy', 'MAX');
      setText('restRoomNextRadiation', 'MAX');
      setText('restRoomNextTierCost', '—');

      setText('restRoomNextTierMobile', 'Максимальний рівень');
      setText('restRoomNextTierDescriptionMobile', 'Кімната повністю покращена.');
      setText('restRoomNextTierBonusesMobile', 'Усі бонуси вже відкриті');
      setText('restRoomNextTierCostMobile', '—');
    }
  }

  function renderButtons(nextRoom) {
    const primary = $('restRoomPrimaryButton');
    const secondary = $('restRoomSecondaryButton');

    setText('restRoomPrimaryButtonText', getPrimaryButtonLabel());
    setText('restRoomSecondaryButtonText', getSecondaryButtonLabel(nextRoom));

    if (primary) primary.disabled = false;
    if (secondary) secondary.disabled = room.owned && !nextRoom;
  }

  function renderLevelsTable() {
    const tableBody = $('restRoomLevelsTableBody');
    if (!tableBody) return;

    const currentLevel = room.owned ? room.level : null;
    const nextLevel = room.owned ? room.level + 1 : 1;

    tableBody.innerHTML = ROOM_LEVELS.map((item) => {
      const isCurrent = item.level === currentLevel;
      const isNext = item.level === nextLevel;
      const stateBadge = isCurrent
        ? '<span class="rest-room-levels-table__badge">Поточний</span>'
        : isNext
          ? '<span class="rest-room-levels-table__badge rest-room-levels-table__badge--next">Наступний</span>'
          : '';

      const priceLabel = item.level === 1 && !room.owned
        ? `Викуп · ${formatMoney(BUY_PRICE)}`
        : formatMoney(item.price);

      return `
        <tr class="${isCurrent ? 'is-current' : ''} ${isNext ? 'is-next' : ''}">
          <td class="rest-room-levels-table__level">
            <span>${item.level}</span>
          </td>
          <td class="rest-room-levels-table__preview">
            <img src="${item.thumb}" alt="${item.name}">
          </td>
          <td class="rest-room-levels-table__room">
            <strong>${item.name}</strong>
            ${stateBadge}
            <p>${item.description}</p>
          </td>
          <td class="rest-room-levels-table__bonuses">
            <span><b>HP</b>${item.hp}</span>
            <span><b>Енергія</b>${item.energy}</span>
            <span><b>Радіація</b>${item.radiation}</span>
          </td>
          <td class="rest-room-levels-table__price">${priceLabel}</td>
        </tr>`;
    }).join('');

    setText('restRoomLevelsCurrent', getCurrentSummaryText());
    setText('restRoomLevelsNext', getNextRoomData() ? formatLevelName(getNextRoomData()) : 'Максимальний рівень');
    setText('restRoomLevelsStatus', getLevelsStatusText());
  }

  function render() {
    const currentRoom = getCurrentRoomData();
    const nextRoom = getNextRoomData();
    renderMainInfo(currentRoom, nextRoom);
    renderButtons(nextRoom);
    renderLevelsTable();
    renderDailyReward();
  }

  function primaryAction() {
    if (!room.owned && !room.rented) {
      if (!spend(RENT_PRICE)) return;
      room.rented = true;
      saveRoomState();
      render();
      return;
    }

    const player = window.GameState?.player;
    if (!player) return;
    player.hp = player.hpMax;
    player.energy = player.energyMax;
    window.GameHud?.render();
    render();
  }

  function secondaryAction() {
    if (!room.owned) {
      if (!spend(BUY_PRICE)) return;
      room.owned = true;
      room.rented = false;
      room.level = 1;
      dailyMessage = 'Щоденний запас відкрито. Першу нагороду можна забрати зараз.';
      saveRoomState();
      render();
      return;
    }

    const nextRoom = getNextRoomData();
    if (!nextRoom || !spend(nextRoom.price)) return;
    room.level = nextRoom.level;
    dailyMessage = `Щоденний запас покращено до рівня ${room.level}.`;
    saveRoomState();
    render();
  }

  function openLevels() {
    renderLevelsTable();
    const panel = $('restRoomLevelsPanel');
    if (panel) panel.hidden = false;
  }

  function closeLevels() {
    const panel = $('restRoomLevelsPanel');
    if (panel) panel.hidden = true;
  }

  function refresh() {
    render();
    closeLevels();

    const view = $('restRoomView');
    const scrollContainer = view?.closest('.game-main');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    }
  }

  function bind() {
    loadRoomState();
    $('restRoomPrimaryButton')?.addEventListener('click', primaryAction);
    $('restRoomSecondaryButton')?.addEventListener('click', secondaryAction);
    $('restRoomLevelsToggle')?.addEventListener('click', openLevels);
    $('restRoomLevelsClose')?.addEventListener('click', closeLevels);

    document.querySelectorAll('[data-rest-room-daily-claim]').forEach((button) => {
      button.addEventListener('click', claimDailyReward);
    });

    document.querySelectorAll('[data-daily-choice]').forEach((button) => {
      button.addEventListener('click', () => selectDailyChoice(button.dataset.dailyChoice));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('restRoomLevelsPanel')?.hidden) closeLevels();
    });

    render();
    startDailyTimer();
  }

  window.GameRestRoom = {
    bind,
    refresh,
    closeLevels,
    claimDailyReward,
    getStorage: () => ({ ...room.supplies })
  };
})();

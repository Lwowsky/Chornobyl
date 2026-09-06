(function () {
  const RENT_PRICE = 10;
  const BUY_PRICE = 5000;
  const STORAGE_KEY = 'the1037.restRoom.v2';
  const FARM_MINUTE_MS = 60 * 1000;

  const FIND_CHANCE_BY_LEVEL = {
    1: 1.0,
    2: 1.1,
    3: 1.2,
    4: 1.4,
    5: 1.6,
    6: 1.8,
    7: 2.1,
    8: 2.4,
    9: 2.7,
    10: 3.0
  };

  const FIND_DROP_WEIGHTS = {
    1: { materials: 70, bandage: 20, iodine: 7, medkit: 2.5, rareMaterials: 0.5, gearCrate: 0 },
    2: { materials: 68, bandage: 20, iodine: 8, medkit: 3, rareMaterials: 1, gearCrate: 0 },
    3: { materials: 66, bandage: 20, iodine: 9, medkit: 3.5, rareMaterials: 1.5, gearCrate: 0 },
    4: { materials: 63, bandage: 20, iodine: 10, medkit: 4, rareMaterials: 2.5, gearCrate: 0.5 },
    5: { materials: 60, bandage: 20, iodine: 11, medkit: 4.5, rareMaterials: 3.5, gearCrate: 1 },
    6: { materials: 57, bandage: 20, iodine: 12, medkit: 5, rareMaterials: 4.5, gearCrate: 1.5 },
    7: { materials: 54, bandage: 20, iodine: 13, medkit: 6, rareMaterials: 5, gearCrate: 2 },
    8: { materials: 51, bandage: 20, iodine: 14, medkit: 7, rareMaterials: 5.5, gearCrate: 2.5 },
    9: { materials: 48, bandage: 20, iodine: 15, medkit: 8, rareMaterials: 6, gearCrate: 3 },
    10: { materials: 45, bandage: 20, iodine: 16, medkit: 9, rareMaterials: 7, gearCrate: 3 }
  };

  const RESOURCE_LABELS = {
    bandage: 'бинт',
    iodine: 'йод',
    materials: 'матеріали',
    ammo: 'набої',
    medkit: 'аптечка',
    rareMaterials: 'рідкісні матеріали',
    eliteCrate: 'Елітний ящик',
    gearCrate: 'Ящик з речами'
  };

  const FARM_FIND_KEYS = ['materials', 'bandage', 'iodine', 'medkit', 'rareMaterials', 'gearCrate'];


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
      price: 10000,
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
      price: 15000,
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
      price: 25000,
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
      price: 40000,
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
      price: 60000,
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
      price: 90000,
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
      price: 130000,
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
      price: 180000,
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
      price: 250000,
      scene: 'assets/hub/rest-room/room-level-10.webp',
      thumb: 'assets/hub/rest-room/room-thumb-10.webp'
    }
  ];

  const room = {
    level: 0,
    owned: false,
    rented: false,
    farmStartedAt: 0,
    farmProcessedMinutes: 0,
    farmMoneyCents: 0,
    farmFindEvents: 0,
    farmFinds: {
      materials: 0,
      bandage: 0,
      iodine: 0,
      medkit: 0,
      rareMaterials: 0,
      gearCrate: 0
    },
    supplies: {
      bandage: 0,
      iodine: 0,
      materials: 0,
      ammo: 0,
      medkit: 0,
      rareMaterials: 0,
      eliteCrate: 0,
      gearCrate: 0
    }
  };

  let dailyTimerId = null;
  let dailyMessage = '';
  let isSidebarOpen = false;
  let sidebarResizeObserver = null;

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
      room.farmStartedAt = Number.isFinite(saved.farmStartedAt) ? saved.farmStartedAt : 0;
      room.farmProcessedMinutes = Number.isFinite(saved.farmProcessedMinutes) ? Math.max(0, Math.floor(saved.farmProcessedMinutes)) : 0;
      room.farmMoneyCents = Number.isFinite(saved.farmMoneyCents) ? Math.max(0, Math.floor(saved.farmMoneyCents)) : 0;
      room.farmFindEvents = Number.isFinite(saved.farmFindEvents) ? Math.max(0, Math.floor(saved.farmFindEvents)) : 0;

      if (saved.farmFinds && typeof saved.farmFinds === 'object') {
        FARM_FIND_KEYS.forEach((key) => {
          const value = Number(saved.farmFinds[key]);
          room.farmFinds[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
        });
      }

      if (saved.supplies && typeof saved.supplies === 'object') {
        Object.keys(room.supplies).forEach((key) => {
          const value = Number(saved.supplies[key]);
          room.supplies[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
        });
      }

      if (room.owned && !room.farmStartedAt) {
        room.farmStartedAt = Date.now();
        room.farmProcessedMinutes = 0;
        room.farmMoneyCents = 0;
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

  function setDailyProgress(percent) {
    const safe = Math.max(0, Math.min(100, percent));
    document.querySelectorAll('[data-daily-progress]').forEach((node) => {
      node.style.width = `${safe}%`;
    });
  }

  function formatMoney(amount) {
    const value = Number(amount) || 0;
    const hasCoins = Math.abs(value - Math.round(value)) > 0.0001;
    return `₴ ${value.toLocaleString('uk-UA', {
      minimumFractionDigits: hasCoins ? 2 : 0,
      maximumFractionDigits: 2
    })}`;
  }

  function formatMoneyFromCents(cents) {
    return formatMoney((Number(cents) || 0) / 100);
  }

  function formatResourceAmount(key, amount) {
    if (!amount) return '';
    const label = RESOURCE_LABELS[key] || key;
    return `${amount}× ${label}`;
  }

  function getFarmCapacityMinutes(level = Math.max(1, room.level || 1)) {
    return Math.max(1, Math.min(10, level)) * 60;
  }

  function getFarmMoneyRateCents(level = Math.max(1, room.level || 1)) {
    return Math.max(1, Math.min(10, level)) * 10;
  }

  function getFindChance(level = Math.max(1, room.level || 1)) {
    return FIND_CHANCE_BY_LEVEL[level] || FIND_CHANCE_BY_LEVEL[1];
  }

  function getFindWeights(level = Math.max(1, room.level || 1)) {
    return FIND_DROP_WEIGHTS[level] || FIND_DROP_WEIGHTS[1];
  }

  function getGearCrateChance(level = Math.max(1, room.level || 1)) {
    return getFindWeights(level).gearCrate || 0;
  }

  function rollFarmFind(level) {
    const weights = getFindWeights(level);
    const roll = Math.random() * 100;
    let cursor = 0;

    for (const key of FARM_FIND_KEYS) {
      cursor += Number(weights[key] || 0);
      if (roll < cursor) return key;
    }

    return 'materials';
  }

  function getFarmFindQuantity(key) {
    if (key === 'materials') return 1 + Math.floor(Math.random() * 3);
    return 1;
  }

  function getFarmFindCount() {
    return Math.max(0, room.farmFindEvents || 0);
  }

  function ensureFarmStarted(now = Date.now()) {
    if (!room.owned) return false;
    if (!Number.isFinite(room.farmStartedAt) || room.farmStartedAt <= 0 || room.farmStartedAt > now) {
      room.farmStartedAt = now;
      room.farmProcessedMinutes = 0;
      room.farmMoneyCents = 0;
      room.farmFindEvents = 0;
      FARM_FIND_KEYS.forEach((key) => { room.farmFinds[key] = 0; });
      saveRoomState();
      return true;
    }
    return false;
  }

  function settlePassiveFarm(now = Date.now()) {
    if (!room.owned) return false;
    ensureFarmStarted(now);

    const level = Math.max(1, room.level || 1);
    const capacityMinutes = getFarmCapacityMinutes(level);
    const elapsedMinutes = Math.min(
      capacityMinutes,
      Math.max(0, Math.floor((now - room.farmStartedAt) / FARM_MINUTE_MS))
    );
    const alreadyProcessed = Math.min(capacityMinutes, Math.max(0, room.farmProcessedMinutes || 0));
    const newMinutes = elapsedMinutes - alreadyProcessed;
    if (newMinutes <= 0) return false;

    const moneyRateCents = getFarmMoneyRateCents(level);
    const findChance = getFindChance(level);

    for (let minute = 0; minute < newMinutes; minute += 1) {
      room.farmMoneyCents += moneyRateCents;
      if (Math.random() * 100 < findChance) {
        const key = rollFarmFind(level);
        room.farmFindEvents += 1;
        room.farmFinds[key] = (room.farmFinds[key] || 0) + getFarmFindQuantity(key);
      }
    }

    room.farmProcessedMinutes = elapsedMinutes;
    saveRoomState();
    return true;
  }

  function reanchorFarmForUpgrade(now = Date.now()) {
    if (!room.owned) return;
    settlePassiveFarm(now);
    room.farmStartedAt = now - Math.max(0, room.farmProcessedMinutes || 0) * FARM_MINUTE_MS;
    saveRoomState();
  }

  function getFarmElapsedMs(now = Date.now()) {
    if (!room.owned || !room.farmStartedAt) return 0;
    return Math.min(
      getFarmCapacityMinutes() * FARM_MINUTE_MS,
      Math.max(0, now - room.farmStartedAt)
    );
  }

  function formatFarmClock(ms) {
    const totalMinutes = Math.max(0, Math.floor(ms / FARM_MINUTE_MS));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function formatFarmCapacity(level) {
    const hours = Math.max(1, Math.min(10, level));
    return `${hours} ${hours === 1 ? 'година' : hours >= 2 && hours <= 4 ? 'години' : 'годин'}`;
  }

  function getBestFindsText(level) {
    if (level <= 3) return 'Матеріали · бинт · йод · аптечка';
    if (level <= 6) return 'Аптечка · рідкісний матеріал · ящик з речами';
    return 'Рідкісний матеріал · аптечка · ящик з речами';
  }

  function getLevelsDailyRewardMarkup(level) {
    const rate = formatMoneyFromCents(getFarmMoneyRateCents(level));
    const chance = getFindChance(level).toFixed(1);

    return `
      <div class="rest-room-level-card__farm-info">
        <div class="rest-room-level-card__farm-metric"><span>Макс. фарм</span><b>${formatFarmCapacity(level)}</b></div>
        <div class="rest-room-level-card__farm-metric"><span>Дохід</span><b>${rate} / хв</b></div>
        <div class="rest-room-level-card__farm-metric"><span>Шанс знахідки</span><b>${chance}% / хв</b></div>
      </div>`;
  }

  function renderDailyReward() {
    const level = Math.max(1, room.level || 1);
    const now = Date.now();
    settlePassiveFarm(now);

    const capacityMinutes = getFarmCapacityMinutes(level);
    const capacityMs = capacityMinutes * FARM_MINUTE_MS;
    const elapsedMs = getFarmElapsedMs(now);
    const progress = capacityMs ? (elapsedMs / capacityMs) * 100 : 0;
    const full = room.owned && elapsedMs >= capacityMs;
    const findCount = getFarmFindCount();

    setDailyText('rate', formatMoneyFromCents(getFarmMoneyRateCents(level)));
    setDailyText('capacity', formatFarmCapacity(level));
    setDailyText('chance', `${getFindChance(level).toFixed(1)}%`);
    setDailyText('money', formatMoneyFromCents(room.farmMoneyCents));
    setDailyText('finds', String(findCount));
    setDailyText('status', !room.owned ? 'Неактивно' : full ? 'Заповнено' : 'Працює');
    setDailyText('message', dailyMessage);
    setDailyProgress(progress);

    document.querySelectorAll('[data-farm-card]').forEach((card) => {
      card.classList.toggle('is-full', full);
      card.classList.toggle('is-active', room.owned && !full);
    });

    if (!room.owned) {
      setDailyText('timer', 'Після викупу');
    } else {
      setDailyText('timer', `${formatFarmClock(elapsedMs)} / ${String(level).padStart(2, '0')}:00`);
    }

    document.querySelectorAll('[data-rest-room-daily-claim]').forEach((button) => {
      if (!room.owned) {
        button.disabled = true;
        button.textContent = 'Спочатку викупити';
      } else if (room.farmProcessedMinutes <= 0) {
        button.disabled = true;
        button.textContent = 'Накопичення триває';
      } else {
        button.disabled = false;
        button.textContent = full ? 'Забрати заповнені запаси' : 'Забрати запаси';
      }
    });
  }

  function getClaimResultRows(finds) {
    const icons = {
      materials: '🔩',
      bandage: '🩹',
      iodine: '☢️',
      medkit: '❤️',
      rareMaterials: '⚙️',
      gearCrate: '📦'
    };

    return FARM_FIND_KEYS
      .filter((key) => (finds[key] || 0) > 0)
      .map((key) => {
        const isRare = key === 'rareMaterials' || key === 'gearCrate';
        const isCrate = key === 'gearCrate';
        const label = isCrate ? 'Особлива знахідка' : isRare ? 'Рідкісна знахідка' : 'Знайдено';
        return `
          <div class="rest-room-claim-result ${isRare ? 'is-rare' : ''} ${isCrate ? 'is-crate' : ''}">
            <span class="rest-room-claim-result__icon" aria-hidden="true">${icons[key] || '•'}</span>
            <div><small>${label}</small><strong>${RESOURCE_LABELS[key] || key}</strong></div>
            <b>×${finds[key]}</b>
          </div>`;
      })
      .join('');
  }

  function openClaimModal(result) {
    closeLevels();
    closeResponsiveSidebar();
    setText('restRoomClaimTime', formatFarmClock(result.elapsedMinutes * FARM_MINUTE_MS));
    setText('restRoomClaimMoney', formatMoneyFromCents(result.moneyCents));
    setText('restRoomClaimFindCount', String(result.findCount));
    setText('restRoomClaimSubtitle', result.findCount
      ? 'Гроші та знайдені припаси вже зараховано.'
      : 'Гроші зараховано. Цього разу без додаткових знахідок.');

    const results = $('restRoomClaimResults');
    if (results) {
      results.innerHTML = result.findCount
        ? getClaimResultRows(result.finds)
        : '<div class="rest-room-claim-empty">Додаткових знахідок цього разу немає.</div>';
    }

    const panel = $('restRoomClaimPanel');
    if (panel) panel.hidden = false;
  }

  function closeClaimModal() {
    const panel = $('restRoomClaimPanel');
    if (panel) panel.hidden = true;
  }

  function claimDailyReward() {
    if (!room.owned) return;
    settlePassiveFarm();
    if (room.farmProcessedMinutes <= 0) return;

    const player = window.GameState?.player;
    if (!player) return;

    const result = {
      elapsedMinutes: room.farmProcessedMinutes,
      moneyCents: room.farmMoneyCents,
      findCount: getFarmFindCount(),
      finds: { ...room.farmFinds }
    };

    player.money = Math.round((player.money + result.moneyCents / 100) * 100) / 100;
    FARM_FIND_KEYS.forEach((key) => {
      const amount = result.finds[key] || 0;
      if (!amount) return;
      if (!(key in room.supplies)) room.supplies[key] = 0;
      room.supplies[key] += amount;
    });

    room.farmStartedAt = Date.now();
    room.farmProcessedMinutes = 0;
    room.farmMoneyCents = 0;
    room.farmFindEvents = 0;
    FARM_FIND_KEYS.forEach((key) => { room.farmFinds[key] = 0; });
    dailyMessage = 'Новий цикл накопичення вже запущено.';

    saveRoomState();
    window.GameHud?.render();
    renderDailyReward();
    openClaimModal(result);
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
    return room.owned ? `Твоя кімната · Рівень\u00A0${room.level}` : 'Доступна кімната';
  }

  function getPrimaryButtonLabel() {
    return !room.owned && !room.rented ? `Орендувати · ${formatMoney(RENT_PRICE)}` : 'Відпочити';
  }

  function getSubtitleText() {
    if (room.owned) {
      return 'Кімната вже викуплена. Відновлюй сили та покращуй її до 10 рівня. Кожен рівень підсилює пасивний фарм і шанс рідкісних знахідок.';
    }

    if (room.rented) {
      return 'Оренда вже активна на поточну ігрову добу. Можна відпочивати зараз або одразу викупити кімнату для постійного доступу.';
    }

    return 'Орендуй кімнату на 1 добу або викупи її та прокачуй до 10 рівня. Вищий рівень збільшує пасивний дохід, час накопичення та шанс рідкісних знахідок.';
  }

  function getSecondaryButtonLabel(nextRoom) {
    if (!room.owned) return `Викупити кімнату · ${formatMoney(BUY_PRICE)}`;
    if (!nextRoom) return 'Максимальний рівень';
    return `Покращити кімнату · ${formatMoney(nextRoom.price)}`;
  }

  function renderMainInfo(currentRoom, nextRoom) {
    const view = $('restRoomView');
    if (view) view.classList.toggle('is-owned', room.owned);

    const scene = $('restRoomSceneImage');
    if (scene) scene.src = currentRoom.scene;

    setText('restRoomSubtitle', getSubtitleText());
    setText('restRoomSceneCaptionLabel', room.owned ? 'Твоя кімната' : 'Доступна кімната');
    setText('restRoomCurrentTierTitle', getCurrentTitleText());
    setText('restRoomCurrentTierName', formatLevelName(currentRoom));
    setText('restRoomCurrentTierDescription', currentRoom.description);
    setText('restRoomCurrentNameOverlay', currentRoom.name);
    setText('restRoomCurrentDescriptionOverlay', currentRoom.description);

    setText('restRoomHpBonus', currentRoom.hp);
    setText('restRoomEnergyBonus', currentRoom.energy);
    setText('restRoomRadiationBonus', currentRoom.radiation);

    const rentOffer = $('restRoomRentOffer');
    const buyOffer = $('restRoomBuyOffer');
    const nextOffer = $('restRoomNextOffer');
    const nextThumb = $('restRoomNextThumb');

    const offersTitle = !room.owned ? 'ДОСТУП І ЦІНИ' : (nextRoom ? 'НАСТУПНЕ ПОКРАЩЕННЯ' : 'МАКСИМАЛЬНИЙ РІВЕНЬ');
    setText('restRoomOffersTitle', offersTitle);
    $('restRoomOffers')?.setAttribute('aria-label', offersTitle.toLowerCase());
    setText('restRoomNextHpCurrent', currentRoom.hp);
    setText('restRoomNextEnergyCurrent', currentRoom.energy);
    setText('restRoomNextRadiationCurrent', currentRoom.radiation);

    if (room.owned) {
      if (rentOffer) rentOffer.hidden = true;
      if (buyOffer) buyOffer.hidden = true;
      if (nextOffer) {
        nextOffer.hidden = false;
        nextOffer.classList.toggle('is-max', !nextRoom);
      }

      if (nextThumb) {
        nextThumb.src = nextRoom?.thumb || currentRoom.thumb;
        nextThumb.alt = nextRoom?.name || currentRoom.name;
      }
    } else {
      if (rentOffer) rentOffer.hidden = false;
      if (buyOffer) buyOffer.hidden = false;
      if (nextOffer) nextOffer.hidden = true;

      setText('restRoomRentOfferTitle', 'Оренда на 1 добу');
      setText('restRoomRentOfferDescription', 'Дає доступ до кнопки «Відпочити» на поточну ігрову добу. HP та енергія відновлюються до максимуму.');
      setText('restRoomRentPrice', formatMoney(RENT_PRICE));
      setText('restRoomBuyOfferTitle', 'Викуп кімнати');
      setText('restRoomBuyOfferDescription', 'Назавжди відкриває Базову кімнату і дає доступ до покращень 2–10 рівня.');
      setText('restRoomBuyPrice', formatMoney(BUY_PRICE));
    }

    const compactUpgradeCard = $('restRoomCompactUpgradeCard');
    if (compactUpgradeCard) {
      compactUpgradeCard.hidden = !room.owned;
    }

    if (nextRoom) {
      setText('restRoomNextTier', formatLevelName(nextRoom));
      setText('restRoomNextTierDescription', nextRoom.description);
      setText('restRoomNextHp', nextRoom.hp);
      setText('restRoomNextEnergy', nextRoom.energy);
      setText('restRoomNextRadiation', nextRoom.radiation);
      setText('restRoomNextTierCostLabel', 'Ціна покращення');
      setText('restRoomNextTierCost', room.owned ? formatMoney(nextRoom.price) : `Викуп · ${formatMoney(BUY_PRICE)}`);
      setText('restRoomNextHpTarget', nextRoom.hp);
      setText('restRoomNextEnergyTarget', nextRoom.energy);
      setText('restRoomNextRadiationTarget', nextRoom.radiation);
      setText('restRoomCompactNextTier', formatLevelName(nextRoom));
      setText('restRoomCompactNextTierDescription', nextRoom.description);
      setText('restRoomCompactNextHpCurrent', currentRoom.hp);
      setText('restRoomCompactNextHpTarget', nextRoom.hp);
      setText('restRoomCompactNextEnergyCurrent', currentRoom.energy);
      setText('restRoomCompactNextEnergyTarget', nextRoom.energy);
      setText('restRoomCompactNextRadiationCurrent', currentRoom.radiation);
      setText('restRoomCompactNextRadiationTarget', nextRoom.radiation);
      setText('restRoomCompactNextTierCostLabel', 'Ціна покращення');
      setText('restRoomCompactNextTierCost', room.owned ? formatMoney(nextRoom.price) : `Викуп · ${formatMoney(BUY_PRICE)}`);
      const compactThumb = $('restRoomCompactNextThumb');
      if (compactThumb) {
        compactThumb.src = nextRoom.thumb;
        compactThumb.alt = nextRoom.name;
      }

    } else {
      setText('restRoomNextTier', 'Максимальний рівень');
      setText('restRoomNextTierDescription', 'Кімната повністю покращена. Нових рівнів більше немає.');
      setText('restRoomNextHp', 'MAX');
      setText('restRoomNextEnergy', 'MAX');
      setText('restRoomNextRadiation', 'MAX');
      setText('restRoomNextTierCostLabel', 'Статус');
      setText('restRoomNextTierCost', 'MAX');
      setText('restRoomNextHpTarget', 'MAX');
      setText('restRoomNextEnergyTarget', 'MAX');
      setText('restRoomNextRadiationTarget', 'MAX');
      setText('restRoomCompactNextTier', 'Максимальний рівень');
      setText('restRoomCompactNextTierDescription', 'Кімната повністю покращена. Нових рівнів більше немає.');
      setText('restRoomCompactNextHpCurrent', currentRoom.hp);
      setText('restRoomCompactNextHpTarget', 'MAX');
      setText('restRoomCompactNextEnergyCurrent', currentRoom.energy);
      setText('restRoomCompactNextEnergyTarget', 'MAX');
      setText('restRoomCompactNextRadiationCurrent', currentRoom.radiation);
      setText('restRoomCompactNextRadiationTarget', 'MAX');
      setText('restRoomCompactNextTierCostLabel', 'Статус');
      setText('restRoomCompactNextTierCost', 'MAX');
      const compactThumb = $('restRoomCompactNextThumb');
      if (compactThumb) {
        compactThumb.src = currentRoom.thumb;
        compactThumb.alt = currentRoom.name;
      }

    }
  }

  function renderButtons(nextRoom) {
    const primary = $('restRoomPrimaryButton');
    const secondary = $('restRoomSecondaryButton');

    setText('restRoomPrimaryButtonText', getPrimaryButtonLabel());
    setText('restRoomSecondaryButtonText', getSecondaryButtonLabel(nextRoom));

    const primaryHint = primary?.querySelector('.rest-room-action__copy small');
    const secondaryHint = secondary?.querySelector('.rest-room-action__copy small');

    if (primaryHint) {
      primaryHint.textContent = room.owned || room.rented
        ? 'Відновити сили та отримати бонуси'
        : 'Оренда відкриє відпочинок на добу';
    }

    if (secondaryHint) {
      secondaryHint.textContent = room.owned
        ? (nextRoom ? 'Перейти на наступний рівень' : 'Кімната вже максимального рівня')
        : 'Назавжди відкрити кімнату';
    }

    if (primary) primary.disabled = false;
    if (secondary) secondary.disabled = room.owned && !nextRoom;
  }

  function renderLevelsTable() {
    const cardsRoot = $('restRoomLevelsCards');
    if (!cardsRoot) return;

    const currentLevel = room.owned ? room.level : null;
    const nextLevel = room.owned ? room.level + 1 : 1;

    cardsRoot.innerHTML = ROOM_LEVELS.map((item) => {
      const isCurrent = item.level === currentLevel;
      const isNext = item.level === nextLevel;
      const stateBadge = isCurrent
        ? '<span class="rest-room-level-card__state-badge">Поточний</span>'
        : isNext
          ? '<span class="rest-room-level-card__state-badge rest-room-level-card__state-badge--next">Наступний</span>'
          : '';

      const priceLabel = item.level === 1 && !room.owned
        ? `Викуп · ${formatMoney(BUY_PRICE)}`
        : formatMoney(item.price);

      return `
        <article class="rest-room-level-card ${isCurrent ? 'is-current' : ''} ${isNext ? 'is-next' : ''}">
          <div class="rest-room-level-card__title-wrap">
            <strong>${item.level} - ${item.name}</strong>
            <p>${item.description}</p>
          </div>

          <div class="rest-room-level-card__media">
            <img src="${item.thumb}" alt="${item.name}">
            <span class="rest-room-level-card__level-badge">${item.level}</span>
            ${stateBadge}
          </div>

          <div class="rest-room-level-card__content">
            <div class="rest-room-level-card__stats" aria-label="Бонуси кімнати">
              <div class="rest-room-level-card__stat"><b>HP</b><span>${item.hp}</span></div>
              <div class="rest-room-level-card__stat"><b>Енергія</b><span>${item.energy}</span></div>
              <div class="rest-room-level-card__stat"><b>Радіація</b><span>${item.radiation}</span></div>
            </div>

            <div class="rest-room-level-card__daily">
              ${getLevelsDailyRewardMarkup(item.level)}
            </div>

            <div class="rest-room-level-card__footer">
              <div class="rest-room-level-card__finds">
                <span>Можливі знахідки</span>
                <b>${getBestFindsText(item.level)}</b>
              </div>

              <div class="rest-room-level-card__price">
                <small>Ціна покращення</small>
                <strong>${priceLabel}</strong>
              </div>
            </div>
          </div>
        </article>`;
    }).join('');

    const currentRoom = room.owned ? getCurrentRoomData() : null;
    const nextRoom = getNextRoomData();
    setText('restRoomLevelsCurrent', getCurrentSummaryText());
    setText('restRoomLevelsCurrentDescription', currentRoom ? currentRoom.description : 'Кімнату ще не викуплено.');
    setText('restRoomLevelsNext', nextRoom ? formatLevelName(nextRoom) : 'Максимальний рівень');
    setText('restRoomLevelsNextDescription', nextRoom ? nextRoom.description : 'Кімната повністю покращена.');
  }

  function isCompactSidebarLayout() {
    const view = $('restRoomView');
    if (!view) return window.innerWidth <= 900;
    return view.getBoundingClientRect().width <= 900;
  }

  function syncResponsiveSidebar() {
    const toggle = $('restRoomSidebarToggle');
    const sidebar = $('restRoomSidebar');
    if (!toggle || !sidebar) return;

    const isCompact = isCompactSidebarLayout();
    if (!isCompact) {
      sidebar.hidden = false;
      sidebar.classList.remove('is-open');
      toggle.hidden = true;
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Інформація про кімнату');
      const iconNode = toggle.querySelector('.rest-room-sidebar-toggle__icon');
      const textNode = toggle.querySelector('.rest-room-sidebar-toggle__text');
      if (iconNode) iconNode.textContent = '☰';
      if (textNode) textNode.textContent = 'Інфо';
      return;
    }

    toggle.hidden = false;
    sidebar.hidden = false;
    sidebar.classList.toggle('is-open', isSidebarOpen);
    toggle.classList.toggle('is-open', isSidebarOpen);
    toggle.setAttribute('aria-expanded', isSidebarOpen ? 'true' : 'false');
    toggle.setAttribute('aria-label', isSidebarOpen ? 'Сховати інформацію про кімнату' : 'Показати інформацію про кімнату');
    const iconNode = toggle.querySelector('.rest-room-sidebar-toggle__icon');
    const textNode = toggle.querySelector('.rest-room-sidebar-toggle__text');
    if (iconNode) iconNode.textContent = '☰';
    if (textNode) textNode.textContent = 'Інфо';
  }

  function toggleResponsiveSidebar() {
    if (!isCompactSidebarLayout()) return;
    isSidebarOpen = !isSidebarOpen;
    syncResponsiveSidebar();
  }

  function closeResponsiveSidebar() {
    if (!isSidebarOpen) return;
    isSidebarOpen = false;
    syncResponsiveSidebar();
  }

  function render() {
    const currentRoom = getCurrentRoomData();
    const nextRoom = getNextRoomData();
    renderMainInfo(currentRoom, nextRoom);
    renderButtons(nextRoom);
    renderLevelsTable();
    renderDailyReward();
    syncResponsiveSidebar();
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
      room.farmStartedAt = Date.now();
      room.farmProcessedMinutes = 0;
      room.farmMoneyCents = 0;
      room.farmFindEvents = 0;
      FARM_FIND_KEYS.forEach((key) => { room.farmFinds[key] = 0; });
      dailyMessage = 'Пасивний генератор запущено. Перші ₴0.10 з’являться через хвилину.';
      saveRoomState();
      render();
      return;
    }

    const nextRoom = getNextRoomData();
    if (!nextRoom || !spend(nextRoom.price)) return;
    reanchorFarmForUpgrade();
    room.level = nextRoom.level;
    dailyMessage = `Пасивний фарм покращено: ${formatMoneyFromCents(getFarmMoneyRateCents(room.level))}/хв · ліміт ${formatFarmCapacity(room.level)}.`;
    saveRoomState();
    render();
  }

  function openLevels() {
    renderLevelsTable();
    const panel = $('restRoomLevelsPanel');
    if (panel) panel.hidden = false;
    document.documentElement.classList.add('rest-room-levels-open');
  }

  function closeLevels() {
    const panel = $('restRoomLevelsPanel');
    if (panel) panel.hidden = true;
    document.documentElement.classList.remove('rest-room-levels-open');
  }

  function refresh() {
    isSidebarOpen = false;
    render();
    closeLevels();
    closeClaimModal();

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
    $('restRoomSidebarToggle')?.addEventListener('click', toggleResponsiveSidebar);
    $('restRoomSidebarClose')?.addEventListener('click', closeResponsiveSidebar);
    window.addEventListener('resize', syncResponsiveSidebar);
    if (window.ResizeObserver) {
      sidebarResizeObserver = new ResizeObserver(() => syncResponsiveSidebar());
      const view = $('restRoomView');
      if (view) sidebarResizeObserver.observe(view);
    }

    document.querySelectorAll('[data-rest-room-daily-claim]').forEach((button) => {
      button.addEventListener('click', claimDailyReward);
    });

    $('restRoomClaimClose')?.addEventListener('click', closeClaimModal);
    $('restRoomClaimConfirm')?.addEventListener('click', closeClaimModal);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('restRoomClaimPanel')?.hidden) closeClaimModal();
      if (event.key === 'Escape' && !$('restRoomLevelsPanel')?.hidden) closeLevels();
      if (event.key === 'Escape' && isSidebarOpen) {
        isSidebarOpen = false;
        syncResponsiveSidebar();
      }
    });

    render();
    startDailyTimer();
  }

  window.GameRestRoom = {
    bind,
    refresh,
    closeLevels,
    closeClaimModal,
    claimDailyReward,
    getStorage: () => ({ ...room.supplies })
  };
})();

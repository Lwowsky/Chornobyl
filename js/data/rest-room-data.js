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


  window.GameRestRoomData = Object.freeze({
    RENT_PRICE,
    BUY_PRICE,
    STORAGE_KEY,
    FARM_MINUTE_MS,
    FIND_CHANCE_BY_LEVEL,
    FIND_DROP_WEIGHTS,
    RESOURCE_LABELS,
    FARM_FIND_KEYS,
    ROOM_LEVELS
  });
})();

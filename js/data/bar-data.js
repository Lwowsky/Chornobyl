(function () {
  const BAR_STATE_KEY = "the1037.bar.v1";
  const BAR_MENU_REFRESH_MS = 4 * 60 * 60 * 1000;
  const BAR_DAILY_REFRESH_MS = 24 * 60 * 60 * 1000;
  const BAR_RUMOR_REFRESH_MS = 6 * 60 * 60 * 1000;
  const BAR_RUMOR_DURATION_MS = 2 * 60 * 60 * 1000;
  const BAR_NPC_RUMOR_REFRESH_MS = 12 * 60 * 60 * 1000;
  const BAR_NPC_RUMOR_DURATION_MS = 60 * 60 * 1000;
  const BAR_BARTENDER_JOB_REFRESH_MS = 12 * 60 * 60 * 1000;
  const BAR_BARTENDER_SPECIAL_DURATION_MS = 45 * 60 * 1000;
  const BAR_RUMOR_JOURNAL_LIMIT = 12;
  const BAR_TICK_MS = 1000;

  const BAR_MENU_ITEMS = [
    { id: "stew", category: "food", rarity: "common", minLevel: 1, name: "Тушонка", icon: "🥫", basePrice: 70, duration: 45, description: "Проста гаряча їжа перед короткою вилазкою.", effects: [{ key: "hpRegen", label: "Відновлення HP", value: 8 }] },
    { id: "porridge", category: "food", rarity: "common", minLevel: 1, name: "Гаряча каша", icon: "🍲", basePrice: 80, duration: 45, description: "Ситна порція, що допомагає довше тримати темп.", effects: [{ key: "energyRegen", label: "Відновлення енергії", value: 10 }] },
    { id: "coffee", category: "drink", rarity: "common", minLevel: 1, name: "Міцна кава", icon: "☕", basePrice: 55, duration: 45, description: "Швидкий заряд перед виходом із безпечної зони.", effects: [{ key: "energyRegen", label: "Відновлення енергії", value: 10 }] },
    { id: "herbalTea", category: "drink", rarity: "common", minLevel: 1, name: "Чай з травами", icon: "🍵", basePrice: 90, duration: 60, description: "Теплий настій, який трохи полегшує вплив Зони.", effects: [{ key: "radiationTaken", label: "Отримана радіація", value: -7 }] },
    { id: "meatPlate", category: "food", rarity: "improved", minLevel: 10, name: "М'ясна тарілка", icon: "🍖", basePrice: 130, duration: 60, description: "Більш поживна страва для довгих боїв.", effects: [{ key: "attack", label: "Атака", value: 5 }] },
    { id: "fieldSoup", category: "food", rarity: "improved", minLevel: 10, name: "Польовий суп", icon: "🥣", basePrice: 120, duration: 60, description: "Гаряча їжа з медичними травами.", effects: [{ key: "medkit", label: "Ефективність аптечок", value: 8 }] },
    { id: "blackTea", category: "drink", rarity: "improved", minLevel: 10, name: "Чорний чай", icon: "🫖", basePrice: 85, duration: 60, description: "Підтримує концентрацію та витривалість.", effects: [{ key: "energyCost", label: "Витрати енергії", value: -5 }] },
    { id: "stalkerDinner", category: "food", rarity: "rare", minLevel: 20, name: "Вечеря сталкера", icon: "🍛", basePrice: 190, duration: 60, description: "Рідкісна ситна страва з двома помірними бонусами.", effects: [{ key: "attack", label: "Атака", value: 4 }, { key: "radiationTaken", label: "Отримана радіація", value: -5 }] },
    { id: "zoneCoffee", category: "drink", rarity: "rare", minLevel: 20, name: "Кава «Зона»", icon: "☕", basePrice: 155, duration: 60, description: "Міцний напій для тих, хто полює за досвідом.", effects: [{ key: "exp", label: "EXP", value: 5 }, { key: "energyRegen", label: "Відновлення енергії", value: 6 }] },
    { id: "hunterMeal", category: "food", rarity: "rare", minLevel: 30, name: "Обід мисливця", icon: "🥘", basePrice: 230, duration: 60, description: "Для тих, хто йде в Зону за здобиччю.", effects: [{ key: "materials", label: "Шанс матеріалів", value: 6 }, { key: "money", label: "Гроші з боїв", value: 5 }] },
    { id: "focusBrew", category: "drink", rarity: "rare", minLevel: 30, name: "Настій концентрації", icon: "🧉", basePrice: 210, duration: 60, description: "Гіркий напій перед складною сутичкою.", effects: [{ key: "crit", label: "Крит. шанс", value: 3 }, { key: "attack", label: "Атака", value: 3 }] },
    { id: "veteranDinner", category: "food", rarity: "special", minLevel: 40, name: "Вечеря ветерана", icon: "🍽️", basePrice: 300, duration: 60, description: "Сильна комбінація без надмірного росту відсотків.", effects: [{ key: "attack", label: "Атака", value: 5 }, { key: "radiationTaken", label: "Отримана радіація", value: -5 }] },
    { id: "scavengerPlate", category: "food", rarity: "special", minLevel: 50, name: "Тарілка шукача", icon: "🥩", basePrice: 340, duration: 60, description: "Елітна страва для високорівневих вилазок.", effects: [{ key: "materials", label: "Шанс матеріалів", value: 7 }, { key: "money", label: "Гроші з боїв", value: 6 }] },
    { id: "signalBrew", category: "drink", rarity: "special", minLevel: 50, name: "Напій «1037»", icon: "🥤", basePrice: 320, duration: 60, description: "Фірмовий напій бару для досвідчених сталкерів.", effects: [{ key: "exp", label: "EXP", value: 6 }, { key: "crit", label: "Крит. шанс", value: 3 }] }
  ];

  const BAR_DAILY_OFFERS = [
    { id: "dailyStalker", name: "Тушонка + міцна кава", description: "Класичний комплект перед довгою вилазкою.", basePrice: 180, duration: 90, effects: [{ key: "hpRegen", label: "Відновлення HP", value: 10 }, { key: "energyRegen", label: "Відновлення енергії", value: 12 }, { key: "exp", label: "EXP", value: 5 }] },
    { id: "dailyHunter", name: "Вечеря мисливця", description: "Для фарму матеріалів і грошей у небезпечних зонах.", basePrice: 230, duration: 90, effects: [{ key: "materials", label: "Шанс матеріалів", value: 6 }, { key: "money", label: "Гроші з боїв", value: 6 }] },
    { id: "dailyGuard", name: "Гаряча страва + трав'яний чай", description: "Збалансований комплект для важких радіаційних маршрутів.", basePrice: 210, duration: 90, effects: [{ key: "radiationTaken", label: "Отримана радіація", value: -8 }, { key: "medkit", label: "Ефективність аптечок", value: 8 }] },
    { id: "dailyVeteran", name: "Комплект ветерана", description: "Рідкісна пропозиція з двома бойовими бонусами.", basePrice: 280, duration: 90, effects: [{ key: "attack", label: "Атака", value: 5 }, { key: "crit", label: "Крит. шанс", value: 3 }] }
  ];

  const BAR_RUMORS = [
    { id: "redForestMaterials", icon: "🌲", locationId: "redForest", location: "Рудий ліс", title: "Покинутий склад", text: "Кажуть, біля старої дороги знайшли сліди покинутого складу. Сьогодні там легше натрапити на корисні матеріали.", effects: [{ key: "materials", label: "Шанс матеріалів", value: 10 }] },
    { id: "yanivTech", icon: "🔧", locationId: "yaniv", location: "Янів", title: "Технічний вантаж", text: "На Янові бачили розбитий технічний вагон. У районі частіше трапляються деталі та інструменти.", effects: [{ key: "technicalLoot", label: "Технічний лут", value: 12 }] },
    { id: "pripyatMeds", icon: "🩹", locationId: "pripyat", location: "Прип’ять", title: "Старі медзапаси", text: "Хтось бачив нерозкриті медичні ящики біля старого корпусу. Варто уважніше перевіряти схованки.", effects: [{ key: "medicalLoot", label: "Медичні знахідки", value: 12 }] },
    { id: "chaesRadiation", icon: "☢", locationId: "chaes", location: "ЧАЕС", title: "Слабший фон", text: "Сталкери кажуть, що на одному з маршрутів до станції сьогодні фон трохи нижчий, ніж зазвичай.", effects: [{ key: "radiationTaken", label: "Отримана радіація", value: -8 }] },
    { id: "dityatkyMoney", icon: "💰", locationId: "dityatky", location: "Дитятки", title: "Скупники платять більше", text: "Через нестачу припасів місцеві скупники тимчасово дають більше за здобич із району Дитяток.", effects: [{ key: "money", label: "Гроші зі здобичі", value: 10 }] },
    { id: "redForestExp", icon: "🐺", locationId: "redForest", location: "Рудий ліс", title: "Небезпечна активність", text: "У Рудому лісі помітили більше мутантів. Небезпечно, зате досвідчені сталкери швидше набираються досвіду.", effects: [{ key: "exp", label: "EXP", value: 8 }] },
    { id: "yanivEnergy", icon: "⚡", locationId: "yaniv", location: "Янів", title: "Коротший маршрут", text: "Через службовий прохід на Янові можна трохи скоротити шлях і витрачати менше сил на дослідження.", effects: [{ key: "energyCost", label: "Витрати енергії", value: -8 }] },
    { id: "pripyatRare", icon: "📦", locationId: "pripyat", location: "Прип’ять", title: "Нерозібрані квартири", text: "Подейкують, що один із секторів Прип’яті ще майже не обшукували. Рідкісні знахідки там трапляються частіше.", effects: [{ key: "rareFind", label: "Рідкісна знахідка", value: 3 }] },
    { id: "chaesAttack", icon: "🎯", locationId: "chaes", location: "ЧАЕС", title: "Відомі маршрути мутантів", text: "Один ветеран намалював свіжі маршрути мутантів біля станції. У бою легше підготувати перший удар.", effects: [{ key: "attack", label: "Атака", value: 5 }] },
    { id: "dityatkyMedkit", icon: "🧪", locationId: "dityatky", location: "Дитятки", title: "Добрі перев’язочні матеріали", text: "У місцевого медика з’явилась партія якісних витратників. Аптечки в цьому районі працюють ефективніше.", effects: [{ key: "medkit", label: "Ефективність аптечок", value: 8 }] }
  ];


  const BAR_NPC_RUMORS = [
    { id: "npcRedForestExp", icon: "🧭", locationId: "redForest", location: "Рудий ліс", title: "Маршрут ветерана", text: "Інформатор показав обхідний маршрут до місць, де найчастіше полюють досвідчені сталкери.", effects: [{ key: "exp", label: "EXP", value: 12 }] },
    { id: "npcRedForestMaterials", icon: "🧰", locationId: "redForest", location: "Рудий ліс", title: "Слід збирача", text: "Є точні координати старого маршруту збирача. У цьому секторі варто уважніше дивитися під ноги.", effects: [{ key: "materials", label: "Шанс матеріалів", value: 14 }] },
    { id: "npcYanivRare", icon: "🔐", locationId: "yaniv", location: "Янів", title: "Зачинена комора", text: "Інформатор почув про службову комору, яку ще не встигли повністю розібрати.", effects: [{ key: "rareFind", label: "Рідкісна знахідка", value: 4 }] },
    { id: "npcPripyatMeds", icon: "🧪", locationId: "pripyat", location: "Прип’ять", title: "Медичний тайник", text: "Один із колишніх санітарів назвав сектор, де могли залишитися нерозкриті медичні запаси.", effects: [{ key: "medicalLoot", label: "Медичні знахідки", value: 15 }] },
    { id: "npcChaesRadiation", icon: "📡", locationId: "chaes", location: "ЧАЕС", title: "Вікно слабкого фону", text: "За словами інформатора, найближчу годину один із маршрутів до станції має трохи нижчий фон.", effects: [{ key: "radiationTaken", label: "Отримана радіація", value: -12 }] },
    { id: "npcDityatkyMoney", icon: "🪙", locationId: "dityatky", location: "Дитятки", title: "Щедрий скупник", text: "Інформатор знає покупця, який недовго платить більше за здобич із району Дитяток.", effects: [{ key: "money", label: "Гроші зі здобичі", value: 15 }] }
  ];

  const BAR_BARTENDER_SPECIAL = {
    id: "bartenderBlackCoffee1037",
    name: "Чорна кава «1037»",
    icon: "☕",
    basePrice: 160,
    duration: 45,
    description: "Фірмова кава Марека. Допомагає довше тримати темп у вилазці.",
    effects: [{ key: "energyCost", label: "Витрати енергії", value: -15 }]
  };

  const BAR_BARTENDER_JOBS = [
    { id: "lostBackpackYaniv", icon: "🎒", locationId: "yaniv", location: "Янів", title: "Загублений рюкзак", intro: "Один сталкер загубив рюкзак біля старої дороги на Янові. Якщо знайдеш — буде нагорода." },
    { id: "missingStashRedForest", icon: "📦", locationId: "redForest", location: "Рудий ліс", title: "Зниклий схрон", intro: "У Рудому лісі перестали виходити на зв'язок люди, які мали забрати невеликий схрон. Треба перевірити місце." },
    { id: "medicineCasePripyat", icon: "🩹", locationId: "pripyat", location: "Прип’ять", title: "Медичний кейс", intro: "У Прип’яті залишився медичний кейс. Замовник платить за те, щоб його повернули цілим." }
  ];

  const BAR_BARTENDER_JOB_VARIANTS = {
    contents: { id: "contents", question: "Що там усередині?", answer: "Кажуть, там корисні припаси. Якщо знайдеш щось зайве — можеш залишити собі.", money: 650, exp: 100, extra: "Шанс додаткової знахідки" },
    pay: { id: "pay", question: "Скільки платять?", answer: "Якщо принесеш усе цілим — заплатять без торгу. Я вибив для тебе кращу ставку.", money: 900, exp: 120, extra: "Підвищена грошова нагорода" },
    risk: { id: "risk", question: "Наскільки це небезпечно?", answer: "Небезпечно. Можу записати тебе на складніший маршрут — ризик вищий, але й платять більше.", money: 1100, exp: 140, extra: "Матеріали + бонус; вороги квесту +5% HP" }
  };


  window.GameBarData = Object.freeze({
    BAR_STATE_KEY,
    BAR_MENU_REFRESH_MS,
    BAR_DAILY_REFRESH_MS,
    BAR_RUMOR_REFRESH_MS,
    BAR_RUMOR_DURATION_MS,
    BAR_NPC_RUMOR_REFRESH_MS,
    BAR_NPC_RUMOR_DURATION_MS,
    BAR_BARTENDER_JOB_REFRESH_MS,
    BAR_BARTENDER_SPECIAL_DURATION_MS,
    BAR_RUMOR_JOURNAL_LIMIT,
    BAR_TICK_MS,
    BAR_MENU_ITEMS,
    BAR_DAILY_OFFERS,
    BAR_RUMORS,
    BAR_NPC_RUMORS,
    BAR_BARTENDER_SPECIAL,
    BAR_BARTENDER_JOBS,
    BAR_BARTENDER_JOB_VARIANTS
  });
})();

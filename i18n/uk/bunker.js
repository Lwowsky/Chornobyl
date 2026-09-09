(function () {
  const sets = [
    ["white", "Білий · Польовий"],
    ["green", "Зелений · Сталкер"],
    ["blue", "Синій · Ветеран"],
    ["purple", "Фіолетовий · Еліта"],
    ["gold", "Золотий · Легенда"],
    ["red", "Червоний · Сигнал 1037"]
  ];
  const slots = {
    head: "Капюшон",
    mask: "Маска",
    body: "Броня",
    cloak: "Плащ",
    pants: "Штани",
    boots: "Черевики",
    gloves: "Рукавиці",
    melee: "Ніж",
    ranged: "Гвинтівка",
    dosimeter: "Дозиметр",
    talisman: "Талісман",
    artifact: "Артефакт"
  };
  const itemNames = {};
  const descriptions = {};
  sets.forEach(([id, label]) => {
    Object.entries(slots).forEach(([slot, slotLabel]) => {
      const key = `test_${id}_${slot}`;
      itemNames[key] = `${label} · ${slotLabel}`;
      descriptions[key] = id === "red"
        ? "Тестовий предмет найвищого червоного сету. Має всі підтримувані бонусні характеристики."
        : `Безкоштовний тестовий предмет сету «${label}». Призначений для перевірки спорядження та характеристик.`;
    });
  });

  window.GameI18n.register("uk", {
    bunker: {
      kicker: "ТЕСТОВИЙ БУНКЕР",
      title: "Бункер спорядження",
      subtitle: "Безкоштовні тестові сети від найпростішого до найсильнішого.",
      info: "Усі речі тут тестові та безкоштовні. Вони потрібні для перевірки інвентарю, профілю, рівнів і характеристик.",
      free: "Безкоштовно",
      takeSet: "Отримати сет",
      equipSet: "Одягнути сет",
      added: "Сет додано в рюкзак.",
      equipped: "Сет екіпіровано.",
      redNote: "Найсильніший тестовий сет: кожен предмет має всі бонусні характеристики.",
      pieces: "12 речей",
      closeInfo: "Закрити інформацію",
      stats: "Характеристики сету",
      owned: "У рюкзаку",
      active: "Одягнено"
    },
    items: itemNames,
    itemDescriptions: descriptions,
    rarities: {
      common: "Білий",
      uncommon: "Зелений",
      rare: "Синій",
      epic: "Фіолетовий",
      legendary: "Золотий",
      mythic: "Червоний"
    }
  });
})();

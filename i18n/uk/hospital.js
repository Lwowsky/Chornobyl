window.GameI18n.register("uk", {
  hospital: {
    kicker: "БЕЗПЕЧНА ЗОНА",
    title: "Лікарня",
    subtitle: "Миттєве лікування та дезактивація після небезпечних вилазок.",
    close: "Закрити лікарню",
    currentState: "ПОТОЧНИЙ СТАН",
    availableServices: "ДОСТУПНІ ПОСЛУГИ",
    hp: "HP",
    radiation: "Радіація",
    money: "Гроші",
    note: "Кімната відпочинку відновлює поступово. Лікарня працює миттєво.",
    states: {
      notNeeded: "Не потрібно",
      notEnoughMoney: "Недостатньо грошей"
    },
    services: {
      fullHeal: {
        title: "Повне лікування",
        description: "Миттєво відновлює HP до максимального значення.",
        change: "HP: {before} → {after}",
        action: "Відновити повністю"
      },
      partialDecon: {
        title: "Дезактивація -25",
        description: "Знижує рівень радіації на 25 одиниць.",
        change: "{before} → {after}",
        action: "Провести дезактивацію"
      },
      fullDecon: {
        title: "Повне очищення",
        description: "Повністю виводить радіацію з організму.",
        change: "{before} → 0",
        action: "Очистити організм"
      }
    },
    messages: {
      success: "Процедуру завершено.",
      money: "Недостатньо грошей для цієї процедури.",
      notNeeded: "Ця процедура зараз не потрібна.",
      error: "Не вдалося виконати процедуру."
    }
  }
});

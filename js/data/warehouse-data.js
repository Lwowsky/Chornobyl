(function () {
  const LEVELS = [
    {
      level: 1,
      capacity: 80,
      bonuses: ["capacity80", "baseSorting", "standardContainers"],
      upgrade: { money: 5000, scrap: 20, battery: 5 }
    },
    {
      level: 2,
      capacity: 120,
      bonuses: ["capacity120", "baseSorting", "standardContainers", "basicWorkshop"],
      upgrade: { money: 15000, scrap: 50, battery: 10 }
    },
    {
      level: 3,
      capacity: 200,
      bonuses: ["capacity200", "advancedSorting", "rareContainers", "moreRecipes"],
      upgrade: { money: 30000, scrap: 90, battery: 20 }
    },
    {
      level: 4,
      capacity: 280,
      bonuses: ["capacity280", "advancedSorting", "rareContainers", "expandedWorkshop"],
      upgrade: { money: 60000, scrap: 150, battery: 35 }
    },
    {
      level: 5,
      capacity: 400,
      bonuses: ["capacity400", "maxSorting", "eliteContainers", "expandedWorkshop"],
      upgrade: null
    }
  ];

  function getLevel(level) {
    return LEVELS.find((entry) => entry.level === Number(level)) || LEVELS[0];
  }

  function getNextLevel(level) {
    return LEVELS.find((entry) => entry.level === Number(level) + 1) || null;
  }

  window.GameWarehouseData = { LEVELS, getLevel, getNextLevel };
})();

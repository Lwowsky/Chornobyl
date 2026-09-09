window.GameQuestRegistry.registerPack("safe-zone-daily", [
  {
    id: "daily_supply_scrap",
    type: "daily",
    titleKey: "questBoard.entries.daily_supply_scrap.title",
    descriptionKey: "questBoard.entries.daily_supply_scrap.description",
    locationKey: "questBoard.locations.safeZone",
    image: "assets/hub/safe-zone-hub.webp",
    minLevel: 1,
    difficulty: 1,
    rarity: "common",
    durationHours: 24,
    objectives: [
      { id: "scrap", type: "inventory", itemId: "scrap", target: 10, labelKey: "questBoard.entries.daily_supply_scrap.objectives.scrap" }
    ],
    rewards: { money: 350, xp: 120, reputation: 15, items: [{ id: "bandage", qty: 1 }] }
  },
  {
    id: "daily_zone_patrol",
    type: "daily",
    titleKey: "questBoard.entries.daily_zone_patrol.title",
    descriptionKey: "questBoard.entries.daily_zone_patrol.description",
    locationKey: "questBoard.locations.outskirts",
    image: "assets/story-locations/dytiatky-main.webp",
    minLevel: 2,
    difficulty: 1,
    rarity: "common",
    durationHours: 24,
    objectives: [
      { id: "kills", type: "event", event: "enemy:killed", target: 5, labelKey: "questBoard.entries.daily_zone_patrol.objectives.kills" }
    ],
    rewards: { money: 500, xp: 180, reputation: 20 }
  },
  {
    id: "daily_medical_stock",
    type: "daily",
    titleKey: "questBoard.entries.daily_medical_stock.title",
    descriptionKey: "questBoard.entries.daily_medical_stock.description",
    locationKey: "questBoard.locations.safeZone",
    image: "assets/story-locations/pripyat_hospital_exterior.webp",
    minLevel: 3,
    difficulty: 1,
    rarity: "common",
    durationHours: 24,
    objectives: [
      { id: "bandages", type: "inventory", itemId: "bandage", target: 4, labelKey: "questBoard.entries.daily_medical_stock.objectives.bandages" },
      { id: "iodine", type: "inventory", itemId: "iodine", target: 2, labelKey: "questBoard.entries.daily_medical_stock.objectives.iodine" }
    ],
    rewards: { money: 650, xp: 220, reputation: 25, items: [{ id: "medkit", qty: 1 }] }
  },
  {
    id: "daily_signal_scan",
    type: "daily",
    titleKey: "questBoard.entries.daily_signal_scan.title",
    descriptionKey: "questBoard.entries.daily_signal_scan.description",
    locationKey: "questBoard.locations.northCheckpoint",
    image: "assets/story-locations/yaniv_checkpoint_outside.webp",
    minLevel: 4,
    difficulty: 2,
    rarity: "rare",
    durationHours: 24,
    objectives: [
      { id: "scan", type: "event", event: "location:scanned", target: 3, labelKey: "questBoard.entries.daily_signal_scan.objectives.scan" }
    ],
    rewards: { money: 900, xp: 300, reputation: 35, items: [{ id: "battery", qty: 1 }] }
  }
]);

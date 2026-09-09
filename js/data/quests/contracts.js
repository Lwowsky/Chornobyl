window.GameQuestRegistry.registerPack("safe-zone-contracts", [
  {
    id: "contract_red_forest_cleanup",
    type: "contract",
    titleKey: "questBoard.entries.contract_red_forest_cleanup.title",
    descriptionKey: "questBoard.entries.contract_red_forest_cleanup.description",
    locationKey: "questBoard.locations.redForest",
    image: "assets/story-locations/redforest.webp",
    minLevel: 5,
    difficulty: 2,
    rarity: "rare",
    durationHours: 18,
    objectives: [
      { id: "kills", type: "event", event: "enemy:killed", match: { location: "redforest" }, target: 8, labelKey: "questBoard.entries.contract_red_forest_cleanup.objectives.kills" }
    ],
    rewards: { money: 1200, xp: 420, reputation: 45, items: [{ id: "gear_crate", qty: 1 }] }
  },
  {
    id: "contract_yaniv_delivery",
    type: "contract",
    titleKey: "questBoard.entries.contract_yaniv_delivery.title",
    descriptionKey: "questBoard.entries.contract_yaniv_delivery.description",
    locationKey: "questBoard.locations.yaniv",
    image: "assets/story-locations/yaniv.webp",
    minLevel: 5,
    difficulty: 1,
    rarity: "common",
    durationHours: 12,
    objectives: [
      { id: "food", type: "inventory", itemId: "food", target: 3, labelKey: "questBoard.entries.contract_yaniv_delivery.objectives.food" },
      { id: "water", type: "inventory", itemId: "water", target: 3, labelKey: "questBoard.entries.contract_yaniv_delivery.objectives.water" }
    ],
    rewards: { money: 850, xp: 260, reputation: 30 }
  },
  {
    id: "contract_bridge_recon",
    type: "contract",
    titleKey: "questBoard.entries.contract_bridge_recon.title",
    descriptionKey: "questBoard.entries.contract_bridge_recon.description",
    locationKey: "questBoard.locations.riverBridge",
    image: "assets/story-locations/prypiat-river-bridge.webp",
    minLevel: 6,
    difficulty: 2,
    rarity: "rare",
    durationHours: 16,
    objectives: [
      { id: "visit", type: "event", event: "location:visited", match: { location: "river-bridge" }, target: 1, labelKey: "questBoard.entries.contract_bridge_recon.objectives.visit" },
      { id: "scan", type: "event", event: "location:scanned", match: { location: "river-bridge" }, target: 2, labelKey: "questBoard.entries.contract_bridge_recon.objectives.scan" }
    ],
    rewards: { money: 1400, xp: 500, reputation: 55, items: [{ id: "rare_hide", qty: 1 }] }
  },
  {
    id: "contract_ammo_reserve",
    type: "contract",
    titleKey: "questBoard.entries.contract_ammo_reserve.title",
    descriptionKey: "questBoard.entries.contract_ammo_reserve.description",
    locationKey: "questBoard.locations.safeZone",
    image: "assets/story-locations/chnpp_checkpoint_exterior.webp",
    minLevel: 5,
    difficulty: 1,
    rarity: "common",
    durationHours: 10,
    objectives: [
      { id: "ammo", type: "inventory", itemId: "ammo", target: 60, labelKey: "questBoard.entries.contract_ammo_reserve.objectives.ammo" }
    ],
    rewards: { money: 700, xp: 240, reputation: 25, items: [{ id: "battery", qty: 1 }] }
  },
  {
    id: "contract_pripyat_records",
    type: "contract",
    titleKey: "questBoard.entries.contract_pripyat_records.title",
    descriptionKey: "questBoard.entries.contract_pripyat_records.description",
    locationKey: "questBoard.locations.pripyat",
    image: "assets/story-locations/pripyat_bus_station_exterior.webp",
    minLevel: 8,
    difficulty: 3,
    rarity: "epic",
    durationHours: 24,
    objectives: [
      { id: "records", type: "event", event: "quest:item-found", match: { item: "field-record" }, target: 3, labelKey: "questBoard.entries.contract_pripyat_records.objectives.records" }
    ],
    rewards: { money: 2400, xp: 900, reputation: 90, items: [{ id: "gear_crate", qty: 2 }] }
  }
]);

(function () {
  window.GameInventoryData.registerItems([
  {
    "id": "medkit",
    "icon": "🧰",
    "profileIcon": "assets/inventory-items/item_medkit.webp",
    "category": "medicine",
    "type": "consumable",
    "weight": 0.55,
    "action": {
      "type": "restore",
      "stat": "hp",
      "amount": 35
    }
  },
  {
    "id": "bandage",
    "icon": "🩹",
    "profileIcon": "assets/inventory-items/item_bandage.webp",
    "category": "medicine",
    "type": "consumable",
    "weight": 0.08,
    "action": {
      "type": "restore",
      "stat": "hp",
      "amount": 10
    }
  },
  {
    "id": "water",
    "icon": "💧",
    "profileIcon": "assets/inventory-items/item_water.webp",
    "category": "food",
    "type": "consumable",
    "weight": 0.7,
    "action": {
      "type": "restore",
      "stat": "energy",
      "amount": 12
    }
  },
  {
    "id": "food",
    "icon": "🥫",
    "profileIcon": "assets/inventory-items/item_food.webp",
    "category": "food",
    "type": "consumable",
    "weight": 0.35,
    "action": {
      "type": "restore",
      "stat": "energy",
      "amount": 18
    }
  },
  {
    "id": "ammo",
    "icon": "▥",
    "profileIcon": "assets/inventory-items/item_ammo.webp",
    "category": "ammo",
    "type": "ammo",
    "weight": 0.012
  },
  {
    "id": "iodine",
    "icon": "🧪",
    "profileIcon": "assets/inventory-items/item_iodine.webp",
    "category": "medicine",
    "type": "consumable",
    "weight": 0.08,
    "action": {
      "type": "reduce",
      "stat": "radiation",
      "amount": 15
    }
  },
  {
    "id": "antirad",
    "icon": "☢",
    "profileIcon": "assets/inventory-items/item_chemical.webp",
    "category": "medicine",
    "type": "consumable",
    "weight": 0.12,
    "action": {
      "type": "reduce",
      "stat": "radiation",
      "amount": 30
    }
  }
]);
})();

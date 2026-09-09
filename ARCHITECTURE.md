# THE 1037 SIGNAL — Architecture v0.56

## Equipment progression
- `js/core/equipment-rarity.js` — rarity tiers, random unique stat rolls, stat power formula, inherited stat order.
- `js/core/equipment-upgrades.js` — +1…+25 item level upgrades and ordinary upgrade costs.
- `js/core/equipment-promotion.js` — +25 rarity promotion, promotion recipes and item migration to the next rarity.
- `js/core/equipment.js` — equip/unequip and aggregated equipment bonuses.
- `js/ui/profile-equipment-picker.js` — one item-information UI; shows level upgrade or rarity promotion depending on state.

## Inventory / resources
- `js/core/inventory-store.js` — inventory quantities, weight and first-acquisition equipment roll creation.
- `js/data/inventory/resources.js` — upgrade materials, including the red/mythic promotion core.
- `js/data/bunker-test-sets.js` — free test sets and their promotion chain IDs.

## Progression
- `js/core/progression.js` — player level 1–100, EXP requirements and base-stat growth.

## Localization
Only Ukrainian is active. New visible strings still use prepared i18n keys so other languages can be added later without changing game logic.

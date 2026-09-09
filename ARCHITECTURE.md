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

## Quest board / scalable quest system — v0.76
- `js/data/quests/registry.js` is the single quest registry and rejects duplicate quest IDs.
- Quest content is split into independent packs under `js/data/quests/` so content can grow without changing UI code.
- `js/core/quest-runtime.js` owns quest state and gameplay progress; other systems communicate through `GameQuests.report(...)` instead of importing quest data.
- `js/ui/quest-board.js` is a generic renderer with tabs, filters, search and 40-item incremental rendering.
- `css/components/quest-board.css` is fully scoped to the quest board and does not redefine existing Hub/Bar/Warehouse selectors.
- Quest text is isolated under `i18n/uk/quests/`; definitions store translation keys instead of visible strings.
- `QUEST_SYSTEM.md` documents the content schema and extension workflow.


## Hospital module (v0.77)
- `js/data/hospital-data.js` — prices, service definitions, treatment constants.
- `js/core/hospital-runtime.js` — quotes and state mutations; no DOM.
- `js/ui/hospital.js` — modal rendering, events and user feedback.
- `css/components/hospital.css` — isolated `hospital-*` selectors, including mobile rules.
- `i18n/uk/hospital.js` — all hospital UI copy.

The Safe Zone `hospital` hotspot routes directly to `GameHospital.open()` and is intentionally excluded from the generic `hubModal` point set.

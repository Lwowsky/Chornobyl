# Code audit — v0.56

- JavaScript syntax: OK for all JS/i18n files.
- Duplicate HTML IDs: 0.
- Duplicate JS includes: 0.
- Duplicate CSS includes: 0.
- Missing local HTML assets/includes: 0.
- Broken aria-labelledby / aria-controls references: 0.
- `!important`: 0.
- Rarity stat count test: 2 / 3 / 4 / 5 / 7 / 9 — OK.
- Random white roll uniqueness test: OK.
- Stat inheritance white → green → blue → purple → gold → red: OK.
- Power continuity test: Attack white +25 = 10, green +1 = 11 — OK.
- Existing repeated declarations inside different responsive media ranges were left intact because they are breakpoint-specific cascade rules, not duplicate includes or duplicated game logic.

## v0.57 responsive audit
- HUD values constrained with min-width/overflow-safe responsive typography.
- Rest Room unowned layout no longer reserves space for inactive farm/upgrade cards.
- Existing JS state/render architecture reused; only state classes were added, no duplicated Rest Room logic.

## v0.58 rest-room regression fix
- Fixed regression from v0.57 where compact layouts could hide the available-room information behind the responsive Info drawer before purchase.
- Unowned compact state now uses a persistent current-room card; drawer behaviour remains for owned rooms only.

## v0.59 rest-room rollback
- Removed the v0.58 unowned-room CSS override that converted the sidebar into an inline block.
- Removed the v0.58 JS branch that disabled the compact sidebar toggle for unowned rooms.
- Sidebar behavior is now identical to v0.57.

## v0.61 rest-room sidebar regression fix
- Unowned state no longer renders the passive-farm/supplies card in the compact sidebar.
- Owned state markup and farm/upgrade logic were not changed.
- Compact sidebar scroll position resets to the top on open so the room-level card is immediately visible.
- v0.60 mobile XP typography remains intact.

## v0.66 warehouse UI + i18n audit
- Warehouse is implemented as a dedicated module: `js/ui/warehouse.js`.
- Warehouse progression/data is isolated in `js/data/warehouse-data.js`.
- Warehouse styles are isolated in `css/components/warehouse.css`.
- Warehouse translation chunk is isolated in `i18n/uk/warehouse.js` and loaded after the base Ukrainian dictionary.
- The modal HTML remains in `index.html` to avoid an extra runtime fetch and keep the single-page build reliable.
- Static i18n references checked: 249 used keys, 0 missing.
- Dynamic inventory/category/slot/backpack translation references checked against all registered item data: 0 missing.
- Warehouse dynamic filter and bonus keys checked: 0 missing.
- JavaScript/i18n syntax check: 47 files OK.
- Duplicate HTML IDs: 0.
- Duplicate JS includes: 0.
- Duplicate CSS includes: 0.
- Missing local JS/CSS includes: 0.
- `!important`: 0.

## v0.67 — Warehouse layout fix
- Inventory grid now scrolls inside its own area and cannot overlap action buttons.
- Open crate / Store / Take remain in a dedicated visible footer.
- Desktop dialog uses a stable viewport-aware height; right upgrade panel scrolls independently when needed.
- Tablet/mobile keep buttons visible with compact responsive sizing.

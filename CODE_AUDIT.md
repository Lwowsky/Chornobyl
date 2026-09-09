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

## v0.76 — Quest board + full integration audit
- Dedicated quest files added; no quest definitions are hard-coded in `index.html` or `js/ui/quest-board.js`.
- Initial catalog: 12 quests in 3 independent packs (4 daily, 5 contracts, 3 story).
- Registry validation: duplicate quest IDs are rejected at registration time.
- Quest reward/objective inventory references checked against the inventory registry: 0 missing item IDs.
- Quest runtime smoke test: accept → event/inventory progress → ready → track → claim passed.
- JavaScript/i18n syntax check: 57 files, 0 syntax errors.
- Static translation audit: 344 referenced keys checked, 0 missing.
- Translation override audit: 0 existing translation keys overwritten by later chunks.
- Duplicate HTML IDs: 0.
- Duplicate `<script src>` includes: 0.
- Duplicate stylesheet includes: 0.
- Missing local HTML assets/scripts/styles: 0.
- Broken `aria-labelledby` / `aria-controls` references: 0.
- Duplicate `window.Game*` module globals: 0.
- Quest module globals are unique: `GameQuestRegistry`, `GameQuests`, `GameQuestBoard`.
- Exact identical CSS rules duplicated across different CSS files: 0.
- Existing cross-file selector reuse belongs to base + responsive/cascade layers; quest-board CSS uses its own scoped selectors and introduces no selector collisions.
- `!important`: 0.
- The old generic Hub placeholder no longer handles `questBoard`; Hub now delegates directly to `GameQuestBoard.open()`, so the new UI is not overlaid or overridden by the old modal path.

## v0.77 — Hospital audit
- Duplicate HTML IDs: 0.
- Duplicate `<script src>` references: 0.
- Duplicate stylesheet references: 0.
- Missing local script/stylesheet references: 0.
- JS/i18n syntax: 61 files checked, 0 errors.
- Static translation audit: 298 referenced keys checked, 0 missing; hospital contributes 15 static keys plus dynamic service subkeys from one translation namespace.
- Hospital selectors use the isolated `hospital-*` prefix and a dedicated stylesheet.
- The old generic `hubModal` no longer handles the `hospital` hotspot. `hub-map.js` routes directly to `GameHospital.open()`.
- `GameHospitalData`, `GameHospitalRuntime`, and `GameHospital` are defined once and loaded once.
- Runtime price test: HP 100/4000 => missing 3900 => ₴7,800; radiation 67 => 42 for ₴250; radiation 67 => 0 for ₴600.

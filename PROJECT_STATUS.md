# THE 1037 SIGNAL — v0.56

## Added
- Full equipment rarity promotion chain: white → green → blue → purple → gold → red.
- Promotion is available only after the current item reaches +25.
- Promoted item starts at +1 of the next rarity.
- Existing rolled stats are preserved; the next rarity adds only the required new unique stats.
- White equipment now gets 2 random unique stats on first acquisition; the saved roll persists across reloads.
- Promotion carries the same roll seed forward, so the item keeps its original stats.
- Unified stat power curve keeps found and promoted items of the same rarity/level equally strong.
- Promotion uses real inventory resources.
- Added `mythic_core` for gold → red.
- Item popup now previews the next rarity, highlights newly-added stats, shows required resources and provides the promotion action.

## Stat counts
- White: 2
- Green: 3
- Blue: 4
- Purple: 5
- Gold: 7
- Red: all 9

## Power continuity example
Attack: white +25 = 10; green +1 = 11. A found green +1 and a promoted green +1 therefore use the same Attack value.

## v0.57 — Rest Room responsive cleanup
- HUD metric labels/values no longer overflow their cards at intermediate and small widths.
- Added explicit unowned/rented room state classes.
- Hidden inactive farm/upgrade cards before room purchase.
- Purchase offers use a compact two-card strip on tablet/mobile instead of squeezing the scene.
- Unowned info drawer is now a compact overlay rather than a full-height panel.
- Fixed `[hidden]` behavior for Rest Room components so hidden upgrade content cannot reappear through CSS.

## v0.58 — Available room info restored
- Restored the visible “Доступна кімната / Базова кімната” information before the room is purchased.
- On screens up to 900px, the unowned room card is now always visible under the scene instead of being hidden inside the Info drawer.
- The compact card keeps HP, energy and radiation bonuses visible without covering the room image.
- Purchased-room responsive drawer behaviour remains unchanged.

## v0.59 — Sidebar restored exactly
- Reverted the v0.58 compact inline-room-card redesign.
- Restored the original Rest Room sidebar behavior from v0.57: desktop keeps the right sidebar; compact screens use the side Info drawer with Close button.
- No room information was moved below the scene and no new layout was introduced.

## v0.60 — Level 1 sidebar info + XP text restore
- Restored the Level 1 passive-farm information in the room sidebar before purchase (income/min, capacity, find chance and inactive status).
- The compact unowned-room drawer now uses the available height so that information is visible instead of being cut away.
- Restored a larger, readable player XP value on phone layouts; other HUD text sizes were not changed.

## v0.61 — Rest Room sidebar behavior restored
- Removed the extra inactive “Запаси кімнати” block from the sidebar before the room is purchased.
- Before purchase, the compact Info drawer again contains only the available Level 1 room card, exactly like the earlier intended layout.
- After purchase, the sidebar keeps the full owned-room structure: current room, room supplies/passive farm, and next upgrade.
- Opening the compact Info drawer now resets it to the top, so the current/available room information is never opened half-scrolled or clipped.
- Kept the restored larger player XP text from v0.60 unchanged.


## v0.70 — Warehouse footer / viewport fix
- Warehouse modal keeps a visible bottom margin inside the viewport.
- Inventory grid is the scrolling region; action buttons are a normal footer below it.
- Removed sticky/floating behavior that could visually overlap item cards.
- Bag / Storage tabs and their filtering logic are unchanged.

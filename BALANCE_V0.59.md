# v0.59 Balance — Before vs After

## Expedition bosses

| Level | Before | v0.59 |
|---|---|---|
| 3 | 240 HP · DEF 10 · DMG 12–17 | 230 HP · DEF 9 · DMG 10–15 |
| 4 | 340 HP · DEF 15 · DMG 24–31 | 290 HP · DEF 12 · DMG 17–23 |
| 5 | 430 HP · DEF 20 · DMG 32–40 | 410 HP · DEF 18 · DMG 29–36 |
| 6 | 600 HP · DEF 28 · DMG 44–56 | 520 HP · DEF 23 · DMG 32–42 |
| 8 | 1050 HP · DEF 42 · DMG 68–84 | 975 HP · DEF 40 · DMG 58–72 |
| 10 | 1750 HP · DEF 65 · DMG 130–155 | 1650 HP · DEF 62 · DMG 125–150 |

Levels 1, 2, 7, and 9 were left unchanged. The goal was to remove abrupt boss spikes while keeping upgraded gear valuable.

## Backpack upgrade money costs

Material costs were not changed.

| Backpack level | Before | v0.59 |
|---|---:|---:|
| 2 | 300 ₴ | 250 ₴ |
| 3 | 800 ₴ | 650 ₴ |
| 4 | 1,500 ₴ | 1,200 ₴ |
| 5 | 2,400 ₴ | 1,900 ₴ |
| 6 | 3,500 ₴ | 2,800 ₴ |
| 7 | 5,000 ₴ | 4,000 ₴ |
| 8 | 7,000 ₴ | 5,500 ₴ |
| 9 | 9,500 ₴ | 7,500 ₴ |
| 10 | 13,000 ₴ | 10,000 ₴ |

Total money cost for Lv.2–10 changed from **43,000 ₴** to **33,800 ₴** (about **21.4% less**).

## Expedition money

Before v0.59, normal Expedition clears did not add a dedicated money reward. v0.59 added money to every Expedition:

- First clear: 100% of the calculated money reward.
- Repeat clear: 55%.
- Normal route base: `12 + level × 6 + routeIndex × 3`.
- Final boss base: `30 + level × 12`.

This was added so Expedition farming contributes to backpack and equipment progression instead of producing only materials/items.

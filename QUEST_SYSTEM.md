# Quest system — v0.76

The quest board is data-driven. The UI does not contain quest definitions, so adding hundreds or thousands of quests does not require editing the modal markup or the rendering logic.

## Files

- `js/data/quests/registry.js` — central registry, duplicate-ID validation and type indexes.
- `js/data/quests/daily.js` — daily quest pack.
- `js/data/quests/contracts.js` — contract quest pack.
- `js/data/quests/story.js` — story quest pack.
- `js/core/quest-runtime.js` — save state, status, progress, accept/track/claim, daily reset and event reporting.
- `js/ui/quest-board.js` — generic rendering, filters, search and pagination.
- `css/components/quest-board.css` — isolated quest-board styles only.
- `i18n/uk/quests/ui.js` — quest board UI translations.
- `i18n/uk/quests/daily.js` — daily quest texts.
- `i18n/uk/quests/contracts.js` — contract texts.
- `i18n/uk/quests/story.js` — story texts.

## Adding a new quest

Add a data object to the appropriate pack, or create a new pack file and register it with:

```js
window.GameQuestRegistry.registerPack("my-pack", [
  {
    id: "unique_quest_id",
    type: "contract",
    titleKey: "questBoard.entries.unique_quest_id.title",
    descriptionKey: "questBoard.entries.unique_quest_id.description",
    locationKey: "questBoard.locations.safeZone",
    image: "assets/.../image.webp",
    minLevel: 5,
    difficulty: 2,
    rarity: "rare",
    durationHours: 12,
    objectives: [
      {
        id: "kills",
        type: "event",
        event: "enemy:killed",
        target: 8,
        labelKey: "questBoard.entries.unique_quest_id.objectives.kills"
      }
    ],
    rewards: {
      money: 1000,
      xp: 350,
      reputation: 40,
      items: [{ id: "gear_crate", qty: 1 }]
    }
  }
]);
```

Then add the visible text to the matching `i18n/<lang>/quests/*.js` pack. The gameplay data never stores Ukrainian text directly.

## Objective types

### Inventory objective

Progress is read from the player's bag + warehouse automatically:

```js
{ id: "scrap", type: "inventory", itemId: "scrap", target: 10, labelKey: "..." }
```

### Event objective

Other systems report events only for active quests:

```js
window.GameQuests.report("enemy:killed", 1, { location: "redforest" });
```

A quest can restrict the event with `match`:

```js
{
  id: "kills",
  type: "event",
  event: "enemy:killed",
  match: { location: "redforest" },
  target: 8,
  labelKey: "..."
}
```

This keeps quest definitions independent from combat/map code. Future systems only emit events; they do not need to know which quests exist.

## Scaling to 1,000+ quests

- Quest definitions are split into packs instead of one giant file.
- The registry indexes quests by type.
- Only active quests are checked when gameplay events are reported.
- The UI renders at most 40 list cards at once and uses `Показати ще`, so 1,000 registered quests do not create 1,000 DOM cards at once.
- Search/filtering works on data and does not duplicate HTML.
- Quest IDs are validated globally; duplicate IDs throw immediately during startup.
- Translation files can be split into as many packs as needed.

## Save data

Quest state is stored in `GameState.questBoard`:

- `entries` — accepted/completed state and event-objective progress.
- `trackedId` — currently tracked quest.
- `unlocked` — reserved for rumor/NPC/secret quest unlocks.
- `dailyKey` — daily reset marker.
- `factionRep` — Safe Zone reputation.

Old saves remain compatible because the quest state is additive and merged with defaults.

window.GameQuestRegistry.registerPack("signal-story", [
  {
    id: "story_lost_signal",
    type: "story",
    titleKey: "questBoard.entries.story_lost_signal.title",
    descriptionKey: "questBoard.entries.story_lost_signal.description",
    locationKey: "questBoard.locations.yaniv",
    image: "assets/story-locations/yaniv.webp",
    minLevel: 5,
    difficulty: 2,
    rarity: "story",
    objectives: [
      { id: "visit", type: "event", event: "location:visited", match: { location: "yaniv" }, target: 1, labelKey: "questBoard.entries.story_lost_signal.objectives.visit" },
      { id: "signal", type: "event", event: "signal:inspected", target: 1, labelKey: "questBoard.entries.story_lost_signal.objectives.signal" }
    ],
    rewards: { money: 1800, xp: 700, reputation: 70, items: [{ id: "gear_crate", qty: 1 }] }
  },
  {
    id: "story_checkpoint_archive",
    type: "story",
    titleKey: "questBoard.entries.story_checkpoint_archive.title",
    descriptionKey: "questBoard.entries.story_checkpoint_archive.description",
    locationKey: "questBoard.locations.checkpoint",
    image: "assets/story-locations/chnpp_checkpoint_exterior.webp",
    minLevel: 7,
    difficulty: 2,
    rarity: "story",
    objectives: [
      { id: "archive", type: "event", event: "quest:item-found", match: { item: "archive" }, target: 1, labelKey: "questBoard.entries.story_checkpoint_archive.objectives.archive" }
    ],
    rewards: { money: 2200, xp: 850, reputation: 85, items: [{ id: "rare_hide", qty: 2 }] }
  },
  {
    id: "story_1037_trace",
    type: "story",
    titleKey: "questBoard.entries.story_1037_trace.title",
    descriptionKey: "questBoard.entries.story_1037_trace.description",
    locationKey: "questBoard.locations.chnpp",
    image: "assets/story-locations/chnpp.webp",
    minLevel: 10,
    difficulty: 3,
    rarity: "story",
    objectives: [
      { id: "trace", type: "event", event: "signal:trace", target: 3, labelKey: "questBoard.entries.story_1037_trace.objectives.trace" }
    ],
    rewards: { money: 5000, xp: 1800, reputation: 150, items: [{ id: "gear_crate", qty: 2 }] }
  }
]);

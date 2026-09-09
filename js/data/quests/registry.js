(function () {
  const questsById = new Map();
  const idsByType = new Map();
  const packIds = new Set();

  function normalizeType(value) {
    const type = String(value || "contract").trim();
    return ["daily", "contract", "story", "special"].includes(type) ? type : "contract";
  }

  function validateQuest(raw, packId) {
    if (!raw || typeof raw !== "object") throw new Error(`[QuestRegistry] Invalid quest in ${packId}`);
    const id = String(raw.id || "").trim();
    if (!id) throw new Error(`[QuestRegistry] Quest without id in ${packId}`);
    if (questsById.has(id)) throw new Error(`[QuestRegistry] Duplicate quest id: ${id}`);
    if (!Array.isArray(raw.objectives) || !raw.objectives.length) throw new Error(`[QuestRegistry] Quest ${id} has no objectives`);
    raw.objectives.forEach((objective, index) => {
      if (!objective?.id) throw new Error(`[QuestRegistry] Quest ${id} objective #${index + 1} has no id`);
      if (!objective?.type) throw new Error(`[QuestRegistry] Quest ${id} objective ${objective.id} has no type`);
      if (!(Number(objective.target) > 0)) throw new Error(`[QuestRegistry] Quest ${id} objective ${objective.id} has invalid target`);
    });
    return {
      ...raw,
      id,
      type: normalizeType(raw.type),
      packId,
      minLevel: Math.max(1, Number(raw.minLevel) || 1),
      difficulty: Math.max(1, Math.min(3, Number(raw.difficulty) || 1)),
      rarity: raw.rarity || "common",
      rewards: raw.rewards || {},
      tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
      objectives: raw.objectives.map((objective) => ({ ...objective, target: Math.max(1, Number(objective.target) || 1) }))
    };
  }

  function registerPack(packId, quests) {
    packId = String(packId || "pack").trim();
    if (packIds.has(packId)) throw new Error(`[QuestRegistry] Duplicate pack id: ${packId}`);
    if (!Array.isArray(quests)) throw new Error(`[QuestRegistry] Pack ${packId} must be an array`);
    const normalized = quests.map((quest) => validateQuest(quest, packId));
    normalized.forEach((quest) => {
      questsById.set(quest.id, Object.freeze(quest));
      if (!idsByType.has(quest.type)) idsByType.set(quest.type, []);
      idsByType.get(quest.type).push(quest.id);
    });
    packIds.add(packId);
  }

  function get(id) { return questsById.get(String(id || "")) || null; }
  function all() { return Array.from(questsById.values()); }
  function byType(type) { return (idsByType.get(normalizeType(type)) || []).map(get).filter(Boolean); }
  function count() { return questsById.size; }
  function packs() { return Array.from(packIds); }

  window.GameQuestRegistry = { registerPack, get, all, byType, count, packs };
})();

(function () {
  const categories = [];
  const items = new Map();
  const backpacks = new Map();

  function registerCategories(list) {
    for (const category of list || []) {
      if (!category?.id || categories.some((entry) => entry.id === category.id)) continue;
      categories.push(Object.freeze({ ...category }));
    }
  }

  function registerItems(list) {
    for (const item of list || []) {
      if (!item?.id) continue;
      items.set(item.id, Object.freeze({ ...item }));
    }
  }

  function registerBackpacks(list) {
    for (const backpack of list || []) {
      if (!backpack?.id) continue;
      backpacks.set(backpack.id, Object.freeze({ ...backpack }));
    }
  }

  function getItem(id) { return items.get(String(id || "")) || null; }
  function getBackpack(id) { return backpacks.get(String(id || "")) || null; }
  function allItems() { return [...items.values()]; }
  function allBackpacks() { return [...backpacks.values()]; }

  window.GameInventoryData = {
    registerCategories,
    registerItems,
    registerBackpacks,
    getItem,
    getBackpack,
    allItems,
    allBackpacks,
    categories
  };
})();

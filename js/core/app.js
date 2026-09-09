window.addEventListener("DOMContentLoaded", () => {
  window.GameInventory.bootstrapStarterKit();
  window.GameProgression.syncPlayerStats();
  window.GameVitals?.update?.({ silent: true });
  window.GameI18n.applyTranslations();
  window.GameEquipment.renderProfile();
  window.GameHud.render();
  window.GameProfile.bind();
  window.GameProfileEquipmentPicker.bind();
  window.GameInventoryUi.bind();
  window.GameNavigation.bind();
  window.GameBunker?.bind?.();
  window.GameRestRoom.bind();
  window.GameWarehouse?.bind?.();
  window.GameHub.bind();
  window.GameStateStore.save();
});

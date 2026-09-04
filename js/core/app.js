window.addEventListener("DOMContentLoaded", () => {
  window.GameI18n.applyTranslations();
  window.GameHud.render();
  window.GameProfile.bind();
  window.GameNavigation.bind();
  window.GameHub.bind();
});

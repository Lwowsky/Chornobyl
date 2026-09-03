(function () {
  const locale = "uk";

  function resolve(key) {
    return key.split(".").reduce((value, part) => value && value[part], window.I18N?.[locale]);
  }

  function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((node) => {
      const value = resolve(node.dataset.i18n);
      if (typeof value === "string") node.textContent = value;
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      const value = resolve(node.dataset.i18nAriaLabel);
      if (typeof value === "string") node.setAttribute("aria-label", value);
    });

    const title = resolve("meta.title");
    if (title) document.title = title;
  }

  window.GameI18n = { locale, resolve, applyTranslations };
})();

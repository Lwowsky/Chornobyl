(function () {
  const locale = "uk";
  window.I18N = window.I18N || {};
  window.I18N[locale] = window.I18N[locale] || {};

  function merge(target, source) {
    Object.entries(source || {}).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        target[key] = target[key] && typeof target[key] === "object" && !Array.isArray(target[key]) ? target[key] : {};
        merge(target[key], value);
      } else target[key] = value;
    });
    return target;
  }

  function register(lang, chunk) {
    window.I18N[lang] = window.I18N[lang] || {};
    merge(window.I18N[lang], chunk);
  }

  function resolve(key) {
    return String(key || "").split(".").reduce((value, part) => value && value[part], window.I18N?.[locale]);
  }

  function format(key, vars = {}, fallback = "") {
    const template = resolve(key);
    const source = typeof template === "string" ? template : String(fallback || key || "");
    return source.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name) => Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`);
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
    root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const value = resolve(node.dataset.i18nPlaceholder);
      if (typeof value === "string") node.setAttribute("placeholder", value);
    });
    const title = resolve("meta.title");
    if (title) document.title = title;
  }

  window.GameI18n = { locale, register, resolve, format, applyTranslations };
})();

(function () {
  const $ = (id) => document.getElementById(id);

  function t(key, fallback = "", vars = null) {
    if (vars) return window.GameI18n?.format?.(key, vars, fallback) || fallback;
    return window.GameI18n?.resolve?.(key) || fallback;
  }

  function money(value) {
    return `₴ ${Math.max(0, Math.round(Number(value) || 0)).toLocaleString("uk-UA")}`;
  }

  function pct(value, max) {
    return `${Math.max(0, Math.min(100, ((Number(value) || 0) / Math.max(1, Number(max) || 1)) * 100))}%`;
  }

  function isOpen() {
    const modal = $("hospitalModal");
    return Boolean(modal && !modal.hidden);
  }

  function setMessage(key = "", fallback = "", tone = "") {
    const node = $("hospitalMessage");
    if (!node) return;
    node.textContent = key ? t(key, fallback) : "";
    node.dataset.tone = tone;
    node.hidden = !node.textContent;
  }

  function renderStatus() {
    const state = window.GameHospitalRuntime.snapshot();
    const hpValue = $("hospitalHpValue");
    const hpBar = $("hospitalHpBar");
    const radValue = $("hospitalRadiationValue");
    const radBar = $("hospitalRadiationBar");
    const moneyValue = $("hospitalMoney");
    if (hpValue) hpValue.textContent = `${Math.round(state.hp)} / ${Math.round(state.hpMax)}`;
    if (hpBar) hpBar.style.width = pct(state.hp, state.hpMax);
    if (radValue) radValue.textContent = `${Math.round(state.radiation)} / ${Math.round(state.radiationMax)}`;
    if (radBar) radBar.style.width = pct(state.radiation, state.radiationMax);
    if (moneyValue) moneyValue.textContent = money(state.money);
  }

  function serviceLabel(service, quote) {
    if (service.id === "fullHeal") {
      return t("hospital.services.fullHeal.change", "HP: {before} → {after}", {
        before: Math.round(quote.before), after: Math.round(quote.after)
      });
    }
    if (service.id === "partialDecon") {
      return t("hospital.services.partialDecon.change", "{before} → {after}", {
        before: Math.round(quote.before), after: Math.round(quote.after)
      });
    }
    return t("hospital.services.fullDecon.change", "{before} → 0", { before: Math.round(quote.before) });
  }

  function renderServices() {
    const root = $("hospitalServices");
    if (!root) return;
    const services = window.GameHospitalData?.services || [];
    root.innerHTML = services.map((service) => {
      const quote = window.GameHospitalRuntime.quote(service.id);
      const base = service.translationKey;
      const disabled = !quote?.needed || !quote?.affordable;
      let hint = "";
      if (!quote?.needed) hint = t("hospital.states.notNeeded", "Не потрібно");
      else if (!quote?.affordable) hint = t("hospital.states.notEnoughMoney", "Недостатньо грошей");
      const className = service.id === "fullHeal" ? " hospital-service--heal" : " hospital-service--radiation";
      return `<article class="hospital-service${className}" data-hospital-service="${service.id}">
        <div class="hospital-service__icon" aria-hidden="true">${service.icon}</div>
        <div class="hospital-service__copy">
          <h3>${t(`${base}.title`, service.id)}</h3>
          <p>${t(`${base}.description`, "")}</p>
          <strong class="hospital-service__change">${serviceLabel(service, quote)}</strong>
        </div>
        <div class="hospital-service__action">
          <span class="hospital-service__price">${money(quote?.cost || 0)}</span>
          <button type="button" data-hospital-action="${service.id}" ${disabled ? "disabled" : ""}>${t(`${base}.action`, "Виконати")}</button>
          ${hint ? `<small>${hint}</small>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  function render() {
    if (!window.GameHospitalRuntime || !window.GameHospitalData) return;
    renderStatus();
    renderServices();
  }

  function open() {
    const modal = $("hospitalModal");
    if (!modal) return;
    setMessage();
    render();
    modal.hidden = false;
    document.body.classList.add("is-hospital-open");
    requestAnimationFrame(() => $("hospitalClose")?.focus?.());
  }

  function close() {
    const modal = $("hospitalModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("is-hospital-open");
    document.querySelector('[data-hub-point="hospital"]')?.classList.remove("is-active");
  }

  function handleAction(serviceId) {
    const result = window.GameHospitalRuntime.execute(serviceId);
    if (result.ok) {
      setMessage("hospital.messages.success", "Процедуру завершено.", "success");
      render();
      return;
    }
    if (result.reason === "money") setMessage("hospital.messages.money", "Недостатньо грошей.", "error");
    else if (result.reason === "notNeeded") setMessage("hospital.messages.notNeeded", "Ця процедура зараз не потрібна.", "neutral");
    else setMessage("hospital.messages.error", "Не вдалося виконати процедуру.", "error");
    render();
  }

  function bind() {
    $("hospitalClose")?.addEventListener("click", close);
    $("hospitalBackdrop")?.addEventListener("click", close);
    $("hospitalServices")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-hospital-action]");
      if (!button || button.disabled) return;
      handleAction(button.dataset.hospitalAction);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) close();
    });
    window.addEventListener("game:state-changed", () => {
      if (isOpen()) render();
    });
  }

  window.GameHospital = { bind, open, close, render };
})();

(function () {
  function clampPercent(value, max) {
    if (!max) return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setBar(id, value, max) {
    const node = document.getElementById(id);
    if (node) node.style.width = `${clampPercent(value, max)}%`;
  }

  function render() {
    const p = window.GameState.player;

    setText("hudNickname", p.nickname);
    setText("hudLevel", p.level);
    setText("playerLevelBadge", p.level);
    setText("hudXpText", `${p.xp} / ${p.xpNext}`);
    setBar("hudXpBar", p.xp, p.xpNext);

    setText("hpText", `${p.hp}/${p.hpMax}`);
    setBar("hpBar", p.hp, p.hpMax);

    setText("energyText", `${p.energy}/${p.energyMax}`);
    setBar("energyBar", p.energy, p.energyMax);

    setText("radiationText", `${p.radiation}/${p.radiationMax}`);
    setBar("radiationBar", p.radiation, p.radiationMax);

    setText("bagText", `${p.bagWeight}/${p.bagMax} кг`);
    setBar("bagBar", p.bagWeight, p.bagMax);

    setText("moneyText", p.money);
  }

  window.GameHud = { render };
})();

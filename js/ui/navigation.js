(function () {
  function show(screenId) {
    if (screenId !== "inventoryView") window.GameInventoryDetails?.closeMobile?.();
    document.querySelectorAll("[data-game-screen]").forEach((screen) => {
      const active = screen.id === screenId;
      screen.classList.toggle("is-active", active);
      screen.setAttribute("aria-hidden", active ? "false" : "true");
    });
    const shell = document.getElementById("gameApp");
    shell?.classList.toggle("is-inventory-screen", screenId === "inventoryView");
    shell?.classList.toggle("is-bar-casino-screen", screenId === "barCasinoView");
    shell?.classList.toggle("is-rest-room-screen", screenId === "restRoomView");
    shell?.classList.toggle("is-bunker-screen", screenId === "bunkerView");
    if (screenId === "inventoryView") window.GameInventoryUi?.render?.();
    if (screenId === "bunkerView") window.GameBunker?.render?.();
  }

  function routeTo(route) {
    if (route === "world") show("hubScreen");
    else if (route === "inventory") show("inventoryView");
    else if (route === "bunker") show("bunkerView");
    else if (route === "quests") {
      window.GameQuestBoard?.open?.();
      return true;
    } else return false;
    document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("is-active", button.dataset.route === route));
    return true;
  }

  function bind() {
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.getAttribute("aria-disabled") === "true") return;
        routeTo(button.dataset.route);
      });
    });
  }

  window.GameNavigation = { bind, routeTo, show };
})();

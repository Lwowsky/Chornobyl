(function () {
  function bind() {
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.route !== "world") return;
        document.querySelectorAll(".nav-button").forEach((item) => item.classList.toggle("is-active", item === button));
      });
    });
  }

  window.GameNavigation = { bind };
})();

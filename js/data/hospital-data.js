(function () {
  const settings = Object.freeze({
    healCostPerHp: 2,
    healMinimumCost: 100,
    partialRadiationAmount: 25,
    partialRadiationCost: 250,
    fullRadiationCost: 600
  });

  const services = Object.freeze([
    Object.freeze({ id: "fullHeal", kind: "heal", icon: "✚", translationKey: "hospital.services.fullHeal" }),
    Object.freeze({ id: "partialDecon", kind: "radiation-partial", icon: "☢", translationKey: "hospital.services.partialDecon" }),
    Object.freeze({ id: "fullDecon", kind: "radiation-full", icon: "◉", translationKey: "hospital.services.fullDecon" })
  ]);

  window.GameHospitalData = { settings, services };
})();

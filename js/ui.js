function syncHud() {
  const stats=normalizePlayerVitals();

  hpBar.style.width=(state.hp/stats.maxHp*100)+"%";
  radBar.style.width=(state.radiation/stats.maxRadiation*100)+"%";
  energyBar.style.width=(state.energy/stats.maxEnergy*100)+"%";

  hpText.textContent=`${Math.round(state.hp)}/${Math.round(stats.maxHp)}`;
  radText.textContent=`${Math.floor(state.radiation)}/${Math.round(stats.maxRadiation)}`;
  energyText.textContent=`${Math.round(state.energy)}/${Math.round(stats.maxEnergy)}`;
  hpBar.parentElement.dataset.value=hpText.textContent;
  radBar.parentElement.dataset.value=radText.textContent;
  energyBar.parentElement.dataset.value=energyText.textContent;
  moneyText.textContent=state.money;

  const recoveryStatus=typeof recoveryHudStatus==="function"?recoveryHudStatus():null;
  const hpRecoveryText=document.getElementById("hpRecoveryText");
  const energyRecoveryText=document.getElementById("energyRecoveryText");
  const radStatusText=document.getElementById("radStatusText");
  if(hpRecoveryText){
    const full=recoveryStatus?.hpText||"";
    const fullNode=hpRecoveryText.querySelector(".hud-stat-mod-full");
    const compactNode=hpRecoveryText.querySelector(".hud-stat-mod-compact");
    if(fullNode)fullNode.textContent=full;
    if(compactNode)compactNode.textContent=recoveryStatus?.hpBadge||"";
    hpRecoveryText.title=full;
    hpRecoveryText.setAttribute("aria-label",full);
  }
  if(energyRecoveryText){
    const full=recoveryStatus?.energyText||"";
    const fullNode=energyRecoveryText.querySelector(".hud-stat-mod-full");
    const compactNode=energyRecoveryText.querySelector(".hud-stat-mod-compact");
    if(fullNode)fullNode.textContent=full;
    if(compactNode)compactNode.textContent=recoveryStatus?.energyBadge||"";
    energyRecoveryText.title=full;
    energyRecoveryText.setAttribute("aria-label",full);
  }
  if(radStatusText){
    radStatusText.textContent=recoveryStatus?.radiationText||"";
    radStatusText.title=recoveryStatus?.radiationTitle||"";
  }

  if(hpBar?.parentElement){
    hpBar.parentElement.dataset.mobileValue=hpText.textContent;
  }
  if(energyBar?.parentElement){
    energyBar.parentElement.dataset.mobileValue=energyText.textContent;
  }
  if(radBar?.parentElement)radBar.parentElement.dataset.mobileValue=radText.textContent;
  const radiationCard=document.querySelector(".hud-stat-radiation");
  if(radiationCard){
    radiationCard.classList.remove("radiation-medium","radiation-severe","radiation-critical");
    const radiation=Number(state.radiation)||0;
    if(radiation>=90)radiationCard.classList.add("radiation-critical");
    else if(radiation>=75)radiationCard.classList.add("radiation-severe");
    else if(radiation>=50)radiationCard.classList.add("radiation-medium");
    radiationCard.title=recoveryStatus?.radiationTitle||"";
  }

  const bagText=document.getElementById("bagText");
  const bagBar=document.getElementById("bagBar");
  const load=typeof backpackLoadInfo==="function"?backpackLoadInfo():null;
  const weight=load?load.weight:(typeof carriedWeight==="function"?carriedWeight():0);
  const maxWeight=load?load.maxWeight:(stats.maxWeight||40);
  if(bagText)bagText.textContent=`${weight.toFixed(1)}/${maxWeight} ${t("units.kg")}`;
  if(bagBar?.parentElement){
    bagBar.parentElement.dataset.value=bagText?.textContent||"";
    bagBar.parentElement.dataset.mobileValue=bagText?.textContent||"";
  }
  if(bagBar){
    const ratio=weight/maxWeight;
    bagBar.style.width=Math.min(100,ratio*100)+"%";
    bagBar.classList.toggle("overloaded",ratio>1);
  }

  const nick=document.getElementById("hudNickname");
  const level=document.getElementById("hudLevel");
  const xpBar=document.getElementById("hudXpBar");
  const xpText=document.getElementById("hudXpText");

  if(nick)nick.textContent=state.nickname||t("common.defaultNickname");

  const xpProgress=typeof playerXpProgress==="function"
    ?playerXpProgress()
    :{level:state.level||1,current:state.xp||0,required:100};

  if(level)level.textContent=xpProgress.level;
  if(xpText)xpText.textContent=xpProgress.maxed?t("levelSystem.maxLevel"):`${xpProgress.current} / ${xpProgress.required}`;
  if(xpBar)xpBar.style.width=xpProgress.maxed?"100%":Math.min(100,(xpProgress.current/xpProgress.required)*100)+"%";
}
function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>el.classList.remove("show"),1600);
}
function setActiveNav(route) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.route === route);
  });

  if (route && state.hasStarted) {
    state.currentRoute=route;
    state.viewMode="game";
    saveState();
  }
}
function cloneTemplate(id) {
  const node = document.getElementById(id).content.cloneNode(true);
  const screen = document.getElementById("screen");
  screen.replaceChildren(node);
  applyTranslations(screen);
}


function mainMenuSaveLocationLabel(slot){
  if(!slot)return "";
  const stageKey=`storyMap.stages.${slot.storyStage}.name`;
  const stageLabel=t(stageKey);
  const fallbackRegion=t(`regions.${slot.currentRegion}.name`);
  return stageLabel&&stageLabel!==stageKey?stageLabel:fallbackRegion;
}

function mainMenuSaveDate(timestamp){
  if(!timestamp)return "—";
  try{
    return new Date(timestamp).toLocaleString(languageLocale(),{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  }catch{
    return "—";
  }
}

function renderMainMenu() {
  if (state.hasStarted) {
    state.viewMode="menu";
    saveState();
  }

  const screen=document.getElementById("screen");
  document.querySelector(".bottom-nav").style.display="none";
  document.querySelector(".hud").style.display="none";
  setActiveNav("");

  const saves=listSaveSlots();
  const activeSave=saves.find(slot=>slot.active)||saves[0]||null;
  const canContinue=!!activeSave;
  const activeAvatarImage=activeSave&&typeof avatarById==="function"
    ? avatarById(activeSave.activeAvatar)?.image
    : null;
  const activeLocation=canContinue?mainMenuSaveLocationLabel(activeSave):"";
  const lastSave=canContinue?mainMenuSaveDate(activeSave.updatedAt):"—";

  screen.innerHTML=`
    <section class="menu-screen menu-screen-v2 menu-screen-v3">
      <div class="menu-atmosphere"></div>

      <div class="menu-v2-shell menu-v3-shell">
        <header class="menu-v2-brand menu-v3-brand">
          <span class="menu-v3-kicker">${t("mainMenu.kicker")}</span>
          <img class="menu-v2-logo menu-v3-logo" src="assets/the-1037-signal-logo.webp" alt="${t("mainMenu.title")}">
          <p>${t("mainMenu.subtitle")}</p>
        </header>

        <div class="menu-v2-grid menu-v3-grid">
          <section class="menu-v2-actions menu-v3-actions">
            <button id="continueBtn" class="menu-option featured" ${canContinue?"":"disabled"}>
              <span class="menu-icon image-icon"><img src="assets/nav/map.webp" alt=""></span>
              <span class="menu-copy">
                <b>${t("mainMenu.continue")}</b>
                <small>${canContinue?`${activeSave.nickname} · ${activeLocation}`:t("mainMenu.noSave")}</small>
              </span>
              <span class="menu-arrow">›</span>
            </button>

            <div class="menu-v3-secondary-grid">
              <button id="heroesBtn" class="menu-option compact-option">
                <span class="menu-icon image-icon"><img src="assets/nav/profile.webp" alt=""></span>
                <span class="menu-copy">
                  <b>${t("mainMenu.heroes")}</b>
                  <small>${t("mainMenu.heroesHint").replace("{count}",String(saves.length))}</small>
                </span>
              </button>

              <button id="newGameBtn" class="menu-option compact-option" ${saves.length>=MAX_SAVE_SLOTS?"disabled":""}>
                <span class="menu-icon text-icon">＋</span>
                <span class="menu-copy">
                  <b>${t("mainMenu.newGame")}</b>
                  <small>${saves.length>=MAX_SAVE_SLOTS?t("settings.saves.limitReached"):t("mainMenu.newGameHint")}</small>
                </span>
              </button>

              <button id="settingsBtn" class="menu-option compact-option">
                <span class="menu-icon image-icon"><img src="assets/nav/settings.webp" alt=""></span>
                <span class="menu-copy">
                  <b>${t("mainMenu.settings")}</b>
                  <small>${t("mainMenu.settingsHint")}</small>
                </span>
              </button>

              <button id="aboutBtn" class="menu-option compact-option">
                <span class="menu-icon text-icon">i</span>
                <span class="menu-copy">
                  <b>${t("mainMenu.about")}</b>
                  <small>${t("mainMenu.aboutHint")}</small>
                </span>
              </button>
            </div>
          </section>

          <aside class="menu-hero-preview menu-v3-hero ${canContinue?"":"empty"}">
            ${canContinue?`
              <div class="menu-hero-art">${activeAvatarImage?`<img src="${activeAvatarImage}" alt="">`:"☢"}</div>
              <div class="menu-v3-hero-shade"></div>
              <div class="menu-hero-info menu-v3-hero-info">
                <div class="menu-v3-hero-topline">
                  <span>${t("mainMenu.activeHero")}</span>
                  <i>●</i>
                </div>
                <h2>${activeSave.nickname}</h2>
                <div class="menu-v3-hero-chips">
                  <b>${t("profile.level")} ${activeSave.level}</b>
                  <b>${activeLocation}</b>
                  <b>${t("settings.saves.day")} ${activeSave.day}</b>
                </div>
                <small class="menu-v3-last-save">${t("settings.saves.lastSave")}: ${lastSave}</small>
              </div>
            `:`
              <div class="menu-hero-empty-mark">☢</div>
              <h2>${t("mainMenu.noHeroTitle")}</h2>
              <p>${t("mainMenu.noHeroHint")}</p>
            `}
          </aside>
        </div>

        <footer class="menu-v2-footer menu-v3-footer">
          <span>${t("mainMenu.status")}</span>
          <span class="menu-v3-footer-line"></span>
          <b>v${GAME_META.version}</b>
        </footer>
      </div>
    </section>`;

  if(canContinue){
    document.getElementById("continueBtn").onclick=()=>{
      if(activeSave&&!activeSave.active)activateSaveSlot(activeSave.id);
      enterGame();
    };
  }

  document.getElementById("heroesBtn").onclick=()=>renderSettings("saves");
  document.getElementById("newGameBtn").onclick=()=>{
    if(!prepareNewHeroCreation())return renderSettings("saves");
    renderNewGameName();
  };
  document.getElementById("settingsBtn").onclick=()=>renderSettings("main");
  document.getElementById("aboutBtn").onclick=()=>renderSettings("about");
}

const STORY_STEPS = [
  { type:"story", icon:"☢", title:"story.step1Title", text:"story.step1Text" },
  { type:"story", icon:"🗺", title:"story.step2Title", text:"story.step2Text" },
  { type:"story", icon:"⚠", title:"story.step3Title", text:"story.step3Text" },
  { type:"tutorial", icon:"♥", title:"story.tutorialTitle", text:"story.tutorial1" },
  { type:"tutorial", icon:"☢", title:"story.tutorialTitle", text:"story.tutorial2" },
  { type:"tutorial", icon:"⚡", title:"story.tutorialTitle", text:"story.tutorial3" },
  { type:"tutorial", icon:"🗺", title:"story.tutorialTitle", text:"story.tutorial4" },
  { type:"ready", icon:"🚧", title:"story.readyTitle", text:"story.readyText" }
];

function onboardingProgress(active, total) {
  return Array.from({length: total}, (_, i) =>
    `<i class="${i === active ? "active" : i < active ? "done" : ""}"></i>`
  ).join("");
}

function renderOnboardingScreen({
  kicker,
  title,
  description = "",
  body = "",
  step = 0,
  total = 1,
  backLabel = t("newGame.back"),
  nextLabel = t("newGame.next"),
  onBack,
  onNext
}) {
  const screen = document.getElementById("screen");
  document.querySelector(".bottom-nav").style.display = "none";
  document.querySelector(".hud").style.display = "none";

  screen.innerHTML = `
    <section class="onboarding-screen">
      <div class="onboarding-shade"></div>

      <div class="onboarding-shell">
        <img class="onboarding-logo" src="assets/the-1037-signal-logo.webp" alt="${t("mainMenu.title")}">

        <article class="onboarding-card">
          <div class="onboarding-kicker">${kicker}</div>
          <h1>${title}</h1>
          ${description ? `<p class="onboarding-description">${description}</p>` : ""}

          <div class="onboarding-body">${body}</div>

          <div class="onboarding-actions">
            <button id="onboardingBack" class="onboarding-btn secondary">
              <span class="onboarding-arrow">‹</span>
              <b>${backLabel}</b>
              <span></span>
            </button>
            <button id="onboardingNext" class="onboarding-btn primary">
              <span></span>
              <b>${nextLabel}</b>
              <span class="onboarding-arrow">›</span>
            </button>
          </div>

          <div class="onboarding-progress">
            ${onboardingProgress(step, total)}
          </div>
        </article>
      </div>
    </section>`;

  document.getElementById("onboardingBack").onclick = onBack;
  document.getElementById("onboardingNext").onclick = onNext;
}

function renderNewGameName() {
  const body = `
    <input
      id="nicknameInput"
      class="onboarding-input"
      maxlength="20"
      autocomplete="off"
      placeholder="${t("newGame.nicknamePlaceholder")}"
    >

    <div class="onboarding-info-card">
      <div class="onboarding-id-icon" aria-hidden="true">
        <span class="id-head"></span>
        <span class="id-body"></span>
        <i></i><i></i><i></i>
      </div>

      <div>
        <div class="onboarding-info-title">${t("newGame.idCardTitle")}</div>
        <div class="onboarding-info-row">
          <span>${t("newGame.status")}:</span>
          <b>${t("newGame.statusValue")}</b>
        </div>
        <div class="onboarding-info-row">
          <span>${t("newGame.entryPoint")}:</span>
          <b>${t("newGame.entryPointValue")}</b>
        </div>
      </div>
    </div>`;

  const submitNickname = () => {
    const input = document.getElementById("nicknameInput");
    const nickname = input.value.trim();
    if (!nickname) return toast(t("newGame.nicknameRequired"));
    state.nickname = nickname;
    renderStoryStep(0);
  };

  renderOnboardingScreen({
    kicker: `← ${t("newGame.title")} →`,
    title: t("newGame.nicknameTitle"),
    description: t("newGame.nicknameDescription"),
    body,
    step: 0,
    total: STORY_STEPS.length + 1,
    onBack: () => {
      cancelNewHeroCreation();
      renderMainMenu();
    },
    onNext: submitNickname
  });

  const input = document.getElementById("nicknameInput");
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") submitNickname();
  });
  input.focus();
}

function renderStoryStep(index) {
  const data = STORY_STEPS[index];
  const last = index === STORY_STEPS.length - 1;

  const kickerMap = {
    story: t("onboarding.storyLabel"),
    tutorial: t("onboarding.tutorialLabel"),
    ready: t("onboarding.readyLabel")
  };

  const body = `
    <div class="onboarding-story-panel">
      <div class="onboarding-story-icon">${data.icon}</div>
      <div>
        <div class="onboarding-story-meta">${state.nickname} · ${index + 1}/${STORY_STEPS.length}</div>
        <p>${t(data.text)}</p>
      </div>
    </div>`;

  renderOnboardingScreen({
    kicker: `← ${kickerMap[data.type]} →`,
    title: t(data.title),
    body,
    step: index + 1,
    total: STORY_STEPS.length + 1,
    nextLabel: last ? t("newGame.start") : t("newGame.next"),
    onBack: () => index === 0 ? renderNewGameName() : renderStoryStep(index - 1),
    onNext: () => last ? startNewGame() : renderStoryStep(index + 1)
  });
}

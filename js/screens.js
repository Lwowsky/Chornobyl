let questActiveTab="story";
let settingsHeroFlashId="";
let settingsHeroFlashTimer=null;

function renderQuests() {
  cloneTemplate("questsTpl");
  setActiveNav("quests");
  const list=document.getElementById("questList");
  if(!list)return;

  const tabs=document.createElement("div");
  tabs.className="quest-tabs";
  tabs.innerHTML=`
    <button type="button" data-quest-tab="story" class="${questActiveTab==="story"?"active":""}">${t("quests.tabs.story")}</button>
    <button type="button" data-quest-tab="daily" class="${questActiveTab==="daily"?"active":""}">${t("quests.tabs.daily")}</button>`;
  list.before(tabs);
  tabs.querySelectorAll("[data-quest-tab]").forEach(button=>{
    button.onclick=()=>{questActiveTab=button.dataset.questTab||"story";renderQuests();};
  });

  if(questActiveTab==="daily"&&typeof renderDailyQuestsPanel==="function"){
    list.innerHTML=renderDailyQuestsPanel();
    if(typeof bindDailyQuests==="function")bindDailyQuests(list,renderQuests);
    return;
  }

  const storyQuestGroups=[
    {stageId:"dytiatky",data:DYTIATKY_STORY,progress:storyStageProgress("dytiatky")},
    {stageId:"pripyat",data:PRIPYAT_STORY,progress:storyStageProgress("pripyat")},
    {stageId:"redforest",data:RED_FOREST_STORY,progress:storyStageProgress("redforest")},
    {stageId:"yaniv",data:YANIV_STORY,progress:storyStageProgress("yaniv")},
    {stageId:"chnpp",data:STORY_LOCATION_CONTENT.chnpp,progress:storyStageProgress("chnpp")}
  ];

  storyQuestGroups.forEach(({stageId,data,progress})=>{
    const rows=storyQuestRows(stageId,data,progress);
    const submitted=rows.filter(row=>row.claimed).length;
    const section=document.createElement("section");
    section.className="quest-story-section";
    section.innerHTML=`<header class="quest-story-heading"><div><span>${t("storyUi.locationEyebrow")}</span><h2>${storyText(data,"title")}</h2></div><b>${submitted}/${rows.length}</b></header>`;

    rows.forEach(row=>{
      const quest=document.createElement("details");
      quest.className=`quest quest-accordion ${row.claimed?"completed":row.ready?"ready":"active"}`;
      const status=row.claimed?t("quests.submitted"):row.ready?t("quests.ready"):t("quests.active");
      quest.innerHTML=`
        <summary>
          <div class="quest-summary-copy"><h3>${row.label}</h3><p>${storyText(data,"objective")}</p></div>
          <div class="quest-summary-side"><span class="quest-status">${status}</span><i class="quest-chevron">⌄</i></div>
        </summary>
        <div class="quest-body">
          <div class="quest-reward-box"><span>${t("quests.reward")}</span><b>${storyQuestRewardText(row.reward)}</b></div>
          ${row.ready?`<button class="quest-claim-button" data-quest-claim-stage="${stageId}" data-quest-claim-index="${row.index}" type="button">${t("storyUi.submitObjective")}</button>`:""}
          ${row.claimed?`<div class="quest-submitted-note">✓ ${t("quests.rewardReceived")}</div>`:""}
          ${!row.done?`<div class="quest-active-note">${t("quests.completeObjectiveFirst")}</div>`:""}
        </div>`;
      section.appendChild(quest);
    });
    list.appendChild(section);
  });

  list.querySelectorAll("[data-quest-claim-stage]").forEach(button=>{
    button.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      const stageId=button.dataset.questClaimStage;
      const index=Number(button.dataset.questClaimIndex);
      const data=stageId==="dytiatky"?DYTIATKY_STORY
        :stageId==="pripyat"?PRIPYAT_STORY
          :stageId==="redforest"?RED_FOREST_STORY
            :stageId==="yaniv"?YANIV_STORY
              :STORY_LOCATION_CONTENT.chnpp;
      const progress=storyStageProgress(stageId);
      if(claimStoryObjectiveQuest(stageId,data,progress,index))renderQuests();
    };
  });
}




function renderSettings(openSection="main"){
  const openedFromMenu=state.viewMode==="menu"||!state.hasStarted;

  cloneTemplate("settingsTpl");

  if(openedFromMenu){
    document.querySelector(".bottom-nav").style.display="none";
    document.querySelector(".hud").style.display="none";
    setActiveNav("");
  }else{
    setActiveNav("settings");
  }

  const version=document.getElementById("settingsVersion");
  if(version)version.textContent=`v${GAME_META.version}`;

  renderSettingsLanguagePicker();
  renderSettingsSaveSlots();
  renderSettingsPreferences();
  bindSettingsNavigation();

  if(openSection==="faq")openSettingsModal(settingsFaqHtml());
  if(openSection==="about")openSettingsModal(settingsAboutHtml());
}

function renderSettingsLanguagePicker(){
  const button=document.getElementById("languagePickerButton");
  const menu=document.getElementById("languagePickerMenu");
  const name=document.getElementById("languageCurrentName");
  const code=document.getElementById("languageCurrentCode");
  if(!button||!menu||!name||!code)return;

  const labels={
    uk:{nameKey:"settings.languages.uk",code:"UA"},
    en:{nameKey:"settings.languages.en",code:"EN"},
    ru:{nameKey:"settings.languages.ru",code:"RU"},
    ja:{nameKey:"settings.languages.ja",code:"JP"}
  };
  const active=labels[currentLang]||labels.en;
  name.textContent=t(active.nameKey);
  code.textContent=active.code;

  button.onclick=()=>{
    const willOpen=menu.hidden;
    menu.hidden=!willOpen;
    button.setAttribute("aria-expanded",String(willOpen));
  };

  menu.querySelectorAll("[data-language]").forEach(option=>{
    const isActive=option.dataset.language===currentLang;
    option.classList.toggle("active",isActive);
    const marker=option.querySelector("i");
    if(marker)marker.textContent=isActive?"✓":"—";
    option.onclick=()=>{
      if(!setLanguage(option.dataset.language))return;
      menu.hidden=true;
      button.setAttribute("aria-expanded","false");
      renderSettings("main");
      syncHud();
    };
  });
}

function settingsSaveDate(timestamp){
  if(!timestamp)return "—";
  try{
    return new Date(timestamp).toLocaleString(languageLocale(),{
      day:"2-digit",month:"2-digit",year:"numeric",
      hour:"2-digit",minute:"2-digit"
    });
  }catch{
    return "—";
  }
}

function settingsLocationLabel(slot){
  const stageKey=`storyMap.stages.${slot.storyStage}.name`;
  const stageLabel=t(stageKey);
  const fallbackRegion=t(`regions.${slot.currentRegion}.name`);
  return stageLabel&&stageLabel!==stageKey?stageLabel:fallbackRegion;
}

function renderSettingsSaveSlots(){
  const list=document.getElementById("saveSlotList");
  const counter=document.getElementById("saveSlotCount");
  const create=document.getElementById("settingsNewHero");
  const heroBar=document.getElementById("settingsActiveHeroBar");
  if(!list||!counter||!create)return;

  const slots=listSaveSlots();
  counter.textContent=slots.length;

  const activeSlot=slots.find(slot=>slot.active)||slots[0]||null;
  if(heroBar){
    if(activeSlot){
      const locationLabel=settingsLocationLabel(activeSlot);
      heroBar.hidden=false;
      heroBar.innerHTML=`
        <span>${t("settings.saves.selectedHero")}</span>
        <strong>${activeSlot.nickname||t("common.defaultNickname")}</strong>
        <small>${t("profile.level")} ${activeSlot.level} · ${locationLabel} · ${t("settings.saves.day")} ${activeSlot.day}</small>`;
    }else{
      heroBar.hidden=true;
      heroBar.innerHTML="";
    }
  }

  if(!slots.length){
    list.innerHTML=`<div class="save-slot-empty">
      <span>＋</span>
      <b>${t("settings.saves.empty")}</b>
      <small>${t("settings.saves.emptyHint")}</small>
    </div>`;
  }else{
    list.innerHTML=slots.map(slot=>{
      const avatar=typeof avatarById==="function"?avatarById(slot.activeAvatar):null;
      const locationLabel=settingsLocationLabel(slot);
      return `<article class="save-slot ${slot.active?"active":""} ${slot.id===settingsHeroFlashId?"just-switched":""}" data-save-slot="${slot.id}" data-save-select="${slot.id}" tabindex="0" role="button" aria-pressed="${slot.active?"true":"false"}">
        <div class="save-slot-avatar">
          ${avatar?.image?`<img src="${avatar.image}" alt="">`:"<span>☢</span>"}
        </div>

        <div class="save-slot-main">
          <div class="save-slot-title-row">
            <div class="save-slot-title-wrap">
              <div class="save-slot-title">
                <h3>${slot.nickname||t("common.defaultNickname")}</h3>
                ${slot.active?`<span>${t("settings.saves.active")}</span>`:""}
              </div>
              <div class="save-slot-meta">
                <span>${t("profile.level")} <b>${slot.level}</b></span>
                <span class="save-slot-location">${locationLabel}</span>
                <span>${t("settings.saves.day")} <b>${slot.day}</b></span>
              </div>
              <small>${t("settings.saves.lastSave")}: ${settingsSaveDate(slot.updatedAt)}</small>
            </div>
            <div class="save-slot-state ${slot.active?"active":"idle"}">${slot.active?t("settings.saves.currentHero"):t("settings.saves.tapToActivate")}</div>
          </div>
        </div>

        <div class="save-slot-actions">
          <button class="save-slot-play" data-save-play="${slot.id}" type="button">
            ${slot.active?t("settings.saves.continueHero"):t("settings.saves.playHero")}
          </button>
          <button class="save-slot-delete" data-save-delete="${slot.id}" type="button" aria-label="${t("settings.saves.delete")}">×</button>
        </div>
      </article>`;
    }).join("");

    list.querySelectorAll("[data-save-select]").forEach(card=>{
      const selectHero=()=>{
        const id=card.dataset.saveSelect;
        const slot=slots.find(entry=>entry.id===id);
        if(!id||!slot||slot.active)return;
        if(!activateSaveSlot(id))return;
        syncHud();
        settingsHeroFlashId=id;
        if(settingsHeroFlashTimer)clearTimeout(settingsHeroFlashTimer);
        renderSettingsSaveSlots();
        settingsHeroFlashTimer=setTimeout(()=>{
          const activeCard=[...document.querySelectorAll("[data-save-slot]")].find(card=>card.dataset.saveSlot===id);
          if(activeCard)activeCard.classList.remove("just-switched");
          if(settingsHeroFlashId===id)settingsHeroFlashId="";
          settingsHeroFlashTimer=null;
        },850);
        toast(t("settings.saves.heroSwitched",{name:slot.nickname||t("common.defaultNickname")}));
      };

      card.onclick=event=>{
        if(event.target.closest("button"))return;
        selectHero();
      };
      card.onkeydown=event=>{
        if(event.key!=="Enter"&&event.key!==" ")return;
        event.preventDefault();
        selectHero();
      };
    });

    list.querySelectorAll("[data-save-play]").forEach(button=>{
      button.onclick=event=>{
        event.stopPropagation();
        if(!activateSaveSlot(button.dataset.savePlay))return;
        syncHud();
        enterGame();
      };
    });

    list.querySelectorAll("[data-save-delete]").forEach(button=>{
      button.onclick=event=>{
        event.stopPropagation();
        const id=button.dataset.saveDelete;
        const slot=slots.find(entry=>entry.id===id);
        if(!slot)return;
        if(!window.confirm(t("settings.saves.deleteConfirm").replace("{name}",slot.nickname||t("common.defaultNickname"))))return;

        const wasActive=id===activeSaveSlotId();
        if(!deleteSaveSlot(id))return;

        if(wasActive){
          const next=listSaveSlots()[0];
          if(next)activateSaveSlot(next.id);
          else state=normalizeItemInstanceState(structuredClone(initialState));
        }

        renderSettings("saves");
      };
    });
  }

  const full=slots.length>=MAX_SAVE_SLOTS;
  create.disabled=full;
  create.classList.toggle("limit",full);
  create.querySelector("small").textContent=full
    ? t("settings.saves.limitReached")
    : t("settings.saves.newHeroHint");

  create.onclick=()=>{
    if(!prepareNewHeroCreation()){
      toast(t("settings.saves.limitReached"));
      return;
    }
    renderNewGameName();
  };
}

function renderSettingsPreferences(){
  const preferences=typeof readUserPreferences==="function"?readUserPreferences():{textSize:"normal",reducedMotion:false};
  document.querySelectorAll("[data-text-size]").forEach(button=>{
    const active=button.dataset.textSize===preferences.textSize;
    button.classList.toggle("active",active);
    button.onclick=()=>{
      if(typeof setUserTextSize==="function")setUserTextSize(button.dataset.textSize);
      renderSettingsPreferences();
    };
  });

  const motion=document.getElementById("settingsReducedMotion");
  if(motion){
    motion.classList.toggle("active",!!preferences.reducedMotion);
    motion.setAttribute("aria-checked",String(!!preferences.reducedMotion));
    motion.onclick=()=>{
      if(typeof setReducedMotion==="function")setReducedMotion(!readUserPreferences().reducedMotion);
      renderSettingsPreferences();
    };
  }

  const reset=document.getElementById("settingsResetPreferences");
  if(reset)reset.onclick=()=>{
    if(typeof resetUserPreferences==="function")resetUserPreferences();
    renderSettingsPreferences();
    toast(t("settings.interface.resetDone"));
  };

  const exportButton=document.getElementById("settingsExportSaves");
  if(exportButton)exportButton.onclick=()=>{
    if(typeof exportSaveBackup==="function"&&exportSaveBackup())toast(t("settings.backup.exported"));
  };

  const importButton=document.getElementById("settingsImportSaves");
  const importFile=document.getElementById("settingsImportFile");
  if(importButton&&importFile){
    importButton.onclick=()=>importFile.click();
    importFile.onchange=async()=>{
      const file=importFile.files?.[0];
      importFile.value="";
      if(!file)return;
      if(!window.confirm(t("settings.backup.replaceConfirm")))return;
      const result=typeof importSaveBackupFile==="function"?await importSaveBackupFile(file):{ok:false};
      if(!result.ok){toast(t("settings.backup.invalid"));return;}
      syncHud();
      toast(t("settings.backup.imported",{count:result.count||0}));
      renderSettings("main");
    };
  }
}

function settingsFaqHtml(){
  const groups=[
    {
      title:"settings.faq.groups.start",
      items:[
        ["settings.faq.saves.q","settings.faq.saves.a"],
        ["settings.faq.radiation.q","settings.faq.radiation.a"]
      ]
    },
    {
      title:"settings.faq.groups.items",
      items:[
        ["settings.faq.items.q","settings.faq.items.a"],
        ["settings.faq.attributes.q","settings.faq.attributes.a"],
        ["settings.faq.rarityBalance.q","settings.faq.rarityBalance.a"]
      ]
    },
    {
      title:"settings.faq.groups.trade",
      items:[
        ["settings.faq.trade.q","settings.faq.trade.a"],
        ["settings.faq.auction.q","settings.faq.auction.a"]
      ]
    },
    {
      title:"settings.faq.groups.map",
      items:[
        ["settings.faq.power.q","settings.faq.power.a"],
        ["settings.faq.expeditions.q","settings.faq.expeditions.a"],
        ["settings.faq.combatV2.q","settings.faq.combatV2.a"],
        ["settings.faq.recovery.q","settings.faq.recovery.a"],
        ["settings.faq.locations.q","settings.faq.locations.a"]
      ]
    }
  ];

  let first=true;
  return `<div class="settings-modal-head">
      <span class="eyebrow">${t("settings.faq.eyebrow")}</span>
      <h2>${t("settings.faq.title")}</h2>
      <p>${t("settings.faq.description")}</p>
    </div>
    <div class="settings-faq-groups">
      ${groups.map(group=>`<section class="settings-faq-group">
        <h3>${t(group.title)}</h3>
        <div class="settings-faq-list">
          ${group.items.map(([q,a])=>{
            const open=first;
            first=false;
            return `<details ${open?"open":""}>
              <summary>${t(q)}</summary>
              <p>${t(a)}</p>
            </details>`;
          }).join("")}
        </div>
      </section>`).join("")}
    </div>`;
}

function settingsAboutHtml(){
  return `<div class="settings-modal-head settings-about-head">
      <span class="eyebrow">${t("settings.about.eyebrow")}</span>
      <h2>${t("settings.about.title")}</h2>
      <p>${t("settings.about.description")}</p>
    </div>

    <div class="settings-about-card">
      <div class="settings-about-mark">☢</div>
      <div>
        <small>${t("settings.about.authorLabel")}</small>
        <strong>${t("settings.about.author")}</strong>
        <p>${t("settings.about.authorRole")}</p>
      </div>
    </div>

    <div class="settings-about-grid">
      <div><span>${t("settings.about.statusLabel")}</span><b>${t("settings.about.status")}</b></div>
      <div><span>${t("settings.version")}</span><b>v${GAME_META.version}</b></div>
    </div>

    <div class="settings-about-story">
      <h3>${t("settings.about.storyTitle")}</h3>
      <p>${t("settings.about.storyText")}</p>
    </div>`;
}

function openSettingsModal(content){
  const overlay=document.getElementById("settingsOverlay");
  const body=document.getElementById("settingsModalContent");
  const close=document.getElementById("settingsModalClose");
  if(!overlay||!body||!close)return;

  body.innerHTML=content;
  overlay.hidden=false;

  const closeModal=()=>{
    overlay.hidden=true;
    body.innerHTML="";
  };

  close.onclick=closeModal;
  overlay.onclick=event=>{
    if(event.target===overlay)closeModal();
  };
}

function bindSettingsNavigation(){
  const mainMenu=document.getElementById("settingsMainMenuTop");
  const faq=document.getElementById("settingsFaqButton");
  const about=document.getElementById("settingsAboutButton");

  if(mainMenu){
    mainMenu.onclick=()=>{
      if(state.hasStarted){
        state.viewMode="menu";
        saveState();
      }
      renderMainMenu();
    };
  }

  if(faq)faq.onclick=()=>openSettingsModal(settingsFaqHtml());
  if(about)about.onclick=()=>openSettingsModal(settingsAboutHtml());
}

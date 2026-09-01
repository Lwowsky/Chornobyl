function route(name) {
  if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive()&&(name==="world"||name==="storyLocation"||name==="expeditions")){
    if(typeof toast==="function")toast(t("survival.recovery.travelBlocked"));
    if(name!=="tradepost"&&state.currentRoute!=="tradepost")renderTradePost();
    return;
  }
  if (name==="world") renderWorld();
  else if (name==="storyLocation") renderStoryLocation(state.storyStage || "dytiatky");
  else if (name==="inventory") renderInventory();
  else if (name==="expeditions") renderExpeditions();
  else if (name==="quests") renderQuests();
  else if (name==="tradepost") renderTradePost();
  else if (name==="profile") renderProfile();
  else if (name==="settings") renderSettings();
}

document.querySelectorAll("[data-route]").forEach(btn => {
  btn.addEventListener("click", () => route(btn.dataset.route));
});

function applyCombatBalanceMigration(){
  const targetVersion=7;
  const current=Math.max(0,Math.floor(Number(state.balanceMigrationVersion)||0));
  if(current>=targetVersion)return false;

  // v0.22 introduces explicit turn-in rewards for every story objective. Fully
  // claimed legacy stages are marked as already submitted so an old save cannot
  // collect the same story rewards twice. Partial stages keep their new turn-ins.
  const storySets=[
    ["dytiatky",typeof DYTIATKY_STORY!=="undefined"?DYTIATKY_STORY:null],
    ["pripyat",typeof PRIPYAT_STORY!=="undefined"?PRIPYAT_STORY:null],
    ["redforest",typeof RED_FOREST_STORY!=="undefined"?RED_FOREST_STORY:null],
    ["yaniv",typeof YANIV_STORY!=="undefined"?YANIV_STORY:null],
    ["chnpp",typeof STORY_LOCATION_CONTENT!=="undefined"?STORY_LOCATION_CONTENT.chnpp:null]
  ];
  storySets.forEach(([stageId,data])=>{
    if(!data)return;
    const progress=storyStageProgress(stageId);
    if(progress.claimed){
      storyQuestRows(stageId,data,progress).forEach(row=>{progress.questClaims[row.key]=true;});
    }
    // v0.23: protected quest items from already submitted objectives must not
    // remain trapped in legacy saves. Remove them during the one-time migration.
    storyQuestRows(stageId,data,progress).forEach(row=>{
      if(row.claimed)consumeQuestInventoryItems(row.quest);
    });
  });

  if(!state.tradePost||typeof state.tradePost!=="object")state.tradePost={};
  if(!Array.isArray(state.tradePost.fieldContracts))state.tradePost.fieldContracts=[];

  if(current<6){
    const stats=normalizePlayerVitals();
    state.hp=stats.maxHp;
    state.energy=stats.maxEnergy;
    state.protection=stats.maxProtection;
    state.radiation=0;
  }

  // v0.30: starter gifts are guaranteed green +1, including legacy saves.
  if(current<7){
    if(typeof ensureSurvivalState==="function")ensureSurvivalState();
    const starterIds=["combat_knife","basic_dosimeter"];
    const candidates=[
      ...(state.inventory||[]).map(inventoryItemData),
      ...(typeof EQUIPMENT_SLOTS!=="undefined"?EQUIPMENT_SLOTS.map(equippedItem).filter(Boolean):[]),
      ...(Array.isArray(state.storage)&&typeof storageItemData==="function"?state.storage.map(storageItemData).filter(Boolean):[])
    ];
    starterIds.forEach(id=>{
      candidates.filter(item=>item?.id===id).forEach(item=>{
        const progress=ensureItemProgression(item);
        if(progress){
          progress.rarity="uncommon";
          progress.upgradeLevel=1;
          progress.attributes=generateItemAttributes(itemRarityAttributeCount("uncommon"),progress.attributes||[]);
        }
      });
    });
    state.starterKnifeGifted=true;
    const dytiatky=storyStageProgress("dytiatky");
    if(dytiatky.claimed&&!dytiatky.flags?.starterSetGifted&&typeof grantDytiatkyStarterSet==="function")grantDytiatkyStarterSet(dytiatky);
  }

  state.balanceMigrationVersion=targetVersion;
  saveState();
  return true;
}

function restoreAppView(){
  applyTranslations();
  applyCombatBalanceMigration();
  syncHud();
  startSafeRecoverySystem();

  if (!state.hasStarted || state.viewMode==="menu") {
    renderMainMenu();
    return;
  }

  document.querySelector(".bottom-nav").style.display="grid";
  document.querySelector(".hud").style.display="grid";
  route(state.currentRoute || "world");
}

restoreAppView();

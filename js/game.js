function startNewGame() {
  const nickname = state.nickname || t("common.defaultNickname");
  state = normalizeItemInstanceState(structuredClone(initialState));
  state.nickname = nickname;
  state.hasStarted = true;
  state.currentRoute = "world";
  state.viewMode = "game";
  if(typeof grantStarterKnifeGift==="function")grantStarterKnifeGift();
  saveState();
  syncHud();
  enterGame();
  setTimeout(()=>{if(typeof toast==="function")toast(t("survival.gifts.knife"));},150);
}

function enterGame() {
  document.querySelector(".bottom-nav").style.display = "grid";
  document.querySelector(".hud").style.display = "grid";
  state.viewMode="game";
  saveState();
  syncHud();
  route(state.currentRoute || "world");
}


function formatGameClock() {
  const minutes = Math.max(0, state.gameMinutes || 0);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}


const STORY_MAP_STAGES = [
  {
    id:"dytiatky", number:1, icon:"⌂", x:50, y:88, status:"current",
    nameKey:"storyMap.stages.dytiatky.name",
    questKey:"storyMap.stages.dytiatky.quest",
    descriptionKey:"storyMap.stages.dytiatky.description",
    objectiveKey:"storyMap.stages.dytiatky.objective",
    rewardKey:"storyMap.stages.dytiatky.reward"
  },
  {
    id:"pripyat", number:2, icon:"▥", x:50, y:65, status:"available",
    nameKey:"storyMap.stages.pripyat.name",
    questKey:"storyMap.stages.pripyat.quest",
    descriptionKey:"storyMap.stages.pripyat.description",
    objectiveKey:"storyMap.stages.pripyat.objective",
    rewardKey:"storyMap.stages.pripyat.reward"
  },
  {
    id:"redforest", number:3, icon:"♠", x:29, y:43, status:"available",
    nameKey:"storyMap.stages.redforest.name",
    questKey:"storyMap.stages.redforest.quest",
    descriptionKey:"storyMap.stages.redforest.description",
    objectiveKey:"storyMap.stages.redforest.objective",
    rewardKey:"storyMap.stages.redforest.reward"
  },
  {
    id:"yaniv", number:4, icon:"▤", x:72, y:44, status:"available",
    nameKey:"storyMap.stages.yaniv.name",
    questKey:"storyMap.stages.yaniv.quest",
    descriptionKey:"storyMap.stages.yaniv.description",
    objectiveKey:"storyMap.stages.yaniv.objective",
    rewardKey:"storyMap.stages.yaniv.reward"
  },
  {
    id:"chnpp", number:5, icon:"☢", x:51, y:13, status:"available",
    nameKey:"storyMap.stages.chnpp.name",
    questKey:"storyMap.stages.chnpp.quest",
    descriptionKey:"storyMap.stages.chnpp.description",
    objectiveKey:"storyMap.stages.chnpp.objective",
    rewardKey:"storyMap.stages.chnpp.reward"
  }
];

function storyText(source, field, fallback=""){
  const key=source?.[`${field}Key`];
  if(key){
    const translated=t(key);
    if(translated!==key)return translated;
  }
  const value=source?.[field];
  return value==null?fallback:value;
}

function storyMapStageStatus(stageId){
  const index=STORY_MAP_STAGES.findIndex(stage=>stage.id===stageId);
  if(index<0)return "locked";
  const progress=storyStageProgress(stageId);
  if(progress.completed)return "completed";
  if(index===0)return "current";
  const previous=STORY_MAP_STAGES[index-1];
  return storyStageProgress(previous.id).completed?"current":"locked";
}

function storyMapRouteSvg(){
  return `
    <path class="route-open" d="M500 1320 C500 1160 500 1080 500 975"/>
    <path class="route-open" d="M500 975 C430 850 360 745 290 645"/>
    <path class="route-open" d="M500 975 C590 850 660 750 720 660"/>
    <path class="route-open" d="M290 645 C370 470 440 320 510 195"/>
    <path class="route-open" d="M720 660 C650 470 590 330 510 195"/>
  `;
}

function renderWorld() {
  cloneTemplate("worldTpl");
  setActiveNav("world");

  const map=document.getElementById("worldMap");
  const details=document.getElementById("mapDetails");
  const headerTitle=document.querySelector(".zone-map-header h1");
  const headerTime=document.querySelector(".zone-map-time");
  const paths=map.querySelector(".zone-routes");

  headerTitle.textContent=t("world.title");
  headerTime.textContent=`${t("world.day")} ${state.day||1} · ${formatGameClock()}`;
  map.classList.add("story-zone-map");
  if(paths)paths.innerHTML=storyMapRouteSvg();

  STORY_MAP_STAGES.forEach(stage=>{
    const btn=document.createElement("button");
    btn.type="button";
    const progress=storyStageProgress(stage.id);
    const stageStatus=storyMapStageStatus(stage.id);
    btn.className=`zone-map-node story-node ${progress.completed?"completed":stageStatus}`;
    btn.dataset.storyStage=stage.id;
    btn.style.left=`${stage.x}%`;
    btn.style.top=`${stage.y}%`;
    btn.innerHTML=`
      <span class="zone-node-ring"><span class="zone-node-icon">${stageStatus==="locked"?"🔒":progress.completed?"✓":stage.number}</span></span>
      <span class="zone-node-label">${storyText(stage,"name")}</span>`;
    btn.onclick=()=>selectStoryStage(stage.id);
    map.appendChild(btn);
  });

  function selectStoryStage(stageId){
    const stage=STORY_MAP_STAGES.find(item=>item.id===stageId)||STORY_MAP_STAGES[0];
    const stageStatus=storyMapStageStatus(stage.id);
    map.querySelectorAll(".story-node").forEach(node=>node.classList.toggle("selected",node.dataset.storyStage===stage.id));

    details.innerHTML=`
      <div class="story-quests-head">
        <div><span>${t("storyUi.storyLine")}</span><h2>${t("storyUi.quests")}</h2></div>
        <b>${stage.number}/5</b>
      </div>
      <div class="story-quest-list">
        ${STORY_MAP_STAGES.map(item=>{
          const itemProgress=storyStageProgress(item.id);
          const itemStatus=storyMapStageStatus(item.id);
          return `
          <button class="story-quest-card ${item.id===stage.id?"active":""} ${itemProgress.completed?"completed":itemStatus}" data-story-quest="${item.id}" type="button">
            <span class="story-quest-number">${itemProgress.completed?"✓":itemStatus==="locked"?"🔒":item.number}</span>
            <span class="story-quest-copy"><b>${storyText(item,"quest")}</b><small>${storyText(item,"name")}</small></span>
            <i>${item.id===stage.id?"›":""}</i>
          </button>`;
        }).join("")}
      </div>
      <section class="story-quest-detail">
        <div class="story-quest-kicker">${stageStatus==="locked"?t("storyUi.blocked"):stageStatus==="current"?t("storyUi.currentTask"):t("storyUi.availableTask")}</div>
        <h3>${storyText(stage,"quest")}</h3>
        <p>${storyText(stage,"description")}</p>
        <div class="story-objective"><span>${t("storyUi.objective")}</span><b>${storyText(stage,"objective")}</b></div>
        <div class="story-objective"><span>${t("storyUi.reward")}</span><b>${storyText(stage,"reward")}</b></div>
        <button id="storyEnterBtn" class="story-enter-btn" type="button" ${stageStatus==="locked"?"disabled":""}>${stageStatus==="locked"?t("storyUi.pathClosed"):t("storyUi.enterLocation")}</button>
      </section>`;

    details.querySelectorAll("[data-story-quest]").forEach(card=>{
      card.onclick=()=>selectStoryStage(card.dataset.storyQuest);
    });
    const enter=details.querySelector("#storyEnterBtn");
    if(enter&&!enter.disabled)enter.onclick=()=>{
      if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive()){toast(t("survival.recovery.travelBlocked"));return;}
      if(typeof canTravelWithBackpack==="function"&&!canTravelWithBackpack())return;
      if(typeof applyStoryRadiationExposure==="function")applyStoryRadiationExposure(stage.id,"travel");
      renderStoryLocation(stage.id);
    };
  }

  selectStoryStage(state.storyStage&&STORY_MAP_STAGES.some(item=>item.id===state.storyStage)?state.storyStage:"dytiatky");
}


function storyProgress(){
  if(!state.storyProgress||typeof state.storyProgress!=="object")state.storyProgress={};
  return state.storyProgress;
}

function storyStageProgress(stageId){
  const all=storyProgress();
  if(!all[stageId]||typeof all[stageId]!=="object")all[stageId]={};
  const progress=all[stageId];
  if(!Array.isArray(progress.found))progress.found=[];
  if(!progress.flags||typeof progress.flags!=="object")progress.flags={};
  if(!progress.questClaims||typeof progress.questClaims!=="object")progress.questClaims={};
  if(!progress.flags.sceneEncountersDefeated||typeof progress.flags.sceneEncountersDefeated!=="object")progress.flags.sceneEncountersDefeated={};
  progress.completed=!!progress.completed;
  progress.claimed=!!progress.claimed;
  if(typeof progress.currentScene!=="string")progress.currentScene="main";
  if(!Number.isInteger(progress.currentIndex))progress.currentIndex=0;
  return progress;
}


let storyIntroTimer=null;

function storyIntroRegistry(progress){
  if(!progress.flags||typeof progress.flags!=="object")progress.flags={};
  if(!progress.flags.introsSeen||typeof progress.flags.introsSeen!=="object")progress.flags.introsSeen={};
  return progress.flags.introsSeen;
}

function stopStoryIntroTyping(){
  if(storyIntroTimer!==null){
    clearTimeout(storyIntroTimer);
    storyIntroTimer=null;
  }
}

function ensureStoryBattleNarrativeModal(){
  let modal=document.getElementById("storyBattleNarrativeModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="storyBattleNarrativeModal";
  modal.className="story-intro-modal story-battle-narrative-modal";
  modal.hidden=true;
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-labelledby","storyBattleNarrativeTitle");
  modal.innerHTML=`<div class="story-intro-card story-battle-narrative-card">
    <div class="story-intro-topline">
      <span id="storyBattleNarrativeKicker" class="story-intro-kicker"></span>
      <span id="storyBattleNarrativeProgress" class="story-intro-progress"></span>
    </div>
    <h2 id="storyBattleNarrativeTitle"></h2>
    <div class="story-intro-divider"></div>
    <p id="storyBattleNarrativeText" class="story-intro-text"></p>
    <div class="story-intro-actions">
      <button id="storyBattleNarrativeNext" class="story-intro-next" type="button"></button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  return modal;
}

function showStoryBattleNarrative(options={}){
  const message=String(options.text||"").trim();
  if(!message)return false;

  const modal=ensureStoryBattleNarrativeModal();
  const title=modal.querySelector("#storyBattleNarrativeTitle");
  const text=modal.querySelector("#storyBattleNarrativeText");
  const kicker=modal.querySelector("#storyBattleNarrativeKicker");
  const counter=modal.querySelector("#storyBattleNarrativeProgress");
  const next=modal.querySelector("#storyBattleNarrativeNext");
  if(!title||!text||!kicker||!counter||!next)return false;

  stopStoryIntroTyping();
  kicker.textContent=t("storyIntro.ui.afterBattle");
  counter.textContent=t("storyIntro.ui.page",{current:1,total:1});
  title.textContent=String(options.title||t("storyIntro.ui.afterBattle"));
  next.textContent=t("storyIntro.ui.next");

  const characters=[...message];
  let index=0;
  let typing=true;
  text.textContent="";
  text.scrollTop=0;
  text.classList.add("typing");

  function finishTyping(){
    if(!typing)return;
    stopStoryIntroTyping();
    typing=false;
    text.classList.remove("typing");
    text.textContent=message;
    text.scrollTop=0;
  }

  function typeNext(){
    if(!typing)return;
    if(index>=characters.length){
      typing=false;
      storyIntroTimer=null;
      text.classList.remove("typing");
      return;
    }
    text.textContent+=characters[index++];
    storyIntroTimer=setTimeout(typeNext,12);
  }

  function closeModal(){
    finishTyping();
    modal.hidden=true;
    document.body.classList.remove("story-battle-narrative-open");
    if(typeof options.onClose==="function")options.onClose();
  }

  next.onclick=()=>{
    if(typing){
      finishTyping();
      return;
    }
    closeModal();
  };

  modal.hidden=false;
  document.body.classList.add("story-battle-narrative-open");
  typeNext();
  next.focus({preventScroll:true});
  return true;
}

function showStorySceneIntro(stageId,scene,progress,options={}){
  const introKey=scene?.introKey;
  if(!introKey)return false;
  const seen=storyIntroRegistry(progress);
  const introSceneId=options.sceneId||progress.currentScene;
  const seenKey=`${stageId}:${introSceneId}`;
  const force=options.force===true;
  const replay=options.replay===true;
  if(seen[seenKey]&&!force)return false;
  const pages=t(introKey);
  if(!Array.isArray(pages)||pages.length===0)return false;

  const modal=document.getElementById("storyIntroModal");
  const title=document.getElementById("storyIntroTitle");
  const text=document.getElementById("storyIntroText");
  const kicker=document.getElementById("storyIntroKicker");
  const counter=document.getElementById("storyIntroProgress");
  const next=document.getElementById("storyIntroNext");
  if(!modal||!title||!text||!kicker||!counter||!next)return false;

  let pageIndex=0;
  let typing=false;
  let fullText="";
  let characters=[];
  let typedIndex=0;

  function finishTyping(){
    if(!typing)return;
    stopStoryIntroTyping();
    typing=false;
    text.classList.remove("typing");
    text.textContent=fullText;
    text.scrollTop=0;
  }

  function typeNextCharacter(){
    if(!typing)return;
    if(typedIndex>=characters.length){
      typing=false;
      storyIntroTimer=null;
      text.classList.remove("typing");
      return;
    }
    text.textContent+=characters[typedIndex++];
    storyIntroTimer=setTimeout(typeNextCharacter,12);
  }

  function renderIntroPage(){
    stopStoryIntroTyping();
    const page=pages[pageIndex]||{};
    kicker.textContent=options.kickerKey?t(options.kickerKey):t(replay?"storyIntro.ui.replayMode":"storyIntro.ui.firstVisit");
    counter.textContent=t("storyIntro.ui.page",{current:pageIndex+1,total:pages.length});
    title.textContent=page.title||storyText(scene,"title");
    fullText=String(page.text||"");
    characters=[...fullText];
    typedIndex=0;
    text.textContent="";
    text.scrollTop=0;
    text.classList.add("typing");
    typing=true;
    next.textContent=pageIndex===pages.length-1
      ?t(options.finalLabelKey||(replay?"storyIntro.ui.closeReplay":"storyIntro.ui.start"))
      :t("storyIntro.ui.next");
    typeNextCharacter();
  }

  function closeIntro(){
    finishTyping();
    seen[seenKey]=true;
    saveState();
    modal.hidden=true;
    document.body.classList.remove("story-intro-open");
    const replayButton=document.getElementById("storyReplayIntroBtn");
    if(replayButton&&!replayButton.hidden)replayButton.focus({preventScroll:true});
    else{
      const firstAction=document.querySelector("#storyInteractionLayer button:not(:disabled)");
      if(firstAction)firstAction.focus({preventScroll:true});
    }
    if(typeof options.onClose==="function")options.onClose();
  }

  next.onclick=()=>{
    if(typing){
      finishTyping();
      return;
    }
    if(pageIndex<pages.length-1){
      pageIndex+=1;
      renderIntroPage();
      return;
    }
    closeIntro();
  };

  modal.hidden=false;
  document.body.classList.add("story-intro-open");
  renderIntroPage();
  next.focus({preventScroll:true});
  return true;
}

function storyIntroSource(data,sceneId){
  if(!data?.scenes||Array.isArray(data.scenes))return null;
  const visited=new Set();
  let currentId=sceneId;
  while(currentId&&!visited.has(currentId)){
    visited.add(currentId);
    const currentScene=data.scenes[currentId];
    if(!currentScene)return null;
    if(currentScene.introKey)return {scene:currentScene,sceneId:currentId};
    currentId=currentScene.parent||"";
  }
  return null;
}

function bindStoryIntroReplay(stageId,data,progress){
  const button=document.getElementById("storyReplayIntroBtn");
  if(!button)return;
  const source=storyIntroSource(data,progress.currentScene);
  const pages=source?.scene?.introKey?t(source.scene.introKey):null;
  button.hidden=!source||!Array.isArray(pages)||pages.length===0;
  button.onclick=button.hidden?null:()=>showStorySceneIntro(
    stageId,
    source.scene,
    progress,
    {force:true,replay:true,sceneId:source.sceneId}
  );
}

function showChnppBossAftermath(progress,options={}){
  if(!progress||!storyHas(progress,"chnpp_final_boss")||storyHas(progress,"chnpp_core_module_1037"))return false;
  return showStorySceneIntro(
    "chnpp",
    {introKey:"storyIntro.chnpp.afterBoss",titleKey:"storyLocations.chnpp.scenes.systemCore.title"},
    progress,
    {
      sceneId:"boss_aftermath",
      kickerKey:"storyIntro.ui.afterBattle",
      finalLabelKey:"storyIntro.ui.takeCore",
      onClose:options.onClose
    }
  );
}

function showChnppEnding(progress,options={}){
  if(!progress?.claimed)return false;
  return showStorySceneIntro(
    "chnpp",
    {introKey:"storyIntro.chnpp.ending",titleKey:"storyLocations.chnpp.title"},
    progress,
    {
      sceneId:"ending",
      kickerKey:"storyIntro.ui.epilogue",
      finalLabelKey:"storyIntro.ui.returnToZone",
      onClose:options.onClose
    }
  );
}

const STORY_LOCATION_CONTENT = { chnpp: CHNPP_STORY };

function storyHas(progress,id){return progress.found.includes(id);}
function storyPortraitBox(box){return box;}
function storyPortraitPoint(point){return point;}
function storyRequirementsMet(progress,requirements=[]){return requirements.every(id=>storyHas(progress,id));}

// v0.22: small story objectives are rewarded only when the player explicitly
// turns them in. The values below are calibrated so a new hero who completes
// Dytjatky + Pripyat + Red Forest + Yaniv and defeats every one-time story
// encounter reaches level 15 exactly at the entrance to ChNPP (4585 total XP).
const STORY_QUEST_REWARDS = Object.freeze({
  dytiatky:Object.freeze({xp:35,money:15,material:"mutant_hide",qty:2}),
  pripyat:Object.freeze({xp:55,money:25,material:"uncommon_hide",qty:1}),
  redforest:Object.freeze({xp:70,money:35,material:"rare_hide",qty:1}),
  yaniv:Object.freeze({xp:100,money:50,material:"epic_hide",qty:1}),
  chnpp:Object.freeze({xp:130,money:70,material:"epic_hide",qty:2})
});

const STORY_ENCOUNTER_XP = Object.freeze({
  1:20,2:25,3:30,4:35,5:40,6:45,7:50,8:55,9:60,10:65
});

const STORY_SCENE_ENCOUNTERS = Object.freeze({
  dytiatky:Object.freeze({
    guard:Object.freeze({type:"raiders",level:1}),
    car:Object.freeze({type:"warehouse",level:2})
  }),
  pripyat:Object.freeze({
    school_corridor:Object.freeze({type:"raiders",level:3}),
    hotel_lobby:Object.freeze({type:"raiders",level:3}),
    residential:Object.freeze({type:"mutants",level:3}),
    department_interior:Object.freeze({type:"warehouse",level:3}),
    cinema_interior:Object.freeze({type:"mutants",level:4}),
    bus_interior:Object.freeze({type:"raiders",level:4}),
    hospital_interior:Object.freeze({type:"hospital",level:4})
  }),
  yaniv:Object.freeze({
    checkpoint_inside:Object.freeze({type:"raiders",level:7}),
    waiting_hall:Object.freeze({type:"mutants",level:7}),
    dispatcher_inside:Object.freeze({type:"bunker",level:7}),
    cargo_wagon:Object.freeze({type:"warehouse",level:8}),
    electrical_inside:Object.freeze({type:"laboratory",level:8}),
    service_post_inside:Object.freeze({type:"raiders",level:8})
  }),
  chnpp:Object.freeze({
    checkpoint_interior:Object.freeze({type:"raiders",level:9}),
    admin_office:Object.freeze({type:"raiders",level:9}),
    machine_hall:Object.freeze({type:"warehouse",level:9}),
    electrical_switchgear:Object.freeze({type:"laboratory",level:9}),
    control_main:Object.freeze({type:"laboratory",level:10}),
    sarcophagus_service:Object.freeze({type:"mutants",level:10}),
    underreactor_corridor:Object.freeze({type:"bunker",level:10}),
    object_server_lab:Object.freeze({type:"laboratory",level:10})
  })
});

let storyEncounterSkipOnce="";

function storyCombatXp(battle){
  const level=clamp(Math.floor(Number(battle?.level)||1),1,10);
  const base=STORY_ENCOUNTER_XP[level]||20;
  return battle?.boss?base*2:base;
}

function storyEncounterMaterial(level){
  const current=clamp(Math.floor(Number(level)||1),1,10);
  if(current<=2)return {id:"mutant_hide",qty:2};
  if(current<=4)return {id:"uncommon_hide",qty:1};
  if(current<=6)return {id:"rare_hide",qty:1};
  if(current<=8)return {id:"epic_hide",qty:1};
  return {id:"epic_hide",qty:2};
}

function grantStoryEncounterRewards(stageId,battle,expedition){
  const level=clamp(Math.floor(Number(battle?.level)||1),1,10);
  const boss=!!battle?.boss;
  const rewards=[];
  const xp=storyCombatXp({level,boss});
  if(typeof addPlayerXp==="function"){
    const gained=addPlayerXp(xp,{notify:true}).gained;
    if(gained)rewards.push({special:"xp",xp:gained});
  }
  const money=(8+level*4)*(boss?2:1);
  state.money=(Number(state.money)||0)+money;
  rewards.push({special:"money",money});
  const material=storyEncounterMaterial(level);
  addStoryLoot(material.id,material.qty*(boss?2:1));
  rewards.push({id:material.id,qty:material.qty*(boss?2:1)});

  // A first story kill can also surprise the player with equipment, but the
  // guaranteed reward remains crafting material + money. Bosses have a better chance.
  if(typeof maybeGrantExpeditionEquipment==="function"&&Math.random()*100<(boss?60:14)){
    const equipment=addExpeditionEquipment(expeditionEquipmentRarity(level));
    if(equipment)rewards.push({id:equipment.id,qty:1,equipment:true,rarity:equipment.expeditionRarity,instanceId:equipment.instanceId});
  }
  return rewards;
}

function storyQuestEquipmentRarity(reward){
  let rarity=reward?.equipmentRarity||null;
  if(rarity==="uncommon"&&Number(reward?.equipmentRareChance)>0&&Math.random()*100<Number(reward.equipmentRareChance))rarity="rare";
  return rarity;
}

function addStoryLoot(itemId,qty=1){
  if(!itemId||typeof addItem!=="function")return null;
  if(typeof inventoryCatalogItem==="function"&&!inventoryCatalogItem(itemId))return null;
  addItem(itemId,qty);
  return typeof inventoryItem==="function"?inventoryItem(itemId):null;
}

function addStoryLootEntry(entry){
  if(!entry?.id)return null;
  const catalog=typeof inventoryCatalogItem==="function"?inventoryCatalogItem(entry.id):null;
  if(!catalog)return null;
  const qty=Math.max(1,Math.floor(Number(entry.qty)||1));
  if(catalog.type==="equipment"&&entry.rarity&&typeof addEquipmentInstance==="function"){
    let last=null;
    for(let index=0;index<qty;index+=1)last=addEquipmentInstance(entry.id,entry.rarity,{upgradeLevel:entry.upgradeLevel||1});
    return last;
  }
  return addStoryLoot(entry.id,qty);
}
function storyItemName(itemId){
  return typeof rewardItemTitle==="function"
    ? rewardItemTitle(itemId,String(itemId||t("common.zoneReward")))
    : String(itemId||t("common.zoneReward"));
}

const STORY_DISCOVERY_INFO = Object.freeze({
  guard_log:{titleKey:"storyDiscoveries.guardLog.title",icon:'<img src="assets/inventory-items/quest_document.webp" alt="">',descriptionKey:"storyDiscoveries.guardLog.description"},
  gate_key:{titleKey:"storyDiscoveries.gateKey.title",icon:'<img src="assets/inventory-items/quest_key.webp" alt="">',descriptionKey:"storyDiscoveries.gateKey.description"},
  route_map:{titleKey:"storyDiscoveries.routeMap.title",icon:'<img src="assets/inventory-items/quest_plan.webp" alt="">',descriptionKey:"storyDiscoveries.routeMap.description"},
  radio_frequency:{titleKey:"storyDiscoveries.radioFrequency.title",icon:'<img src="assets/inventory-items/quest_tape.webp" alt="">',descriptionKey:"storyDiscoveries.radioFrequency.description"},
  vehicle_pass:{titleKey:"storyDiscoveries.vehiclePass.title",icon:'<img src="assets/inventory-items/quest_document.webp" alt="">',descriptionKey:"storyDiscoveries.vehiclePass.description"},
  signal_photo:{titleKey:"storyDiscoveries.signalPhoto.title",icon:'<img src="assets/inventory-items/quest_document.webp" alt="">',descriptionKey:"storyDiscoveries.signalPhoto.description"},
  barrel_diary:{titleKey:"storyDiscoveries.barrelDiary.title",icon:'<img src="assets/inventory-items/quest_document.webp" alt="">',descriptionKey:"storyDiscoveries.barrelDiary.description"},
  barrel_zone_map:{titleKey:"storyDiscoveries.barrelZoneMap.title",icon:'<img src="assets/inventory-items/quest_plan.webp" alt="">',descriptionKey:"storyDiscoveries.barrelZoneMap.description"},
  barrel_flashlight_broken:{titleKey:"storyDiscoveries.brokenFlashlight.title",icon:'<img src="assets/inventory-items/item_flashlight.webp" alt="">',descriptionKey:"storyDiscoveries.brokenFlashlight.description"}
});

function storyDiscoveryData(area){
  const lootId=area.loot?.[0]?.id;
  if(lootId){
    const catalog=typeof inventoryCatalogItem==="function"?inventoryCatalogItem(lootId):null;
    const descKey=`itemDescriptions.${lootId}`;
    const translated=typeof t==="function"?t(descKey):descKey;
    const fallbackDescription=translated&&translated!==descKey?translated:storyText(area,"message",t("storyUi.foundUsefulItem"));
    return {
      itemId:lootId,
      title:storyText(area,"title",storyItemName(lootId)),
      icon:(catalog?.profileIcon?`<img src="${catalog.profileIcon}" alt="">`:(area.icon||(catalog?.icon||"◆"))),
      description:storyText(area,"description",fallbackDescription),
      meta:catalog?.type==="equipment"
        ?t("storyUi.equipmentSlot",{slot:catalog.slot})
        :t("storyUi.category",{category:(catalog?.category?((typeof t==="function"?t(`inventory.categories.${catalog.category}`):catalog.category)||catalog.category):t("storyUi.discovery"))})
    };
  }
  const info=STORY_DISCOVERY_INFO[area.id]||{};
  return {
    itemId:null,
    title:storyText(area,"title",storyText(info,"title",t("storyUi.discovery"))),
    icon:area.icon||info.icon||"✓",
    description:storyText(area,"description",storyText(area,"message",storyText(info,"description",t("storyUi.foundImportant")))),
    meta:t("storyUi.storyDiscovery")
  };
}

function latestInventoryKeyById(itemId){
  if(!itemId||!Array.isArray(state.inventory))return null;
  for(let i=state.inventory.length-1;i>=0;i--){
    const entry=state.inventory[i];
    if(entry?.id===itemId)return typeof inventoryEntryKey==="function"?inventoryEntryKey(entry):(entry.instanceId||entry.id);
  }
  return null;
}

function showStoryItemModal(area){
  const modal=document.getElementById("storyItemModal");
  if(!modal)return;
  const info=storyDiscoveryData(area);
  document.getElementById("storyItemIcon").innerHTML=info.icon;
  document.getElementById("storyItemTitle").textContent=info.title;
  document.getElementById("storyItemDescription").textContent=info.description;
  document.getElementById("storyItemMeta").textContent=info.meta;
  const equip=document.getElementById("storyItemEquip");
  const close=document.getElementById("storyItemClose");
  equip.hidden=true;
  equip.onclick=null;
  if(info.itemId){
    const catalog=typeof inventoryCatalogItem==="function"?inventoryCatalogItem(info.itemId):null;
    if(catalog&&typeof isEquipableItem==="function"&&isEquipableItem(catalog)){
      const latestKey=latestInventoryKeyById(info.itemId);
      const latest=latestKey?inventoryItemData(inventoryEntryByKey(latestKey)):null;
      if(latest&&typeof itemRarity==="function"){
        const rarity=itemRarity(latest);
        document.getElementById("storyItemMeta").textContent=`${t(rarity.labelKey)} +${itemUpgradeLevel(latest)} · ${t("storyUi.equipmentSlot",{slot:catalog.slot})}`;
      }
      equip.hidden=false;
      equip.textContent=catalog.slot==="dosimeter"?t("storyUi.equipDosimeter"):t("storyUi.equip");
      equip.onclick=()=>{
        const key=latestInventoryKeyById(info.itemId);
        if(key&&typeof equipItem==="function"&&equipItem(key)){
          document.getElementById("storyItemMeta").textContent=t("storyUi.equipped");
          equip.hidden=true;
        }
      };
    }
  }
  close.onclick=()=>{modal.hidden=true;};
  modal.hidden=false;
}

function storyQuestKey(stageId,quest,index){
  const requirements=Array.isArray(quest?.requirements)?quest.requirements.filter(Boolean):[];
  if(quest?.id)return String(quest.id);
  if(requirements.length)return requirements.join("+");
  return `${stageId}:q${index+1}`;
}

function storyQuestReward(stageId){
  const reward=STORY_QUEST_REWARDS[stageId]||{xp:20,money:10,material:"mutant_hide",qty:1};
  return {...reward};
}

function storyQuestRewardText(reward){
  const parts=typeof rewardSummaryParts==="function"?rewardSummaryParts(reward):[];
  return parts.length?parts.join(" · "):"+0 EXP · +0 ₴";
}

function storyQuestRows(stageId,data,progress){
  const stageReward=storyQuestReward(stageId);
  if(Array.isArray(data.quests)){
    return data.quests.map((quest,index)=>{
      const key=storyQuestKey(stageId,quest,index);
      const done=storyRequirementsMet(progress,quest.requirements||[]);
      const claimed=!!progress.questClaims[key];
      const reward={...stageReward,...(quest.rewardData||{})};
      return {index,key,quest,done,claimed,ready:done&&!claimed,label:storyText(quest,"label"),reward};
    });
  }
  if(Array.isArray(data.checklist)){
    return data.checklist.map(([id,label],index)=>{
      const quest={id,requirements:[id]};
      const key=storyQuestKey(stageId,quest,index);
      const done=storyHas(progress,id);
      const claimed=!!progress.questClaims[key];
      return {index,key,quest,done,claimed,ready:done&&!claimed,label,reward:stageReward};
    });
  }
  if(Array.isArray(data.scenes)){
    return data.scenes.map((scene,index)=>{
      const quest={id:scene.id,requirements:[scene.id]};
      const key=storyQuestKey(stageId,quest,index);
      const done=storyHas(progress,scene.id);
      const claimed=!!progress.questClaims[key];
      return {index,key,quest,done,claimed,ready:done&&!claimed,label:storyText(scene,"title"),reward:stageReward};
    });
  }
  return [];
}

function storyAllObjectiveQuestsClaimed(stageId,data,progress){
  const rows=storyQuestRows(stageId,data,progress);
  return rows.length===0||rows.every(row=>row.claimed);
}

function questInventoryItemIds(quest){
  const explicit=Array.isArray(quest?.consumeItems)?quest.consumeItems:[];
  const candidates=explicit.length?explicit:(Array.isArray(quest?.requirements)?quest.requirements:[]);
  return [...new Set(candidates.filter(id=>{
    const catalog=typeof inventoryCatalogItem==="function"?inventoryCatalogItem(id):null;
    return catalog && (catalog.type==="quest" || catalog.category==="quest");
  }))];
}

function consumeQuestInventoryItems(quest){
  const ids=questInventoryItemIds(quest);
  if(!ids.length||!Array.isArray(state.inventory))return [];
  const removed=[];
  ids.forEach(id=>{
    const before=state.inventory.reduce((sum,item)=>sum+(item.id===id?(Number(item.qty)||0):0),0);
    if(before>0)removed.push({id,qty:before});
    state.inventory=state.inventory.filter(item=>item.id!==id);
  });
  return removed;
}

function cleanupClaimedQuestInventory(stageId,data,progress){
  if(!Array.isArray(data?.quests)||!progress?.questClaims)return false;
  let changed=false;
  data.quests.forEach((quest,index)=>{
    const key=storyQuestKey(stageId,quest,index);
    if(!progress.questClaims[key])return;
    if(consumeQuestInventoryItems(quest).length)changed=true;
  });
  if(changed)saveState();
  return changed;
}

function claimStoryObjectiveQuest(stageId,data,progress,index){
  const rows=storyQuestRows(stageId,data,progress);
  const row=rows[index];
  if(!row||!row.done||row.claimed)return null;
  const reward=row.reward||storyQuestReward(stageId);
  const xpResult=typeof addPlayerXp==="function"?addPlayerXp(reward.xp||0,{notify:true}):{gained:0};
  if(typeof addPlayerXp!=="function")state.xp=(Number(state.xp)||0)+(Number(reward.xp)||0);
  state.money=(Number(state.money)||0)+(Number(reward.money)||0);
  if(reward.material&&reward.qty)addStoryLoot(reward.material,reward.qty);
  (Array.isArray(reward.items)?reward.items:[]).forEach(item=>{
    if(item?.id)addStoryLoot(item.id,item.qty||1);
  });
  consumeQuestInventoryItems(row.quest);
  progress.questClaims[row.key]=true;
  saveState();
  syncHud();
  toast(t("storyUi.objectiveClaimedToast",{xp:xpResult.gained||reward.xp||0}));
  return {...row,claimed:true,ready:false};
}

function claimStoryQuest(stageId,data,progress){
  if(!progress.completed||progress.claimed||!storyAllObjectiveQuestsClaimed(stageId,data,progress))return;
  const reward=data.rewardData||{};
  const xpResult=typeof addPlayerXp==="function"?addPlayerXp(reward.xp||0,{notify:true}):{gained:0};
  if(typeof addPlayerXp!=="function")state.xp=(Number(state.xp)||0)+(Number(reward.xp)||0);
  state.money=(Number(state.money)||0)+(Number(reward.money)||0);
  (reward.items||[]).forEach(item=>addStoryLoot(item.id,item.qty||1));
  const equipmentRarity=storyQuestEquipmentRarity(reward);
  const equipment=equipmentRarity&&typeof grantSmartQuestEquipment==="function"?grantSmartQuestEquipment(equipmentRarity):null;
  const starterSet=stageId==="dytiatky"&&reward.starterSet&&typeof grantDytiatkyStarterSet==="function"
    ?grantDytiatkyStarterSet(progress)
    :[];
  progress.claimed=true;
  saveState();
  syncHud();
  const modal=document.getElementById("storyRewardModal");
  if(!modal)return;
  document.getElementById("storyRewardTitle").textContent=storyText(data,"quest");
  const equipmentReward=equipment?`<div><b>${t(itemRarity(equipment).labelKey)}</b><span>${storyItemName(equipment.id)}</span></div>`:"";
  const starterSetReward=(starterSet||[]).map(item=>`<div><b>${t(itemRarity(item).labelKey)} +1</b><span>${storyItemName(item.id)}</span></div>`).join("");
  document.getElementById("storyRewardItems").innerHTML=`
    <div><span class="story-reward-icon"><img src="assets/inventory-items/item_exp.webp" alt=""></span><b>+${xpResult.gained||reward.xp||0}</b><span>${t("storyUi.experience")}</span></div>
    <div><span class="story-reward-icon"><img src="assets/inventory-items/item_money.webp" alt=""></span><b>+${reward.money||0} ₴</b><span>${t("storyUi.currency")}</span></div>
    ${(reward.items||[]).map(item=>`<div><span class="story-reward-icon">${inventoryCatalogItem(item.id)?.profileIcon?`<img src="${inventoryCatalogItem(item.id).profileIcon}" alt="">`:(inventoryCatalogItem(item.id)?.icon||"◆")}</span><b>×${item.qty||1}</b><span>${storyItemName(item.id)}</span></div>`).join("")}
    ${equipment?`<div><span class="story-reward-icon">${inventoryCatalogItem(equipment.id)?.profileIcon?`<img src="${inventoryCatalogItem(equipment.id).profileIcon}" alt="">`:(inventoryCatalogItem(equipment.id)?.icon||"◆")}</span><b>${t(itemRarity(equipment).labelKey)}</b><span>${storyItemName(equipment.id)}</span></div>`:""}
    ${(starterSet||[]).map(item=>`<div><span class="story-reward-icon">${inventoryCatalogItem(item.id)?.profileIcon?`<img src="${inventoryCatalogItem(item.id).profileIcon}" alt="">`:(inventoryCatalogItem(item.id)?.icon||"◆")}</span><b>${t(itemRarity(item).labelKey)} +1</b><span>${storyItemName(item.id)}</span></div>`).join("")}`;
  modal.hidden=false;
  document.getElementById("storyRewardClose").onclick=()=>{
    modal.hidden=true;
    renderStoryLocation(stageId);
    if(stageId==="chnpp"){
      setTimeout(()=>{
        const latest=storyStageProgress("chnpp");
        const shown=showChnppEnding(latest,{
          onClose:()=>{
            state.currentRoute="world";
            saveState();
            renderWorld();
          }
        });
        if(!shown){
          state.currentRoute="world";
          saveState();
          renderWorld();
        }
      },0);
    }
  };
}

function renderStoryMissionBase(stageId,data,progress,total,doneCount){
  const title=storyText(data,"title");
  const description=storyText(data,"description");
  const allObjectiveClaims=storyAllObjectiveQuestsClaimed(stageId,data,progress);
  document.getElementById("storyLocationTitle").textContent=title;
  document.getElementById("storyLocationDescription").textContent=description;
  document.getElementById("storyMissionTitle").textContent=storyText(data,"quest");
  document.getElementById("storyMissionText").textContent=description;
  document.getElementById("storyMissionObjective").textContent=storyText(data,"objective");
  document.getElementById("storyMissionReward").textContent=storyText(data,"reward");
  document.getElementById("storyProgressCount").textContent=`${doneCount}/${total}`;
  const status=document.getElementById("storyMissionStatus");
  status.textContent=progress.claimed
    ?t("storyUi.submitted")
    :progress.completed&&allObjectiveClaims
      ?t("storyUi.readyToSubmit")
      :progress.completed
        ?t("storyUi.submitObjectivesFirst")
        :`${doneCount}/${total}`;
  const claim=document.getElementById("storyClaimBtn");
  const claimed=document.getElementById("storyClaimedNote");
  claim.hidden=!progress.completed||progress.claimed||!allObjectiveClaims;
  claimed.hidden=!progress.claimed;
  claim.onclick=()=>claimStoryQuest(stageId,data,progress);
}

function storyChecklistHtml(rows){
  return rows.map(row=>`<div class="story-check-row ${row.claimed?"done submitted":row.done?"done ready":""}">
    <span>${row.claimed?"✓":row.done?"!":"○"}</span>
    <div class="story-check-copy"><b>${row.label}</b>${row.done&&!row.claimed?`<small>${storyQuestRewardText(row.reward)}</small>`:""}</div>
    ${row.ready?`<button class="story-row-claim" data-story-row-claim="${row.index}" type="button">${t("storyUi.submitObjective")}</button>`:""}
    ${row.claimed?`<em>${t("storyUi.objectiveSubmitted")}</em>`:""}
  </div>`).join("");
}

function bindStoryChecklistClaims(stageId,data,progress,rerender){
  document.querySelectorAll("[data-story-row-claim]").forEach(button=>{
    button.onclick=()=>{
      const index=Number(button.dataset.storyRowClaim);
      if(claimStoryObjectiveQuest(stageId,data,progress,index))rerender();
    };
  });
}

function appendStoryForwardArrow(button){
  const arrow=document.createElement("span");
  arrow.className="story-forward-arrow";
  arrow.textContent="↑";
  button.appendChild(arrow);
}

function storyFoundCheckPoint(area){
  if(Array.isArray(area.checkAt))return area.checkAt;
  if(Array.isArray(area.marker))return area.marker;
  const [left,top,width,height]=area.box||[0,0,0,0];
  return [left+width/2,top+height/2];
}

function appendStoryFoundCheck(layer,area){
  const [x,y]=storyFoundCheckPoint(area);
  const check=document.createElement("span");
  check.className="story-found-check floating story-found-check-global";
  check.textContent="✓";
  check.style.left=`${x}%`;
  check.style.top=`${y}%`;
  layer.appendChild(check);
}

function storyAreaMarker(button,area,locked){
  const labelText=storyText(area,"label");
  if(labelText){
    button.classList.add("story-map-marker");
    const label=document.createElement("span");
    label.className="story-area-label";
    label.textContent=`${locked?"🔒 ":""}${labelText}`;
    if(Array.isArray(area.marker)){
      const [markerX,markerY]=area.marker;
      const [left,top,width,height]=area.box;
      label.classList.add("floating");
      label.style.left=`${((markerX-left)/width)*100}%`;
      label.style.top=`${((markerY-top)/height)*100}%`;
    }
    button.appendChild(label);
  }else if(locked){
    const lock=document.createElement("span");
    lock.className="story-area-lock";
    lock.textContent="🔒";
    button.appendChild(lock);
  }
}

function appendStoryEnemyBadge(button,battle,labelText=""){
  const badge=document.createElement("span");
  badge.className=`story-enemy-badge${battle?.boss?" boss":""}`;
  badge.textContent=battle?.boss?"☠":"✦";
  button.appendChild(badge);

  const name=document.createElement("span");
  name.className=`story-enemy-name${battle?.boss?" boss":""}`;
  name.textContent=labelText||storyText(battle,"name",t("expeditions.combat.enemy"));
  button.appendChild(name);
}

function startStoryCombat(stageId,data,progress,area){
  if(typeof expeditionById!=="function"||typeof startExpeditionCombat!=="function")return false;
  if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive()){toast(t("survival.recovery.expeditionBlocked"));return false;}
  if(typeof canTravelWithBackpack==="function"&&!canTravelWithBackpack())return false;
  if(typeof applyStoryRadiationExposure==="function")applyStoryRadiationExposure(stageId,"encounter");
  const battle=area.combat||{};
  const expedition=expeditionById(battle.type);
  if(!expedition)return false;
  const battleName=storyText(battle,"name",t("expeditions.combat.enemy"));
  const mobOverrides={
    name:battleName,
    nameKey:battle.nameKey||"",
    image:battle.image,
    tier:battle.boss?"boss":expeditionLevelTier(battle.level||1)
  };

  return startExpeditionCombat(expedition,{
    source:"story",
    level:battle.level||1,
    energyCost:battle.energy||5,
    ignorePower:true,
    title:`${storyText(data,"title")} · ${battleName}`,
    mobOverrides,
    onVictory:()=>{
      if(storyHas(progress,area.id))return {rewards:[],firstClear:false,message:t("storyUi.enemyAlreadyDefeated")};
      progress.found.push(area.id);
      const rewards=grantStoryEncounterRewards(stageId,battle,expedition);
      progress.completed=data.required.every(id=>storyHas(progress,id));
      saveState();
      const victoryMessage=stageId==="redforest"
        ?redForestVictoryMessage(progress,battleName,area.id)
        :genericStoryCombatVictoryMessage(stageId,data,progress,battleName);
      return {rewards,firstClear:true,message:victoryMessage};
    },
    onReturn:()=>renderStoryLocation(stageId)
  });
}

function storySceneEncounterDefeated(progress,sceneId){
  return !!progress.flags?.sceneEncountersDefeated?.[sceneId];
}

function maybeStartStorySceneEncounter(stageId,data,progress,sceneId,scene){
  const config=STORY_SCENE_ENCOUNTERS[stageId]?.[sceneId];
  if(!config||storySceneEncounterDefeated(progress,sceneId))return false;
  const encounterKey=`${stageId}:${sceneId}`;
  if(storyEncounterSkipOnce===encounterKey){
    storyEncounterSkipOnce="";
    return false;
  }
  if(typeof expeditionById!=="function"||typeof startExpeditionCombat!=="function")return false;
  const expedition=expeditionById(config.type);
  if(!expedition)return false;
  if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive())return false;
  if(typeof canTravelWithBackpack==="function"&&!canTravelWithBackpack())return false;
  if(typeof applyStoryRadiationExposure==="function")applyStoryRadiationExposure(stageId,"encounter");
  const enemy=expeditionMobFor(expedition,config.level);
  const title=t("storyUi.ambushTitle",{location:storyText(scene,"title")});
  return startExpeditionCombat(expedition,{
    source:"story",
    level:config.level,
    energyCost:1,
    ignorePower:true,
    title,
    mobOverrides:{name:enemy.name,nameKey:enemy.nameKey,image:enemy.image,tier:enemy.tier},
    onVictory:()=>{
      progress.flags.sceneEncountersDefeated[sceneId]=true;
      const rewards=grantStoryEncounterRewards(stageId,config,expedition);
      saveState();
      return {rewards,firstClear:true,message:storySceneEncounterVictoryMessage(stageId,progress,enemy.name)};
    },
    onReturn:(outcome)=>{
      if(outcome!=="victory"){
        if(scene?.parent)progress.currentScene=scene.parent;
        else storyEncounterSkipOnce=encounterKey;
        saveState();
      }
      renderStoryLocation(stageId);
    }
  });
}

function renderInteractiveStoryLocation(stageId,data,progress){
  cleanupClaimedQuestInventory(stageId,data,progress);
  const scene=data.scenes[progress.currentScene]||data.scenes.main;
  if(!data.scenes[progress.currentScene])progress.currentScene="main";
  const questRows=storyQuestRows(stageId,data,progress);
  const doneCount=questRows.filter(row=>row.done).length;
  progress.completed=data.required.every(id=>storyHas(progress,id));
  renderStoryMissionBase(stageId,data,progress,questRows.length,doneCount);
  document.getElementById("storyMissionChecklist").innerHTML=storyChecklistHtml(questRows);
  bindStoryChecklistClaims(stageId,data,progress,()=>renderInteractiveStoryLocation(stageId,data,progress));

  const image=document.getElementById("storySceneImage");
  image.src=`assets/story-locations/${scene.image}`;
  image.alt=storyText(scene,"title");
  document.getElementById("storySceneTitle").textContent=storyText(scene,"title");
  document.getElementById("storySceneHint").textContent=storyText(scene,"hint");
  const event=document.getElementById("storyEvent");
  event.textContent=progress.completed&&!progress.claimed
    ?(storyAllObjectiveQuestsClaimed(stageId,data,progress)?t("storyUi.allObjectivesDone"):t("storyUi.submitObjectivesFirst"))
    :storyText(scene,"event",t("storyUi.inspectInteractive"));
  const continueBtn=document.getElementById("storyContinueBtn");
  continueBtn.hidden=true;

  const sceneBack=document.getElementById("storySceneBack");
  sceneBack.hidden=!scene.parent;
  sceneBack.onclick=()=>{
    if(typeof canTravelWithBackpack==="function"&&!canTravelWithBackpack())return;
    if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive()){toast(t("survival.recovery.travelBlocked"));return;}
    if(typeof applyStoryRadiationExposure==="function")applyStoryRadiationExposure(stageId,"travel");
    progress.currentScene=scene.parent||"main";
    saveState();
    renderInteractiveStoryLocation(stageId,data,progress);
  };

  const layer=document.getElementById("storyInteractionLayer");
  layer.innerHTML="";
  (scene.areas||[]).forEach((area,index)=>{
    if(area.visibleAfter&&!storyRequirementsMet(progress,area.visibleAfter))return;
    const button=document.createElement("button");
    button.type="button";
    button.className=`story-hit-area${area.combat?" story-enemy-area":""}${area.stageTarget?" story-stage-exit":""}`;
    const fallbackAreaLabel=area.combat
      ?storyText(area.combat,"name",t("storyUi.interactiveArea",{number:index+1}))
      :t("storyUi.interactiveArea",{number:index+1});
    button.setAttribute("aria-label",storyText(area,"label",storyText(area,"title",fallbackAreaLabel)));
    const [left,top,width,height]=storyPortraitBox(area.box);
    Object.assign(button.style,{left:`${left}%`,top:`${top}%`,width:`${width}%`,height:`${height}%`});

    const isCollected=!!area.id&&storyHas(progress,area.id);
    const locked=!!area.requires&&!storyRequirementsMet(progress,area.requires);
    if(locked)button.classList.add("locked");
    if(area.forwardArrow){
      button.classList.add("story-gate-control","open");
      appendStoryForwardArrow(button);
    }else{
      storyAreaMarker(button,area,locked);
    }

    if(area.combat&&!isCollected)appendStoryEnemyBadge(button,area.combat,storyText(area.combat,"name",fallbackAreaLabel));

    if(isCollected&&!area.target&&!area.stageTarget){
      button.classList.add("collected");
      button.disabled=true;
      appendStoryFoundCheck(layer,area);
    }

    button.onclick=()=>{
      if(locked){
        event.textContent=storyText(area,"fail",t("storyUi.prerequisiteRequired"));
        return;
      }
      if(area.target){
        if(typeof canTravelWithBackpack==="function"&&!canTravelWithBackpack())return;
        if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive()){event.textContent=t("survival.recovery.travelBlocked");return;}
        if(typeof applyStoryRadiationExposure==="function")applyStoryRadiationExposure(stageId,"travel");
        progress.currentScene=area.target;
        saveState();
        renderInteractiveStoryLocation(stageId,data,progress);
        return;
      }
      if(area.combat){
        startStoryCombat(stageId,data,progress,area);
        return;
      }
      if(area.service==="hospitalDecontamination"){
        const before=Math.floor(Number(state.radiation)||0);
        if(typeof useHospitalDecontamination==="function"&&useHospitalDecontamination()){
          event.textContent=t("survival.hospital.eventCompleted",{before,cost:HOSPITAL_DECONTAMINATION_COST});
        }else{
          event.textContent=t("survival.hospital.eventHint",{cost:HOSPITAL_DECONTAMINATION_COST});
        }
        return;
      }
      if(area.id&&!isCollected){
        progress.found.push(area.id);
        (area.loot||[]).forEach(item=>addStoryLootEntry(item));
        const actionEnergyCost=typeof radiationAdjustedEnergyCost==="function"?radiationAdjustedEnergyCost(1):1;
        state.energy=Math.max(0,(Number(state.energy)||0)-actionEnergyCost);
        progress.completed=data.required.every(id=>storyHas(progress,id));
        saveState();
        syncHud();
        renderInteractiveStoryLocation(stageId,data,progress);
        document.getElementById("storyEvent").textContent=storyText(area,"message",t("storyUi.foundImportant"));
        if(!area.action)showStoryItemModal(area);
        return;
      }
      if(area.stageTarget){
        if(typeof canTravelWithBackpack==="function"&&!canTravelWithBackpack())return;
        if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive()){event.textContent=t("survival.recovery.travelBlocked");return;}
        if(typeof applyStoryRadiationExposure==="function")applyStoryRadiationExposure(area.stageTarget,"travel");
        state.storyStage=area.stageTarget;
        saveState();
        renderStoryLocation(area.stageTarget);
        return;
      }
      event.textContent=t("storyUi.alreadyCollected");
    };
    layer.appendChild(button);
  });

  if(stageId==="dytiatky"&&progress.currentScene==="main"){
    const gateReady=DYTIATKY_TEST_EXIT_OPEN||data.required.filter(id=>!["barrier_open","dytiatky_gate_boss","exit_zone"].includes(id)).every(id=>storyHas(progress,id));
    const gateBossDefeated=storyHas(progress,"dytiatky_gate_boss");
    const gate=document.createElement("button");
    gate.type="button";
    gate.className=`story-gate-control ${gateReady?"open":"locked"}${gateReady&&!gateBossDefeated?" boss":""}`;
    gate.setAttribute("aria-label",gateReady?(gateBossDefeated?t("storyUi.passGate"):t("storyLocations.dytiatky.enemies.gateBoss")):t("storyUi.gateLocked"));
    Object.assign(gate.style,{left:"54%",top:"48%",width:"28%",height:"18%"});
    if(gateReady){
      if(gateBossDefeated){
        appendStoryForwardArrow(gate);
      }else{
        appendStoryEnemyBadge(gate,{boss:true,nameKey:"storyLocations.dytiatky.enemies.gateBoss"},t("storyLocations.dytiatky.enemies.gateBoss"));
      }
    }else{
      const lock=document.createElement("span");
      lock.className="story-gate-lock";
      lock.textContent="🔒";
      gate.appendChild(lock);
    }
    gate.onclick=()=>{
      if(!gateReady){event.textContent=t("storyUi.gateLockedHint");return;}
      if(!storyHas(progress,"barrier_open"))progress.found.push("barrier_open");

      if(!storyHas(progress,"dytiatky_gate_boss")){
        const expedition=typeof expeditionById==="function"?expeditionById(EXPEDITION_FINAL.id):null;
        if(!expedition)return;
        progress.completed=data.required.every(id=>storyHas(progress,id));
        saveState();
        document.getElementById("storyEvent").textContent=t("storyUi.gateBossAppears");
        startExpeditionCombat(expedition,{
          source:"story",
          level:1,
          energyCost:2,
          ignorePower:true,
          title:`${storyText(data,"title")} · ${t("storyLocations.dytiatky.enemies.gateBoss")}`,
          mobOverrides:{
            name:t("storyLocations.dytiatky.enemies.gateBoss"),
            nameKey:"storyLocations.dytiatky.enemies.gateBoss",
            image:"assets/expeditions/bosses/boss-01.webp",
            tier:"boss"
          },
          initialMobHp:50,
          onVictory:()=>{
            if(storyHas(progress,"dytiatky_gate_boss"))return {rewards:[],firstClear:false,message:t("storyUi.enemyAlreadyDefeated")};
            progress.found.push("dytiatky_gate_boss");
            const rewards=[
              ...dytiatkyGateBossStarterRewards(progress)
            ];
            progress.completed=data.required.every(id=>storyHas(progress,id));
            saveState();
            return {rewards,firstClear:true,message:dytiatkyGateBossVictoryMessage(progress,rewards,t("storyLocations.dytiatky.enemies.gateBoss"))};
          },
          onReturn:()=>renderStoryLocation(stageId)
        });
        return;
      }

      const alreadyOpened=storyHas(progress,"barrier_open")&&storyHas(progress,"exit_zone");
      if(alreadyOpened){
        if(typeof canTravelWithBackpack==="function"&&!canTravelWithBackpack())return;
        if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive()){event.textContent=t("survival.recovery.travelBlocked");return;}
        if(typeof applyStoryRadiationExposure==="function")applyStoryRadiationExposure("pripyat","travel");
        state.storyStage="pripyat";
        saveState();
        renderStoryLocation("pripyat");
        return;
      }
      if(!storyHas(progress,"exit_zone"))progress.found.push("exit_zone");
      progress.completed=data.required.every(id=>storyHas(progress,id));
      saveState();
      renderInteractiveStoryLocation(stageId,data,progress);
      document.getElementById("storyEvent").textContent=t("storyUi.gateTravelReady");
    };
    layer.appendChild(gate);
  }

  bindStoryIntroReplay(stageId,data,progress);
  if(stageId==="chnpp"&&progress.currentScene==="system_core"){
    const aftermathShown=showChnppBossAftermath(progress,{
      onClose:()=>setTimeout(()=>maybeStartStorySceneEncounter(stageId,data,progress,progress.currentScene,scene),0)
    });
    if(aftermathShown)return;
  }
  const introShown=showStorySceneIntro(stageId,scene,progress,{onClose:()=>setTimeout(()=>maybeStartStorySceneEncounter(stageId,data,progress,progress.currentScene,scene),0)});
  if(!introShown)setTimeout(()=>maybeStartStorySceneEncounter(stageId,data,progress,progress.currentScene,scene),0);
}

function renderSimpleStoryLocation(stageId,data,progress){
  const total=data.scenes.length;
  progress.currentIndex=Math.max(0,Math.min(progress.currentIndex,total-1));
  const scene=data.scenes[progress.currentIndex];
  const questRows=storyQuestRows(stageId,data,progress);
  const doneCount=questRows.filter(row=>row.done).length;
  progress.completed=doneCount===total;
  renderStoryMissionBase(stageId,data,progress,total,doneCount);
  document.getElementById("storyMissionChecklist").innerHTML=storyChecklistHtml(questRows);
  bindStoryChecklistClaims(stageId,data,progress,()=>renderSimpleStoryLocation(stageId,data,progress));
  const image=document.getElementById("storySceneImage");
  image.src=`assets/story-locations/${stageId}-${scene.image}.webp`;image.alt=storyText(scene,"title");
  document.getElementById("storySceneTitle").textContent=storyText(scene,"title");
  document.getElementById("storySceneHint").textContent=storyText(scene,"hint");
  const event=document.getElementById("storyEvent");event.textContent=storyHas(progress,scene.id)?storyText(scene,"found"):t("storyUi.findObject");
  const replayButton=document.getElementById("storyReplayIntroBtn");
  if(replayButton){replayButton.hidden=true;replayButton.onclick=null;}
  const layer=document.getElementById("storyInteractionLayer");layer.innerHTML="";
  const hit=document.createElement("button");hit.type="button";hit.className="story-hit-area";hit.setAttribute("aria-label",t("storyUi.exploreObject"));
  const [hotX,hotY]=storyPortraitPoint(scene.hotspot);
  Object.assign(hit.style,{left:`${hotX-8}%`,top:`${hotY-5}%`,width:"16%",height:"10%"});
  hit.onclick=()=>{
    if(!storyHas(progress,scene.id)){
      progress.found.push(scene.id);
      const actionEnergyCost=typeof radiationAdjustedEnergyCost==="function"?radiationAdjustedEnergyCost(1):1;
      state.energy=Math.max(0,(Number(state.energy)||0)-actionEnergyCost);
      if(scene.item)addStoryLoot(scene.item,1);
      progress.completed=progress.found.filter(id=>data.scenes.some(item=>item.id===id)).length===total;
      saveState();syncHud();
    }
    renderSimpleStoryLocation(stageId,data,progress);
    document.getElementById("storyEvent").textContent=storyText(scene,"found");
  };
  layer.appendChild(hit);
  const sceneBack=document.getElementById("storySceneBack");
  sceneBack.hidden=progress.currentIndex===0;
  sceneBack.onclick=()=>{progress.currentIndex=Math.max(0,progress.currentIndex-1);saveState();renderSimpleStoryLocation(stageId,data,progress);};
  const next=document.getElementById("storyContinueBtn");
  next.hidden=!storyHas(progress,scene.id)||progress.currentIndex>=total-1;
  next.onclick=()=>{progress.currentIndex=Math.min(total-1,progress.currentIndex+1);saveState();renderSimpleStoryLocation(stageId,data,progress);};
  setTimeout(()=>maybeStartStorySceneEncounter(stageId,data,progress,scene.id,scene),0);
}

function renderStoryLocation(stageId="dytiatky"){
  state.storyStage=stageId;
  state.currentRoute="storyLocation";
  saveState();
  cloneTemplate("storyLocationTpl");
  const storyScreen=document.querySelector(".story-location-screen");
  if(storyScreen)storyScreen.dataset.storyStage=stageId;
  setActiveNav("world");
  const progress=storyStageProgress(stageId);
  document.getElementById("storyLocationBack").onclick=()=>{state.currentRoute="world";saveState();renderWorld();};
  if(stageId==="dytiatky")renderInteractiveStoryLocation(stageId,DYTIATKY_STORY,progress);
  else if(stageId==="pripyat")renderInteractiveStoryLocation(stageId,PRIPYAT_STORY,progress);
  else if(stageId==="redforest")renderInteractiveStoryLocation(stageId,RED_FOREST_STORY,progress);
  else if(stageId==="yaniv")renderInteractiveStoryLocation(stageId,YANIV_STORY,progress);
  else if(stageId==="chnpp")renderInteractiveStoryLocation(stageId,CHNPP_STORY,progress);
  else renderSimpleStoryLocation(stageId,STORY_LOCATION_CONTENT[stageId]||CHNPP_STORY,progress);
}

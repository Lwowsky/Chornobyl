/* =========================================================
   DAILY TASKS v0.35
   Non-story daily goals: contracts, expeditions, crafting and medicine.
   ========================================================= */

const DAILY_TASK_DEFINITIONS=Object.freeze([
  Object.freeze({id:"contracts",target:3,icon:"📋",reward:Object.freeze({xp:8,money:180,items:Object.freeze([{id:"uncommon_hide",qty:1}])})}),
  Object.freeze({id:"expeditionKills",target:5,icon:"☠",reward:Object.freeze({xp:10,money:150,items:Object.freeze([{id:"ammo",qty:20}])})}),
  Object.freeze({id:"sell",target:3,icon:"₴",reward:Object.freeze({xp:8,money:160,items:Object.freeze([{id:"battery",qty:2}])})}),
  Object.freeze({id:"craft",target:2,icon:"⚙",reward:Object.freeze({xp:6,money:120,items:Object.freeze([{id:"scrap",qty:4}])})}),
  Object.freeze({id:"medical",target:2,icon:"✚",reward:Object.freeze({xp:6,money:100,items:Object.freeze([{id:"bandage",qty:2}])})})
]);

const DAILY_ALL_REWARD=Object.freeze({xp:15,money:300,items:Object.freeze([{id:"rare_hide",qty:1}])});
const DAILY_MEDICAL_ITEM_IDS=new Set(["medkit","bandage","iodine","antirad"]);

function dailyLocalDayId(now=new Date()){
  const y=now.getFullYear();
  const m=String(now.getMonth()+1).padStart(2,"0");
  const d=String(now.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function ensureDailyState(){
  const day=dailyLocalDayId();
  if(!state.dailyTasks||typeof state.dailyTasks!=="object"||state.dailyTasks.day!==day){
    state.dailyTasks={day,progress:{},claimed:{},bonusClaimed:false};
    DAILY_TASK_DEFINITIONS.forEach(task=>{state.dailyTasks.progress[task.id]=0;state.dailyTasks.claimed[task.id]=false;});
    if(typeof saveState==="function")saveState();
  }
  if(!state.dailyTasks.progress||typeof state.dailyTasks.progress!=="object")state.dailyTasks.progress={};
  if(!state.dailyTasks.claimed||typeof state.dailyTasks.claimed!=="object")state.dailyTasks.claimed={};
  DAILY_TASK_DEFINITIONS.forEach(task=>{
    const value=Math.max(0,Math.floor(Number(state.dailyTasks.progress[task.id])||0));
    state.dailyTasks.progress[task.id]=Math.min(task.target,value);
    state.dailyTasks.claimed[task.id]=!!state.dailyTasks.claimed[task.id];
  });
  state.dailyTasks.bonusClaimed=!!state.dailyTasks.bonusClaimed;
  return state.dailyTasks;
}

function dailyTrack(taskId,amount=1){
  const task=DAILY_TASK_DEFINITIONS.find(row=>row.id===taskId);
  if(!task)return false;
  const daily=ensureDailyState();
  if(daily.claimed[task.id])return false;
  const before=Math.max(0,Number(daily.progress[task.id])||0);
  daily.progress[task.id]=Math.min(task.target,before+Math.max(0,Number(amount)||0));
  if(daily.progress[task.id]!==before){
    if(typeof saveState==="function")saveState();
    return true;
  }
  return false;
}

function dailyTrackMedicalItem(itemId){
  if(DAILY_MEDICAL_ITEM_IDS.has(String(itemId||"")))return dailyTrack("medical",1);
  return false;
}

function dailyGrantReward(reward){
  const data=reward||{};
  if(data.xp&&typeof addPlayerXp==="function")addPlayerXp(data.xp,{notify:true});
  state.money=(Number(state.money)||0)+(Number(data.money)||0);
  (data.items||[]).forEach(item=>{if(typeof addItem==="function")addItem(item.id,item.qty||1);});
}

function claimDailyTask(taskId){
  const task=DAILY_TASK_DEFINITIONS.find(row=>row.id===taskId);
  const daily=ensureDailyState();
  if(!task||daily.claimed[task.id]||(Number(daily.progress[task.id])||0)<task.target)return false;
  dailyGrantReward(task.reward);
  daily.claimed[task.id]=true;
  saveState();
  syncHud();
  toast(t("quests.daily.claimed"));
  return true;
}

function dailyAllTasksReady(){
  const daily=ensureDailyState();
  return DAILY_TASK_DEFINITIONS.every(task=>daily.claimed[task.id]);
}

function claimDailyBonus(){
  const daily=ensureDailyState();
  if(daily.bonusClaimed||!dailyAllTasksReady())return false;
  dailyGrantReward(DAILY_ALL_REWARD);
  daily.bonusClaimed=true;
  saveState();
  syncHud();
  toast(t("quests.daily.bonusClaimed"));
  return true;
}

function dailyTimeUntilReset(){
  const now=new Date();
  const next=new Date(now);
  next.setHours(24,0,0,0);
  const total=Math.max(0,Math.floor((next-now)/1000));
  const h=String(Math.floor(total/3600)).padStart(2,"0");
  const m=String(Math.floor((total%3600)/60)).padStart(2,"0");
  return `${h}:${m}`;
}

function dailySpecialRewardIconHtml(type){
  const path=type==="xp"?"assets/inventory-items/item_exp.webp":"assets/inventory-items/item_money.webp";
  return `<img src="${path}" alt="">`;
}

function dailyRewardIconHtml(itemId){
  if(typeof rewardItemIconHtml==="function")return rewardItemIconHtml(itemId);
  const catalog=typeof inventoryCatalogItem==="function"?inventoryCatalogItem(itemId):null;
  if(catalog?.profileIcon)return `<img src="${catalog.profileIcon}" alt="">`;
  return `<span>${catalog?.icon||"◆"}</span>`;
}

function dailyRewardTilesHtml(reward,compact=false){
  const data=reward||{};
  const rows=[];
  if(data.xp)rows.push(`<div class="daily-reward-tile special"><span class="daily-reward-art">${dailySpecialRewardIconHtml("xp")}</span><b>${t("levelSystem.experience")}</b><small>+${data.xp} EXP</small></div>`);
  if(data.money)rows.push(`<div class="daily-reward-tile special"><span class="daily-reward-art">${dailySpecialRewardIconHtml("money")}</span><b>${t("storyUi.currency")}</b><small>+${data.money} ₴</small></div>`);
  (data.items||[]).forEach(item=>rows.push(`<div class="daily-reward-tile"><span class="daily-reward-art">${dailyRewardIconHtml(item.id)}</span><b>${typeof rewardItemTitle==="function"?rewardItemTitle(item.id):t(`items.${item.id}`)}</b><small>×${item.qty||1}</small></div>`));
  return `<div class="daily-reward-grid ${compact?"compact":""}">${rows.join("")}</div>`;
}

function renderDailyQuestsPanel(){
  const daily=ensureDailyState();
  const claimed=DAILY_TASK_DEFINITIONS.filter(task=>daily.claimed[task.id]).length;
  return `<section class="daily-quests-panel">
    <header class="daily-quests-heading">
      <div><span>${t("quests.daily.eyebrow")}</span><h2>${t("quests.daily.title")}</h2><p>${t("quests.daily.hint")}</p></div>
      <div class="daily-reset"><small>${t("quests.daily.resetIn")}</small><b>${dailyTimeUntilReset()}</b></div>
    </header>
    <div class="daily-quests-progress"><span>${t("quests.daily.todayProgress")}</span><b>${claimed}/${DAILY_TASK_DEFINITIONS.length}</b></div>
    <div class="daily-quest-list">
      ${DAILY_TASK_DEFINITIONS.map(task=>{
        const progress=Math.min(task.target,Math.max(0,Number(daily.progress[task.id])||0));
        const done=progress>=task.target;
        const claimedTask=!!daily.claimed[task.id];
        const percent=Math.min(100,progress/task.target*100);
        return `<article class="daily-quest-card ${claimedTask?"claimed":done?"ready":""}">
          <div class="daily-quest-icon">${task.icon}</div>
          <div class="daily-quest-copy">
            <div class="daily-quest-title"><h3>${t(`quests.daily.tasks.${task.id}.title`)}</h3><b>${progress}/${task.target}</b></div>
            <p>${t(`quests.daily.tasks.${task.id}.description`)}</p>
            <div class="daily-progress-bar"><i style="width:${percent}%"></i><span>${progress}/${task.target}</span></div>
            ${dailyRewardTilesHtml(task.reward,true)}
          </div>
          <div class="daily-quest-action">
            ${claimedTask?`<span class="daily-claimed">✓ ${t("quests.daily.received")}</span>`:`<button data-daily-claim="${task.id}" type="button" ${done?"":"disabled"}>${t("quests.daily.claim")}</button>`}
          </div>
        </article>`;
      }).join("")}
    </div>
    <section class="daily-all-bonus ${dailyAllTasksReady()?"ready":""} ${daily.bonusClaimed?"claimed":""}">
      <div><span>${t("quests.daily.bonusEyebrow")}</span><h3>${t("quests.daily.bonusTitle")}</h3><p>${t("quests.daily.bonusHint")}</p></div>
      ${dailyRewardTilesHtml(DAILY_ALL_REWARD,true)}
      ${daily.bonusClaimed?`<span class="daily-claimed">✓ ${t("quests.daily.received")}</span>`:`<button data-daily-bonus type="button" ${dailyAllTasksReady()?"":"disabled"}>${t("quests.daily.claimBonus")}</button>`}
    </section>
  </section>`;
}

function bindDailyQuests(container,rerender){
  if(!container)return;
  container.querySelectorAll("[data-daily-claim]").forEach(button=>{
    button.onclick=()=>{if(claimDailyTask(button.dataset.dailyClaim)&&typeof rerender==="function")rerender();};
  });
  const bonus=container.querySelector("[data-daily-bonus]");
  if(bonus)bonus.onclick=()=>{if(claimDailyBonus()&&typeof rerender==="function")rerender();};
}

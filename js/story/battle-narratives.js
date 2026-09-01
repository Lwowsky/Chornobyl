/* Story battle narrative helpers. */

function storyBattleNarrativeFallback(combat){
  const enemyName=typeof expeditionMobName==="function"?expeditionMobName(combat?.mob):t("common.enemy");
  return t("storyUi.battleNarrative.fallback",{enemyName});
}

function redForestRemainingSummary(progress){
  const mobsDown=RED_FOREST_ENEMY_IDS.filter(id=>storyHas(progress,id)).length;
  const mobsTotal=RED_FOREST_ENEMY_IDS.length;
  const bossDown=storyHas(progress,"red_boss")?1:0;
  return {mobsDown,mobsTotal,mobsLeft:Math.max(0,mobsTotal-mobsDown),bossDown,bossLeft:bossDown?0:1};
}

function redForestVictoryMessage(progress,battleName,enemyId){
  const info=redForestRemainingSummary(progress);
  const params={...info,battleName,bossSuffix:info.bossLeft?t("storyUi.battleNarrative.redforest.bossSuffix"):""};
  if(enemyId==="red_boss")return t("storyUi.battleNarrative.redforest.boss",params);
  if(info.mobsDown===1){
    const pool=["first1","first2"];
    return t(`storyUi.battleNarrative.redforest.${pool[Math.floor(Math.random()*pool.length)]}`,params);
  }
  if(info.mobsDown===4){
    const pool=["half1","half2"];
    return t(`storyUi.battleNarrative.redforest.${pool[Math.floor(Math.random()*pool.length)]}`,params);
  }
  if(info.mobsLeft===0&&info.bossLeft===1)return t("storyUi.battleNarrative.redforest.bossOnly",params);
  const pool=["normal1","normal2","normal3"];
  return t(`storyUi.battleNarrative.redforest.${pool[Math.floor(Math.random()*pool.length)]}`,params);
}

function storyCombatEncounterIds(data){
  if(!data?.scenes)return [];
  return [...new Set(Object.values(data.scenes)
    .flatMap(scene=>Array.isArray(scene?.areas)?scene.areas:[])
    .filter(area=>area?.combat&&area?.id)
    .map(area=>area.id))];
}

function storyCombatEncounterSummary(data,progress){
  const ids=storyCombatEncounterIds(data);
  const defeated=ids.filter(id=>storyHas(progress,id)).length;
  const total=ids.length;
  return {defeated,total,left:Math.max(0,total-defeated)};
}

function storySceneEncounterIds(stageId){
  return Object.keys(STORY_SCENE_ENCOUNTERS?.[stageId]||{});
}

function storySceneEncounterSummary(stageId,progress){
  const ids=storySceneEncounterIds(stageId);
  const defeated=ids.filter(id=>progress.flags?.sceneEncountersDefeated?.[id]).length;
  const total=ids.length;
  return {defeated,total,left:Math.max(0,total-defeated)};
}

function storySceneEncounterVictoryMessage(stageId,progress,battleName){
  const summary=storySceneEncounterSummary(stageId,progress);
  const locationName=storyText(STORY_LOCATION_CONTENT[stageId]||{},"title",t("storyUi.battleNarrative.locationFallback"));
  const params={...summary,battleName,locationName};
  if(summary.total<=1)return t("storyUi.battleNarrative.scene.single",params);
  if(summary.defeated===1){
    const pool=["first1","first2"];
    return t(`storyUi.battleNarrative.scene.${pool[Math.floor(Math.random()*pool.length)]}`,params);
  }
  if(summary.left===0)return t("storyUi.battleNarrative.scene.all",params);
  const pool=["normal1","normal2","normal3"];
  return t(`storyUi.battleNarrative.scene.${pool[Math.floor(Math.random()*pool.length)]}`,params);
}

function rewardEntryFromEquipmentItem(item){
  return item
    ? {id:item.id,qty:1,equipment:true,rarity:typeof itemRarityId==="function"?itemRarityId(item):"uncommon",instanceId:item.instanceId}
    : null;
}

function dytiatkyGateBossStarterRewards(progress){
  const starterSet=typeof grantDytiatkyStarterSet==="function"?grantDytiatkyStarterSet(progress):[];
  return (starterSet||[]).map(rewardEntryFromEquipmentItem).filter(Boolean);
}

function dytiatkyGateBossVictoryMessage(progress,rewards,battleName){
  const setCount=(rewards||[]).filter(row=>row&&row.equipment).length;
  const lootLine=setCount?t("storyUi.battleNarrative.dytiatky.loot"):"";
  return t("storyUi.battleNarrative.dytiatky.victory",{battleName,lootLine});
}

function genericStoryCombatVictoryMessage(stageId,data,progress,battleName){
  const summary=storyCombatEncounterSummary(data,progress);
  const locationName=storyText(data,"title",t("storyUi.battleNarrative.locationFallback"));
  const params={...summary,battleName,locationName};
  if(summary.total<=1)return t("storyUi.battleNarrative.generic.single",params);
  if(summary.defeated===1){
    const pool=["first1","first2"];
    return t(`storyUi.battleNarrative.generic.${pool[Math.floor(Math.random()*pool.length)]}`,params);
  }
  if(summary.left===Math.floor(summary.total/2)){
    const pool=["half1","half2"];
    return t(`storyUi.battleNarrative.generic.${pool[Math.floor(Math.random()*pool.length)]}`,params);
  }
  if(summary.left===0)return t("storyUi.battleNarrative.generic.all",params);
  const pool=["normal1","normal2","normal3"];
  return t(`storyUi.battleNarrative.generic.${pool[Math.floor(Math.random()*pool.length)]}`,params);
}

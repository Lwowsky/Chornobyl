/* =========================================================
   RECOVERY SYSTEM v0.32
   Field: +1 HP/min, +1 Energy/min
   Bunker: +2 HP/min, +1 Energy/min
   Active decontamination: +3 HP/min, +1 Energy/min
   Radiation slows regeneration and 100 radiation drains HP.
   ========================================================= */

const RECOVERY_BASE_PER_MINUTE=Object.freeze({
  field:Object.freeze({hp:1,energy:1}),
  bunker:Object.freeze({hp:2,energy:1}),
  decontamination:Object.freeze({hp:3,energy:1})
});

const RECOVERY_DAMAGE_COOLDOWN_MS=2*60*1000;
const CRITICAL_RADIATION_HP_LOSS_PER_MINUTE=1;
const SAFE_RECOVERY_TICK_MS=15000;
let safeRecoveryTimer=null;

function ensureRecoveryState(now=Date.now()){
  if(!state.recovery||typeof state.recovery!=="object")state.recovery={lastTick:0,lastDamageAt:0};
  if(!Number.isFinite(state.recovery.lastTick)||state.recovery.lastTick<=0)state.recovery.lastTick=now;
  state.recovery.lastDamageAt=Math.max(0,Number(state.recovery.lastDamageAt)||0);
  return state.recovery;
}

function markPlayerDamaged(now=Date.now()){
  const recovery=ensureRecoveryState(now);
  recovery.lastDamageAt=Math.max(recovery.lastDamageAt||0,now);
  return recovery.lastDamageAt;
}

function hpRecoveryCooldownRemainingMs(now=Date.now()){
  const recovery=ensureRecoveryState(now);
  return Math.max(0,(recovery.lastDamageAt+RECOVERY_DAMAGE_COOLDOWN_MS)-now);
}

function currentRecoveryType(){
  if(!state.hasStarted)return null;
  if(typeof isBunkerRecoveryActive==="function"&&isBunkerRecoveryActive())return "decontamination";
  if(typeof expeditionCombat!=="undefined"&&!!expeditionCombat&&!expeditionCombat.finished)return null;
  if(state.currentRoute==="tradepost")return "bunker";
  return "field";
}

function recoveryIsSuspended(){
  return typeof expeditionCombat!=="undefined"&&!!expeditionCombat&&!expeditionCombat.finished;
}

function recoveryRadiationMultiplier(){
  return typeof radiationRegenerationMultiplier==="function"
    ? radiationRegenerationMultiplier(state.radiation)
    : ((Number(state.radiation)||0)>=50?0.5:1);
}

function recoveryBaseRates(type=currentRecoveryType()){
  return RECOVERY_BASE_PER_MINUTE[type]||Object.freeze({hp:0,energy:0});
}

function recoveryRates(now=Date.now()){
  const type=currentRecoveryType();
  const base=recoveryBaseRates(type);
  const radiationMultiplier=recoveryRadiationMultiplier();
  const hpCooldown=hpRecoveryCooldownRemainingMs(now);
  return {
    type,
    radiationMultiplier,
    hp:hpCooldown>0?0:base.hp*radiationMultiplier,
    energy:base.energy*radiationMultiplier,
    hpBase:base.hp,
    energyBase:base.energy,
    hpCooldownMs:hpCooldown
  };
}

function recoveryRateLabel(value){
  const amount=Math.max(0,Number(value)||0);
  if(amount===0)return "0";
  if(Number.isInteger(amount))return String(amount);
  return amount.toFixed(amount<1?2:1).replace(/0+$/,'').replace(/\.$/,'');
}

function recoveryRadiationPenaltyPercent(){
  return Math.round((1-recoveryRadiationMultiplier())*100);
}

function recoveryRadiationStatusShort(){
  const radiation=Math.max(0,Number(state.radiation)||0);
  if(radiation>=100)return t("recovery.radiationCriticalShort");
  const combatPenalty=typeof radiationCombatPenaltyPercent==="function"?radiationCombatPenaltyPercent(radiation):0;
  if(combatPenalty>0)return t("recovery.radiationCombatShort",{value:combatPenalty});
  const regenPenalty=recoveryRadiationPenaltyPercent();
  if(regenPenalty>0)return t("recovery.radiationRegenShort",{value:regenPenalty});
  return "";
}

function recoveryRadiationStatusLong(){
  const radiation=Math.max(0,Number(state.radiation)||0);
  if(radiation>=100)return t("recovery.radiationCriticalLong");
  const combatPenalty=typeof radiationCombatPenaltyPercent==="function"?radiationCombatPenaltyPercent(radiation):0;
  const regenPenalty=recoveryRadiationPenaltyPercent();
  if(combatPenalty>0)return t("recovery.radiationCombatLong",{regen:regenPenalty,combat:combatPenalty});
  if(regenPenalty>0)return t("recovery.radiationRegenLong",{value:regenPenalty});
  return t("recovery.radiationNormal");
}

function recoveryHudStatus(now=Date.now()){
  const rates=recoveryRates(now);
  const suspended=recoveryIsSuspended();
  let hpText;
  if(suspended)hpText=t("recovery.pausedCombat");
  else if(rates.hpCooldownMs>0)hpText=t("recovery.hpCooldownShort",{time:formatRecoveryClock(rates.hpCooldownMs)});
  else hpText=t("recovery.rateShort",{value:recoveryRateLabel(rates.hp)});
  const energyText=suspended?t("recovery.pausedCombat"):t("recovery.rateShort",{value:recoveryRateLabel(rates.energy)});
  const hpBadge=suspended
    ? "⏸"
    : rates.hpCooldownMs>0
      ? "⏱"
      : `+${recoveryRateLabel(rates.hp)}`;
  const energyBadge=suspended?"⏸":`+${recoveryRateLabel(rates.energy)}`;
  return {
    ...rates,
    hpText,
    energyText,
    hpBadge,
    energyBadge,
    radiationText:recoveryRadiationStatusShort(),
    radiationTitle:recoveryRadiationStatusLong()
  };
}

function formatRecoveryClock(ms){
  const total=Math.max(0,Math.ceil((Number(ms)||0)/1000));
  const minutes=Math.floor(total/60);
  const seconds=total%60;
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

function applySafeZoneRecovery(now=Date.now(),options={}){
  const recovery=ensureRecoveryState(now);
  const previous=recovery.lastTick;
  recovery.lastTick=now;

  if(!state.hasStarted||recoveryIsSuspended())return {changed:false,elapsedMinutes:0};
  const type=currentRecoveryType();
  if(!type)return {changed:false,elapsedMinutes:0};

  const elapsedMs=Math.max(0,now-previous);
  const elapsedMinutes=elapsedMs/60000;
  if(elapsedMinutes<=0)return {changed:false,elapsedMinutes:0};

  const before={
    hp:Number(state.hp)||0,
    energy:Number(state.energy)||0,
    radiation:Number(state.radiation)||0
  };

  const base=recoveryBaseRates(type);
  const radiationMultiplier=recoveryRadiationMultiplier();
  const cooldownEnd=recovery.lastDamageAt>0?recovery.lastDamageAt+RECOVERY_DAMAGE_COOLDOWN_MS:0;
  const hpStart=Math.max(previous,cooldownEnd);
  const hpElapsedMinutes=hpStart<now?(now-hpStart)/60000:0;

  let hpDelta=base.hp*radiationMultiplier*hpElapsedMinutes;
  const energyDelta=base.energy*radiationMultiplier*elapsedMinutes;

  if(before.radiation>=100){
    hpDelta-=CRITICAL_RADIATION_HP_LOSS_PER_MINUTE*elapsedMinutes;
  }

  const hpLimit=typeof getPlayerStatLimit==="function"?getPlayerStatLimit("hp"):getPlayerStats().maxHp;
  const energyLimit=typeof getPlayerStatLimit==="function"?getPlayerStatLimit("energy"):getPlayerStats().maxEnergy;
  state.hp=clamp(before.hp+hpDelta,1,hpLimit);
  state.energy=clamp(before.energy+energyDelta,0,energyLimit);

  const changed=Math.abs(state.hp-before.hp)>0.0001||Math.abs(state.energy-before.energy)>0.0001;
  if(changed&&options.save!==false)saveState();
  if((changed||options.syncHud)&&typeof syncHud==="function")syncHud();

  return {
    changed,
    elapsedMinutes,
    type,
    radiationMultiplier,
    hpGained:state.hp-before.hp,
    energyGained:state.energy-before.energy
  };
}

function startSafeRecoverySystem(){
  if(safeRecoveryTimer)clearInterval(safeRecoveryTimer);

  const now=Date.now();
  if(typeof applyBunkerRecovery==="function")applyBunkerRecovery(now,{save:true});
  const wasInitialized=!!state?.recovery?.lastTick;
  const result=applySafeZoneRecovery(now,{save:true,syncHud:true});

  if(wasInitialized&&result.changed&&result.elapsedMinutes>=1){
    const minutes=Math.floor(result.elapsedMinutes);
    toast(t("recovery.offlineRecovered",{minutes}));
  }

  safeRecoveryTimer=setInterval(()=>{
    const tick=Date.now();
    if(typeof applyBunkerRecovery==="function")applyBunkerRecovery(tick,{save:true});
    applySafeZoneRecovery(tick,{save:true,syncHud:true});
  },SAFE_RECOVERY_TICK_MS);
}

const USER_PREFERENCES_KEY="the-1037-signal-ui-preferences-v1";
const DEFAULT_USER_PREFERENCES=Object.freeze({textSize:"normal",reducedMotion:false});

function readUserPreferences(){
  try{
    const raw=JSON.parse(localStorage.getItem(USER_PREFERENCES_KEY)||"null");
    return {
      textSize:raw?.textSize==="large"?"large":"normal",
      reducedMotion:!!raw?.reducedMotion
    };
  }catch{
    return {...DEFAULT_USER_PREFERENCES};
  }
}

function writeUserPreferences(next){
  const safe={
    textSize:next?.textSize==="large"?"large":"normal",
    reducedMotion:!!next?.reducedMotion
  };
  localStorage.setItem(USER_PREFERENCES_KEY,JSON.stringify(safe));
  applyUserPreferences(safe);
  return safe;
}

function applyUserPreferences(preferences=readUserPreferences()){
  document.documentElement.classList.toggle("ui-large-text",preferences.textSize==="large");
  document.documentElement.classList.toggle("reduced-motion",!!preferences.reducedMotion);
}

function setUserTextSize(value){
  const current=readUserPreferences();
  current.textSize=value==="large"?"large":"normal";
  return writeUserPreferences(current);
}

function setReducedMotion(enabled){
  const current=readUserPreferences();
  current.reducedMotion=!!enabled;
  return writeUserPreferences(current);
}

function resetUserPreferences(){
  localStorage.removeItem(USER_PREFERENCES_KEY);
  applyUserPreferences(DEFAULT_USER_PREFERENCES);
  return {...DEFAULT_USER_PREFERENCES};
}

applyUserPreferences();

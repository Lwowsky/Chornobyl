const TRANSLATIONS = {};
const SUPPORTED_LANGUAGES=Object.freeze(["en","uk","ru","ja"]);
const DEFAULT_LANGUAGE="en";

function mergeTranslationChunk(target, source){
  Object.entries(source||{}).forEach(([key,value])=>{
    if(value&&typeof value==="object"&&!Array.isArray(value)){
      if(!target[key]||typeof target[key]!=="object"||Array.isArray(target[key]))target[key]={};
      mergeTranslationChunk(target[key],value);
    }else{
      target[key]=value;
    }
  });
  return target;
}

function registerTranslations(lang, chunk){
  if(!TRANSLATIONS[lang])TRANSLATIONS[lang]={};
  mergeTranslationChunk(TRANSLATIONS[lang],chunk);
}

function storedLanguage(){
  try{
    const value=localStorage.getItem("zone17_language");
    return SUPPORTED_LANGUAGES.includes(value)?value:"";
  }catch{
    return "";
  }
}

function browserLanguage(){
  const candidates=typeof navigator!=="undefined"
    ? [...(Array.isArray(navigator.languages)?navigator.languages:[]),navigator.language]
    : [];
  for(const candidate of candidates){
    const primary=String(candidate||"").trim().toLowerCase().split(/[-_]/)[0];
    if(SUPPORTED_LANGUAGES.includes(primary))return primary;
  }
  return DEFAULT_LANGUAGE;
}

function saveLanguagePreference(lang){
  try{localStorage.setItem("zone17_language",lang);}catch{}
}

function languageLocale(lang=currentLang){
  return ({en:"en-US",uk:"uk-UA",ru:"ru-RU",ja:"ja-JP"})[lang]||"en-US";
}

let currentLang = storedLanguage() || browserLanguage();

function getByPath(obj, path) {
  return String(path).split(".").reduce((acc, part) => acc && acc[part], obj);
}

function t(key, params = {}) {
  let value=getByPath(TRANSLATIONS[currentLang],key);
  if(value==null&&currentLang!==DEFAULT_LANGUAGE)value=getByPath(TRANSLATIONS[DEFAULT_LANGUAGE],key);
  if(value==null){
    if(String(key).startsWith("items."))return getByPath(TRANSLATIONS[DEFAULT_LANGUAGE],"common.itemFallback")||"Item";
    if(String(key).startsWith("itemDescriptions."))return getByPath(TRANSLATIONS[DEFAULT_LANGUAGE],"common.itemDescriptionFallback")||"Zone item";
    return key;
  }
  if(typeof value!=="string")return value;
  return value.replace(/\{(\w+)\}/g,(_,name)=>params[name]??`{${name}}`);
}

function setLanguage(lang){
  if(!TRANSLATIONS[lang])return false;
  currentLang=lang;
  saveLanguagePreference(lang);
  applyTranslations();
  return true;
}

function applyTranslations(root=document){
  if(!TRANSLATIONS[currentLang]){
    currentLang=DEFAULT_LANGUAGE;
    saveLanguagePreference(currentLang);
  }
  if(root===document&&document.documentElement)document.documentElement.lang=currentLang;
  root.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n);});
  root.querySelectorAll("[data-i18n-title]").forEach(el=>{el.title=t(el.dataset.i18nTitle);});
  root.querySelectorAll("[data-i18n-aria-label]").forEach(el=>{el.setAttribute("aria-label",t(el.dataset.i18nAriaLabel));});
  root.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{el.setAttribute("placeholder",t(el.dataset.i18nPlaceholder));});
}

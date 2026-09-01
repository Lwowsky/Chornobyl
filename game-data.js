const GAME_META = {
  brandKey: "mainMenu.title",
  version: "0.62"
};



function rewardCatalogItemById(itemId){
  if(!itemId)return null;
  if(typeof inventoryCatalogItem==="function"){
    const catalog=inventoryCatalogItem(itemId);
    if(catalog)return catalog;
  }
  return Array.isArray(GAME_DATA?.inventory)
    ? (GAME_DATA.inventory.find(item=>item.id===itemId)||null)
    : null;
}

function rewardItemTitle(itemId,fallback=null){
  const zoneFallback=fallback||(typeof t==="function"?t("common.zoneReward"):"Zone Reward");
  if(!itemId)return zoneFallback;
  const key=String(itemId).startsWith("items.")?String(itemId):`items.${itemId}`;
  const translated=typeof t==="function"?t(key):key;
  const itemFallback=typeof t==="function"?t("common.itemFallback"):"Item";
  if(translated&&translated!==key&&translated!==itemFallback)return translated;
  const catalog=rewardCatalogItemById(itemId);
  return catalog?.name||catalog?.title||String(itemId)||zoneFallback;
}

function rewardItemIconHtml(itemId,fallback="◆"){
  const catalog=rewardCatalogItemById(itemId);
  if(catalog?.profileIcon)return `<img src="${catalog.profileIcon}" alt="">`;
  return `<span>${catalog?.icon||fallback}</span>`;
}

function normalizeRewardEntry(reward){
  if(!reward||typeof reward!=="object")return null;
  if(reward.special==="xp"||(!reward.id&&Number(reward.xp)>0&&reward.special!=="money")){
    return {...reward,special:"xp",xp:Math.max(0,Number(reward.xp)||0)};
  }
  if(reward.special==="money"||(!reward.id&&Number(reward.money)>0)){
    return {...reward,special:"money",money:Math.max(0,Number(reward.money)||0)};
  }
  if(reward.id){
    return {...reward,id:String(reward.id),qty:Math.max(1,Math.floor(Number(reward.qty)||1))};
  }
  return null;
}

function rewardSummaryParts(reward){
  const data=reward&&typeof reward==="object"?reward:{};
  const parts=[];
  const xp=Math.max(0,Number(data.xp)||0);
  const money=Math.max(0,Number(data.money)||0);
  if(xp)parts.push(`+${xp} EXP`);
  if(money)parts.push(`+${money} ₴`);
  if(data.material&&data.qty)parts.push(`${rewardItemTitle(data.material)} ×${Math.max(1,Math.floor(Number(data.qty)||1))}`);
  (Array.isArray(data.items)?data.items:[]).forEach(item=>{
    if(item?.id)parts.push(`${rewardItemTitle(item.id)} ×${Math.max(1,Math.floor(Number(item.qty)||1))}`);
  });
  if(data.equipment?.id){
    const rarity=(typeof ITEM_RARITIES!=="undefined"&&ITEM_RARITIES[data.equipment.rarity])?ITEM_RARITIES[data.equipment.rarity]:ITEM_RARITIES?.common;
    const rarityLabel=rarity&&typeof t==="function"?t(rarity.labelKey):"";
    parts.push([rarityLabel,rewardItemTitle(data.equipment.id)].filter(Boolean).join(" · "));
  }
  return parts;
}

const GAME_DATA = {
  locations: {
    south_01:{icon:"•", radiation:0, energy:5, art:"zone", combatPower:0, recovery:"safe"},
    south_02:{icon:"•", radiation:0, energy:6, art:"zone", combatPower:15, recovery:"bunker"},
    south_03:{icon:"•", radiation:1, energy:7, art:"zone", combatPower:25},
    south_04:{icon:"•", radiation:1, energy:4, art:"zone", combatPower:40},
    south_05:{icon:"•", radiation:1, energy:5, art:"zone", combatPower:55},
    south_06:{icon:"•", radiation:1, energy:6, art:"zone", combatPower:70},
    south_07:{icon:"•", radiation:2, energy:7, art:"zone", combatPower:90},
    south_08:{icon:"•", radiation:1, energy:4, art:"zone", combatPower:115},
    south_09:{icon:"•", radiation:1, energy:5, art:"zone", combatPower:145},
    south_10:{icon:"•", radiation:2, energy:6, art:"zone", combatPower:180},
    chornobyl_01:{icon:"•", radiation:1, energy:7, art:"zone"},
    chornobyl_02:{icon:"•", radiation:1, energy:8, art:"zone"},
    chornobyl_03:{icon:"•", radiation:2, energy:9, art:"zone"},
    chornobyl_04:{icon:"•", radiation:2, energy:6, art:"zone"},
    chornobyl_05:{icon:"•", radiation:2, energy:7, art:"zone"},
    chornobyl_06:{icon:"•", radiation:2, energy:8, art:"zone"},
    chornobyl_07:{icon:"•", radiation:3, energy:9, art:"zone"},
    chornobyl_08:{icon:"•", radiation:2, energy:6, art:"zone"},
    chornobyl_09:{icon:"•", radiation:2, energy:7, art:"zone"},
    chornobyl_10:{icon:"•", radiation:3, energy:8, art:"zone"},
    redforest_01:{icon:"•", radiation:2, energy:9, art:"zone"},
    redforest_02:{icon:"•", radiation:2, energy:10, art:"zone"},
    redforest_03:{icon:"•", radiation:3, energy:11, art:"zone"},
    redforest_04:{icon:"•", radiation:3, energy:8, art:"zone"},
    redforest_05:{icon:"•", radiation:3, energy:9, art:"zone"},
    redforest_06:{icon:"•", radiation:3, energy:10, art:"zone"},
    redforest_07:{icon:"•", radiation:4, energy:11, art:"zone"},
    redforest_08:{icon:"•", radiation:3, energy:8, art:"zone"},
    redforest_09:{icon:"•", radiation:3, energy:9, art:"zone"},
    redforest_10:{icon:"•", radiation:4, energy:10, art:"zone"},
    pripyat_01:{icon:"•", radiation:3, energy:11, art:"zone"},
    pripyat_02:{icon:"•", radiation:3, energy:12, art:"zone"},
    pripyat_03:{icon:"•", radiation:4, energy:13, art:"zone"},
    pripyat_04:{icon:"•", radiation:4, energy:10, art:"zone"},
    pripyat_05:{icon:"•", radiation:4, energy:11, art:"zone"},
    pripyat_06:{icon:"•", radiation:4, energy:12, art:"zone"},
    pripyat_07:{icon:"•", radiation:5, energy:13, art:"zone"},
    pripyat_08:{icon:"•", radiation:4, energy:10, art:"zone"},
    pripyat_09:{icon:"•", radiation:4, energy:11, art:"zone"},
    pripyat_10:{icon:"•", radiation:5, energy:12, art:"zone"},
    npp_01:{icon:"•", radiation:4, energy:13, art:"zone"},
    npp_02:{icon:"•", radiation:4, energy:14, art:"zone"},
    npp_03:{icon:"•", radiation:5, energy:15, art:"zone"},
    npp_04:{icon:"•", radiation:5, energy:12, art:"zone"},
    npp_05:{icon:"•", radiation:5, energy:13, art:"zone"},
    npp_06:{icon:"•", radiation:5, energy:14, art:"zone"},
    npp_07:{icon:"•", radiation:5, energy:15, art:"zone"},
    npp_08:{icon:"•", radiation:5, energy:12, art:"zone"},
    npp_09:{icon:"•", radiation:5, energy:13, art:"zone"},
    npp_10:{icon:"•", radiation:5, energy:14, art:"zone"},
    duga_01:{icon:"•", radiation:3, energy:11, art:"zone"},
    duga_02:{icon:"•", radiation:3, energy:12, art:"zone"},
    duga_03:{icon:"•", radiation:4, energy:13, art:"zone"},
    duga_04:{icon:"•", radiation:4, energy:10, art:"zone"},
    duga_05:{icon:"•", radiation:4, energy:11, art:"zone"},
    duga_06:{icon:"•", radiation:4, energy:12, art:"zone"},
    duga_07:{icon:"•", radiation:5, energy:13, art:"zone"},
    duga_08:{icon:"•", radiation:4, energy:10, art:"zone"},
    duga_09:{icon:"•", radiation:4, energy:11, art:"zone"},
    duga_10:{icon:"•", radiation:5, energy:12, art:"zone"},
    swamps_01:{icon:"•", radiation:2, energy:9, art:"zone"},
    swamps_02:{icon:"•", radiation:2, energy:10, art:"zone"},
    swamps_03:{icon:"•", radiation:3, energy:11, art:"zone"},
    swamps_04:{icon:"•", radiation:3, energy:8, art:"zone"},
    swamps_05:{icon:"•", radiation:3, energy:9, art:"zone"},
    swamps_06:{icon:"•", radiation:3, energy:10, art:"zone"},
    swamps_07:{icon:"•", radiation:4, energy:11, art:"zone"},
    swamps_08:{icon:"•", radiation:3, energy:8, art:"zone"},
    swamps_09:{icon:"•", radiation:3, energy:9, art:"zone"},
    swamps_10:{icon:"•", radiation:4, energy:10, art:"zone"},
    yaniv_01:{icon:"•", radiation:2, energy:9, art:"zone"},
    yaniv_02:{icon:"•", radiation:2, energy:10, art:"zone"},
    yaniv_03:{icon:"•", radiation:3, energy:11, art:"zone"},
    yaniv_04:{icon:"•", radiation:3, energy:8, art:"zone"},
    yaniv_05:{icon:"•", radiation:3, energy:9, art:"zone"},
    yaniv_06:{icon:"•", radiation:3, energy:10, art:"zone"},
    yaniv_07:{icon:"•", radiation:4, energy:11, art:"zone"},
    yaniv_08:{icon:"•", radiation:3, energy:8, art:"zone"},
    yaniv_09:{icon:"•", radiation:3, energy:9, art:"zone"},
    yaniv_10:{icon:"•", radiation:4, energy:10, art:"zone"},
    zaton_01:{icon:"•", radiation:2, energy:9, art:"zone"},
    zaton_02:{icon:"•", radiation:2, energy:10, art:"zone"},
    zaton_03:{icon:"•", radiation:3, energy:11, art:"zone"},
    zaton_04:{icon:"•", radiation:3, energy:8, art:"zone"},
    zaton_05:{icon:"•", radiation:3, energy:9, art:"zone"},
    zaton_06:{icon:"•", radiation:3, energy:10, art:"zone"},
    zaton_07:{icon:"•", radiation:4, energy:11, art:"zone"},
    zaton_08:{icon:"•", radiation:3, energy:8, art:"zone"},
    zaton_09:{icon:"•", radiation:3, energy:9, art:"zone"},
    zaton_10:{icon:"•", radiation:4, energy:10, art:"zone"},
    jupiter_01:{icon:"•", radiation:3, energy:11, art:"zone"},
    jupiter_02:{icon:"•", radiation:3, energy:12, art:"zone"},
    jupiter_03:{icon:"•", radiation:4, energy:13, art:"zone"},
    jupiter_04:{icon:"•", radiation:4, energy:10, art:"zone"},
    jupiter_05:{icon:"•", radiation:4, energy:11, art:"zone"},
    jupiter_06:{icon:"•", radiation:4, energy:12, art:"zone"},
    jupiter_07:{icon:"•", radiation:5, energy:13, art:"zone"},
    jupiter_08:{icon:"•", radiation:4, energy:10, art:"zone"},
    jupiter_09:{icon:"•", radiation:4, energy:11, art:"zone"},
    jupiter_10:{icon:"•", radiation:5, energy:12, art:"zone"},
    kopachi_01:{icon:"•", radiation:1, energy:7, art:"zone"},
    kopachi_02:{icon:"•", radiation:1, energy:8, art:"zone"},
    kopachi_03:{icon:"•", radiation:2, energy:9, art:"zone"},
    kopachi_04:{icon:"•", radiation:2, energy:6, art:"zone"},
    kopachi_05:{icon:"•", radiation:2, energy:7, art:"zone"},
    kopachi_06:{icon:"•", radiation:2, energy:8, art:"zone"},
    kopachi_07:{icon:"•", radiation:3, energy:9, art:"zone"},
    kopachi_08:{icon:"•", radiation:2, energy:6, art:"zone"},
    kopachi_09:{icon:"•", radiation:2, energy:7, art:"zone"},
    kopachi_10:{icon:"•", radiation:3, energy:8, art:"zone"},
    poliske_01:{icon:"•", radiation:2, energy:9, art:"zone"},
    poliske_02:{icon:"•", radiation:2, energy:10, art:"zone"},
    poliske_03:{icon:"•", radiation:3, energy:11, art:"zone"},
    poliske_04:{icon:"•", radiation:3, energy:8, art:"zone"},
    poliske_05:{icon:"•", radiation:3, energy:9, art:"zone"},
    poliske_06:{icon:"•", radiation:3, energy:10, art:"zone"},
    poliske_07:{icon:"•", radiation:4, energy:11, art:"zone"},
    poliske_08:{icon:"•", radiation:3, energy:8, art:"zone"},
    poliske_09:{icon:"•", radiation:3, energy:9, art:"zone"},
    poliske_10:{icon:"•", radiation:4, energy:10, art:"zone"},
    rosokha_01:{icon:"•", radiation:3, energy:11, art:"zone"},
    rosokha_02:{icon:"•", radiation:3, energy:12, art:"zone"},
    rosokha_03:{icon:"•", radiation:4, energy:13, art:"zone"},
    rosokha_04:{icon:"•", radiation:4, energy:10, art:"zone"},
    rosokha_05:{icon:"•", radiation:4, energy:11, art:"zone"},
    rosokha_06:{icon:"•", radiation:4, energy:12, art:"zone"},
    rosokha_07:{icon:"•", radiation:5, energy:13, art:"zone"},
    rosokha_08:{icon:"•", radiation:4, energy:10, art:"zone"},
    rosokha_09:{icon:"•", radiation:4, energy:11, art:"zone"},
    rosokha_10:{icon:"•", radiation:5, energy:12, art:"zone"},
    lelev_01:{icon:"•", radiation:1, energy:7, art:"zone"},
    lelev_02:{icon:"•", radiation:1, energy:8, art:"zone"},
    lelev_03:{icon:"•", radiation:2, energy:9, art:"zone"},
    lelev_04:{icon:"•", radiation:2, energy:6, art:"zone"},
    lelev_05:{icon:"•", radiation:2, energy:7, art:"zone"},
    lelev_06:{icon:"•", radiation:2, energy:8, art:"zone"},
    lelev_07:{icon:"•", radiation:3, energy:9, art:"zone"},
    lelev_08:{icon:"•", radiation:2, energy:6, art:"zone"},
    lelev_09:{icon:"•", radiation:2, energy:7, art:"zone"},
    lelev_10:{icon:"•", radiation:3, energy:8, art:"zone"},
    burakovka_01:{icon:"•", radiation:3, energy:11, art:"zone"},
    burakovka_02:{icon:"•", radiation:3, energy:12, art:"zone"},
    burakovka_03:{icon:"•", radiation:4, energy:13, art:"zone"},
    burakovka_04:{icon:"•", radiation:4, energy:10, art:"zone"},
    burakovka_05:{icon:"•", radiation:4, energy:11, art:"zone"},
    burakovka_06:{icon:"•", radiation:4, energy:12, art:"zone"},
    burakovka_07:{icon:"•", radiation:5, energy:13, art:"zone"},
    burakovka_08:{icon:"•", radiation:4, energy:10, art:"zone"},
    burakovka_09:{icon:"•", radiation:4, energy:11, art:"zone"},
    burakovka_10:{icon:"•", radiation:5, energy:12, art:"zone"},
    cooling_01:{icon:"•", radiation:3, energy:11, art:"zone"},
    cooling_02:{icon:"•", radiation:3, energy:12, art:"zone"},
    cooling_03:{icon:"•", radiation:4, energy:13, art:"zone"},
    cooling_04:{icon:"•", radiation:4, energy:10, art:"zone"},
    cooling_05:{icon:"•", radiation:4, energy:11, art:"zone"},
    cooling_06:{icon:"•", radiation:4, energy:12, art:"zone"},
    cooling_07:{icon:"•", radiation:5, energy:13, art:"zone"},
    cooling_08:{icon:"•", radiation:4, energy:10, art:"zone"},
    cooling_09:{icon:"•", radiation:4, energy:11, art:"zone"},
    cooling_10:{icon:"•", radiation:5, energy:12, art:"zone"},
    underground_01:{icon:"•", radiation:4, energy:13, art:"zone"},
    underground_02:{icon:"•", radiation:4, energy:14, art:"zone"},
    underground_03:{icon:"•", radiation:5, energy:15, art:"zone"},
    underground_04:{icon:"•", radiation:5, energy:12, art:"zone"},
    underground_05:{icon:"•", radiation:5, energy:13, art:"zone"},
    underground_06:{icon:"•", radiation:5, energy:14, art:"zone"},
    underground_07:{icon:"•", radiation:5, energy:15, art:"zone"},
    underground_08:{icon:"•", radiation:5, energy:12, art:"zone"},
    underground_09:{icon:"•", radiation:5, energy:13, art:"zone"},
    underground_10:{icon:"•", radiation:5, energy:14, art:"zone"},
    labs_01:{icon:"•", radiation:4, energy:13, art:"zone"},
    labs_02:{icon:"•", radiation:4, energy:14, art:"zone"},
    labs_03:{icon:"•", radiation:5, energy:15, art:"zone"},
    labs_04:{icon:"•", radiation:5, energy:12, art:"zone"},
    labs_05:{icon:"•", radiation:5, energy:13, art:"zone"},
    labs_06:{icon:"•", radiation:5, energy:14, art:"zone"},
    labs_07:{icon:"•", radiation:5, energy:15, art:"zone"},
    labs_08:{icon:"•", radiation:5, energy:12, art:"zone"},
    labs_09:{icon:"•", radiation:5, energy:13, art:"zone"},
    labs_10:{icon:"•", radiation:5, energy:14, art:"zone"},
    north_01:{icon:"•", radiation:4, energy:13, art:"zone"},
    north_02:{icon:"•", radiation:4, energy:14, art:"zone"},
    north_03:{icon:"•", radiation:5, energy:15, art:"zone"},
    north_04:{icon:"•", radiation:5, energy:12, art:"zone"},
    north_05:{icon:"•", radiation:5, energy:13, art:"zone"},
    north_06:{icon:"•", radiation:5, energy:14, art:"zone"},
    north_07:{icon:"•", radiation:5, energy:15, art:"zone"},
    north_08:{icon:"•", radiation:5, energy:12, art:"zone"},
    north_09:{icon:"•", radiation:5, energy:13, art:"zone"},
    north_10:{icon:"•", radiation:5, energy:14, art:"zone"},
    sector17_01:{icon:"•", radiation:4, energy:13, art:"zone"},
    sector17_02:{icon:"•", radiation:4, energy:14, art:"zone"},
    sector17_03:{icon:"•", radiation:5, energy:15, art:"zone"},
    sector17_04:{icon:"•", radiation:5, energy:12, art:"zone"},
    sector17_05:{icon:"•", radiation:5, energy:13, art:"zone"},
    sector17_06:{icon:"•", radiation:5, energy:14, art:"zone"},
    sector17_07:{icon:"•", radiation:5, energy:15, art:"zone"},
    sector17_08:{icon:"•", radiation:5, energy:12, art:"zone"},
    sector17_09:{icon:"•", radiation:5, energy:13, art:"zone"},
    sector17_10:{icon:"•", radiation:5, energy:14, art:"zone"},
  },

  inventoryCategories: [
    {id:"food", icon:"assets/inventory-categories/food.webp"},
    {id:"gear", icon:"assets/inventory-categories/gear.webp"},
    {id:"resources", icon:"assets/inventory-categories/resources.webp"},
    {id:"quest", icon:"assets/inventory-categories/quest.webp"},
    {id:"trophies", icon:"assets/inventory-categories/trophies.webp"},
    {id:"ammo", icon:"assets/inventory-categories/ammo.webp"},
    {id:"medicine", icon:"assets/inventory-categories/medicine.webp"},
    {id:"tools", icon:"assets/inventory-categories/tools.webp"},
    {id:"other", icon:"assets/inventory-categories/other.webp"}
  ],

  inventory: [
    {
      id:"medkit",
      icon:"🧰",profileIcon:"assets/inventory-items/item_medkit.webp",
      category:"medicine",
      type:"consumable",
      weight:0.55,
      action:{type:"restore", stat:"hp", amount:35}
    },
    {
      id:"bandage",
      icon:"🩹",profileIcon:"assets/inventory-items/item_bandage.webp",
      category:"medicine",
      type:"consumable",
      weight:0.08,
      action:{type:"restore", stat:"hp", amount:10}
    },
    {
      id:"water",
      icon:"💧",profileIcon:"assets/inventory-items/item_water.webp",
      category:"food",
      type:"consumable",
      weight:0.70,
      action:{type:"restore", stat:"energy", amount:12}
    },
    {
      id:"food",
      icon:"🥫",profileIcon:"assets/inventory-items/item_food.webp",
      category:"food",
      type:"consumable",
      weight:0.35,
      action:{type:"restore", stat:"energy", amount:18}
    },
    {
      id:"ammo",
      icon:"▥",profileIcon:"assets/inventory-items/item_ammo.webp",
      category:"ammo",
      type:"ammo",
      weight:0.012
    },
    {
      id:"filter",
      icon:"◉",profileIcon:"assets/inventory-items/item_chemical.webp",
      category:"gear",
      type:"consumable",
      weight:0.18,
      action:{type:"restore", stat:"protection", amount:35}
    },
    {
      id:"iodine",
      icon:"🧪",profileIcon:"assets/inventory-items/item_iodine.webp",
      category:"medicine",
      type:"consumable",
      weight:0.08,
      action:{type:"reduce", stat:"radiation", amount:15}
    },
    {
      id:"antirad",
      icon:"☢",profileIcon:"assets/inventory-items/item_chemical.webp",
      category:"medicine",
      type:"consumable",
      weight:0.12,
      action:{type:"reduce", stat:"radiation", amount:30}
    },
    {
      id:"old_note",
      icon:"📄",profileIcon:"assets/inventory-items/quest_document.webp",
      category:"quest",
      type:"quest",
      weight:0.05
    },
    {id:"pripyat_city_map",icon:"🗺",profileIcon:"assets/inventory-items/quest_plan.webp",category:"quest",type:"quest",weight:0.08},
    {id:"school_diary",icon:"📓",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.12},
    {id:"park_maintenance_log",icon:"📒",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.18},
    {id:"hotel_signal_note",icon:"📻",profileIcon:"assets/inventory-items/quest_tape.webp",category:"quest",type:"quest",weight:0.04},
    {id:"residential_letter",icon:"✉",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.03},
    {id:"department_manifest",icon:"📋",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.10},
    {id:"cinema_frequency_note",icon:"📻",profileIcon:"assets/inventory-items/quest_tape.webp",category:"quest",type:"quest",weight:0.03},
    {id:"bus_passenger_list",icon:"📋",profileIcon:"assets/inventory-items/quest_personnel.webp",category:"quest",type:"quest",weight:0.08},
    {id:"hospital_case_file",icon:"🩺",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.16},
    {id:"pripyat_signal_coordinates",icon:"📡",profileIcon:"assets/inventory-items/quest_plan.webp",category:"quest",type:"quest",weight:0.02},
    {id:"yaniv_checkpoint_register",icon:"📒",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.12},
    {id:"yaniv_station_documents",icon:"📁",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.10},
    {id:"yaniv_service_token",icon:"🪙",profileIcon:"assets/inventory-items/quest_service_token.webp",category:"quest",type:"quest",weight:0.04},
    {id:"yaniv_emergency_route_map",icon:"🗺",profileIcon:"assets/inventory-items/quest_plan.webp",category:"quest",type:"quest",weight:0.08},
    {id:"yaniv_spare_fuse",icon:"⚡",profileIcon:"assets/inventory-items/quest_fuse.webp",category:"quest",type:"quest",weight:0.18},
    {id:"yaniv_military_pass",icon:"🪪",profileIcon:"assets/inventory-items/quest_card.webp",category:"quest",type:"quest",weight:0.03},
    {id:"chnpp_checkpoint_register",icon:"📒",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.10},
    {id:"chnpp_inner_perimeter_key",icon:"🗝",profileIcon:"assets/inventory-items/quest_key.webp",category:"quest",type:"quest",weight:0.05},
    {id:"chnpp_project_1037_order",icon:"📁",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.12},
    {id:"chnpp_personnel_list",icon:"📋",profileIcon:"assets/inventory-items/quest_personnel.webp",category:"quest",type:"quest",weight:0.10},
    {id:"chnpp_service_plan",icon:"🗺",profileIcon:"assets/inventory-items/quest_plan.webp",category:"quest",type:"quest",weight:0.08},
    {id:"chnpp_transport_access_code",icon:"🔢",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.03},
    {id:"chnpp_transport_gate_fuse",icon:"⚡",profileIcon:"assets/inventory-items/quest_fuse.webp",category:"quest",type:"quest",weight:0.16},
    {id:"chnpp_last_shift_log",icon:"📓",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.15},
    {id:"chnpp_chief_electrician_key",icon:"🗝",profileIcon:"assets/inventory-items/quest_key.webp",category:"quest",type:"quest",weight:0.05},
    {id:"chnpp_repair_component",icon:"⚙",profileIcon:"assets/inventory-items/quest_module.webp",category:"quest",type:"quest",weight:0.45},
    {id:"chnpp_power_fuse_a",icon:"⚡",profileIcon:"assets/inventory-items/quest_fuse.webp",category:"quest",type:"quest",weight:0.18},
    {id:"chnpp_power_fuse_b",icon:"⚡",profileIcon:"assets/inventory-items/quest_fuse.webp",category:"quest",type:"quest",weight:0.18},
    {id:"chnpp_power_scheme",icon:"🗺",profileIcon:"assets/inventory-items/quest_plan.webp",category:"quest",type:"quest",weight:0.08},
    {id:"chnpp_operator_log",icon:"📓",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.12},
    {id:"chnpp_lower_level_code",icon:"🔢",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.03},
    {id:"chnpp_signal_tape",icon:"📼",profileIcon:"assets/inventory-items/quest_tape.webp",category:"quest",type:"quest",weight:0.08},
    {id:"chnpp_isolation_protocol_4",icon:"📁",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.12},
    {id:"chnpp_elevator_level12_scheme",icon:"🗺",profileIcon:"assets/inventory-items/quest_plan.webp",category:"quest",type:"quest",weight:0.08},
    {id:"chnpp_access_card_1037",icon:"🪪",profileIcon:"assets/inventory-items/quest_card.webp",category:"quest",type:"quest",weight:0.04},
    {id:"chnpp_airlock_fuse",icon:"⚡",profileIcon:"assets/inventory-items/quest_fuse.webp",category:"quest",type:"quest",weight:0.20},
    {id:"chnpp_emergency_open_key",icon:"📄",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.03},
    {id:"chnpp_transmitter_access_key",icon:"🗝",profileIcon:"assets/inventory-items/quest_key.webp",category:"quest",type:"quest",weight:0.05},
    {id:"chnpp_final_protocol_1037",icon:"📁",profileIcon:"assets/inventory-items/quest_document.webp",category:"quest",type:"quest",weight:0.14},
    {id:"chnpp_object_personnel_list",icon:"📋",profileIcon:"assets/inventory-items/quest_personnel.webp",category:"quest",type:"quest",weight:0.10},
    {id:"chnpp_power_module_1037",icon:"🔋",profileIcon:"assets/inventory-items/quest_module.webp",category:"quest",type:"quest",weight:0.80},
    {id:"chnpp_operator_authorization_key",icon:"🗝",profileIcon:"assets/inventory-items/quest_key.webp",category:"quest",type:"quest",weight:0.05},
    {id:"chnpp_signal_archive_1037",icon:"💾",profileIcon:"assets/inventory-items/quest_archive.webp",category:"quest",type:"quest",weight:0.30},
    {id:"chnpp_core_module_1037",icon:"☢",profileIcon:"assets/inventory-items/quest_module.webp",category:"quest",type:"quest",weight:1.20},
    {
      id:"mutant_tooth",
      icon:"🦷",profileIcon:"assets/inventory-items/item_mutant_tooth.webp",
      category:"trophies",
      type:"trophy",
      weight:0.12
    },
    {
      id:"mutant_hide",
      icon:"🟫",profileIcon:"assets/inventory-items/material_common.webp",
      category:"trophies",
      type:"trophy",
      upgradeMaterialRarity:"common",weight:0.45
    },
    {
      id:"scrap",
      icon:"⚙",profileIcon:"assets/inventory-items/material_common.webp",
      category:"resources",
      type:"resource",
      weight:0.18
    },
    {
      id:"battery",
      icon:"🔋",profileIcon:"assets/inventory-items/quest_module.webp",
      category:"resources",
      type:"resource",
      weight:0.15
    },
    {
      id:"lockpick",
      icon:"🗝",profileIcon:"assets/inventory-items/quest_key.webp",
      category:"tools",
      type:"tool",
      weight:0.08
    },
    {
      id:"toolkit",
      icon:"🧰",profileIcon:"assets/inventory-items/item_toolkit.webp",
      category:"tools",
      type:"tool",
      weight:0.85
    },
    {
      id:"flashlight",
      icon:"🔦",profileIcon:"assets/inventory-items/item_flashlight.webp",
      category:"tools",
      type:"tool",
      weight:0.25
    },
    {
      id:"artifact",
      icon:"◆",profileIcon:"assets/inventory-items/material_red.webp",
      category:"other",
      type:"artifact",
      weight:0.35
    },
    {id:"old_mask",icon:"😷",category:"gear",type:"equipment",slot:"mask",weight:0.65,profileIcon:"assets/equipment/items-png/mask.webp"},
    {id:"reinforced_mask",icon:"🥽",category:"gear",type:"equipment",slot:"mask",weight:0.85,profileIcon:"assets/equipment/items-png/mask.webp"},
    {id:"field_armor",icon:"🦺",category:"gear",type:"equipment",slot:"body",weight:4.2,profileIcon:"assets/equipment/items-png/body.webp"},
    {id:"rusty_rifle",icon:"🔫",category:"gear",type:"equipment",slot:"ranged",weight:3.4,profileIcon:"assets/equipment/items-png/ranged.webp"},
    {id:"field_pants",icon:"👖",category:"gear",type:"equipment",slot:"pants",weight:1.1,profileIcon:"assets/equipment/items-png/pants.webp"},
    {id:"weak_artifact",icon:"◆",profileIcon:"assets/inventory-items/material_red.webp",category:"other",type:"resource",weight:0.25},
    {id:"field_hood",icon:"🪖",category:"gear",type:"equipment",slot:"head",weight:0.35,profileIcon:"assets/equipment/items-png/head.webp"},
    {id:"field_cloak",icon:"🧥",category:"gear",type:"equipment",slot:"cloak",weight:1.3,profileIcon:"assets/equipment/items-png/cloak.webp"},
    {id:"field_gloves",icon:"🧤",category:"gear",type:"equipment",slot:"gloves",weight:0.25,profileIcon:"assets/equipment/items-png/gloves.webp"},
    {id:"field_boots",icon:"🥾",category:"gear",type:"equipment",slot:"boots",weight:0.9,profileIcon:"assets/equipment/items-png/boots.webp"},
    {id:"combat_knife",icon:"🔪",category:"gear",type:"equipment",slot:"melee",weight:0.35,profileIcon:"assets/equipment/items-png/melee.webp"},
    {id:"basic_dosimeter",icon:"☢",category:"tools",type:"equipment",slot:"dosimeter",weight:0.2,profileIcon:"assets/equipment/items-png/dosimeter.webp"},
    {id:"uncommon_hide",icon:"🟢",profileIcon:"assets/inventory-items/material_uncommon.webp",category:"resources",type:"resource",upgradeMaterialRarity:"uncommon",weight:0.45},
    {id:"rare_hide",icon:"🔵",profileIcon:"assets/inventory-items/material_rare.webp",category:"resources",type:"resource",upgradeMaterialRarity:"rare",weight:0.45},
    {id:"epic_hide",icon:"🟣",profileIcon:"assets/inventory-items/material_epic.webp",category:"resources",type:"resource",upgradeMaterialRarity:"epic",weight:0.45},
    {id:"legendary_hide",icon:"🟠",profileIcon:"assets/inventory-items/material_legendary.webp",category:"resources",type:"resource",upgradeMaterialRarity:"legendary",weight:0.45}
  ]
};

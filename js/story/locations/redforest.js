/* Story location data. */

const RED_FOREST_ENEMY_IDS=["red_mob_01","red_mob_02","red_mob_03","red_mob_04","red_mob_05","red_mob_06","red_mob_07","red_mob_08"];

const RED_FOREST_STORY = {
  titleKey:"storyLocations.redforest.title",
  descriptionKey:"storyLocations.redforest.description",
  questKey:"storyLocations.redforest.quest",
  objectiveKey:"storyLocations.redforest.objective",
  rewardKey:"storyLocations.redforest.reward",
  rewardData:{xp:400,money:700,items:[{id:"rare_hide",qty:2},{id:"mutant_tooth",qty:5}],equipmentRarity:"rare"},
  required:[...RED_FOREST_ENEMY_IDS,"red_boss"],
  quests:[
    {requirements:["red_mob_01"],labelKey:"storyLocations.redforest.quests.q1"},
    {requirements:["red_mob_02"],labelKey:"storyLocations.redforest.quests.q2"},
    {requirements:["red_mob_03"],labelKey:"storyLocations.redforest.quests.q3"},
    {requirements:["red_mob_04"],labelKey:"storyLocations.redforest.quests.q4"},
    {requirements:["red_mob_05"],labelKey:"storyLocations.redforest.quests.q5"},
    {requirements:["red_mob_06"],labelKey:"storyLocations.redforest.quests.q6"},
    {requirements:["red_mob_07"],labelKey:"storyLocations.redforest.quests.q7"},
    {requirements:["red_mob_08"],labelKey:"storyLocations.redforest.quests.q8"},
    {requirements:["red_boss"],labelKey:"storyLocations.redforest.quests.q9"},
    {requirements:[...RED_FOREST_ENEMY_IDS,"red_boss"],labelKey:"storyLocations.redforest.quests.q10"}
  ],
  scenes:{
    main:{
      image:"redforest.webp",
      introKey:"storyIntro.redforest.main",
      titleKey:"storyLocations.redforest.scenes.main.title",
      hintKey:"storyLocations.redforest.scenes.main.hint",
      areas:[
        {id:"red_mob_01",box:[11,22,14,16],checkAt:[18,30],combat:{type:"raiders",level:5,nameKey:"storyLocations.redforest.enemies.mob1",image:"assets/expeditions/mobs/raiders.webp",energy:5}},
        {id:"red_mob_02",box:[31,29,15,12],checkAt:[39,35],combat:{type:"mutants",level:5,nameKey:"storyLocations.redforest.enemies.mob2",image:"assets/expeditions/mobs/mutants.webp",energy:5}},
        {id:"red_mob_03",box:[73,27,10,15],checkAt:[78,35],combat:{type:"raiders",level:5,nameKey:"storyLocations.redforest.enemies.mob3",image:"assets/expeditions/mobs/raiders.webp",energy:6}},
        {id:"red_mob_04",box:[60,35,13,15],checkAt:[67,43],combat:{type:"mutants",level:5,nameKey:"storyLocations.redforest.enemies.mob4",image:"assets/expeditions/mobs/mutants.webp",energy:6}},
        {id:"red_mob_05",box:[42,39,13,14],checkAt:[49,46],combat:{type:"bunker",level:6,nameKey:"storyLocations.redforest.enemies.mob5",image:"assets/expeditions/mobs/bunker.webp",energy:6}},
        {id:"red_mob_06",box:[9,42,16,15],checkAt:[17,50],combat:{type:"raiders",level:6,nameKey:"storyLocations.redforest.enemies.mob6",image:"assets/expeditions/mobs/raiders.webp",energy:5}},
        {id:"red_mob_07",box:[25,58,22,18],checkAt:[36,67],combat:{type:"mutants",level:6,nameKey:"storyLocations.redforest.enemies.mob7",image:"assets/expeditions/mobs/mutants.webp",energy:6}},
        {id:"red_mob_08",box:[72,66,21,20],checkAt:[83,76],combat:{type:"raiders",level:6,nameKey:"storyLocations.redforest.enemies.mob8",image:"assets/expeditions/mobs/raiders.webp",energy:6}},
        {id:"red_boss",box:[48,10,22,13],checkAt:[59,17],requires:[...RED_FOREST_ENEMY_IDS],failKey:"storyLocations.redforest.scenes.main.bossLocked",combat:{type:"signal",level:6,nameKey:"storyLocations.redforest.enemies.boss",image:"assets/expeditions/bosses/boss-06.webp",energy:10,boss:true}},
        {box:[39,5,34,12],labelKey:"storyLocations.redforest.scenes.main.exit",visibleAfter:["red_boss"],stageTarget:"yaniv",messageKey:"storyLocations.redforest.scenes.main.exitMessage"}
      ]
    }
  }
};

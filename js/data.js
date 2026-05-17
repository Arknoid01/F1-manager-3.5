// ============================================================
//  F1 Manager — data.js  (v5 — grid 2025-2026 + Cadillac)
// ============================================================

const F1Data = {

  // Version des données — changer ce numéro force la mise à jour
  // des équipes/pilotes de base (sans effacer la progression)
  DATA_VERSION: 5,

  // ── PNEUS ─────────────────────────────────────────────────
  tyres: {
    SOFT:   { name: 'Soft',     color: '#FF3333', degradationRate: 0.045, grip: 1.00, warmupLaps: 1 },
    MEDIUM: { name: 'Medium',   color: '#FFD700', degradationRate: 0.025, grip: 0.97, warmupLaps: 2 },
    HARD:   { name: 'Hard',     color: '#FFFFFF', degradationRate: 0.012, grip: 0.94, warmupLaps: 3 },
    INTER:  { name: 'Inter',    color: '#00CC44', degradationRate: 0.030, grip: 0.88, warmupLaps: 2 },
    WET:    { name: 'Full Wet', color: '#4488FF', degradationRate: 0.020, grip: 0.80, warmupLaps: 2 },
  },

  // ── CIRCUITS ──────────────────────────────────────────────
  circuits: [
    { id:'bahrain',     name:'Bahrain',     fullName:'Bahrain International Circuit',        laps:57, lapDistance:5.412, baseLapTime:93.5,  pitLoss:22, overtakingDifficulty:0.40, tyreDegradation:1.20, drsZones:2, fuelPerLap:1.8, rainChance:0.02, dryingRate:8.0, trackTemp:35 , circuitType:'balanced'},
    { id:'jeddah',      name:'Jeddah',      fullName:'Jeddah Corniche Circuit',               laps:50, lapDistance:6.174, baseLapTime:90.5,  pitLoss:21, overtakingDifficulty:0.42, tyreDegradation:0.95, drsZones:3, fuelPerLap:2.1, rainChance:0.03, dryingRate:9.0, trackTemp:38 , circuitType:'street'},
    { id:'melbourne',   name:'Australie',   fullName:'Albert Park Circuit',                   laps:58, lapDistance:5.278, baseLapTime:80.8,  pitLoss:20, overtakingDifficulty:0.55, tyreDegradation:1.00, drsZones:4, fuelPerLap:1.8, rainChance:0.25, dryingRate:5.0, trackTemp:28 , circuitType:'street'},
    { id:'imola',       name:'Imola',       fullName:'Autodromo Enzo e Dino Ferrari',          laps:63, lapDistance:4.909, baseLapTime:78.5,  pitLoss:25, overtakingDifficulty:0.72, tyreDegradation:0.90, drsZones:1, fuelPerLap:1.6, rainChance:0.28, dryingRate:4.5, trackTemp:22 , circuitType:'technical'},
    { id:'miami',       name:'Miami',       fullName:'Miami International Autodrome',          laps:57, lapDistance:5.412, baseLapTime:91.1,  pitLoss:22, overtakingDifficulty:0.50, tyreDegradation:1.15, drsZones:3, fuelPerLap:1.9, rainChance:0.2, dryingRate:6.0, trackTemp:32 , circuitType:'street'},
    { id:'monaco',      name:'Monaco',      fullName:'Circuit de Monaco',                     laps:78, lapDistance:3.337, baseLapTime:75.0,  pitLoss:28, overtakingDifficulty:0.95, tyreDegradation:0.70, drsZones:1, fuelPerLap:1.2, rainChance:0.3, dryingRate:3.5, trackTemp:26 , circuitType:'street'},
    { id:'canada',      name:'Canada',      fullName:'Circuit Gilles-Villeneuve',              laps:70, lapDistance:4.361, baseLapTime:74.0,  pitLoss:19, overtakingDifficulty:0.35, tyreDegradation:1.05, drsZones:3, fuelPerLap:1.55, rainChance:0.22, dryingRate:4.0, trackTemp:24 , circuitType:'balanced'},
    { id:'barcelona',   name:'Espagne',     fullName:'Circuit de Barcelona-Catalunya',         laps:66, lapDistance:4.657, baseLapTime:78.8,  pitLoss:22, overtakingDifficulty:0.62, tyreDegradation:1.35, drsZones:2, fuelPerLap:1.7, rainChance:0.12, dryingRate:6.5, trackTemp:30 , circuitType:'balanced'},
    { id:'austria',     name:'Autriche',    fullName:'Red Bull Ring',                          laps:71, lapDistance:4.318, baseLapTime:66.4,  pitLoss:19, overtakingDifficulty:0.28, tyreDegradation:1.05, drsZones:3, fuelPerLap:1.45, rainChance:0.45, dryingRate:4.0, trackTemp:22 , circuitType:'power'},
    { id:'silverstone', name:'Silverstone', fullName:'Silverstone Circuit',                   laps:52, lapDistance:5.891, baseLapTime:89.5,  pitLoss:21, overtakingDifficulty:0.45, tyreDegradation:1.40, drsZones:2, fuelPerLap:2.0, rainChance:0.35, dryingRate:3.5, trackTemp:22 , circuitType:'high_speed'},
    { id:'hungary',     name:'Hongrie',     fullName:'Hungaroring',                            laps:70, lapDistance:4.381, baseLapTime:78.0,  pitLoss:21, overtakingDifficulty:0.82, tyreDegradation:1.25, drsZones:1, fuelPerLap:1.55, rainChance:0.25, dryingRate:5.0, trackTemp:30 , circuitType:'technical'},
    { id:'spa',         name:'Spa',         fullName:'Circuit de Spa-Francorchamps',           laps:44, lapDistance:7.004, baseLapTime:106.0, pitLoss:24, overtakingDifficulty:0.35, tyreDegradation:1.10, drsZones:2, fuelPerLap:2.2, rainChance:0.48, dryingRate:3.0, trackTemp:20 , circuitType:'high_speed'},
    { id:'zandvoort',   name:'Pays-Bas',    fullName:'Circuit Zandvoort',                      laps:72, lapDistance:4.259, baseLapTime:71.5,  pitLoss:20, overtakingDifficulty:0.75, tyreDegradation:1.18, drsZones:2, fuelPerLap:1.45, rainChance:0.3, dryingRate:3.5, trackTemp:22 , circuitType:'technical'},
    { id:'monza',       name:'Monza',       fullName:'Autodromo Nazionale Monza',              laps:53, lapDistance:5.793, baseLapTime:82.5,  pitLoss:23, overtakingDifficulty:0.30, tyreDegradation:0.90, drsZones:2, fuelPerLap:1.9, rainChance:0.2, dryingRate:5.5, trackTemp:28 , circuitType:'power'},
    { id:'baku',        name:'Azerbaïdjan', fullName:'Baku City Circuit',                      laps:51, lapDistance:6.003, baseLapTime:103.0, pitLoss:20, overtakingDifficulty:0.25, tyreDegradation:0.82, drsZones:2, fuelPerLap:2.0, rainChance:0.08, dryingRate:7.0, trackTemp:32 , circuitType:'street'},
    { id:'singapore',   name:'Singapour',   fullName:'Marina Bay Street Circuit',              laps:62, lapDistance:4.940, baseLapTime:95.0,  pitLoss:27, overtakingDifficulty:0.78, tyreDegradation:1.28, drsZones:3, fuelPerLap:1.75, rainChance:0.41, dryingRate:4.0, trackTemp:32 , circuitType:'street'},
    { id:'suzuka',      name:'Suzuka',      fullName:'Suzuka International Racing Course',     laps:53, lapDistance:5.807, baseLapTime:91.0,  pitLoss:22, overtakingDifficulty:0.60, tyreDegradation:1.15, drsZones:1, fuelPerLap:1.9, rainChance:0.41, dryingRate:4.5, trackTemp:26 , circuitType:'technical'},
    { id:'qatar',       name:'Qatar',       fullName:'Lusail International Circuit',           laps:57, lapDistance:5.419, baseLapTime:84.0,  pitLoss:24, overtakingDifficulty:0.58, tyreDegradation:1.55, drsZones:1, fuelPerLap:1.85, rainChance:0.01, dryingRate:10.0, trackTemp:38 , circuitType:'power'},
    { id:'cota',        name:'États-Unis',  fullName:'Circuit of the Americas',                laps:56, lapDistance:5.513, baseLapTime:97.0,  pitLoss:22, overtakingDifficulty:0.48, tyreDegradation:1.20, drsZones:2, fuelPerLap:1.9, rainChance:0.22, dryingRate:5.5, trackTemp:30 , circuitType:'mixed'},
    { id:'mexico',      name:'Mexique',     fullName:'Autódromo Hermanos Rodríguez',           laps:71, lapDistance:4.304, baseLapTime:78.8,  pitLoss:20, overtakingDifficulty:0.38, tyreDegradation:0.95, drsZones:3, fuelPerLap:1.5, rainChance:0.15, dryingRate:5.0, trackTemp:28 , circuitType:'power'},
    { id:'brazil',      name:'Brésil',      fullName:'Interlagos',                             laps:71, lapDistance:4.309, baseLapTime:71.6,  pitLoss:20, overtakingDifficulty:0.33, tyreDegradation:1.20, drsZones:2, fuelPerLap:1.45, rainChance:0.45, dryingRate:3.5, trackTemp:26 , circuitType:'mixed'},
    { id:'vegas',       name:'Las Vegas',   fullName:'Las Vegas Strip Circuit',                laps:50, lapDistance:6.201, baseLapTime:94.0,  pitLoss:21, overtakingDifficulty:0.32, tyreDegradation:0.78, drsZones:2, fuelPerLap:2.05, rainChance:0.04, dryingRate:9.0, trackTemp:18 , circuitType:'street'},
    { id:'abudhabi',    name:'Abu Dhabi',   fullName:'Yas Marina Circuit',                     laps:58, lapDistance:5.281, baseLapTime:87.5,  pitLoss:22, overtakingDifficulty:0.52, tyreDegradation:0.98, drsZones:2, fuelPerLap:1.85, rainChance:0.02, dryingRate:9.5, trackTemp:36 , circuitType:'balanced'},
  ],

  // ── ÉQUIPES 2025 (+ Cadillac 2026) ───────────────────────
  teams: [
    // McLaren — Champions constructeurs 2024, dominants 2025
    { id:'mclaren',     name:'McLaren',         shortName:'MCL', color:'#FF8000', accentColor:'#FFFFFF', budget:195, performance:95, reliability:88, aero:96, chassis:94, engine:90, isPlayer:false , logo: 'img/teams/mclaren.png' },
    // Ferrari — Leclerc + Hamilton, challenger principal
    { id:'ferrari',     name:'Ferrari',         shortName:'FER', color:'#CC0000', accentColor:'#FFD700', budget:200, performance:92, reliability:85, aero:91, chassis:90, engine:96, isPlayer:false , logo: 'img/teams/ferrari.png' },
    // Red Bull — Verstappen + Tsunoda (après swap Lawson)
    { id:'redbull',     name:'Red Bull Racing', shortName:'RBR', color:'#1E3A6E', accentColor:'#FFD700', budget:205, performance:90, reliability:86, aero:92, chassis:90, engine:93, isPlayer:false , logo: 'img/teams/redbull.png' },
    // Mercedes — Russell + Antonelli (rookie)
    { id:'mercedes',    name:'Mercedes',        shortName:'MER', color:'#00D2BE', accentColor:'#FFFFFF', budget:200, performance:87, reliability:90, aero:86, chassis:88, engine:96, isPlayer:false , logo: 'img/teams/mercedes.png' },
    // Aston Martin — Newey recruté, gros projet 2026
    { id:'aston',       name:'Aston Martin',    shortName:'AMR', color:'#006F62', accentColor:'#FFD700', budget:170, performance:78, reliability:82, aero:77, chassis:79, engine:88, isPlayer:false , logo: 'img/teams/aston.png' },
    // Alpine — Saison chaotique, Gasly + Colapinto (remplace Doohan)
    { id:'alpine',      name:'Alpine',          shortName:'ALP', color:'#0090FF', accentColor:'#FF0000', budget:130, performance:70, reliability:76, aero:70, chassis:69, engine:82, isPlayer:false , logo: 'img/teams/alpine.png' },
    // Williams — Albon + Sainz, remontée sous Vowles
    { id:'williams',    name:'Williams',        shortName:'WIL', color:'#005AFF', accentColor:'#FFFFFF', budget:90, performance:68, reliability:76, aero:67, chassis:69, engine:85, isPlayer:false , logo: 'img/teams/williams.png' },
    // Haas — Bearman + Ocon, nouvelle ère
    { id:'haas',        name:'Haas',            shortName:'HAA', color:'#E8002D', accentColor:'#FFFFFF', budget:75, performance:63, reliability:73, aero:62, chassis:64, engine:85, isPlayer:false , logo: 'img/teams/haas.png' },
    // Kick Sauber — Hülkenberg + Bortoleto, transition Audi
    { id:'sauber',      name:'Audi',            shortName:'AUD', color:'#BB0000', accentColor:'#FFFFFF', budget:95, performance:63, reliability:74, aero:62, chassis:63, engine:85, isPlayer:false , logo: 'img/teams/sauber.png' },
    // Racing Bulls — Lawson + Hadjar (après swap Tsunoda→Red Bull)
    { id:'racingbulls', name:'Racing Bulls',    shortName:'RCB', color:'#6692FF', accentColor:'#FFD700', budget:88, performance:72, reliability:77, aero:71, chassis:73, engine:85, isPlayer:false , logo: 'img/teams/racingbulls.png' },
    // Cadillac — 11ème équipe 2026, Pérez + Bottas
    { id:'cadillac',    name:'Cadillac',        shortName:'CAD', color:'#6F6F78', accentColor:'#FFFFFF', budget:115, performance:55, reliability:65, aero:54, chassis:56, engine:82, isPlayer:false , logo: 'img/teams/cadillac.png' },
  ],

  // ── PILOTES 2025-2026 ────────────────────────────────────
  drivers: [
    // ── McLAREN ──────────────────────────────────────────────
    { id:'NOR', name:'Norris',      firstName:'Lando',    teamId:'mclaren',     number:1,  age:26, pace:96, consistency:91, wetSkill:90, overtaking:93, defending:86, salary:25,  trait:'aggressive',     potential:98, retired:false },
    { id:'PIA', name:'Piastri',     firstName:'Oscar',    teamId:'mclaren',     number:81, age:25, pace:93, consistency:90, wetSkill:86, overtaking:88, defending:83, salary:15,  trait:'consistent',     potential:97, retired:false },

    // ── FERRARI ──────────────────────────────────────────────
    { id:'LEC', name:'Leclerc',     firstName:'Charles',  teamId:'ferrari',     number:16, age:28, pace:95, consistency:88, wetSkill:93, overtaking:90, defending:86, salary:32,  trait:'qualifier',     potential:97, retired:false },
    { id:'HAM', name:'Hamilton',    firstName:'Lewis',    teamId:'ferrari',     number:44, age:41, pace:92, consistency:90, wetSkill:97, overtaking:91, defending:91, salary:45,  trait:'rain_master',     potential:92, retired:false },

    // ── RED BULL ─────────────────────────────────────────────
    { id:'VER', name:'Verstappen',  firstName:'Max',      teamId:'redbull',     number:3,  age:28, pace:97, consistency:95, wetSkill:96, overtaking:94, defending:93, salary:60,  trait:'aggressive',     potential:99, retired:false },
    // Tsunoda promu chez Red Bull après 2 courses (remplace Lawson)
    { id:'TSU', name:'Tsunoda',     firstName:'Yuki',     teamId:'racingbulls', number:22, age:25, pace:84, consistency:80, wetSkill:80, overtaking:82, defending:76, salary:4,  trait:'aggressive',     potential:89, retired:false },

    // ── MERCEDES ─────────────────────────────────────────────
    { id:'RUS', name:'Russell',     firstName:'George',   teamId:'mercedes',    number:63, age:28, pace:92, consistency:90, wetSkill:89, overtaking:89, defending:85, salary:14,  trait:'qualifier',     potential:95, retired:false },
    // Kimi Antonelli — rookie 2025, immense talent
    { id:'ANT', name:'Antonelli',   firstName:'Andrea Kimi', teamId:'mercedes', number:12, age:19, pace:88, consistency:81, wetSkill:84, overtaking:85, defending:76, salary:4,  trait:'prodigy',     potential:98, retired:false },

    // ── ASTON MARTIN ─────────────────────────────────────────
    { id:'ALO', name:'Alonso',      firstName:'Fernando', teamId:'aston',       number:14, age:44, pace:90, consistency:89, wetSkill:93, overtaking:90, defending:96, salary:20,  trait:'defender',     potential:90, retired:false },
    { id:'STR', name:'Stroll',      firstName:'Lance',    teamId:'aston',       number:18, age:27, pace:79, consistency:76, wetSkill:74, overtaking:75, defending:77, salary:8,  trait:'consistent',     potential:83, retired:false },

    // ── ALPINE ───────────────────────────────────────────────
    { id:'GAS', name:'Gasly',       firstName:'Pierre',   teamId:'alpine',      number:10, age:30, pace:84, consistency:82, wetSkill:83, overtaking:81, defending:80, salary:6,  trait:'aggressive',     potential:88, retired:false },
    // Colapinto remplace Doohan après 6 courses
    { id:'COL', name:'Colapinto',   firstName:'Franco',   teamId:'alpine',      number:43, age:22, pace:83, consistency:78, wetSkill:80, overtaking:81, defending:75, salary:3,  trait:'aggressive',     potential:93, retired:false },

    // ── WILLIAMS ─────────────────────────────────────────────
    { id:'ALB', name:'Albon',       firstName:'Alexander',teamId:'williams',    number:23, age:30, pace:82, consistency:81, wetSkill:80, overtaking:80, defending:78, salary:4,  trait:'overtaker',     potential:87, retired:false },
    { id:'SAI', name:'Sainz',       firstName:'Carlos',   teamId:'williams',    number:55, age:31, pace:91, consistency:92, wetSkill:87, overtaking:87, defending:89, salary:14,  trait:'consistent',     potential:94, retired:false },

    // ── HAAS ─────────────────────────────────────────────────
    // Bearman — rookie très prometteur, ex-Ferrari junior
    { id:'BEA', name:'Bearman',     firstName:'Ollie',    teamId:'haas',        number:87, age:21, pace:84, consistency:79, wetSkill:79, overtaking:80, defending:76, salary:3,  trait:'prodigy',     potential:94, retired:false },
    // Ocon — vient d'Alpine, expérimenté
    { id:'OCO', name:'Ocon',        firstName:'Esteban',  teamId:'haas',        number:31, age:29, pace:81, consistency:80, wetSkill:79, overtaking:78, defending:79, salary:5,  trait:'consistent',     potential:85, retired:false },

    // ── AUDI ────────────────────────────────────────────────
    { id:'HUL', name:'Hülkenberg',  firstName:'Nico',     teamId:'sauber',      number:27, age:38, pace:83, consistency:84, wetSkill:81, overtaking:79, defending:81, salary:6,  trait:'consistent',     potential:87, retired:false },
    // Bortoleto — rookie F2 champion 2024, énorme potentiel
    { id:'BOR', name:'Bortoleto',   firstName:'Gabriel',  teamId:'sauber',      number:5,  age:21, pace:85, consistency:80, wetSkill:81, overtaking:83, defending:74, salary:3,  trait:'prodigy',     potential:96, retired:false },

    // ── RACING BULLS ─────────────────────────────────────────
    { id:'LIN', name:'Lindblad',    firstName:'Arvid',    teamId:'racingbulls', number:41, age:18, pace:79, consistency:73, wetSkill:74, overtaking:76, defending:69, salary:2,  trait:'prodigy',     potential:93, retired:false },
    // Hadjar — rookie F2 runner-up 2024
    { id:'HAD', name:'Hadjar',      firstName:'Isack',    teamId:'redbull',     number:6,  age:21, pace:83, consistency:78, wetSkill:77, overtaking:81, defending:73, salary:2,  trait:'qualifier',     potential:93, retired:false },

    // ── CADILLAC (2026) ──────────────────────────────────────
    { id:'PER', name:'Pérez',       firstName:'Sergio',   teamId:'cadillac',    number:11, age:36, pace:83, consistency:80, wetSkill:78, overtaking:81, defending:83, salary:8,  trait:'consistent',     potential:86, retired:false },
    { id:'BOT', name:'Bottas',      firstName:'Valtteri', teamId:'cadillac',    number:77, age:36, pace:80, consistency:82, wetSkill:79, overtaking:76, defending:78, salary:5,  trait:'consistent',     potential:84, retired:false },
  ],

    // ── TRAITS PILOTES ────────────────────────────────────────
  traits: {
    aggressive:  { label:'Agressif',       icon:'🔥', desc:'Dépassements plus faciles, pneus plus usés',        paceBonus:0.15,  tyreMultiplier:1.20, overtakingBonus:3,  wetPenalty:0  },
    consistent:  { label:'Régulier',       icon:'📊', desc:'Rythme stable, gère bien les longs relais',          paceBonus:0,     tyreMultiplier:0.88, overtakingBonus:0,  wetPenalty:0  },
    qualifier:   { label:'Qualifiant',     icon:'⚡', desc:'Très rapide sur un tour, légèrement moins en course', paceBonus:0.20,  tyreMultiplier:1.10, overtakingBonus:1,  wetPenalty:0  },
    rain_master: { label:'Maître pluie',   icon:'🌧️', desc:'Exceptionnel sous la pluie',                        paceBonus:0,     tyreMultiplier:0.95, overtakingBonus:0,  wetPenalty:-5 },
    defender:    { label:'Défenseur',      icon:'🛡️', desc:'Défend très bien sa position',                       paceBonus:0,     tyreMultiplier:0.90, overtakingBonus:-2, wetPenalty:0  },
    overtaker:   { label:'Dépasseur',      icon:'🏎️', desc:'Spécialiste du dépassement en course',               paceBonus:0.05,  tyreMultiplier:1.05, overtakingBonus:5,  wetPenalty:0  },
    prodigy:     { label:'Prodige',        icon:'🌟', desc:'Talent exceptionnel, progression ultra rapide',       paceBonus:0.10,  tyreMultiplier:1.00, overtakingBonus:2,  wetPenalty:0  },
    technical:   { label:'Technicien',     icon:'🔧', desc:'Excellent feedback technique, optimise la voiture',  paceBonus:0.05,  tyreMultiplier:0.85, overtakingBonus:0,  wetPenalty:0  },
  },

  // ── NUMÉROS DISPONIBLES pour nouveaux pilotes ─────────────
  availableNumbers: [2,3,7,8,9,13,15,17,19,20,21,24,25,26,28,29,32,33,34,35,36,37,38,39,40,41,42,45,46,47,48,49,50,51,52,53,54,56,57,58,59,60,61,62,64,65,66,67,68,69,70,71,72,73,74,75,76,78,79,80,82,83,84,85,86,88,89,90,91,92,93,94,95,96,97,98],

  // ── BASE DE NOMS ─────────────────────────────────────────
  driverNames: {
    // Prénoms par nationalité
    firstNames: {
      french:    ['Pierre','Charles','Romain','Jules','Anthoine','Esteban','François','Sébastien','Olivier','Jean','Victor','Hugo','Louis','Théo','Maxime','Adrien','Baptiste','Clément','Damien','Émile'],
      british:   ['Lewis','George','Lando','Oliver','Jack','Jamie','Tom','Harry','Oscar','Callum','Will','James','Alex','Sam','Luke','Dan','Max','Ryan','Jake','Ben'],
      german:    ['Sebastian','Nico','Mick','David','Pascal','Adrian','Felix','Moritz','Florian','Philipp','Jan','Fabian','Simon','Tobias','Michael','Ralf','Heinz','Karl'],
      spanish:   ['Carlos','Fernando','Alex','Marc','Sergio','Dani','Pedro','Roberto','Miguel','Antonio','Juan','Diego','Álvaro','Raúl','Iván','Lorenzo','Víctor'],
      dutch:     ['Max','Nyck','Giedo','Daniël','Rinus','Robin','Bart','Jeroen','Jos','Tom','Liam','Tijmen'],
      italian:   ['Antonio','Luca','Marco','Andrea','Roberto','Davide','Giovanni','Matteo','Lorenzo','Riccardo','Edoardo','Giuliano','Paolo','Stefano'],
      japanese:  ['Yuki','Kazuki','Naoki','Ryo','Kenji','Hiroshi','Takuma','Daisuke','Sho','Nobuharu','Kenta','Marino','Ritomo'],
      brazilian: ['Felipe','Bruno','Nelson','Rubens','Emerson','Ayrton','Piquet','Gabriel','Caio','Vitor','Luca','Pietro','Enzo'],
      australian:['Oscar','Jack','Mark','David','Will','Mitch','Cameron','Thomas','Daniel','Marcus','James','Ryan','Liam'],
      canadian:  ['Lance','Jacques','Gilles','Patrick','Nicholas','Robert','Andre','Mike','Kevin'],
      chinese:   ['Guanyu','Yifei','Ye','Zheng','Wei','Hua','Xin'],
      american:  ['Logan','Mario','Eddie','Scott','Alexander','Ryan','Connor','Tyler','Chase','Austin','Hunter'],
      mexican:   ['Sergio','Esteban','José','Luis','Ricardo','Emiliano','Rodrigo','Diego'],
      finnish:   ['Valtteri','Kimi','Mika','Heikki','Leo','Eetu','Aleksi','Teemu'],
      monegasque:['Charles','Arthur','Louis','Pierre'],
      danish:    ['Kevin','Jan','Tom','Mikkel','Marcus','Frederik'],
    },
    // Noms de famille par nationalité
    lastNames: {
      french:    ['Gasly','Ocon','Grosjean','Vergne','Bianchi','Prost','Villeneuve','Celis','Aubry','Laurent','Renault','Dupont','Martin','Bernard','Lefevre','Fontaine','Girard','Mercier','Dubois','Petit'],
      british:   ['Hamilton','Russell','Norris','Albon','Button','Coulthard','Hill','Mansell','Moss','Clark','Surtees','Hunt','Watson','Warwick','Herbert','Blundell','Palmer','Heidfeld'],
      german:    ['Vettel','Schumacher','Rosberg','Hülkenberg','Marko','Weber','Frentzen','Wendlinger','Ludwig','Barth','Winkelhock','Auer','Trummer'],
      spanish:   ['Sainz','Alonso','Montoya','de la Rosa','Campos','Criville','Aspar','Lopez','Merhi','Llopis','Rueda'],
      dutch:     ['Verstappen','van der Garde','Doornbos','Bleekemolen','Lammers','Vermeulen'],
      italian:   ['Leclerc','Giovinazzi','Fisichella','Trulli','Barrichello','Piquet','Farina','Ascari','Nuvolari','Varzi'],
      japanese:  ['Tsunoda','Kobayashi','Nakajima','Suzuki','Sato','Yamamoto','Inoue','Kato','Noda','Hattori'],
      brazilian: ['Piquet','Barrichello','Massa','Fittipaldi','Senna','Prost','Alesi','Rosset','Bueno','Neto'],
      australian:['Webber','Ricciardo','Brabham','Moffat','Brock','Jones','Davison','Caruso'],
      canadian:  ['Stroll','Villeneuve','Doornbos','Comeau','Tagliani','Lapointe'],
      chinese:   ['Zhou','Ye','Ping','Li','Zhang','Wang','Chen','Liu'],
      american:  ['Sargeant','Andretti','Rahal','Tracy','Franchitti','Sullivan','McGee'],
      mexican:   ['Pérez','Rodriguez','Guerrero','Ibarra','Cortez','Medina'],
      finnish:   ['Bottas','Räikkönen','Häkkinen','Kovalainen','Salo','Rosberg'],
      monegasque:['Leclerc','Grimaldi','Noghes','Frissette'],
      danish:    ['Magnussen','Kristensen','Nielsen','Mortensen','Hansen'],
    },
  },

  // ── SPONSORS ──────────────────────────────────────────────
  sponsorBrands: ['Oracle','Heineken 0.0','DHL','Pirelli','Rolex','Qatar Airways','AWS','Aramco','Santander','Shell','Petronas','Castore','Monster Energy','Google Chrome','OKX','BWT'],

  // ── STAFF ─────────────────────────────────────────────────
  staffPool: [
    { id:'newey',     name:'Adrian Newey',        role:'Directeur technique', bonus:'aero',        level:98, salary:25, cost:45 },
    { id:'wache',     name:'Pierre Waché',         role:'Technique',           bonus:'chassis',     level:91, salary:12, cost:28 },
    { id:'allison',   name:'James Allison',        role:'Technique',           bonus:'chassis',     level:93, salary:15, cost:32 },
    { id:'seidl',     name:'Andreas Seidl',        role:'Opérations',          bonus:'pitstop',     level:86, salary:8,  cost:18 },
    { id:'wheatley',  name:'Jonathan Wheatley',    role:'Sportif',             bonus:'reliability', level:88, salary:8,  cost:20 },
    { id:'stella',    name:'Andrea Stella',        role:'Team principal',      bonus:'consistency', level:90, salary:10, cost:24 },
  ],

  // ── POINTS F1 ─────────────────────────────────────────────
  pointsSystem: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],

  // ── ARBRE R&D ─────────────────────────────────────────────
  // Chaque domaine a 3 niveaux d'upgrade + 1 concept voiture suivante
  // cost : budget M€ | tokens : tokens R&D | gain : points de stat
  // deliveryGps : tours avant livraison | requires : niveau prérequis
  rdTree: {

    aero: {
      label: 'Aérodynamique', icon: '🌊', color: '#3d7eff',
      stat: 'aero',
      upgrades: [
        { id:'aero_1', level:1, name:'Fond plat optimisé',      desc:'Refonte du fond plat pour réduire la traînée.',          cost:10, tokens:1, gain:2, deliveryGps:4, requires:null },
        { id:'aero_2', level:2, name:'Nouveau aileron avant',   desc:'Aileron avant à 5 volets, meilleure charge en virage.',   cost:20, tokens:3, gain:3, deliveryGps:5, requires:'aero_1' },
        { id:'aero_3', level:3, name:'Concept aéro radical',    desc:'Refonte complète du concept aérodynamique.',             cost:38, tokens:5, gain:4, deliveryGps:7, requires:'aero_2' },
      ],
      nextYear: { id:'aero_ny', name:'Architecture 2026',       desc:'Nouveau concept pour le règlement 2026.',                cost:50, tokens:6, gain:5, isNextYear:true },
    },

    chassis: {
      label: 'Châssis', icon: '🏗️', color: '#e8003d',
      stat: 'chassis',
      upgrades: [
        { id:'chas_1', level:1, name:'Suspension révisée',      desc:'Géométrie de suspension améliorée, meilleur transfert.',  cost:12, tokens:1, gain:2, deliveryGps:4, requires:null },
        { id:'chas_2', level:2, name:'Monocoque allégée',       desc:'Nouvelle monocoque en composite carbone.',               cost:24, tokens:3, gain:3, deliveryGps:5, requires:'chas_1' },
        { id:'chas_3', level:3, name:'Plateforme renforcée',    desc:'Refonte complète de la plateforme châssis.',             cost:42, tokens:5, gain:4, deliveryGps:7, requires:'chas_2' },
      ],
      nextYear: { id:'chas_ny', name:'Châssis 2026',            desc:'Architecture châssis conçue pour le nouveau règlement.', cost:55, tokens:6, gain:5, isNextYear:true },
    },

    engine: {
      label: 'Moteur / ERS', icon: '⚡', color: '#ff8c42',
      stat: 'engine',
      upgrades: [
        { id:'eng_1',  level:1, name:'Mapping moteur optimisé', desc:'Nouveau mapping, meilleure utilisation de l\'énergie.',   cost:15, tokens:1, gain:2, deliveryGps:3, requires:null },
        { id:'eng_2',  level:2, name:'ERS amélioré',            desc:'Nouvelle batterie ERS, déploiement plus efficace.',      cost:28, tokens:3, gain:2, deliveryGps:5, requires:'eng_1' },
        { id:'eng_3',  level:3, name:'Unité de puissance V3',   desc:'Troisième spec moteur de la saison.',                    cost:48, tokens:5, gain:3, deliveryGps:7, requires:'eng_2' },
      ],
      nextYear: { id:'eng_ny', name:'Moteur hybride 2026',      desc:'Nouveau groupe propulseur pour le règlement 2026.',      cost:65, tokens:7, gain:5, isNextYear:true },
    },

    reliability: {
      label: 'Fiabilité', icon: '🛡️', color: '#00d97e',
      stat: 'reliability',
      upgrades: [
        { id:'rel_1',  level:1, name:'Refroidissement amélioré',desc:'Meilleure gestion thermique, moins de surchauffe.',      cost:10, tokens:1, gain:2, deliveryGps:3, requires:null },
        { id:'rel_2',  level:2, name:'Hydraulique renforcé',    desc:'Circuit hydraulique revu, réduction des fuites.',        cost:18, tokens:3, gain:3, deliveryGps:4, requires:'rel_1' },
        { id:'rel_3',  level:3, name:'Système de contrôle v3',  desc:'Nouveau software de monitoring pièces critiques.',       cost:30, tokens:4, gain:3, deliveryGps:6, requires:'rel_2' },
      ],
      nextYear: { id:'rel_ny', name:'Fiabilité 2026',           desc:'Conception durable pour le nouveau règlement.',          cost:42, tokens:5, gain:4, isNextYear:true },
    },

    pitstop: {
      label: 'Pit Stop', icon: '⏱️', color: '#f5c842',
      stat: 'pitstop',
      upgrades: [
        { id:'pit_1',  level:1, name:'Outils pneumatiques v2',  desc:'Nouvelle génération d\'outils, gain de 0.3s.',           cost:8,  tokens:1, gain:2, deliveryGps:3, requires:null },
        { id:'pit_2',  level:2, name:'Procédures optimisées',   desc:'Révision complète des procédures stands.',               cost:14, tokens:2, gain:3, deliveryGps:4, requires:'pit_1' },
        { id:'pit_3',  level:3, name:'Rig d\'entraînement',     desc:'Simulateur d\'arrêts pour améliorer la précision.',      cost:24, tokens:3, gain:3, deliveryGps:5, requires:'pit_2' },
      ],
      nextYear: { id:'pit_ny', name:'Stand 2026',               desc:'Refonte complète du processus pit stop.',                cost:28, tokens:4, gain:4, isNextYear:true },
    },
  },

  // Token freeze supprimé — remplacé par rendement décroissant après course 15
  LATE_SEASON_RACE: 15,        // après cette course, gain réduit de 30%
  LATE_SEASON_PENALTY: 0.70,   // multiplicateur de gain en fin de saison

  // Revenus Concorde par position constructeurs (M€/saison)
  concordeRevenues: [120, 100, 85, 72, 62, 54, 46, 38, 30, 22, 15],

  // Budget R&D = 40% du budget total
  rdBudgetRatio: 0.40,

  // Cycles réglementaires — reset partiel des performances
  // Chaque nouveau règlement remet les bases à zéro selon l'investissement next year
  regulationCycles: [
    { season: 2028, name: 'Règlement 2028', desc: 'Nouveau règlement technique majeur — voitures actives, effet de sol renforcé', resetFactor: 0.82 },
    { season: 2031, name: 'Règlement 2031', desc: 'Réforme aérodynamique et motorisation hybride avancée', resetFactor: 0.80 },
    { season: 2034, name: 'Règlement 2034', desc: 'Transition vers motorisation durable', resetFactor: 0.78 },
  ],

  // Multiplicateurs d'investissement next year selon le règlement
  // Plus tu investis tôt, plus le bonus au reset est important
  nextYearBonusMultiplier: 1.8, // gain × 1.8 si nouveau règlement

  // Concepts risqués par domaine — pari R&D
  // Succès : +bigGain, Échec : -smallLoss, Probabilité selon niveau tech équipe
  riskyConceptCost: { budget: 20, tokens: 3 },
  riskyConceptOutcomes: {
    success: { gain: 6, probability: 0.35 },
    partial: { gain:  2, probability: 0.35 },
    failure: { gain: -5, probability: 0.30 },
  },

  // Spécialisations — bonus sur certains circuits si domaine élevé
  specializations: {
    aero:        { threshold: 90, circuitTypes: ['technical','street'], bonus: 0.8 },
    chassis:     { threshold: 90, circuitTypes: ['high_speed','mixed'], bonus: 0.7 },
    engine:      { threshold: 90, circuitTypes: ['power'],              bonus: 0.9 },
    reliability: { threshold: 88, circuitTypes: ['all'],                bonus: 0.5 },
    pitstop:     { threshold: 85, circuitTypes: ['all'],                bonus: 0.3 },
  },

};

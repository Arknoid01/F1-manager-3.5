// ============================================================
//  F1 Manager — events.js  (v2 — événements enrichis)
//  Événements carrière, objectifs direction, news center
// ============================================================

const CareerEvents = {
  KEY_LAST_PRE: '_lastPreEventRaceKey',

  rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  ensure(save) {
    save.news          = save.news          || [];
    save.reputation    = Number.isFinite(save.reputation) ? save.reputation : 50;
    save.driverEffects = save.driverEffects || {};
    save.contracts     = save.contracts     || {};
    save.aiDevelopment = save.aiDevelopment || {};
    save.boardObjectives = save.boardObjectives || this.generateObjectives(save);
    save.boardPressure = Number.isFinite(save.boardPressure) ? save.boardPressure : 0;
    save.fanBase       = Number.isFinite(save.fanBase) ? save.fanBase : 50;
    return save;
  },

  teamDrivers(save) {
    return F1Data.drivers.filter(d => d.teamId && d.teamId !== 'free_agent' && d.teamId === save.playerTeamId);
  },

  // ── NEWS LOG ──────────────────────────────────────────────
  log(save, item) {
    this.ensure(save);
    save.news.unshift({
      date:   new Date().toISOString(),
      season: save.season,
      race:   save.race,
      ...item
    });
    save.news = save.news.slice(0, 50);
  },

  // ── EFFETS TEMPORAIRES SUR PILOTES ────────────────────────
  applyDriverEffect(save, driverId, effect) {
    this.ensure(save);
    const cur = save.driverEffects[driverId] || {
      pace:0, consistency:0, wetSkill:0, overtaking:0, defending:0, races:0, label:''
    };
    ['pace','consistency','wetSkill','overtaking','defending']
      .forEach(k => cur[k] = (cur[k]||0) + (effect[k]||0));
    cur.races = Math.max(cur.races||0, effect.races||1);
    cur.label = effect.label || cur.label;
    save.driverEffects[driverId] = cur;
  },

  decayEffects(save) {
    this.ensure(save);
    Object.keys(save.driverEffects).forEach(id => {
      save.driverEffects[id].races = (save.driverEffects[id].races||0) - 1;
      if (save.driverEffects[id].races <= 0) delete save.driverEffects[id];
    });
  },

  // ── OBJECTIFS DIRECTION (BOARD) ───────────────────────────
  generateObjectives(save) {
    const team  = F1Data.teams.find(t => t.id === save?.playerTeamId);
    const perf  = team?.performance || 70;
    const season = save?.season || 2025;

    // Objectifs calibrés selon le niveau de l'équipe
    let constructorTarget, driverTarget, minRaces, budgetTarget;

    if (perf >= 90) {
      constructorTarget = 1; driverTarget = 1; minRaces = 15; budgetTarget = 50;
    } else if (perf >= 80) {
      constructorTarget = 3; driverTarget = 5; minRaces = 10; budgetTarget = 30;
    } else if (perf >= 70) {
      constructorTarget = 5; driverTarget = 8; minRaces = 6;  budgetTarget = 15;
    } else {
      constructorTarget = 8; driverTarget = 12; minRaces = 3; budgetTarget = 8;
    }

    return {
      season,
      constructorPos:  constructorTarget,
      driverPos:       driverTarget,
      minPointsRaces:  minRaces,
      budgetSurplus:   budgetTarget,
      description: [
        `Terminer P${constructorTarget} au championnat constructeurs`,
        `Avoir un pilote dans le top ${driverTarget} pilotes`,
        `Marquer des points dans ${minRaces} courses`,
        `Dégager un surplus de ${budgetTarget}M€ en fin de saison`,
      ],
    };
  },

  // Évaluer si les objectifs sont atteints
  evaluateObjectives(save) {
    if (!save?.boardObjectives) return { score:0, details:[], racesDone:0, racesWithPoints:0 };

    const obj = save.boardObjectives;
    const details = [];
    let score = 0;

    const sameId = (a,b) => String(a) === String(b);
    const currentSeason = Number(save.season || obj.season || 2025);
    const totalRaces = F1Data?.circuits?.length || 24;

    // Ne lit que les résultats de la saison en cours.
    // Important : certaines anciennes sauvegardes gardent l'historique de plusieurs saisons dans raceResults.
    const seasonResults = (save.raceResults || []).filter(r => {
      if (r.season === undefined || r.season === null) return true;
      return Number(r.season) === currentSeason;
    });
    const racesDone = seasonResults.length || Number(save.race || 0) || 0;
    const seasonStarted = racesDone > 0;
    const seasonFinished = racesDone >= totalRaces;

    // Position constructeurs
    const teams = [...F1Data.teams].sort((a,b) =>
      (Number(save.teamStandings?.[b.id])||0) - (Number(save.teamStandings?.[a.id])||0)
    );
    const constPos = seasonStarted ? (teams.findIndex(t => sameId(t.id, save.playerTeamId)) + 1) : null;
    const constOk  = constPos ? constPos <= obj.constructorPos : null;
    details.push({ label:`Constructeurs ${constPos ? `P${constPos}` : '—'}/${obj.constructorPos}`, ok: constOk, finalOnly:true });
    if (constOk) score += 30;

    // Position pilote
    const allDrivers = [...F1Data.drivers].filter(d=>!d.retired)
      .sort((a,b)=>(Number(save.driverStandings?.[b.id])||0)-(Number(save.driverStandings?.[a.id])||0));
    const driverPos = seasonStarted ? (allDrivers.findIndex(d=>sameId(d.teamId, save.playerTeamId))+1) : null;
    const driverOk  = driverPos ? driverPos <= obj.driverPos : null;
    details.push({ label:`Pilote ${driverPos ? `P${driverPos}` : '—'}/${obj.driverPos}`, ok: driverOk, finalOnly:true });
    if (driverOk) score += 30;

    // Courses avec points
    const racesWithPoints = seasonResults.filter(r => {
      const playerPts = (r.results||[])
        .filter(x => sameId(x.teamId ?? x.team?.id, save.playerTeamId))
        .reduce((sum, x) => sum + (Number(x.points)||0), 0);
      return playerPts > 0;
    }).length;
    const racesOk = racesWithPoints >= (Number(obj.minPointsRaces)||0);
    details.push({ label:`${racesWithPoints}/${obj.minPointsRaces} courses avec points`, ok: racesOk, progress:racesWithPoints, target:obj.minPointsRaces });
    if (racesOk) score += 20;

    // Santé financière : utilise l'objectif sauvegardé si disponible au lieu d'une valeur fixe.
    const budgetTarget = Number.isFinite(Number(obj.budgetSurplus)) ? Number(obj.budgetSurplus) : 50;
    const budgetOk = (Number(save.budget)||0) >= budgetTarget;
    details.push({ label:`Budget ${Math.round((Number(save.budget)||0)*10)/10}/${budgetTarget}M€`, ok: budgetOk, target:budgetTarget });
    if (budgetOk) score += 20;

    return { score, details, constPos, driverPos, racesWithPoints, racesDone, seasonFinished, budgetTarget };
  },

  // Calculer la pression du board
  updateBoardPressure(save) {
    const eval_ = this.evaluateObjectives(save);
    const races  = (save.raceResults||[]).length;
    if (races < 3) return; // trop tôt pour juger

    // Pression monte si objectifs pas atteints
    const deficit = 100 - eval_.score;
    save.boardPressure = Math.min(100, (save.boardPressure||0) + deficit * 0.02);
    save.boardPressure = Math.max(0,   save.boardPressure - eval_.score * 0.01);
    save.boardPressure = Math.round(save.boardPressure * 10) / 10;
  },

  getPressureLevel(pressure) {
    if (pressure >= 80) return { label:'🔴 Licenciement imminent', color:'#ff2244', fire:true };
    if (pressure >= 60) return { label:'🟠 Forte pression',        color:'#ff8844', fire:false };
    if (pressure >= 40) return { label:'🟡 Sous surveillance',     color:'#ffdd44', fire:false };
    if (pressure >= 20) return { label:'🟢 Acceptable',            color:'#44cc44', fire:false };
    return                     { label:'✅ Direction satisfaite',  color:'#00e676', fire:false };
  },

  // ── RÉPUTATION & FANS ─────────────────────────────────────
  updateFanBase(save, racePosition) {
    const change = racePosition === 1  ? +8
      : racePosition <= 3  ? +4
      : racePosition <= 10 ? +1
      : racePosition <= 15 ? -1
      : -3;
    save.fanBase = Math.max(0, Math.min(100, (save.fanBase||50) + change));
  },

  // ── ÉVÉNEMENTS PRÉ-COURSE ─────────────────────────────────
  triggerPreRace(save) {
    this.ensure(save);
    const raceKey = `${save.season}-${save.race}`;
    // On laisse weekend.html gérer le "une seule fois par GP" via sa propre clé
    // On garde juste la clé pour la compatibilité avec d'autres appelants
    save[this.KEY_LAST_PRE] = raceKey;
    const drivers = this.teamDrivers(save);
    if (!drivers.length) return null;
    const d = this.rand(drivers);

    const circuit = F1Data.circuits[(save.race||0) % F1Data.circuits.length];
    const circName = circuit?.name || 'ce circuit';
    const circId   = circuit?.id || '';

    // 45% événement gameplay, 55% news ambiance/immersion (jamais silencieux)
    if (Math.random() > 0.45) {
      return this.triggerAmbianceNews(save, d, circuit, circId, circName);
    }

    const events = [
      // Blessures / Forme physique
      () => ({
        title: 'Blessure légère à l\'entraînement',
        text:  `${d.firstName} ${d.name} s'est blessé au poignet en simulateur. Il sera moins performant ce week-end.`,
        icon:  '🤕', category: 'medical',
        effect: () => this.applyDriverEffect(save, d.id, {pace:-4, consistency:-3, races:1, label:'Blessure légère'})
      }),
      () => ({
        title: 'Pilote en grande forme',
        text:  `${d.firstName} ${d.name} a dominé les séances libres à ${circName}. Bonus de confiance pour ce GP.`,
        icon:  '💪', category: 'performance',
        effect: () => this.applyDriverEffect(save, d.id, {pace:+3, consistency:+2, races:1, label:'En grande forme'})
      }),
      () => ({
        title: 'Gastro dans l\'équipe',
        text:  `Une gastro-entérite touche plusieurs membres de l'équipe dont ${d.firstName} ${d.name}. Week-end compliqué en perspective.`,
        icon:  '🤒', category: 'medical',
        effect: () => this.applyDriverEffect(save, d.id, {consistency:-5, races:1, label:'Pas dans son assiette'})
      }),

      // Technique
      () => ({
        title: 'Package aérodynamique validé',
        text:  'La FIA valide votre nouveau package aéro. Petit gain de performance immédiat.',
        icon:  '🌊', category: 'technical',
        effect: () => { if(save.carDev?.aero) save.carDev.aero.level=Math.min(100,save.carDev.aero.level+1); save.reputation+=1; }
      }),
      () => ({
        title: 'Fuite hydraulique détectée',
        text:  'Les mécaniciens ont repéré un problème sur la voiture de pole. Fiabilité temporairement en baisse.',
        icon:  '🔧', category: 'technical',
        effect: () => { if(save.carDev?.reliability) save.carDev.reliability.level=Math.max(1,save.carDev.reliability.level-2); }
      }),
      () => ({
        title: 'Soufflerie validée',
        text:  'Vos données de soufflerie se confirment en piste. La corrélation est excellente ce week-end.',
        icon:  '🏭', category: 'technical',
        effect: () => { save.reputation=(save.reputation||50)+2; save.tokens=(save.tokens||0)+1; }
      }),
      () => ({
        title: 'Problème de boîte de vitesses',
        text:  'Un problème de boîte détecté en FP3. L\'équipe change la boîte, pénalité de 5 places sur la grille.',
        icon:  '⚙️', category: 'technical',
        effect: () => this.applyDriverEffect(save, d.id, {consistency:-2, races:1, label:'Pénalité grille'})
      }),

      // Financier / Sponsor
      () => ({
        title: 'Sponsor satisfait',
        text:  'Un partenaire principal augmente sa visibilité pour ce GP. Prime d\'activation de 8M€.',
        icon:  '💰', category: 'financial',
        effect: () => { save.budget=Math.round(((save.budget||0)+8)*10)/10; save.reputation+=1; save.fanBase=(save.fanBase||50)+2; }
      }),
      () => ({
        title: 'Contrôle technique renforcé',
        text:  'La FIA contrôle plusieurs pièces de votre voiture. Vos ingénieurs perdent du temps de développement.',
        icon:  '🔍', category: 'regulatory',
        effect: () => { save.tokens=Math.max(0,(save.tokens||0)-1); }
      }),
      () => ({
        title: 'Nouveau sponsor intéressé',
        text:  'Une grande marque de tech veut s\'associer à votre équipe. Négociation en cours.',
        icon:  '🤝', category: 'financial',
        effect: () => { save.budget=Math.round(((save.budget||0)+12)*10)/10; }
      }),

      // Mercato / Contrats
      () => ({
        title: 'Rumeur mercato',
        text:  `Le clan ${d.firstName} ${d.name} demande des garanties sportives pour sa prolongation. Le coût augmente.`,
        icon:  '📰', category: 'mercato',
        effect: () => {
          save.contracts[d.id] = save.contracts[d.id] || {years:2};
          save.contracts[d.id].salaryDemand = (d.salary||5) + 3;
        }
      }),
      () => ({
        title: 'Approche d\'une équipe rivale',
        text:  `Une équipe rivale tente de débaucher ${d.firstName} ${d.name}. Votre pilote reste loyal… pour l'instant.`,
        icon:  '🔄', category: 'mercato',
        effect: () => {
          save.contracts[d.id] = save.contracts[d.id] || {years:2};
          save.contracts[d.id].salaryDemand = (d.salary||5) + 5;
          save.boardPressure = Math.min(100, (save.boardPressure||0) + 5);
        }
      }),

      // IA / Concurrents
      () => ({
        title: 'Mise à jour moteur concurrente',
        text:  'Une équipe rivale a apporté une grosse évolution moteur ce week-end. Attention !',
        icon:  '⚡', category: 'competitor',
        effect: () => {
          const rivals = F1Data.teams.filter(t=>t.id!==save.playerTeamId);
          const r = this.rand(rivals);
          save.aiDevelopment[r.id] = save.aiDevelopment[r.id]||{};
          save.aiDevelopment[r.id].engine = (save.aiDevelopment[r.id].engine||0) + 2;
        }
      }),
      () => ({
        title: 'Accident en pitlane IA',
        text:  'Une équipe rivale a eu un incident en pitlane lors des essais. Safety car probable.',
        icon:  '💥', category: 'competitor',
        effect: () => { /* effet cosmétique */ }
      }),

      // Board
      () => ({
        title: 'Réunion de direction',
        text:  save.boardPressure > 50
          ? 'La direction est préoccupée par les résultats. Elle attend une amélioration immédiate.'
          : 'La direction confirme son soutien. Objectifs maintenus pour la saison.',
        icon:  '🏢', category: 'board',
        effect: () => {
          if(save.boardPressure > 50) save.boardPressure = Math.min(100, save.boardPressure + 5);
          else save.reputation = Math.min(100, (save.reputation||50) + 2);
        }
      }),
    ];

    const ev = this.rand(events)();
    ev.effect();
    this.log(save, { phase:'pre', icon:ev.icon||'📰', category:ev.category||'general', title:ev.title, text:ev.text });
    return ev;
  },

  // ── NEWS AMBIANCE / IMMERSION (pas d'effet gameplay) ────────
  triggerAmbianceNews(save, d, circuit, circId, circName) {
    const teamName  = F1Data.teams.find(t=>t.id===save.playerTeamId)?.name || 'votre équipe';
    const dName     = `${d.firstName} ${d.name}`;
    const weather   = save.weekendWeather || 'dry';
    const isWet     = weather !== 'dry';
    const isStreet  = circuit?.circuitType === 'street';
    const isSpeed   = circuit?.circuitType === 'power';
    const isTech    = circuit?.circuitType === 'technical';

    // Pools par thème
    const paddockNews = [
      { icon:'🎙️', title:'Ambiance paddock', text:`Le paddock de ${circName} bourdonne d'activité. Les mécaniciens ont travaillé toute la nuit, les motorhomes sont pleins. L'atmosphère est électrique avant ce GP.` },
      { icon:'☕', title:'Jeudi paddock', text:`${dName} a été aperçu détendu au motorhome ce matin, café à la main. "On est prêts" a-t-il glissé aux journalistes. Le reste de l'équipe partage ce calme apparent.` },
      { icon:'🎧', title:'Briefing équipe', text:`Réunion stratégique de deux heures ce matin avec tous les ingénieurs. La stratégie de course a été affinée, les scénarios météo passés en revue. L'équipe est alignée.` },
      { icon:'📺', title:'Médias', text:`${dName} enchaîne les interviews depuis ce matin. La presse veut savoir si ${teamName} peut surprendre ce week-end. La réponse reste mesurée mais confiante.` },
      { icon:'🤝', title:'Relations sponsor', text:`Le sponsor principal est présent ce week-end avec une délégation. Une bonne performance devant les caméras serait appréciée. Pas de pression supplémentaire... officiellement.` },
      { icon:'🔬', title:'Données simulateur', text:`Les données de simulateur de la semaine pointent vers une bonne corrélation avec la piste réelle. Les ingénieurs sont optimistes sur le setup de départ.` },
      { icon:'🔧', title:'Nuit de travail', text:`Les mécaniciens de ${teamName} ont travaillé jusqu'à 3h du matin pour affiner les réglages. Le muret est satisfait du résultat. La voiture est prête.` },
      { icon:'📊', title:'Analyse télémétrie', text:`L'ingénieur de course de ${dName} a passé la soirée sur les données des rivaux. Quelques failles ont été identifiées. Le plan de course est ajusté en conséquence.` },
      { icon:'🍕', title:"Cohésion d'équipe", text:`Dîner d'équipe hier soir pour souder le groupe avant le week-end. ${teamName} mise sur l'esprit collectif pour performer ce GP.` },
      { icon:'💬', title:'Conférence de presse', text:`${dName} était en forme en conférence de presse ce jeudi. Détendu, précis, confiant. Les journalistes ont noté une sérénité inhabituelle.` },
      { icon:'🏋️', title:'Préparation physique', text:`${dName} a commencé sa journée par une séance de sport à 7h. La condition physique est un facteur clé sur ce circuit exigeant.` },
      { icon:'🎯', title:'Debriefing EL', text:`Deux heures de debriefing après les essais libres. Les ingénieurs ont identifié le setup optimal. La voiture devrait être plus compétitive en qualif.` },
      { icon:'📡', title:'Ingénieur en chef', text:`L'ingénieur en chef de ${teamName} est confiant sur la stratégie de base. Deux scénarios sont prêts selon l'évolution de la météo dimanche.` },
      { icon:'🧪', title:'Nouveaux composants', text:`${teamName} a apporté quelques nouveautés techniques ce week-end. L'impact sur la performance sera évalué au fil des sessions.` },
    ];

    const supporterNews = [
      { icon:'🏟️', title:'Les fans sont là', text:`Les tribunes se remplissent déjà pour les essais libres. Des supporters de ${teamName} ont fait des centaines de kilomètres pour être là. Leur énergie se ressent jusqu'au garage.` },
      { icon:'🎌', title:'Ambiance tribunes', text:`Les drapeaux flottent dans les tribunes de ${circName}. Les fans locaux dominent, mais on aperçoit quelques bannières pour ${teamName} dans les virages. Le public sera chaud.` },
      { icon:'📸', title:'Fan du jour', text:`Un groupe de supporters de ${teamName} s'est installé au virage le plus photographié du circuit dès l'aube. Leur banderole devrait passer à la télé.` },
      { icon:'🛍️', title:'Fan zone', text:`La fan zone de ${circName} est prise d'assaut. Les files d'attente pour les autographes s'allongent. ${dName} a signé une centaine de casquettes avant de regagner le garage.` },
      { icon:'✈️', title:'Supporters déplacés', text:`Des fans de ${teamName} venus de toute l'Europe ont fait le voyage jusqu'à ${circName}. Certains campent depuis la veille. La passion dépasse les frontières.` },
      { icon:'🎺', title:'Ambiance électrique', text:`Le circuit de ${circName} vibre déjà ce jeudi. Les supporters font de ce GP une véritable fête du sport automobile.` },
      { icon:'📱', title:'Buzz réseaux sociaux', text:`Les photos du paddock de ${circName} tournent en boucle sur les réseaux. ${teamName} est au centre de l'attention ce week-end.` },
      { icon:'👶', title:'La relève', text:`De jeunes fans en t-shirt ${teamName} attendent ${dName} à la sortie du paddock depuis l'aube. La passion se transmet de génération en génération.` },
      { icon:'🌍', title:'Grand Prix mondial', text:`Des supporters de 47 nationalités différentes ont fait le déplacement à ${circName} ce week-end. La F1 c'est vraiment une passion mondiale.` },
    ];

    const circuitNews = [
      { icon:'🗺️', title:`Circuit de ${circName}`, text:isStreet
          ? `Les rues de ${circName} ont été homologuées hier soir. Les glissières neuves brillent sous les projecteurs. Chaque centimètre de bitume a été inspecté avant l'ouverture de la piste.`
          : isSpeed
          ? `${circName}, temple de la vitesse pure. Les équipes ont opté pour les réglages les plus effacés possibles. La bataille moteur sera décisive ce week-end.`
          : isTech
          ? `${circName} met à l'épreuve l'équilibre de la voiture dans toutes ses dimensions. Setup polyvalent ou spécialisé ? Les ingénieurs ont tranché, on verra si c'était le bon choix.`
          : `${circName} offre plusieurs configurations stratégiques. L'undercut fonctionne bien ici historiquement — les fenêtres de pit seront cruciales.`
      },
      { icon:'📏', title:'Reconnaissance circuit', text:`${dName} a effectué le tour de reconnaissance à vélo ce matin avec l'ingénieur de piste. Quelques bosses nouvelles ont été notées dans le secteur 2. Les notes ont été actualisées.` },
      { icon:'🌡️', title:'Conditions piste', text:isWet
          ? `La piste est humide et le séchage sera long. Les équipes débattent déjà du bon moment pour basculer sur pneus slicks. La météo sera le facteur numéro un ce week-end.`
          : `La piste est propre et la température idéale pour les pneus. Le grip devrait être excellent dès les premières minutes des essais libres.`
      },
    ];

    const anecdotes = [
      { icon:'🏁', title:'Histoire du circuit', text:`${circName} a une histoire chargée. Victoires mémorables, retournements de situation — ce circuit a tout vu. Chaque génération de pilote y a laissé sa marque.` },
      { icon:'🍽️', title:'Gastronomie locale', text:`Le paddock a ses bonnes adresses. Plusieurs mécaniciens de ${teamName} ont découvert un restaurant local qui fait fureur cette semaine. Le moral est bon.` },
      { icon:'🌅', title:'Jeudi matin', text:`Lever du soleil sur ${circName}. Les premiers camions sont arrivés lundi. Depuis, le village paddock a poussé comme une ville éphémère. Dans 5 jours, il n'en restera rien.` },
      { icon:'🚁', title:'Vue aérienne', text:`Les images aériennes du circuit circulent sur les réseaux. Les gradins se remplissent, les motorhomes brillent au soleil. ${circName} est prêt à accueillir le monde.` },
      { icon:'🌙', title:'Nuit dans le paddock', text:`Le paddock ne dort jamais vraiment. À minuit, des mécaniciens travaillent encore sous les lumières des garages. C'est ça aussi, la Formule 1.` },
      { icon:'🎬', title:'Caméras partout', text:`Les équipes de tournage sont partout dans le paddock de ${circName}. Chaque sourire, chaque tension — tout est filmé pour la postérité.` },
      { icon:'🚗', title:'Logistique monstre', text:`23 camions, des milliers de pièces, des centaines de personnes — tout ça pour quelques centaines de kilomètres de course. La F1 c'est une organisation colossale.` },
      { icon:'🏨', title:"Vie d'hôtel", text:`Les pilotes et le staff enchaînent les hôtels depuis des semaines. ${dName} avoue que son sac est perpétuellement à moitié défait. C'est le prix du rêve.` },
      { icon:'🌤️', title:'Météo du week-end', text:`La météo de ${circName} est capricieuse. Les ingénieurs ont préparé deux setup différents selon l'évolution des conditions. L'adaptabilité sera clé.` },
      { icon:'🔋', title:'Simulateur de nuit', text:`${dName} a passé deux heures au simulateur hier soir pour peaufiner ses repères. Chaque dixième gagné virtuellement peut se retrouver en vrai.` },
    ];

    // Mélanger tous les pools et piocher
    const all = [...paddockNews, ...supporterNews, ...circuitNews, ...anecdotes];
    const ev  = this.rand(all);

    this.log(save, { phase:'pre', icon:ev.icon, category:'ambiance', title:ev.title, text:ev.text });
    // Pas d'appel à ev.effect() — c'est purement narratif
    return { title:ev.title, text:ev.text, icon:ev.icon, category:'ambiance' };
  },

  // ── ÉVÉNEMENTS POST-COURSE ────────────────────────────────
  triggerPostRace(save, summary={}) {
    this.ensure(save);
    this.decayEffects(save);
    this.updateBoardPressure(save);

    const pos = summary.playerPosition || 0;
    if (pos > 0) this.updateFanBase(save, pos);

    // Toujours loguer le résultat de course
    if (pos > 0) {
      const drivers = this.teamDrivers(save);
      const circuit = F1Data.circuits[(save.race||1)-1];
      this.log(save, {
        phase: 'result',
        icon:  pos === 1 ? '🏆' : pos <= 3 ? '🥈' : pos <= 10 ? '✅' : '📊',
        category: 'race_result',
        title: pos === 1 ? `Victoire au GP de ${circuit?.name||'?'} !`
          : pos <= 3 ? `Podium P${pos} au GP de ${circuit?.name||'?'}`
          : `P${pos} au GP de ${circuit?.name||'?'}`,
        text: `Points marqués : ${summary.playerPoints||0}. ${pos===1?'Drapeau à damiers sous les vivats du public !':''}`,
      });
    }

    if (Math.random() > 0.60) return null;

    const drivers = this.teamDrivers(save);
    if (!drivers.length) return null;
    const d = this.rand(drivers);

    const events = [
      () => ({
        title: 'Usine inspirée par le résultat',
        text:  'Les ingénieurs ont trouvé une piste de développement suite à la course. +1 token R&D.',
        icon:  '🔬', category: 'technical',
        effect: () => { save.tokens=(save.tokens||0)+1; save.reputation+=1; }
      }),
      () => ({
        title: 'Accident coûteux au garage',
        text:  'Une casse logistique lors du transport coûte 6M€ en réparations.',
        icon:  '💸', category: 'financial',
        effect: () => { save.budget=Math.max(0,Math.round(((save.budget||0)-6)*10)/10); save.reputation-=1; }
      }),
      () => ({
        title: 'Progrès en pit stop',
        text:  'L\'analyse vidéo des arrêts au stand porte ses fruits. Le département pit stop progresse.',
        icon:  '⏱️', category: 'technical',
        effect: () => { if(save.carDev?.pitstop) save.carDev.pitstop.level=Math.min(100,save.carDev.pitstop.level+1); }
      }),
      () => ({
        title: 'Interview remarquée',
        text:  `${d.firstName} ${d.name} a donné une interview percutante après la course. La fanbase s'agrandit.`,
        icon:  '🎤', category: 'media',
        effect: () => { save.fanBase=Math.min(100,(save.fanBase||50)+3); save.reputation+=1; }
      }),
      () => ({
        title: 'Presse positive',
        text:  'Les médias soulignent votre progression. La réputation de l\'équipe monte.',
        icon:  '📰', category: 'media',
        effect: () => { save.reputation=Math.min(100,(save.reputation||50)+3); save.fanBase=(save.fanBase||50)+2; }
      }),
      () => ({
        title: 'Tension interne',
        text:  `${d.firstName} ${d.name} critique publiquement la stratégie. Ambiance tendue au garage.`,
        icon:  '😤', category: 'internal',
        effect: () => this.applyDriverEffect(save, d.id, {consistency:-3, races:1, label:'Tension interne'})
      }),
      () => ({
        title: 'Prime d\'image sponsor',
        text:  'Un sponsor verse une prime d\'image suite au résultat. +10M€.',
        icon:  '💰', category: 'financial',
        effect: () => { save.budget=Math.round(((save.budget||0)+10)*10)/10; }
      }),
      () => ({
        title: 'Analyse aéro post-course',
        text:  'Les données de course permettent une corrélation exceptionnelle avec la soufflerie.',
        icon:  '🌊', category: 'technical',
        effect: () => { if(save.carDev?.aero) save.carDev.aero.level=Math.min(100,save.carDev.aero.level+1); }
      }),
      () => ({
        title: pos <= 3 ? 'Fête au paddock !' : 'Débrief d\'équipe',
        text:  pos <= 3
          ? 'Le podium galvanise toute l\'équipe. Moral au plus haut !'
          : 'L\'équipe analyse les données pour progresser lors du prochain GP.',
        icon:  pos <= 3 ? '🎉' : '📊', category: 'internal',
        effect: () => {
          if(pos <= 3) {
            save.reputation=Math.min(100,(save.reputation||50)+4);
            save.boardPressure=Math.max(0,(save.boardPressure||0)-8);
          } else {
            save.reputation=Math.min(100,(save.reputation||50)+1);
          }
        }
      }),
      () => ({
        title: 'Surveillance budget cap FIA',
        text:  'La FIA annonce un audit du budget cap. Vos finances seront scrutées en fin de saison.',
        icon:  '📋', category: 'regulatory',
        effect: () => { /* cosmétique */ }
      }),
      () => ({
        title: pos === 1 ? 'Victoire historique !' : 'Contact avec une équipe adverse',
        text:  pos === 1
          ? `${d.firstName} ${d.name} s'impose ! L'équipe est en liesse, les fans sont en délire.`
          : 'Un incident en piste est sous investigation. Résultat à confirmer.',
        icon:  pos === 1 ? '🏆' : '⚠️', category: pos === 1 ? 'race_result' : 'incident',
        effect: () => {
          if(pos===1) {
            save.reputation=Math.min(100,(save.reputation||50)+6);
            save.fanBase=Math.min(100,(save.fanBase||50)+5);
            save.boardPressure=Math.max(0,(save.boardPressure||0)-15);
          }
        }
      }),
    ];

    const ev = this.rand(events)();
    ev.effect();
    this.log(save, { phase:'post', icon:ev.icon||'📰', category:ev.category||'general', title:ev.title, text:ev.text });
    return ev;
  },

  // ── DRIVER EFFECTIF (avec effets temporaires) ─────────────
  effectiveDriver(driver) {
    try {
      const save = Save.load();
      if (!save?.driverEffects?.[driver.id]) return driver;
      const e = save.driverEffects[driver.id];
      const d = { ...driver };
      ['pace','consistency','wetSkill','overtaking','defending']
        .forEach(k => d[k] = Math.max(1, Math.min(100, (d[k]||70) + (e[k]||0))));
      d.eventLabel = e.label;
      return d;
    } catch(err) { return driver; }
  },

  // ── CONTRATS ──────────────────────────────────────────────
  ensureContractSystem(save) {
    this.ensure(save);
    F1Data.drivers.filter(d=>d.teamId===save.playerTeamId).forEach(d => {
      save.contracts[d.id] = save.contracts[d.id] || { years:2, salaryDemand: (d.salary||1)+2 };
    });
  },

  makeContractOffer(save, driverId, offer) {
    this.ensure(save);
    const driver = F1Data.drivers.find(d => d.id === driverId);
    if (!driver) return { ok:false, accepted:false, msg:'Pilote introuvable.' };

    const isMine  = driver.teamId === save.playerTeamId;
    const fee     = isMine ? 0 : Math.round((driver.salary||1) * 1.5);
    const total   = fee + (offer.bonus||0) + (offer.salary||driver.salary||1) * (offer.years||2);

    if ((save.budget||0) < fee + (offer.bonus||0)) {
      return { ok:false, accepted:false, msg:`Budget insuffisant (frais : ${fee}M€ + prime ${offer.bonus||0}M€).` };
    }

    // Évaluation de l'offre par le pilote
    const demand   = save.contracts?.[driverId]?.salaryDemand || (driver.salary||1) + 2;
    const salaryOk = (offer.salary||0) >= demand;
    const yearsOk  = (offer.years||0) >= 2;
    const bonusOk  = (offer.bonus||0) >= Math.round((driver.salary||1)*0.3);

    // Score d'attractivité (0-100)
    let score = 0;
    if (salaryOk) score += 40;
    else          score += Math.max(0, 40 - (demand - (offer.salary||0)) * 5);
    if (yearsOk)  score += 20;
    if (bonusOk)  score += 20;
    // Réputation et niveau équipe
    score += Math.round((save.reputation||50) * 0.2);

    const accepted = score >= 60 || Math.random() < score / 120;

    if (accepted) {
      if (!isMine) {
        // Libérer l'ancien employeur
        driver.teamId = save.playerTeamId;
        save.budget   = Math.round(((save.budget||0) - fee - (offer.bonus||0)) * 10) / 10;

        // Si pas de siège libre, remplacer le moins bon
        const myDrivers = F1Data.drivers.filter(d => d.teamId===save.playerTeamId && !d.retired);
        if (myDrivers.length > 2) {
          const worst = myDrivers.sort((a,b)=>
            ((a.pace+a.consistency)/2) - ((b.pace+b.consistency)/2)
          )[0];
          if (worst.id !== driverId) worst.teamId = 'free_agent';
        }
      }
      save.contracts[driverId] = { years: offer.years||2, salaryDemand: offer.salary||demand };

      // Persister le teamId dans driverStates
      save.driverStates = save.driverStates || {};
      save.driverStates[driverId] = save.driverStates[driverId] || {};
      save.driverStates[driverId].teamId = save.playerTeamId;

      // Libérer l'ancien employeur dans driverStates aussi
      Object.keys(save.driverStates).forEach(id => {
        if (id !== driverId && save.driverStates[id]?.teamId === save.playerTeamId) {
          const stillMine = F1Data.drivers.find(d=>d.id===id&&d.teamId===save.playerTeamId);
          if (!stillMine) save.driverStates[id].teamId = 'free_agent';
        }
      });

      this.log(save, { phase:'mercato', icon:'✅', category:'transfer',
        title: isMine ? `Contrat prolongé` : `Transfert signé`,
        text: `${driver.firstName} ${driver.name} ${isMine?'prolonge':'rejoint l\'équipe'} pour ${offer.salary}M€/an, ${offer.years} an(s).`
      });
      Save.save(save);
      return { ok:true, accepted:true, msg:`${driver.firstName} ${driver.name} a accepté l'offre !` };
    } else {
      // Contre-offre
      save.contracts[driverId] = save.contracts[driverId] || {};
      save.contracts[driverId].refus = (save.contracts[driverId].refus||0) + 1;
      const counter = { salary: demand + 1, years: Math.max(offer.years||1, 2) };
      Save.save(save);
      return {
        ok:false, accepted:false,
        counter,
        msg:`${driver.firstName} ${driver.name} refuse. Il demande ${demand+1}M€/an minimum.`
      };
    }
  },

  // ── IA DÉVELOPPEMENT ─────────────────────────────────────
  applyAiDevelopment(save) {
    if (!save?.aiDevelopment) return;
    F1Data.teams.forEach(t => {
      const ai = save.aiDevelopment[t.id];
      if (!ai) return;
      ['aero','chassis','engine','reliability'].forEach(k => {
        if (ai[k]) t[k] = Math.max(1, Math.min(100, (t[k]||70) + ai[k]));
      });
      t.performance = Math.round((t.aero + t.chassis + t.engine) / 3);
    });
  },
};


// Expose CareerEvents for every HTML page / inline handler.
if (typeof window !== 'undefined') window.CareerEvents = CareerEvents;

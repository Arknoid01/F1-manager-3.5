// ============================================================
//  F1 Manager — save.js
//  Persistence via localStorage (migration PHP facile plus tard)
// ============================================================

const Save = {

  KEY: 'f1manager_v1',

  // ── STRUCTURE DE SAUVEGARDE ───────────────────────────────
  defaultSave() {
    return {
      version: 2,
      lastSaved: null,
      season: 2025,
      race: 0, // index dans le calendrier
      playerTeamId: null,
      budget: 0,
      tokens: 0,
      finances: { income: 0, expenses: 0 },
      sponsors: [],
      staff: [],
      completedSeasons: [],
      news: [],
      socialEvents: [],
      reputation: 50,
      driverEffects: {},
      contracts: {},
      aiDevelopment: {},

      // Championnat
      driverStandings: {},   // { driverId: points }
      teamStandings: {},     // { teamId: points }

      // Résultats des courses
      raceResults: [],

      // État équipe joueur
      playerTeam: null,

      // Développement voiture
      carDev: {
        current: null,  // stats actuelles
        nextYear: null, // budget alloué N+1
      },

      // Parcours carrière : intro → preseason → season
      careerPhase: null,
      _onboardingDone: false,
      _introMeetingSeen: false,
      arrivalBriefingPending: false,
    };
  },

  resetWeekendState(save) {
    if (!save) return;
    save.weekendFPDone = 0;
    save.weekendQualiDone = false;
    save.weekendWeather = null;
    save.weekendCircuit = null;
    save.weekendSetup = 'balanced';
    save.weekendFPResults = [];
    save.qualiGrid = null;
    save.qualiStrategy = {};
    save.weekendPaddockEvent = null;
    save.raceStrategies = null;
    save.raceQualiGrid = null;
    save.weekendSprintSQDone = false;
    save.weekendSprintRaceDone = false;
    save.sprintGrid = null;
    save.sprintRaceResults = null;
    save.parcFermeLocked = false;
    save.fpLiveConfig = null;
    save.raceMode = null;
  },

  migrateCareerPhase(save) {
    if (!save || !save.playerTeamId) return;
    if (save._onboardingDone === undefined) {
      const started = (save.race || 0) > 0 || (save.raceResults || []).length > 0;
      save._onboardingDone = started;
    }
    if (!save.careerPhase) {
      if (!save._onboardingDone) save.careerPhase = 'intro';
      else if ((save.race || 0) === 0 && !(save.raceResults || []).length) save.careerPhase = 'preseason';
      else save.careerPhase = 'season';
    }
  },

  createNewCareer(teamId) {
    const team = typeof F1Data !== 'undefined' ? F1Data.teams.find(t => t.id === teamId) : null;
    const s = { ...this.defaultSave(), playerTeamId: teamId };
    s.season = 2025;
    s.race = 0;
    s.budget = team?.budget ?? 100;
    s.careerPhase = 'intro';
    s._onboardingDone = false;
    s._introMeetingSeen = false;
    s._introMeetingOnlyAtCreation = true;
    s.socialEvents = [];
    s.driverStandings = {};
    s.teamStandings = {};
    s.raceResults = [];
    s.dataVersion = typeof F1Data !== 'undefined' ? (F1Data.DATA_VERSION || 1) : 1;
    this.resetWeekendState(s);
    s.arrivalBriefingPending = true;
    const currentDataVersion = typeof F1Data !== 'undefined' ? (F1Data.DATA_VERSION || 1) : 1;
    if ((s.dataVersion || 0) <= currentDataVersion) {
      this.migrateBaseData(s, currentDataVersion);
    }
    this.persistDriverStates(s);
    if (typeof Career !== 'undefined' && Career.ensureContractSystem) {
      Career.ensureContractSystem(s);
    }
    this.save(s);
    return s;
  },

  enterPreseason(save) {
    if (!save) save = this.load();
    if (!save) return null;
    save.careerPhase = 'preseason';
    save._onboardingDone = true;
    save._introMeetingSeen = true;
    save._introMeetingOnlyAtCreation = false;
    save._indexSocialGeneratedKey = `${save.season || 2025}_${save.race || 0}`;
    save.socialEvents = save.socialEvents || [];
    this.resetWeekendState(save);
    save.arrivalBriefingPending = true;
    this.save(save);
    return save;
  },

  launchSeasonFromPreseason(save) {
    if (!save) save = this.load();
    if (!save) return null;
    save.careerPhase = 'season';
    save.race = save.race ?? 0;
    this.resetWeekendState(save);
    save.arrivalBriefingPending = true;
    const evKey = `paddock_${save.season}-${save.race}`;
    delete save[evKey];
    this.save(save);
    return save;
  },

  // ── SAVE ──────────────────────────────────────────────────
  save(data) {
    try {
      data.lastSaved = new Date().toISOString();
      localStorage.setItem(this.KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[Save] Erreur sauvegarde:', e);
      return false;
    }
  },

  // ── LOAD ──────────────────────────────────────────────────
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const save = JSON.parse(raw);

      // Migration DATA_VERSION — met à jour le grid si data.js a changé
      const currentDataVersion = typeof F1Data !== 'undefined' ? (F1Data.DATA_VERSION || 1) : 1;
      if ((save.dataVersion || 0) < currentDataVersion) {
        this.migrateBaseData(save, currentDataVersion);
      }

      this.migrateSponsorSeasonProgress(save);
      this.migrateCareerPhase(save);
      this.applyDriverStates(save);
      this.applyTeamDevelopment(save);
      return save;
    } catch (e) {
      console.error('[Save] Erreur chargement:', e);
      return null;
    }
  },


  migrateSponsorSeasonProgress(save) {
    if (!save || !Array.isArray(save.sponsors)) return;
    const season = Number(save.season || 2025);

    save.sponsors.forEach(sp => {
      const clauses = sp.clauses || [];
      const hasOldProgress = clauses.some(cl =>
        Number(cl.progress || 0) !== 0 ||
        cl.bonusPaid || cl.paid || cl.completed ||
        (cl.bonusObjective && (
          Number(cl.bonusObjective.progress || 0) !== 0 ||
          cl.bonusObjective.paid || cl.bonusObjective.bonusPaid ||
          cl.bonusObjective.completed || cl.bonusObjective.unlocked
        ))
      );

      if (sp._progressSeason !== season && ((save.race || 0) <= 1 || hasOldProgress)) {
        sp.progress = 0;
        sp.paid = false;
        sp.satisfied = true;
        sp._progressSeason = season;

        clauses.forEach(cl => {
          cl.progress = 0;
          cl.bonusPaid = false;
          cl.paid = false;
          cl.completed = false;
          cl.satisfied = false;

          if (cl.bonusObjective && typeof cl.bonusObjective === 'object') {
            cl.bonusObjective.progress = 0;
            cl.bonusObjective.paid = false;
            cl.bonusObjective.bonusPaid = false;
            cl.bonusObjective.completed = false;
            cl.bonusObjective.satisfied = false;
            cl.bonusObjective.unlocked = false;
          }
        });
      }
    });
  },

  migrateBaseData(save, newVersion) {
    if (typeof F1Data === 'undefined') return;
    if (!save.driverStates) { save.dataVersion = newVersion; return; }

    F1Data.drivers.forEach(driver => {
      const state = save.driverStates[driver.id];
      if (!state) {
        // Nouveau pilote (ex: Antonelli, Colapinto...) — initialiser
        save.driverStates[driver.id] = {
          age:driver.age, pace:driver.pace, consistency:driver.consistency,
          wetSkill:driver.wetSkill, overtaking:driver.overtaking, defending:driver.defending,
          salary:driver.salary, trait:driver.trait, potential:driver.potential,
          retired:false, teamId:driver.teamId, seasons:0,
        };
      } else if (!state.teamId || state.teamId === save.playerTeamId) {
        // Ne pas toucher aux pilotes recrutés par le joueur
      } else if (state.teamId !== driver.teamId) {
        // Pilote qui a changé d'équipe dans la réalité → mettre à jour
        state.teamId = driver.teamId;
      }
    });

    // Supprimer les états de pilotes qui n'existent plus
    const currentIds = new Set(F1Data.drivers.map(d => d.id));
    Object.keys(save.driverStates).forEach(id => {
      if (!currentIds.has(id) && !(save.generatedDrivers||[]).find(g=>g.id===id)) {
        delete save.driverStates[id];
      }
    });

    save.dataVersion = newVersion;
    try { localStorage.setItem(this.KEY, JSON.stringify(save)); } catch(e) {}
    console.log(`[Save] Migration data v${newVersion} OK`);
  },



  // ── SYNCHRO VOITURE JOUEUR / R&D / STAFF ─────────────────
  // Les pages lisent souvent directement F1Data.teams. On applique ici
  // la valeur finale partout : base sauvegardée + R&D + bonus staff.
  applyTeamDevelopment(save) {
    if (!save || typeof F1Data === 'undefined' || !Array.isArray(F1Data.teams) || !save.playerTeamId) return;
    const team = F1Data.teams.find(t => String(t.id) === String(save.playerTeamId));
    if (!team) return;

    const stats = ['aero','chassis','engine','reliability'];
    save._carBreakdown = save._carBreakdown || {};
    const staffBonuses = save.staffBonuses || {};

    stats.forEach(stat => {
      const originalBase = save.carDev?.[stat]?.base ?? team[stat] ?? 70;
      if (save.carDev?.[stat] && save.carDev[stat].base == null) save.carDev[stat].base = originalBase;
      const rdLevel = Number(save.carDev?.[stat]?.level ?? originalBase);
      const staff = Number(staffBonuses[stat] || 0);
      const finalValue = Math.max(1, Math.min(100, Math.round((rdLevel + staff) * 10) / 10));
      save._carBreakdown[stat] = {
        base: originalBase,
        rd: Math.round((rdLevel - originalBase) * 10) / 10,
        staff,
        final: finalValue
      };
      team[stat] = finalValue;
    });

    team.performance = Math.round(((team.aero || 0) + (team.chassis || 0) + (team.engine || 0)) / 3);
  },

  // ── SYNCHRO PILOTES / MARCHÉ ──────────────────────────────
  // Toutes les pages appellent Save.load(). Cette fonction restaure donc
  // les transferts sauvegardés avant que Race, Standings ou Index lisent
  // F1Data.drivers. Sans ça, ces pages reprenaient les teamId d'origine.
  applyDriverStates(save) {
    if (!save || typeof F1Data === 'undefined' || !Array.isArray(F1Data.drivers)) return;

    if (Array.isArray(save.generatedDrivers)) {
      save.generatedDrivers.forEach(gd => {
        if (gd && gd.id && !F1Data.drivers.find(d => d.id === gd.id)) {
          F1Data.drivers.push({ ...gd });
        }
      });
    }

    if (!save.driverStates) return;
    F1Data.drivers.forEach(d => {
      const state = save.driverStates[d.id];
      if (!state) return;
      d.age = state.age ?? d.age;
      d.pace = state.pace ?? d.pace;
      d.consistency = state.consistency ?? d.consistency;
      d.wetSkill = state.wetSkill ?? d.wetSkill;
      d.overtaking = state.overtaking ?? d.overtaking;
      d.defending = state.defending ?? d.defending;
      d.salary = state.salary ?? d.salary;
      d.trait = state.trait ?? d.trait;
      d.potential = state.potential ?? d.potential;
      d.retired = state.retired ?? false;
      d.personality = state.personality ?? d.personality;
      d.contractYears = state.contractYears ?? d.contractYears ?? 0;
      d.seasons = state.seasons ?? d.seasons ?? 0;
      if (Object.prototype.hasOwnProperty.call(state, 'teamId') && state.teamId) d.teamId = state.teamId;
    });
  },

  persistDriverStates(save) {
    if (!save || typeof F1Data === 'undefined') return;
    save.driverStates = save.driverStates || {};
    F1Data.drivers.forEach(d => {
      const existing = save.driverStates[d.id];
      if (existing) {
        // Conserver les stats acquises — seulement mettre à jour les champs non-stats
        save.driverStates[d.id] = {
          ...existing,
          age: d.age, salary: d.salary, trait: d.trait,
          retired: d.retired, teamId: d.teamId,
          seasons: d.seasons || 0, contractYears: d.contractYears || 0,
          personality: d.personality,
          // Conserver potential et stats si déjà présents
          potential:    existing.potential    ?? d.potential,
          pace:         existing.pace         ?? d.pace,
          consistency:  existing.consistency  ?? d.consistency,
          wetSkill:     existing.wetSkill     ?? d.wetSkill,
          overtaking:   existing.overtaking   ?? d.overtaking,
          defending:    existing.defending    ?? d.defending,
        };
      } else {
        // Nouveau pilote — initialiser avec les valeurs de base
        save.driverStates[d.id] = {
          age: d.age, pace: d.pace, consistency: d.consistency, wetSkill: d.wetSkill,
          overtaking: d.overtaking, defending: d.defending, salary: d.salary,
          trait: d.trait, potential: d.potential, retired: d.retired, teamId: d.teamId,
          seasons: d.seasons || 0, contractYears: d.contractYears || 0, personality: d.personality,
        };
      }
    });
  },

  // ── RESET ─────────────────────────────────────────────────
  reset() {
    localStorage.removeItem(this.KEY);
  },

  // ── CHECK ─────────────────────────────────────────────────
  hasSave() {
    return localStorage.getItem(this.KEY) !== null;
  },


  // ── ENREGISTRER UNE COURSE DANS LA CARRIÈRE ───────────────
  recordRaceResults(raceState, results) {
    const save = this.load();
    if (typeof CareerEvents !== 'undefined') CareerEvents.ensure(save || {});
    if (!save || !save.playerTeamId || !raceState || !results || !results.length) {
      console.warn('[Save] Course non enregistrée : sauvegarde/carrière introuvable ou résultats vides.');
      return null;
    }

    const circuit = raceState.circuit;
    if (typeof CareerEvents !== 'undefined') { CareerEvents.triggerPostRace(save, { results }); }
    const playerTeamId = save.playerTeamId;

    save.driverStandings = save.driverStandings || {};
    save.teamStandings   = save.teamStandings || {};
    save.raceResults     = save.raceResults || [];

    results.forEach(r => {
      const driverId = r.driver && r.driver.id;
      const teamId   = r.team && r.team.id;
      if (!driverId || !teamId) return;
      save.driverStandings[driverId] = (save.driverStandings[driverId] || 0) + (r.points || 0);
      save.teamStandings[teamId]     = (save.teamStandings[teamId] || 0) + (r.points || 0);
    });

    const playerResults = results.filter(r => r.team && r.team.id === playerTeamId);
    const bestPosition  = playerResults.length ? Math.min(...playerResults.map(r => r.position)) : 20;
    const teamPoints    = playerResults.reduce((sum, r) => sum + (r.points || 0), 0);

    // -- PROGRESSION EN COURSE --
    // Gains très faibles — progression sur 2-3 saisons max
    try {
      if (!save.driverStates) save.driverStates = {};
      console.log('[Prog] results count:', results.length);
      results.forEach(r => {
        const dId = (r.driver && r.driver.id) || r.driverId;
        if (!dId) { console.log('[Prog] skip - no dId', r.position); return; }
        const driver = F1Data.drivers.find(d => d.id === dId);
        if (!driver) return;
        // Initialiser si absent (save ancien ou premier GP)
        if (!save.driverStates[dId]) {
          save.driverStates[dId] = {
            pace: driver.pace, consistency: driver.consistency,
            wetSkill: driver.wetSkill, overtaking: driver.overtaking,
            defending: driver.defending, potential: driver.potential,
            age: driver.age, retired: driver.retired, teamId: driver.teamId,
          };
        }
        const state = save.driverStates[dId];

        // Définir age EN PREMIER
        const age   = state.age       || driver.age       || 25;

        // Caper le potentiel selon l'âge — un vétéran ne peut plus progresser au-delà de ses stats actuelles
        const agePotCap = age >= 38 ? 0 : age >= 35 ? 50 : age >= 32 ? 75 : 100;
        const rawPot = state.potential || driver.potential || 85;
        const pot = agePotCap === 0 ? Math.max(rawPot, state.pace || driver.pace || 80)
                  : agePotCap < 100 ? rawPot * (agePotCap/100) + (state.pace||driver.pace||80) * (1-agePotCap/100)
                  : rawPot;
        const pos   = r.position || 20;
        const isDnf = r.status === 'dnf';
        if (isDnf) return;
        if (dId === 'SAI' || dId === 'NOR') console.log('[Prog '+dId+'] age='+age+' pot='+pot.toFixed(2)+' pace='+(state.pace||driver.pace)+' pos='+pos);

        // Facteur age
        const ageFactor = age < 23 ? 1.5 : age < 29 ? 1.2 : age < 34 ? 0.8 : 0.3;
        // Facteur resultat
        const posFactor = pos <= 3 ? 1.5 : pos <= 6 ? 1.2 : pos <= 10 ? 1.0 : 0.7;
        // Gain de base par course : 0.10 à 0.25
        const baseGain  = (0.10 + Math.random() * 0.15) * ageFactor * posFactor;

        // Stat a ameliorer
        const statToImprove = pos <= 10
          ? (Math.random() < 0.6 ? 'pace' : 'consistency')
          : (Math.random() < 0.5 ? 'defending' : 'overtaking');

        const current = state[statToImprove] || driver[statToImprove] || 75;
        if (current >= pot) return; // plafond potentiel

        // Ralentir si proche du potentiel
        const gap       = pot - current;
        const gapFactor = gap <= 2 ? 0.3 : gap <= 5 ? 0.6 : 1.0;
        // Arrondir à 2 décimales pour éviter les gains nuls
        const finalGain = Math.round(baseGain * gapFactor * 100) / 100;

        if (finalGain >= 0.01) {
          state[statToImprove] = Math.min(pot, Math.round((current + finalGain) * 100) / 100);
        }

        // Regression legere apres 34 ans
        if (age >= 34 && Math.random() < 0.15) {
          const regStat = Math.random() < 0.5 ? 'pace' : 'consistency';
          const cur = state[regStat] || driver[regStat] || 75;
          state[regStat] = Math.max(cur - 0.1, Math.round(cur * 0.998 * 10) / 10);
        }
      });
    } catch(e) { console.warn('Progression pilotes:', e); }

    // Récompense course de base
    const reward = 2 + Math.round(teamPoints * 0.3) + (bestPosition <= 3 ? 3 : bestPosition <= 10 ? 1 : 0);

    // Tokens performance-based + 0.5 garanti (demi-token = 1 token tous les 2 GP)
    // Nerf v2 : gains réduits pour allonger la progression R&D
    // Petite équipe : ~12-15/saison → 1-2 domaines par saison max
    // Top équipe    : ~25-30/saison → peut développer 2-3 domaines
    const tokens = (Math.random() < 0.5 ? 1 : 0)  // 1 garanti sur 2 GP (demi-token)
                 + (teamPoints > 0 ? 1 : 0)         // top 10 = +1
                 + (bestPosition <= 5  ? 1 : 0);    // top 5  = +1 (max 3/course)

    // Revenus sponsors — 3 versements clairs dans la saison
    let sponsorBonus = 0;
    if (typeof Sponsors !== 'undefined') {
      Sponsors.updateAfterRace(save, { results: results.map(r => ({
        teamId: r.team?.id, position: r.position||20, points: r.points||0, status: r.status
      }))});
    }

    const totalSponsorAnnual = (save.sponsors||[]).reduce((s,sp)=>s+(sp.value||0),0);
    const raceIdx = Number(save.race) || 0;
    const totalRaces = F1Data.circuits.length;
    const midPoint = Math.floor(totalRaces / 2);

    // Versement 1 : 40% au démarrage (course 1)
    if (raceIdx === 0 && totalSponsorAnnual > 0) {
      sponsorBonus = Math.round(totalSponsorAnnual * 0.40 * 10) / 10;
      if (save.news) save.news.push({ icon:'💰', category:'finance',
        title:'Versement sponsors — Début de saison',
        text:`40% des contrats sponsors versés : +${sponsorBonus}M€` });
    }
    // Versement 2 : 30% à mi-saison
    else if (raceIdx === midPoint && totalSponsorAnnual > 0) {
      sponsorBonus = Math.round(totalSponsorAnnual * 0.30 * 10) / 10;
      if (save.news) save.news.push({ icon:'💰', category:'finance',
        title:'Versement sponsors — Mi-saison',
        text:`30% des contrats sponsors versés : +${sponsorBonus}M€` });
    }

    const currentRaceIndex = Number(save.race) || 0;
    const annualExpenses   = Number(save.finances?.expenses) || 0;
    // Coûts opérationnels croissants par saison (+4%/an, plafonné à +30%)
    const opMult = save._opCostMultiplier || 1.0;
    const gpOperatingCost  = Math.round((2.5 + annualExpenses / Math.max(1, F1Data.circuits.length)) * opMult * 10) / 10;
    save.budget  = Math.round(((Number(save.budget)||0) + reward + sponsorBonus - gpOperatingCost) * 10) / 10;
    // Budget plancher par course : minimum 0 (le plancher annuel est géré en fin de saison)
    // Normaliser reputation si c'est un objet {sport, media, tech, finance}
    if (save.reputation !== null && typeof save.reputation === 'object') {
      const r = save.reputation;
      save.reputation = Math.round(((r.sport||50) + (r.media||50) + (r.tech||50) + (r.finance||50)) / 4);
    }
    if (save.budget < 0) { save.reputation = Math.max(0,(save.reputation||50)-3); save.budget = 0; }
    // Upgrade low-cost toujours disponible si budget < 15M (filet de sécurité mid-saison)
    if ((save.budget||0) < 15) save._safetyUpgradeAvailable = true;
    save.tokens  = (Number(save.tokens)||0) + tokens;
    save.race    = currentRaceIndex + 1;

    save.raceResults.push({
      season: save.season||2025, raceIndex: save.raceResults.length,
      circuitId: circuit?.id||null, circuitName: circuit?.name||'Circuit inconnu',
      date: new Date().toISOString(),
      reward: reward+sponsorBonus, operatingCost: gpOperatingCost,
      baseReward: reward, sponsorBonus, tokens,
      results: results.map(r => ({
        position: r.position, driverId: r.driver?.id||null, teamId: r.team?.id||null,
        points: r.points||0, totalTime: Number.isFinite(r.totalTime)?r.totalTime:null,
        gap: Number.isFinite(r.gap)?r.gap:null, status: r.status,
        dnfLap: r.dnfLap||null, bestLap: Number.isFinite(r.bestLap)?r.bestLap:null,
        pitStops: r.pitStops||[],
      })),
    });

    // ── FIN DE SAISON : ne PAS lancer l'intersaison ici ────────────
    // La course doit seulement enregistrer le dernier GP et marquer la saison
    // comme terminée. La vraie transition (vieillissement, contrats, mercato,
    // revenus annuels, reset championnats) est déclenchée depuis season-review.html
    // via Career.endOfSeason(save). Avant, cette fonction faisait déjà le reset :
    // la page bilan recevait donc une saison vide ou pouvait appliquer la fin
    // de saison deux fois.
    if (save.race >= F1Data.circuits.length) {
      const teamRank = [...F1Data.teams].sort((a,b)=>(save.teamStandings[b.id]||0)-(save.teamStandings[a.id]||0));
      const playerPos = teamRank.findIndex(t=>t.id===playerTeamId)+1;
      save.seasonFinished = true;
      save._seasonReadyForReview = true;
      save._newSeasonBanner = `Saison ${save.season||2025} terminée · P${playerPos || '?'} constructeurs · Revue annuelle disponible`;
      save.news = save.news || [];
      if (!save.news.some(n => n && n.id === `season_review_${save.season||2025}`)) {
        save.news.unshift({
          id:`season_review_${save.season||2025}`, icon:'🏁', category:'season',
          title:'Fin de saison',
          text:'Le dernier Grand Prix est terminé. La revue annuelle est disponible avant de lancer la prochaine saison.'
        });
      }
    }

    // -- PROGRESSION DES EQUIPES IA APRÈS CHAQUE GP --
    try {
      // Restaurer d'abord les stats accumulées avant de progresser
      if (save.rivalTeamStats) {
        F1Data.teams.forEach(team => {
          const stored = save.rivalTeamStats[team.id];
          if (!stored) return;
          ['aero','chassis','engine','reliability','performance'].forEach(k => {
            if (stored[k] !== undefined) team[k] = stored[k];
          });
        });
      }
      F1Data.teams.forEach(team => {
        if (team.id === playerTeamId) return; // joueur géré via R&D
        const richness = (team.budget||200) / 500; // 0 à 1 selon budget
        const gain = (Math.random() * 0.15 + 0.05) * richness; // 0.05 à 0.20 pts par GP
        ['aero','chassis','engine','reliability'].forEach(stat => {
          if (team[stat] !== undefined) {
            team[stat] = Math.min(97, parseFloat((team[stat] + gain).toFixed(2)));
          }
        });
        team.performance = Math.round((team.aero + team.chassis + team.engine) / 3);
      });
      // Persister les stats IA dans le save
      if (!save.rivalTeamStats) save.rivalTeamStats = {};
      F1Data.teams.forEach(team => {
        if (team.id === playerTeamId) return;
        save.rivalTeamStats[team.id] = {
          aero: team.aero, chassis: team.chassis,
          engine: team.engine, reliability: team.reliability,
          performance: team.performance,
        };
      });
    } catch(e) { console.warn('IA progress:', e); }

    // -- BONUS TECHNIQUES SPONSORS --
    try {
      if (typeof Sponsors !== 'undefined' && Sponsors.applyTechBonuses) {
        Sponsors.applyTechBonuses(save);
        // Appliquer les tokens bonus sponsors
        if (save.sponsorBonuses?.tokens > 0) {
          save.tokens = (save.tokens||0) + save.sponsorBonuses.tokens;
        }
      }
    } catch(e) { console.warn('Sponsor bonuses:', e); }

    // -- GENERATION DISCUSSIONS SOCIALES POST-COURSE --
    try {
      this.generatePostRaceSocial(save, results, playerTeamId);
    } catch(e) { console.warn('Social gen:', e); }

    const ok = this.save(save);
    return ok ? { reward: reward + sponsorBonus,
      operatingCost: gpOperatingCost, baseReward: reward, sponsorBonus, tokens, save } : null;
  },

  // Pilotes actifs de l'équipe joueur (driverStates prioritaire)
  getPlayerDrivers(save, playerTeamId) {
    if (typeof F1Data === 'undefined' || !playerTeamId) return [];
    this.applyDriverStates(save);

    const fromStates = Object.entries(save?.driverStates || {})
      .filter(([, v]) => v.teamId && v.teamId !== 'free_agent' && v.teamId === playerTeamId && !v.retired)
      .map(([id]) => F1Data.drivers.find(d => d.id === id))
      .filter(Boolean);

    if (fromStates.length) return fromStates;

    return F1Data.drivers.filter(d =>
      d.teamId && d.teamId !== 'free_agent' && d.teamId === playerTeamId && !d.retired
    );
  },

  // -- GENERATION DISCUSSIONS SOCIALES POST-COURSE --
  // Appele une seule fois par recordRaceResults — genere 3-5 discussions structurees
  generatePostRaceSocial(save, results, playerTeamId) {
    if (!save || !playerTeamId) return;

    // Ne pas regenerer si deja fait pour ce GP
    const gpKey = `social_generated_gp_${save.race||0}_${save.season||2025}`;
    if (save[gpKey]) return;

    // Nettoyer les anciens events resolus pour ne garder que les non traites
    save.socialEvents = (save.socialEvents||[]).filter(e => !e.resolved);

    const drivers    = this.getPlayerDrivers(save, playerTeamId);
    const circuits   = F1Data.circuits || [];
    const nextCirc   = circuits[(save.race||0) % Math.max(1, circuits.length)];
    const race       = save.race || 0;
    const season     = save.season || 2025;
    const totalRaces = circuits.length;
    const pct        = race / Math.max(1, totalRaces);

    if (!save.socialEvents) save.socialEvents = [];

    const playerResults = results.filter(r => (r.team?.id || r.teamId) === playerTeamId);
    const bestPos       = playerResults.length ? Math.min(...playerResults.map(r => r.position||20)) : 20;
    const hasDnf        = playerResults.some(r => r.status === 'dnf');
    const hasPodium     = bestPos <= 3;
    const hasPoints     = bestPos <= 10;

    const events = [];


    // Helper : choisir une phrase au hasard dans un pool
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Pools de réponses par type
    const RESP = {
      // Positif — soutien fort
      support_pos: [
        "Tu n'y es pour rien. La mécanique nous a lâchés — on va régler ça.",
        "Je suis derrière toi. Ce qui s'est passé n'est pas de ta faute, on corrige ensemble.",
        "On reste soudés. Ce genre de journée arrive, on en sort plus forts.",
        "Tête haute. L'équipe est avec toi. On reviendra.",
        "C'est la course. On analyse, on corrige, et on repart au prochain GP.",
      ],
      // Neutre — analyser
      analyse_neu: [
        "Raconte-moi ce qui s'est passé depuis ton point de vue.",
        "Donne-moi ta version des faits. Je veux tout comprendre avant d'en parler.",
        "On se pose et on regarde les données ensemble. Sans jugement.",
        "Qu'est-ce que tu as ressenti en voiture ? Tes impressions comptent.",
        "On fait le point ensemble demain matin avec les données complètes.",
      ],
      // Négatif — pression
      pression_neg: [
        "Ce genre d'abandon nous coûte des points précieux. On doit faire mieux.",
        "Je comprends la frustration mais les résultats ne sont pas là. Il faut réagir.",
        "On ne peut pas se permettre ces sorties de route. Les prochains GP seront décisifs.",
        "C'est inacceptable à ce niveau. On en parle au debriefing demain, sans complaisance.",
        "Il faut que tu te ressaisisses. L'équipe compte sur toi et tu dois être là.",
      ],
      // Félicitations
      congrats_pos: [
        "Une performance magistrale. Tu as tout donné et ça se voit.",
        "Exactement ce qu'on attendait de toi. Bravo — à toute l'équipe.",
        "Tu as été parfait aujourd'hui. La voiture, la stratégie, tout s'est aligné.",
        "Je suis fier de toi. Ce résultat, tu l'as construit lap après lap.",
        "Incroyable. Tu m'as donné des frissons dans les stands. Continue comme ça.",
      ],
      // Maintenir pression
      maintain_neu: [
        "Excellent. Maintenant on ne relâche pas la pression.",
        "Beau résultat. Le prochain GP sera encore plus important — reste concentré.",
        "Très bien. Mais la concurrence va réagir. Il faudra confirmer.",
        "C'est le minimum qu'on attend de cette équipe. Restons humbles et concentrés.",
        "On savait que tu pouvais le faire. Maintenant il faut en faire une habitude.",
      ],
      // Critique constructive
      critic_neg: [
        "Bon résultat mais j'ai vu des détails à corriger pour la prochaine fois.",
        "C'est bien mais il y avait plus à faire. On en parle demain.",
        "Je t'ai vu hésiter à deux reprises. On l'analyse et on corrige.",
        "Le résultat est là mais le pilotage n'était pas au top. Il faut progresser.",
        "Satisfaisant mais pas optimal. On a des données à exploiter pour s'améliorer.",
      ],
      // Valoriser
      value_pos: [
        "Travail propre et efficace. C'est exactement ce qu'on attendait.",
        "Solide. Tu as géré la course intelligemment. C'est ce qui fait la différence.",
        "Bien joué. Chaque point compte et tu l'as bien compris.",
        "Course propre, aucune erreur. C'est le professionnalisme qu'on demande.",
        "Tu as fait ton job parfaitement. Points pris, voiture intacte. Chapeau.",
      ],
      // Progresser
      progress_neu: [
        "Bon résultat. On a encore de la marge pour progresser.",
        "On avance dans la bonne direction. Ce résultat nous dit où on en est.",
        "Pas mal. Maintenant on sait sur quoi travailler pour le prochain GP.",
        "C'est un bon indicateur. On n'est pas encore au maximum de notre potentiel.",
        "Bien. On est dans les points, c'est l'essentiel. On pousse pour plus.",
      ],
      // Manque d'opportunité
      missed_neg: [
        "Honnêtement on méritait mieux. Il y avait des opportunités ratées.",
        "Les points sont là mais on a laissé des places sur la table. À corriger.",
        "Ce n'est pas une mauvaise course mais on peut faire beaucoup mieux.",
        "Je ne suis pas entièrement satisfait. On a manqué au moins deux occasions.",
        "Le résultat est acceptable mais le potentiel de la voiture méritait plus.",
      ],
      // Empathie moral bas
      empathy_pos: [
        "Je t'ai observé en course — je sais que tu peux faire bien mieux. Qu'est-ce qui se passe ?",
        "On prend le temps d'en parler. Pas de pression, juste toi et moi. Qu'est-ce qui ne va pas ?",
        "Je suis là. Parle-moi. Pas en tant que patron — en tant que quelqu'un qui veut t'aider.",
        "Ce n'est pas le moment de parler performances. D'abord : comment tu vas, toi ?",
        "J'ai vu quelque chose dans tes yeux après la course. On se parle franchement ?",
      ],
      // Analyser moral bas
      data_neu: [
        "On va analyser les données ensemble et repartir de zéro.",
        "Je veux qu'on reprenne tout depuis le début. Pas de jugement, que des faits.",
        "Le simulateur est disponible cette semaine. On travaille ensemble ?",
        "Rien ne sert de chercher des coupables. Qu'est-ce qu'on peut améliorer ?",
        "Je veux ta vision honnête de la situation. On construit la solution ensemble.",
      ],
      // Exigence moral bas
      demand_neg: [
        "Ces résultats ne sont pas acceptables. Il faut que ça change rapidement.",
        "Je dois être direct avec toi : on attend beaucoup plus. Tu le sais.",
        "Le niveau qu'on te demande n'est pas négociable. Il faut te ressaisir maintenant.",
        "L'équipe investit énormément. Les résultats doivent suivre. Sans excuse.",
        "On ne peut pas continuer comme ça. Qu'est-ce qui t'empêche de performer ?",
      ],
      // Encouragement générique
      encourage_pos: [
        "Bonne course. On repart de ça pour le prochain GP.",
        "C'est ça l'esprit d'équipe. On analyse, on s'améliore, on revient plus forts.",
        "Contenu de ce que j'ai vu aujourd'hui. On continue dans cette direction.",
        "Tu m'as donné des éléments positifs à analyser. C'est encourageant.",
        "Bien joué. Le travail de la semaine a payé. On recommence.",
      ],
      // Pas parfait mais ok
      ok_neu: [
        "Pas parfait mais on avance. On en parle demain.",
        "C'est dans la boîte. Pas la meilleure course mais on a des éléments à exploiter.",
        "On prend ce que la course nous donne. On verra ce qu'on peut faire mieux.",
        "C'est une bonne base de travail. On va analyser ça cette semaine.",
        "Ni le meilleur ni le pire. On tire les conclusions et on repart.",
      ],
      // Debrief demain
      debrief_neg: [
        "Je t'attends au debriefing demain matin. On a des choses à revoir.",
        "On en parle demain avec les données. Il y a des ajustements à faire.",
        "Ce n'est pas le moment d'en parler. Demain matin, 9h, on fait le point.",
        "Debriefing demain. J'ai des questions précises sur certains moments de la course.",
        "Je préfère analyser les données avant d'en parler. Demain sans faute.",
      ],
    };

    // ── PHASE POST-COURSE (1-2 events) ──────────────────────
    drivers.forEach(d => {
      const dRes    = playerResults.find(r => (r.driver?.id || r.driverId) === d.id);
      const pos     = dRes?.position || 20;
      const isDnf   = dRes?.status === 'dnf';
      const moral   = save.immersion?.driverMorale?.[d.id]?.value ?? 70;
      const loyalty = save.driverLoyalty?.[d.id] ?? 50;

      // Garantir 1 event post-course par pilote
      // Priorite : DNF > podium > points > moral bas > result generique
      if (isDnf) {
        const texts = [
          `${d.firstName} est silencieux dans le motorhome depuis l'abandon. Personne n'ose lui parler. C'est a vous de faire le premier pas.`,
          `La radio de ${d.firstName} est coupee depuis l'arrivee au garage. Son mecanicien vous fait signe du regard — il faut intervenir.`,
          `${d.firstName} est assis seul sur le muret des stands, casque entre les mains. La deception est palpable.`,
          `${d.firstName} a enleve son casque en plein milieu de la voie des stands. Il marche en silence vers le motorhome. Votre presence compte.`,
          `L'ingenieur de piste vous prend a part : "${d.firstName} refuse le debriefing. Il a besoin que vous lui parliez en premier."`,
          `${d.firstName} fixe les donnees sur son ecran sans les lire. L'abandon le ronge. Il n'a pas dit un mot depuis 40 minutes.`,
          `Le mecanicien en chef vous contacte discretement : "${d.firstName} est dans le garage depuis une heure. Seul. Il faudrait quelqu'un."`,
          `${d.firstName} a donne une interview courte puis est parti sans debriefing. Les journalistes ont note sa tension. Vous devez reagir.`,
          `Retour au paddock. ${d.firstName} evite tout le monde apres l'abandon. Son regard croise le votre — il attend quelque chose de vous.`,
          `La deuxieme voiture est dans les points. ${d.firstName} l'a vu sur les ecrans du garage. L'ecart entre eux deux pese lourd ce soir.`,
        ];
        events.push({
          id: `post_dnf_${d.id}_${race}`,
          driverId: d.id, phase: 'post', type: 'driver',
          trigger: 'Abandon',
          text: texts[race % texts.length],
          choices: [
            { text: pick(RESP.support_pos), effect: {moral:+10, confiance:+6, loyalty:+4}, choiceType:'positive' },
            { text: pick(RESP.analyse_neu), effect: {moral:+4, confiance:+8}, choiceType:'neutral' },
            { text: pick(RESP.pression_neg), effect: {moral:-8, confiance:-5, loyalty:-3}, choiceType:'negative' },
          ]
        });
      } else if (pos <= 3) {
        const texts = [
          `${d.firstName} arrive dans votre bureau, sourire aux levres. P${pos}. L'equipe est en feu. Il attend votre reaction.`,
          `Le debriefing vient de se terminer. ${d.firstName} est en pleine confiance — c'est le moment de capitaliser.`,
          `P${pos} pour ${d.firstName}. Les sponsors appellent deja. Comment gerez-vous ce moment ?`,
          `${d.firstName} sort de la voiture poing leve. P${pos}. Le garage explose. Il vous cherche du regard dans la foule.`,
          `Podium. Champagne. ${d.firstName} vous attrape par l'epaule dans le parc ferme : "On en remet une couche au prochain ?"`,
          `Les medias veulent ${d.firstName} en conference de presse. Il vous demande d'abord votre ressenti sur sa course.`,
          `P${pos}. ${d.firstName} est calme mais ses yeux brillent. Il sait ce qu'il a fait. Il attend juste que vous le reconnaissez.`,
          `Dans le motorhome apres le podium, ${d.firstName} s'assoit en face de vous. "C'est le debut ou c'est un accident ?" Il veut savoir ce que vous pensez.`,
          `${d.firstName} a recu trois offres d'interview apres le podium. Il n'en accepte aucune avant de vous avoir parle.`,
          `L'equipe fete le podium. ${d.firstName} leve son verre dans votre direction. "A toi aussi. Sans la strategie, j'etais P5."`,
        ];
        events.push({
          id: `post_podium_${d.id}_${race}`,
          driverId: d.id, phase: 'post', type: 'driver',
          trigger: `P${pos}`,
          text: texts[race % texts.length],
          choices: [
            { text: pick(RESP.congrats_pos), effect: {moral:+8, confiance:+6, loyalty:+5}, choiceType:'positive' },
            { text: pick(RESP.maintain_neu), effect: {moral:+4, confiance:+4, pace:+2}, choiceType:'neutral' },
            { text: pick(RESP.critic_neg), effect: {moral:-2, confiance:+3, pace:+3}, choiceType:'negative' },
          ]
        });
      } else if (pos <= 10) {
        events.push({
          id: `post_points_${d.id}_${race}`,
          driverId: d.id, phase: 'post', type: 'driver',
          trigger: `P${pos}`,
          text: [
            `${d.firstName} est pragmatique apres son P${pos}. Points pris, voiture dans le mur, course propre. Il vient vous voir avant de quitter le circuit.`,
            `P${pos}. ${d.firstName} range son casque sans un mot. Ce n'est pas la celebration rêvee mais les points sont la. Il vous regarde.`,
            `Debriefing termine. ${d.firstName} s'etire et sourit : "C'est pas brillant mais c'est solide. P${pos}, on prend." Qu'est-ce que vous repondez ?`,
            `${d.firstName} repasse devant vous en sortant du garage, pouce leve. P${pos}. Course propre. Il attend juste un mot de votre part.`,
            `Le mecanicien vous dit que ${d.firstName} sifflait en nettoyant son casque. P${pos} et des points. Il est satisfait — vous ?`,
            `${d.firstName} sort du debrief technique et vous tend son casque : "C'est propre. P${pos}. On peut faire encore mieux mais je suis content." Et vous ?`,
            `P${pos} pour ${d.firstName}. Dans le couloir du motorhome il croise votre regard. "Ca va, non ?" — il veut savoir ce que vous en pensez.`,
            `Apres la course, ${d.firstName} passe la tete dans votre bureau. P${pos}, points marques, aucun incident. "On progresse ?" vous demande-t-il.`,
          ][race % 8],
          choices: [
            { text: pick(RESP.value_pos), effect: {moral:+6, confiance:+5, loyalty:+3}, choiceType:'positive' },
            { text: `P${pos} c'est correct. On a encore de la marge pour progresser.`, effect: {moral:+2, confiance:+3}, choiceType:'neutral' },
            { text: pick(RESP.missed_neg), effect: {moral:-4, confiance:-2, pace:+2}, choiceType:'negative' },
          ]
        });
      } else if (moral < 45) {
        events.push({
          id: `post_low_moral_${d.id}_${race}`,
          driverId: d.id, phase: 'post', type: 'driver',
          trigger: 'Passage difficile',
          text: [
            `${d.firstName} n'est pas en grande forme ces derniers temps. P${pos} aujourd'hui, et quelque chose semble peser. Son mecanicien rapporte qu'il a quitte le garage sans debriefing.`,
            `P${pos} et ${d.firstName} est parti sans un mot. L'ingenieur vous dit qu'il n'a repondu a aucune question du debrief. La situation inquiete.`,
            `${d.firstName} a refuse les interviews. Il est assis seul dans le bus de l'equipe. Son equipier vous dit qu'il n'a pas mange depuis ce matin.`,
            `Le moral de ${d.firstName} inquiete tout le monde dans le garage. P${pos} aujourd'hui mais le probleme n'est pas la voiture. Il faut agir.`,
            `Trois GP difficiles pour ${d.firstName}. P${pos} encore une fois. Il commence a douter — de lui, de la voiture, ou des deux. Vous devez clarifier.`,
            `${d.firstName} a l'air absent. Sur la radio pendant la course il n'a pas parle. P${pos}. Son mecanicien vous dit qu'il a change depuis quelques semaines.`,
            `L'ambiance dans le garage est lourde. ${d.firstName} est parti en silence apres P${pos}. Les techniciens vous regardent — ils attendent que vous preniez les choses en main.`,
            `${d.firstName} vous a envoye un message ce soir : "On peut parler ?" C'est la premiere fois qu'il fait ca. P${pos}. Quelque chose ne va pas.`,
          ][race % 8],
          choices: [
            { text: pick(RESP.empathy_pos), effect: {moral:+10, confiance:+8, loyalty:+5}, choiceType:'positive' },
            { text: pick(RESP.data_neu), effect: {moral:+5, confiance:+6, pace:+1}, choiceType:'neutral' },
            { text: pick(RESP.demand_neg), effect: {moral:-8, confiance:-6, loyalty:-4, pace:+3}, choiceType:'negative' },
          ]
        });
      } else {
        // Fallback garanti — resultat quelconque
        const fallbackTexts = [
          `Le debriefing vient de se terminer. ${d.firstName} vous croise dans le couloir en sortant du garage. Un regard, quelques mots suffisent parfois.`,
          `${d.firstName} range ses affaires apres la course. P${pos}. Il leve les yeux quand vous entrez dans le garage.`,
          `Fin de course. ${d.firstName} signe quelques autographes puis revient vers le motorhome. Il vous fait signe d'approcher.`,
          `${d.firstName} est en train de regarder les replays de sa course quand vous entrez dans le motorhome. Il coupe l'ecran. "Alors ?"`,
          `Course terminee. P${pos}. ${d.firstName} est sous la douche du camion quand votre message arrive. Il vous repond : "5 minutes."`,
          `Dans le paddock qui se vide, ${d.firstName} traine pres du camion. Il attend quelque chose — probablement vous.`,
          `${d.firstName} a signe des dizaines d'autographes mais il guette la porte du paddock. Des que vous arrivez, il se dirige vers vous.`,
          `Le staff range le materiel. ${d.firstName} devrait etre parti depuis 30 minutes. Il est encore la. Il attendait votre passage.`,
          `Votre telephone vibre. Message de ${d.firstName} : "T'as deux minutes ?" Vous etes encore dans le paddock. Il est au motorhome.`,
          `P${pos}. Course propre. ${d.firstName} croise vos bras devant vous dans le couloir. "Soyez honnete — c etait bien ou pas ?"`,
        ];
        events.push({
          id: `post_result_${d.id}_${race}`,
          driverId: d.id, phase: 'post', type: 'driver',
          trigger: `P${pos}`,
          text: fallbackTexts[race % fallbackTexts.length],
          choices: [
            { text: pick(RESP.encourage_pos), effect: {moral:+5, confiance:+4, loyalty:+2}, choiceType:'positive' },
            { text: `P${pos}. Pas parfait mais on avance. On en parle demain.`, effect: {moral:+2, confiance:+2}, choiceType:'neutral' },
            { text: pick(RESP.debrief_neg), effect: {moral:-3, confiance:+2, pace:+1}, choiceType:'negative' },
          ]
        });
      }
    });

    // ── PHASE TECHNIQUE (1-2 events ingenieur) ──────────────
    const engExisting = events.filter(e => e.phase === 'tech').length;
    if (engExisting === 0) {
      const techOptions = [];

      // Fiabilite si DNF
      if (hasDnf) {
        techOptions.push({
          id: `tech_reliability_${race}`,
          driverId: 'engineer', phase: 'tech', type: 'engineer',
          trigger: 'Analyse fiabilite',
          text: `Votre chef mecanicien a passe la nuit a analyser l'abandon. Il identifie deux options pour le prochain GP : changer la piece concernee au risque d'une penalite de grille, ou rouler avec le risque d'un nouvel abandon.`,
          choices: [
            { text: "On change. Une penalite de 5 places vaut mieux qu'un deuxieme abandon.", effect: {moral:+3, confiance:+5, penaltyGrid:true}, choiceType:'positive' },
            { text: "On surveille de pres et on decide jeudi apres les donnees EL.", effect: {moral:+1, confiance:+2}, choiceType:'neutral' },
            { text: "On prend le risque. La grille de depart ne se negocie pas.", effect: {dnfRisk:true, moral:-2}, choiceType:'negative' },
          ]
        });
      }

      // Analyse post-course standard
      const postAnalysis = [
        `Votre ingenieur de piste vient de compiler les donnees de la course. Il y a une piste serieuse d'amelioration sur le comportement en freinage tardif. Votre feu vert est necessaire pour lancer le travail.`,
        `L'analyse post-course est prete. Les donnees montrent que l'on perd principalement dans les virages lents — setup ou pilotage, la question se pose. L'ingenieur attend votre decision sur l'orientation.`,
        `Debriefing termine. Votre ingenieur a identifie un gain potentiel sur la gestion thermique des pneus. Cela necessite un changement de protocole pour le prochain week-end.`,
        `Les donnees telemetriques de la course viennent d'etre analysees. L'ingenieur a repere une anomalie sur le differentiel arriere. Ce n'est pas critique mais ca coute du temps. Il attend votre go pour investiguer.`,
        `Rapport technique disponible. On perd en moyenne 0.08s par tour sur la traction en sortie de virage lent. L'ingenieur a une solution mais elle demande une journee de travail supplementaire cette semaine.`,
        `Debriefing post-course : le comportement de la voiture sous SC etait different de la simulation. L'ingenieur veut comprendre pourquoi avant le prochain GP. Ca prend du temps et des ressources.`,
        `L'ingenieur vous presente les donnees d'usure des freins. On est dans les clous mais la marge est fine. Il propose un changement de specification pour le prochain circuit — plus couteux mais plus fiable.`,
        `Analyse aero post-course : on perd de l'appui en ligne droite mais on en gagne en virage. L'ingenieur ne sait pas si c'est voulu ou un probleme. Il attend votre direction pour la suite.`,
        `Les donnees moteur de la course inquietent legerement l'ingenieur. Temperatures plus elevees que prevu en fin de course. Rien de critique mais il veut ajuster les cartographies pour le prochain GP.`,
        `Rapport complet disponible. La bonne nouvelle : on est dans le top 5 des equipes sur la strategie de pneus. La mauvaise : on perd du temps aux arrets. L'ingenieur a une piste d'amelioration.`,
      ];
      techOptions.push({
        id: `tech_debrief_${race}`,
        driverId: 'engineer', phase: 'tech', type: 'engineer',
        trigger: 'Debriefing technique',
        text: postAnalysis[race % postAnalysis.length],
        choices: [
          { text: "Lancez le travail. On integre ca au programme du prochain week-end.", effect: {pace:+2, confiance:+3, tokenBonus:0}, choiceType:'positive' },
          { text: "Interessant. On fait un point apres les EL du prochain GP avant de valider.", effect: {pace:+1}, choiceType:'neutral' },
          { text: "On a d'autres priorites pour l'instant. Gardez ca en reserve.", effect: {}, choiceType:'negative' },
        ]
      });

      // R&D tous les 4 GP
      if (race % 4 === 0 && race > 0) {
        const domains = ['aero','chassis','engine','reliability'];
        const labels  = {aero:'aerodynamique',chassis:'chassis',engine:'moteur',reliability:'fiabilite'};
        const dom     = domains[race % domains.length];
        techOptions.push({
          id: `tech_rd_${race}`,
          driverId: 'engineer', phase: 'tech', type: 'engineer',
          trigger: 'Opportunite R&D',
          text: `L'equipe technique a identifie une piste de developpement sur le ${labels[dom]} suite aux donnees de ce GP. Les ressources sont disponibles mais limitees.`,
          choices: [
            { text: "On investit. C'est exactement le genre d'opportunite qu'on cherchait.", effect: {rdBonus:dom, tokenBonus:+1}, choiceType:'positive' },
            { text: "Donnez-moi les projections detaillees avant que je valide.", effect: {}, choiceType:'neutral' },
            { text: "Pas maintenant. On concentre les ressources ailleurs.", effect: {}, choiceType:'negative' },
          ]
        });
      }

      // Briefing pneus prochain circuit
      if (nextCirc) {
        const highDeg = nextCirc.tyreDegradation > 1.2;
        techOptions.push({
          id: `tech_tyres_${race}`,
          driverId: 'engineer', phase: 'tech', type: 'engineer',
          trigger: `Preparation ${nextCirc.name || 'prochain GP'}`,
          text: `Premier briefing sur le prochain circuit. La degradation des pneus est ${highDeg ? 'elevee — les simulations privilegient deux arrets' : 'moderee — un seul arret bien gere semble optimal'}. Comment orientez-vous la preparation ?`,
          choices: [
            { text: highDeg ? "Deux arrets. On optimise chaque relance plutot que de subir la degradation." : "Un arret. On maximise le rythme et on gere.", effect: {setupBonus:'race', moral:+2}, choiceType:'positive' },
            { text: "On reste ouverts aux deux options et on decide selon la meteo du vendredi.", effect: {}, choiceType:'neutral' },
            { text: "On attaque avec les Softs des le depart et on verra.", effect: {setupBonus:'qualify'}, choiceType:'negative' },
          ]
        });
      }

      // Toujours pousser tous les techOptions dans events — max 2
      const techToAdd = techOptions.slice(0, 2);
      techToAdd.forEach(te => events.push(te));
    }

    // ── PHASE PRE-COURSE (1 event) ───────────────────────────
    if (drivers.length > 0) {
      const d = drivers[Math.floor(Math.random() * drivers.length)];
      const driverPts = save.driverStandings?.[d.id] || 0;
      const loyalty   = save.driverLoyalty?.[d.id] ?? 50;
      const nextName  = nextCirc?.name || 'le prochain Grand Prix';

      let preEvent = null;

      // Arc narratif selon la phase de saison
      if (pct < 0.22 && !save[`arc_start_${d.id}_${season}`]) {
        save[`arc_start_${d.id}_${season}`] = true;
        preEvent = {
          id: `pre_arc_start_${d.id}_${season}`,
          driverId: d.id, phase: 'pre', type: 'driver',
          trigger: 'Debut de saison',
          text: `${d.firstName} vient vous voir dans votre bureau. "On a fait quoi comme objectifs cette saison ?" La question est posee calmement mais elle compte.`,
          choices: [
            { text: "On vise le top 5 constructeurs minimum. Et on se bat pour chaque point.", effect: {moral:+8, confiance:+6, loyalty:+5}, choiceType:'positive' },
            { text: "On progresse GP apres GP. Pas d'objectif chiffre — juste la performance.", effect: {moral:+4, confiance:+4}, choiceType:'neutral' },
            { text: "L'objectif c'est d'etre competitif a chaque sortie. Le classement suivra.", effect: {moral:+2, confiance:+3, pace:+1}, choiceType:'negative' },
          ]
        };
      } else if (pct >= 0.48 && pct < 0.70 && !save[`arc_tension_${d.id}_${season}`]) {
        save[`arc_tension_${d.id}_${season}`] = true;
        preEvent = {
          id: `pre_arc_tension_${d.id}_${season}`,
          driverId: d.id, phase: 'pre', type: 'driver',
          trigger: 'Phase cruciale',
          text: `On arrive dans le coeur de la saison. ${d.firstName} vous prend a part : "Les prochains GP vont tout decider. Je veux savoir jusqu'ou tu es pret a pousser cette voiture."`,
          choices: [
            { text: "On attaque. Setup agressif, strategie audacieuse — on ne gere pas.", effect: {moral:+6, confiance:+5, pace:+3, dnfRisk:true}, choiceType:'positive' },
            { text: "On joue nos forces. Regularite et saisir les opportunites.", effect: {moral:+4, confiance:+5, pace:+1}, choiceType:'neutral' },
            { text: "On securise les points. On prend zero risque inutile.", effect: {moral:+2, confiance:+3, pace:-1}, choiceType:'negative' },
          ]
        };
      } else if (pct >= 0.87 && !save[`arc_end_${d.id}_${season}`]) {
        save[`arc_end_${d.id}_${season}`] = true;
        preEvent = {
          id: `pre_arc_end_${d.id}_${season}`,
          driverId: d.id, phase: 'pre', type: 'driver',
          trigger: 'Derniers GP de la saison',
          text: `Il ne reste que quelques courses. ${d.firstName} vous dit simplement : "C'est la derniere ligne droite. Je veux qu'on finisse fort ensemble."`,
          choices: [
            { text: "On finit comme on a commence — tout donner. Carte blanche.", effect: {moral:+12, confiance:+10, loyalty:+8, pace:+3}, choiceType:'positive' },
            { text: "On reste concentres. Chaque point compte jusqu'au bout.", effect: {moral:+6, confiance:+6, pace:+2}, choiceType:'neutral' },
            { text: "On protege notre classement. La prudence d'abord.", effect: {moral:+2, confiance:+3, pace:-1}, choiceType:'negative' },
          ]
        };
      } else {
        // Event pré-course contextuel
        const preTexts = [
          `${d.firstName} passe la tete dans votre bureau la veille du depart pour ${nextName}. "On est prets ?" Il attend votre leadership avant de monter dans l'avion.`,
          `Avant de quitter le paddock, ${d.firstName} vous croise dans le couloir. "Le prochain circuit me convient bien. On peut viser plus haut ?" Sa confiance est visible.`,
          `${d.firstName} vous envoie un message depuis l'hotel : il a regarde des donnees de qualification sur ${nextName} et a des idees. Il veut en discuter.`,
          `Vol vers ${nextName}. ${d.firstName} s'assoit a cote de vous dans l'avion de l'equipe. "J'ai une question sur la strategie." Le couloir est calme. Le moment est bon.`,
          `${d.firstName} vous laisse un message vocal ce soir. "J'ai analyse les donnees de ${nextName}. Je crois qu'on peut se qualifier dans le top 8. Rappelle-moi."`,
          `A l'hotel avant ${nextName}, ${d.firstName} croise votre regard au petit dejeuner. "On se fixe un objectif cette semaine ou on improvise ?" Il veut une reponse claire.`,
          `${d.firstName} a passe la soiree a regarder des onboards de ${nextName}. Il vous contacte : "Y a un truc sur le freinage au virage 7 que je veux tester en EL. T'en penses quoi ?"`,
          `Message de ${d.firstName} la veille du voyage : "J'ai besoin de savoir si la voiture va etre prete pour ${nextName}. Des rumeurs circulent dans le paddock sur notre fiabilite."`,
          `${d.firstName} vous croise dans le couloir de l'usine. "Je voulais te dire — je suis focus pour ${nextName}. Mais j'ai besoin que tu m'expliques la strategie de la semaine."`,
          `La semaine avant ${nextName}, ${d.firstName} demande un meeting de 10 minutes. Il a prepare des notes. Il veut s'assurer que vous etes alignes sur les objectifs du week-end.`,
        ];
        preEvent = {
          id: `pre_generic_${d.id}_${race}`,
          driverId: d.id, phase: 'pre', type: 'driver',
          trigger: `Avant ${nextName}`,
          text: preTexts[race % preTexts.length],
          choices: [
            { text: "Plus que prets. On va chercher le maximum la-bas.", effect: {moral:+7, confiance:+5, loyalty:+3}, choiceType:'positive' },
            { text: "On fait notre travail et on reste concentres sur nos points forts.", effect: {moral:+3, confiance:+3}, choiceType:'neutral' },
            { text: "On se concentre d'abord sur les EL avant de fixer des objectifs.", effect: {moral:+1, confiance:+2}, choiceType:'negative' },
          ]
        };
      }

      if (preEvent) events.push(preEvent);
    }

    // ── EVENT D'ESCALADE PRIORITAIRE ────────────────────────
    drivers.forEach(d => {
      const loyalty = save.driverLoyalty?.[d.id] ?? 50;
      const moral   = save.immersion?.driverMorale?.[d.id]?.value ?? 70;
      const history = (save.socialHistory||[]).filter(h => h.driverName?.includes(d.name));
      const hardCount = history.slice(0,5).filter(h=>h.choiceType==='negative').length;

      if (hardCount >= 2 && loyalty < 35 && !save[`esc_threat_${d.id}_${season}`]) {
        save[`esc_threat_${d.id}_${season}`] = true;
        events.unshift({
          id: `esc_threat_${d.id}_${season}`,
          driverId: d.id, phase: 'post', type: 'escalation', urgent: true,
          trigger: 'Situation critique',
          text: `${d.firstName} ${d.name} a demande un entretien prive d'urgence. Son agent est en contact avec deux equipes. Les tensions des derniers GP ont fragilise la relation. Il est temps de clarifier.`,
          choices: [
            { text: "J'ai fait des erreurs de management. On repart sur une base saine.", effect: {moral:+15, confiance:+12, loyalty:+15}, choiceType:'positive' },
            { text: "Je t'offre une prolongation avec une revalorisation. Tu es notre avenir.", effect: {moral:+10, confiance:+8, loyalty:+10, contractSignal:true}, choiceType:'neutral' },
            { text: "Si les conditions ne te conviennent plus, je comprends. Chacun ses choix.", effect: {moral:-15, confiance:-15, loyalty:-20}, choiceType:'negative' },
          ]
        });
      }
    });

    // Ajouter tous les events au save
    events.forEach(ev => {
      if (!save.socialEvents.find(e => e.id === ev.id)) {
        save.socialEvents.push({...ev, read: false, resolved: false});
      }
    });

    // Marquer comme généré seulement si des events ont bien été créés
    if (events.length > 0) {
      save[gpKey] = true;
    }
  },

  // Répare les sauvegardes où la génération a échoué (flag posé mais 0 message)
  repairSocialIfMissing(save) {
    if (!save?.playerTeamId || !save.lastGpSummary) return save;
    const raceIdx = Number(save.race) || 0;
    if (raceIdx <= 0) return save;

    const gpKey = `social_generated_gp_${raceIdx}_${save.season||2025}`;
    const pending = (save.socialEvents || []).filter(e => !e.resolved);
    const hasEventsForGp = pending.some(e =>
      String(e.id || '').endsWith(`_${raceIdx}`) ||
      String(e.id || '').includes(`_${raceIdx}_`)
    );

    if (pending.length > 0 && hasEventsForGp) return save;
    if (!save[gpKey] && pending.length > 0) return save;

    // Flag bloquant sans messages → on régénère depuis le dernier GP
    delete save[gpKey];

    const summary = save.lastGpSummary;
    const results = (summary.results || summary.playerResults || []).map(r => ({
      position: r.position || 20,
      status: r.status || 'finished',
      points: r.points || 0,
      driver: r.driverId ? F1Data.drivers.find(d => d.id === r.driverId) : null,
      driverId: r.driverId || null,
      team: F1Data.teams.find(t => t.id === (r.teamId || save.playerTeamId)),
      teamId: r.teamId || null,
    })).filter(r => r.driver || r.driverId);

    if (!results.length) return save;

    try {
      this.generatePostRaceSocial(save, results, save.playerTeamId);
      if ((save.socialEvents || []).some(e => !e.resolved)) {
        this.save(save);
      }
    } catch (e) {
      console.warn('[Save] repairSocialIfMissing:', e);
    }
    return save;
  },

  // ── RESTAURATION STATS EQUIPES IA ────────────────────────
  restoreRivalStats(save) {
    if (!save?.rivalTeamStats || typeof F1Data === 'undefined') return;
    F1Data.teams.forEach(team => {
      const stored = save.rivalTeamStats[team.id];
      if (!stored) return;
      team.aero        = stored.aero        ?? team.aero;
      team.chassis     = stored.chassis     ?? team.chassis;
      team.engine      = stored.engine      ?? team.engine;
      team.reliability = stored.reliability ?? team.reliability;
      team.performance = stored.performance ?? team.performance;
    });
  },

  // ── RESET RÉGLEMENTAIRE ───────────────────────────────────
  applyRegulationReset(save, regulation) {
    const resetFactor = regulation.resetFactor || 0.82;

    F1Data.teams.forEach(team => {
      // Calculer le bonus next year investi par le joueur
      const isPlayer = team.id === save.playerTeamId;
      let nextYearBonus = 0;

      if (isPlayer && save.nextYearDev) {
        Object.values(save.nextYearDev).forEach(inv => {
          nextYearBonus += (inv.gain || 0) * (F1Data.nextYearBonusMultiplier || 1.8);
        });
      }

      // IA : investissement simulé selon la richesse — capé à 12 pour éviter powercreep
      if (!isPlayer) {
        const richness = (team.budget||200) / 500; // 0 à 1
        nextYearBonus  = Math.round(richness * 10 + Math.random() * 4); // 2-14 pts max
      }

      // Reset : utiliser les stats persistées pour l'IA (pas les stats de base de data.js)
      const stats = ['aero','chassis','engine','reliability'];
      stats.forEach(stat => {
        const rivalStored = !isPlayer ? save.rivalTeamStats?.[team.id]?.[stat] : null;
        const current = isPlayer
          ? (save.carDev?.[stat]?.level || team[stat])
          : (rivalStored || team[stat]); // stats fin de saison, pas data.js
        const reset   = Math.round(current * resetFactor + nextYearBonus * 0.25);
        const newVal  = Math.max(45, Math.min(95, reset));

        if (isPlayer && save.carDev?.[stat]) {
          save.carDev[stat].level    = newVal;
          save.carDev[stat].done     = []; // reset upgrades
          save.carDev[stat].pending  = [];
        }
        team[stat] = newVal;
      });

      team.performance = Math.round((team.aero + team.chassis + team.engine) / 3);

      // Log news pour l'IA
      if (!isPlayer && nextYearBonus > 12) {
        if (typeof save.news === 'undefined') save.news = [];
        save.news.push({
          icon: '⚙️', category: 'technical',
          title: `${team.name} bien préparée pour ${regulation.season}`,
          text: `${team.name} a massivement investi dans le nouveau règlement. Performance de base : ${team.performance}.`,
        });
      }
    });

    // Reset next year dev après application
    save.nextYearDev = {};

    // Bannière règlement
    if (typeof save.news === 'undefined') save.news = [];
    save.news.push({
      icon: '📋', category: 'regulation',
      title: regulation.name,
      text: regulation.desc + ` Reset des performances (×${regulation.resetFactor}). Les équipes qui ont investi dans le nouveau concept partent avec un avantage.`,
    });
  },

  // ── AUTOSAVE ─────────────────────────────────────────────
  startAutosave(getData, intervalMs = 60000) {
    return setInterval(() => {
      const data = getData();
      if (data) this.save(data);
    }, intervalMs);
  },

};


function resetSponsorObjectivesForNewSeason(career){
  if(!career || !Array.isArray(career.sponsors)) return career;

  career.sponsors.forEach(sponsor=>{
    sponsor.progress = 0;
    sponsor.paid = false;
    sponsor.satisfied = false;

    if(Array.isArray(sponsor.clauses)){
      sponsor.clauses.forEach(clause=>{
        clause.progress = 0;
        clause.bonusPaid = false;
        clause.paid = false;
        clause.completed = false;
        clause.satisfied = false;

        if(clause.bonusObjective && typeof clause.bonusObjective === "object"){
          clause.bonusObjective.progress = 0;
          clause.bonusObjective.paid = false;
          clause.bonusObjective.bonusPaid = false;
          clause.bonusObjective.completed = false;
          clause.bonusObjective.satisfied = false;
          if("unlocked" in clause.bonusObjective){
            clause.bonusObjective.unlocked = false;
          }
        }
      });
    }
  });

  return career;
}


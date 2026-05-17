// ============================================================
//  F1 Manager — career.js
//  Système de carrière long terme :
//  - Évolution / déclin des pilotes
//  - Génération de nouveaux pilotes
//  - Vieillissement annuel
//  - Retraites
// ============================================================

const Career = {

  // ── COURBE D'ÉVOLUTION PAR ÂGE ────────────────────────────
  // Retourne un multiplicateur de progression/déclin selon l'âge
  ageProgression(age) {
    if (age <= 20) return { pace: +2.5, consistency: +1.5, wetSkill: +1.0, defending: +0.5, overtaking: +1.5 };
    if (age <= 23) return { pace: +1.8, consistency: +1.2, wetSkill: +0.8, defending: +0.8, overtaking: +1.2 };
    if (age <= 26) return { pace: +1.0, consistency: +0.8, wetSkill: +0.5, defending: +0.5, overtaking: +0.8 };
    if (age <= 29) return { pace: +0.4, consistency: +0.5, wetSkill: +0.3, defending: +0.3, overtaking: +0.3 };
    if (age <= 32) return { pace: +0.0, consistency: +0.3, wetSkill: +0.1, defending: +0.2, overtaking: +0.0 };
    if (age <= 35) return { pace: -0.5, consistency: +0.1, wetSkill: +0.0, defending: +0.1, overtaking: -0.3 };
    if (age <= 38) return { pace: -1.2, consistency: -0.2, wetSkill: -0.2, defending: -0.1, overtaking: -0.8 };
    return             { pace: -2.0, consistency: -0.8, wetSkill: -0.5, defending: -0.5, overtaking: -1.5 };
  },

  // ── VIEILLISSEMENT ANNUEL ─────────────────────────────────
  // Appelé en fin de saison pour tous les pilotes
  ageAllDrivers(save) {
    if (!save) return;
    const retired = [];

    F1Data.drivers.forEach(driver => {
      if (driver.retired) return;

      driver.age = (driver.age || 25) + 1;

      // Progression selon l'âge
      const prog = this.ageProgression(driver.age);
      const trait = F1Data.traits[driver.trait] || {};

      // Variabilité individuelle (±50% de la progression de base)
      const variance = 0.5 + Math.random();

      // Stats plafonnées par le potentiel du pilote
      const cap = driver.potential || 95;

      ['pace','consistency','wetSkill','overtaking','defending'].forEach(stat => {
        const delta = (prog[stat] || 0) * variance;
        driver[stat] = Math.max(50, Math.min(cap, Math.round((driver[stat] || 70) + delta)));
      });

      // Retraite possible à partir de 38 ans (probabilité croissante).
      // Les agents libres vieillissent/retraitent plus vite pour éviter un marché saturé
      // de pilotes générés qui restent disponibles pendant 20 saisons.
      if (driver.age >= 38) {
        const isFreeAgent = !driver.teamId;
        const retireChance = isFreeAgent
          ? Math.min(0.95, (driver.age - 37) * 0.28)
          : Math.min(0.85, (driver.age - 37) * 0.18);
        if (driver.age >= 42 || Math.random() < retireChance) {
          driver.retired = true;
          driver.teamId  = null;
          retired.push(driver);
        }
      }

      // Mise à jour salaire selon les stats
      driver.salary = this.calcSalary(driver);
    });

    return retired;
  },

  // ── CALCUL SALAIRE ────────────────────────────────────────
  calcSalary(driver) {
    const avg = (driver.pace + driver.consistency + driver.wetSkill) / 3;
    if (avg >= 93) return Math.round(30 + (avg - 93) * 8);
    if (avg >= 87) return Math.round(10 + (avg - 87) * 3.5);
    if (avg >= 80) return Math.round(4  + (avg - 80) * 0.8);
    return Math.max(1, Math.round(avg * 0.05));
  },

  // ── GÉNÉRATION D'UN NOUVEAU PILOTE ────────────────────────
  generateDriver(save) {
    const names  = F1Data.driverNames;
    const nats   = Object.keys(names.firstNames);
    const nat    = nats[Math.floor(Math.random() * nats.length)];

    const fnames = names.firstNames[nat] || names.firstNames.british;
    const lnames = names.lastNames[nat]  || names.lastNames.british;

    const firstName = fnames[Math.floor(Math.random() * fnames.length)];
    const lastName  = lnames[Math.floor(Math.random() * lnames.length)];

    // Numéro libre
    const usedNumbers = new Set(F1Data.drivers.filter(d=>!d.retired).map(d=>d.number));
    const available   = F1Data.availableNumbers.filter(n => !usedNumbers.has(n));
    const number      = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : Math.floor(Math.random() * 90) + 10;

    // Âge : 18-22 (jeune talent)
    const age = 18 + Math.floor(Math.random() * 5);

    // Spécialité → boost dans 1 ou 2 stats
    const traits    = Object.keys(F1Data.traits);
    const trait     = traits[Math.floor(Math.random() * traits.length)];
    const traitData = F1Data.traits[trait];

    // Stats de base selon l'âge (jeune = bas mais potentiel élevé)
    const base = 62 + Math.floor(Math.random() * 15); // 62-77

    // Potentiel aléatoire : détermine le plafond de progression
    // Rare talent (95+) = 5% de chance, bon talent (88-94) = 25%, correct (80-87) = 45%, limité (70-79) = 25%
    const potRoll = Math.random();
    let potential;
    if      (potRoll < 0.05) potential = 95 + Math.floor(Math.random() * 5);  // 95-99 : futur champion
    else if (potRoll < 0.30) potential = 88 + Math.floor(Math.random() * 7);  // 88-94 : très bon
    else if (potRoll < 0.75) potential = 80 + Math.floor(Math.random() * 8);  // 80-87 : correct
    else                     potential = 70 + Math.floor(Math.random() * 10); // 70-79 : limité

    // Spécialisation selon le trait
    const statMap = {
      aggressive:  { pace:+4, overtaking:+5, wetSkill:+0, consistency:-3 },
      consistent:  { pace:+0, consistency:+5, wetSkill:+2, defending:+2   },
      qualifier:   { pace:+6, consistency:-2, wetSkill:+0, overtaking:+1  },
      rain_master: { wetSkill:+8, pace:+0, consistency:+2, defending:+2   },
      defender:    { defending:+7, pace:-1, consistency:+3, wetSkill:+1   },
      overtaker:   { overtaking:+7, pace:+2, consistency:-1, wetSkill:+0  },
      prodigy:     { pace:+3, consistency:+3, wetSkill:+3, overtaking:+3  },
      technical:   { consistency:+4, defending:+3, pace:+1, wetSkill:+2   },
    };

    const spec = statMap[trait] || {};

    const driver = {
      id:          `GEN_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      name:        lastName,
      firstName,
      nationality: nat,
      teamId:      null, // sans équipe au départ
      number,
      age,
      potential,
      trait,
      retired:     false,
      generated:   true,
      pace:        Math.min(potential, Math.max(50, base + (spec.pace || 0))),
      consistency: Math.min(potential, Math.max(50, base + (spec.consistency || 0))),
      wetSkill:    Math.min(potential, Math.max(50, base + (spec.wetSkill || 0))),
      overtaking:  Math.min(potential, Math.max(50, base + (spec.overtaking || 0))),
      defending:   Math.min(potential, Math.max(50, base + (spec.defending || 0))),
      salary:      1, // calculé après
      seasons:     0, // nombre de saisons en F1
    };

    driver.salary = this.calcSalary(driver);

    return driver;
  },

  // ── ENTRÉES EN F1 CHAQUE SAISON ───────────────────────────
  // Génère 2-4 jeunes talents qui entrent dans le pool
  generateNewTalents(save) {
    const count = 2 + Math.floor(Math.random() * 3); // 2-4 par saison : marché vivant sans saturation
    const newDrivers = [];
    for (let i = 0; i < count; i++) {
      const d = this.generateDriver(save);
      newDrivers.push(d);
      F1Data.drivers.push(d);
    }
    return newDrivers;
  },

  // ── LIBÉRATION DES SIÈGES ─────────────────────────────────
  // En fin de saison, certains pilotes perdent leur siège (perf insuffisante)
  releasePoorPerformers(save) {
    const released = [];
    if (!save?.teamStandings) return released;

    F1Data.teams.forEach(team => {
      const teamDrivers = F1Data.drivers.filter(d => d.teamId === team.id && !d.retired);
      if (teamDrivers.length < 2) return;

      // Le pilote le moins bon peut être remplacé si l'écart est trop grand
      const sorted = [...teamDrivers].sort((a, b) => {
        const scoreA = (a.pace + a.consistency + a.wetSkill) / 3;
        const scoreB = (b.pace + b.consistency + b.wetSkill) / 3;
        return scoreB - scoreA;
      });

      const best  = sorted[0];
      const worst = sorted[sorted.length - 1];
      const gap   = ((best.pace + best.consistency) / 2) - ((worst.pace + worst.consistency) / 2);

      // Libère si écart > 12 points et pas l'équipe joueur
      if (gap > 12 && team.id !== save.playerTeamId && Math.random() < 0.45) {
        worst.teamId = 'free_agent';
        released.push(worst);
      }
    });

    return released;
  },

  // ── SIGNATURE IA : remplacer les sièges vides ────────────
  fillEmptySeats(save) {
    const freeDrivers = F1Data.drivers.filter(d => !d.teamId && !d.retired);

    F1Data.teams.forEach(team => {
      if (team.id === save?.playerTeamId) return; // géré par le joueur
      const count = F1Data.drivers.filter(d => d.teamId === team.id && !d.retired).length;
      if (count >= 2) return;

      const needed = 2 - count;
      for (let i = 0; i < needed; i++) {
        if (!freeDrivers.length) break;
        // Choisir le meilleur disponible adapté au niveau de l'équipe
        const teamLevel = team.performance;
        const candidates = freeDrivers.sort((a, b) => {
          const sa = Math.abs(((a.pace + a.consistency) / 2) - teamLevel);
          const sb = Math.abs(((b.pace + b.consistency) / 2) - teamLevel);
          return sa - sb;
        });
        const pick = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
        if (pick) {
          pick.teamId = team.id;
          freeDrivers.splice(freeDrivers.indexOf(pick), 1);
        }
      }
    });
  },

  cleanupDriverPool(save) {
    if (!save || typeof F1Data === 'undefined') return;
    // On garde les pilotes officiels et les actifs. On retire seulement les vieux générés,
    // agents libres et retraités du pool sauvegardé pour éviter une liste infinie.
    const removable = new Set(
      F1Data.drivers
        .filter(d => d.generated && !d.teamId && d.retired && (d.age || 0) >= 42)
        .map(d => d.id)
    );
    if (!removable.size) return;
    F1Data.drivers = F1Data.drivers.filter(d => !removable.has(d.id));
    save.generatedDrivers = (save.generatedDrivers || []).filter(d => !removable.has(d.id));
    Object.keys(save.driverStates || {}).forEach(id => { if (removable.has(id)) delete save.driverStates[id]; });
    Object.keys(save.contracts || {}).forEach(id => { if (removable.has(id)) delete save.contracts[id]; });
  },


  resetSponsorSeasonProgress(save) {
    if (!save || !Array.isArray(save.sponsors)) return save;
    const season = Number(save.season || 2025);

    save.sponsors.forEach(sp => {
      sp.progress = 0;
      sp.paid = false;
      sp.satisfied = true;
      sp._progressSeason = season;

      (sp.clauses || []).forEach(cl => {
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
    });

    return save;
  },

  // ── FIN DE SAISON COMPLÈTE ────────────────────────────────
  // Appelé manuellement depuis drivers.html
  endOfSeason(save) {
    const report = {
      retired:    [],
      newTalents: [],
      released:   [],
      academy:    null,
    };

    if (!save) return report;

    save.generatedDrivers  = save.generatedDrivers  || [];
    save.completedSeasons  = save.completedSeasons  || [];
    save.driverStandings   = save.driverStandings   || {};
    save.teamStandings     = save.teamStandings     || {};
    save.raceResults       = save.raceResults       || [];

    const currentSeason = save.season || 2025;
    const playerTeamId  = save.playerTeamId;
    this.ensureContractSystem(save);

    // 0. Archiver le palmarès de la saison que l'on termine.
    // Même si le joueur clique sur "Fin de saison" avant le dernier GP,
    // l'ancienne saison est clôturée proprement et les stats repartent à zéro.
    const teamRank = [...F1Data.teams].sort((a, b) =>
      (save.teamStandings[b.id] || 0) - (save.teamStandings[a.id] || 0)
    );
    const driverRank = [...F1Data.drivers].sort((a, b) =>
      (save.driverStandings[b.id] || 0) - (save.driverStandings[a.id] || 0)
    );
    const playerConstructorPos = teamRank.findIndex(t => t.id === playerTeamId) + 1 || null;
    const champion             = driverRank[0] || null;
    const constructorChampion  = teamRank[0] || null;
    const prize = playerConstructorPos ? Math.max(20, 120 - (playerConstructorPos - 1) * 10) : 20;

    save.completedSeasons.push({
      season: currentSeason,
      playerConstructorPos,
      driverChampionId: champion?.id || null,
      constructorChampionId: constructorChampion?.id || null,
      prize,
      racesCompleted: Number(save.race) || 0,
    });

    // 1. Vieillir tous les pilotes
    report.retired = this.ageAllDrivers(save) || [];

    // 2. Libérer les mauvais performers (IA)
    report.released = this.releasePoorPerformers(save);

    // 3. Générer de nouveaux talents
    const newDrivers = this.generateNewTalents(save);
    report.newTalents = newDrivers;
    newDrivers.forEach(d => save.generatedDrivers.push(d));

    // 3b. Académie joueur : un junior au hasard est libéré comme agent libre,
    // puis un nouveau talent arrive. Les autres restent à l'académie et ne saturent pas le marché.
    if (typeof Immersion !== 'undefined' && Immersion.academyEndOfSeason) {
      report.academy = Immersion.academyEndOfSeason(save);
    }

    // 4. Remplir les sièges vides (IA) AVANT de persister les états pilotes.
    // Avant, les changements de teamId pouvaient être perdus au rechargement.
    this.fillEmptySeats(save);
    this.cleanupDriverPool(save);

    // 5. Persister l'état de tous les pilotes
    save.driverStates = {};
    F1Data.drivers.forEach(d => {
      save.driverStates[d.id] = {
        age:         d.age,
        pace:        d.pace,
        consistency: d.consistency,
        wetSkill:    d.wetSkill,
        overtaking:  d.overtaking,
        defending:   d.defending,
        salary:      d.salary,
        trait:       d.trait,
        potential:   d.potential,
        retired:     d.retired,
        teamId:      d.teamId,
        seasons:     (d.seasons || 0) + 1,
      };
      d.seasons = (d.seasons || 0) + 1;
    });

    // 5b. Les contrats perdent une année à la fin de chaque saison
    Object.keys(save.contracts || {}).forEach(id => {
      const c = save.contracts[id];
      if (!c) return;
      c.years = Math.max(0, (Number(c.years) || 0) - 1);
      const d = F1Data.drivers.find(x => x.id === id);
      if (d && d.teamId === playerTeamId && c.years === 0) {
        c.satisfaction = Math.max(10, (c.satisfaction ?? 50) - 8);
      }
    });

    // 6. Incrémenter la saison et reset complet des stats/courses
    save.season          = currentSeason + 1;
    save.race            = 0;
    save.driverStandings = {};
    save.teamStandings   = {};

    // Nettoyer les pilotes retraités du driverStates pour le standings
    if (save.driverStates) {
      Object.keys(save.driverStates).forEach(id => {
        const st = save.driverStates[id];
        const d  = F1Data.drivers.find(x => x.id === id);
        // Marquer comme retraité si plus d'équipe et pas de contrat
        if (st.teamId === 'free_agent' || !st.teamId) {
          const contract = save.contracts?.[id];
          if (!contract || contract.years <= 0) {
            st.retired = true;
          }
        }
      });
    }
    save.raceResults     = [];
    save.seasonFinished = false;
    save._seasonReadyForReview = false;

    // Nettoyage des données du dernier GP : elles appartiennent à l'ancienne
    // saison et ne doivent pas faire croire à l'index que la nouvelle saison
    // est déjà terminée.
    save.lastGpSummary = null;
    save.lastRaceResult = null;
    save._lastRaceResult = null;
    save._seasonClosedAt = new Date().toISOString();

    save.news            = (save.news || []).slice(0, 5);

    // Changement de règlement tous les 4 ans
    const newSeason = currentSeason + 1;
    const isRegulationYear = (newSeason % 4 === 0); // 2028, 2032, 2036...
    if (isRegulationYear && typeof Save !== 'undefined' && Save.applyRegulationReset) {
      const regulation = {
        resetFactor: 0.80, // reset plus brutal que l'intersaison normale
        desc: `Nouveau règlement technique ${newSeason}.`,
        year: newSeason,
      };
      Save.applyRegulationReset(save, regulation);
      save.news = save.news || [];
      save.news.unshift({
        icon: '📋',
        category: 'regulation',
        title: `Nouveau règlement ${newSeason}`,
        text: `La FIA introduit un nouveau règlement technique. Toutes les équipes repartent avec des performances réinitialisées. Les équipes qui ont investi dans la nouvelle réglementation partent avec un avantage.`,
        date: new Date().toISOString(),
      });
    }

    // Reset profond des objectifs sponsors pour la nouvelle saison
    this.resetSponsorSeasonProgress(save);

    // 7. Tokens bonus + prime fin de saison
    save.tokens = (save.tokens || 0) + 3; // réduit de 5→3 (nerf R&D)
    save.budget = Math.round(((save.budget || 0) + prize) * 10) / 10;

    // 8. Revenus annuels
    const team = F1Data.teams.find(t => t.id === save.playerTeamId);
    if (team) {
      const incomeBonus = Math.round(team.performance * 0.8);
      save.budget = Math.round(((save.budget || 0) + incomeBonus) * 10) / 10;
    }

    // ══════════════════════════════════════════════════════════
    // 9. PROGRESSION VOITURE — système équilibré v2
    //    Héritage partiel + IA qui progresse + stagnation possible
    //    + filet de sécurité anti-death-spiral
    // ══════════════════════════════════════════════════════════
    if (save.carDev && team) {
      const DOMAINS = ['aero','chassis','engine','reliability'];
      const seasonsPlayed = save.completedSeasons?.length || 1;

      // ── Calculer les gains de la saison (delta vs base équipe)
      const seasonGains = {};
      DOMAINS.forEach(d => {
        const base = team[d] !== undefined ? team[d] : 70;
        const current = save.carDev[d]?.level || base;
        seasonGains[d] = Math.max(0, current - base);
      });

      // ── Héritage partiel : 35% des gains conservés
      // Plus on est avancé (saisons jouées), moins on hérite (équipe mature)
      const heritageFactor = Math.max(0.15, 0.35 - (seasonsPlayed - 1) * 0.03);

      // ── Événements de stagnation (30% de chance, max 1 domaine/saison, jamais 2x le même)
      let stagnationDomain = null;
      const lastStagnation = save._lastStagnationDomain || null;
      if (Math.random() < 0.30) {
        const candidates = DOMAINS.filter(d => d !== lastStagnation && seasonGains[d] > 0);
        if (candidates.length) {
          stagnationDomain = candidates[Math.floor(Math.random() * candidates.length)];
          save._lastStagnationDomain = stagnationDomain;
          const stagnationEvents = [
            `Concept technique dans une impasse en ${stagnationDomain}.`,
            `Ingénieur clé parti chez un concurrent — ${stagnationDomain} gelé.`,
            `Règlement défavorable au concept ${stagnationDomain} de l'équipe.`,
            `Direction technique divisée sur l'avenir du ${stagnationDomain}.`,
          ];
          const msg = stagnationEvents[Math.floor(Math.random() * stagnationEvents.length)];
          save.news = save.news || [];
          save.news.push({ icon:'⚠️', category:'technical', title:'Stagnation technique', text: msg });
          report.stagnation = { domain: stagnationDomain, msg };
        }
      } else {
        save._lastStagnationDomain = null; // reset si pas de stagnation cette saison
      }

      // ── Coûts opérationnels croissants (+4% par saison, plafonné à +30%)
      const opCostMultiplier = Math.min(1.30, 1 + (seasonsPlayed - 1) * 0.04);
      save._opCostMultiplier = opCostMultiplier;

      // ── Appliquer la nouvelle base pour chaque domaine
      DOMAINS.forEach(d => {
        const base = team[d] !== undefined ? team[d] : 70;
        const gain = seasonGains[d];
        const isStagnated = d === stagnationDomain;

        // Héritage : gain × heritageFactor, annulé si stagnation
        const inherited = isStagnated ? 0 : Math.round(gain * heritageFactor * 10) / 10;

        // nextYearDev bonus
        let nextYearBonus = 0;
        if (save.nextYearDev) {
          Object.values(save.nextYearDev).forEach(inv => {
            if (inv.domainKey === d) nextYearBonus += (inv.gain || 0);
          });
        }

        // Plafond relatif : au-delà de 85, progression réduite de 50%
        const rawNew = base + inherited + nextYearBonus;
        let newLevel;
        if (rawNew > 85) {
          const over = rawNew - 85;
          newLevel = 85 + Math.round(over * 0.5);
        } else {
          newLevel = rawNew;
        }
        newLevel = Math.max(base, Math.min(99, newLevel)); // jamais en dessous de la base

        save.carDev[d] = {
          level: Math.round(newLevel * 10) / 10,
          upgrades: 0,
          done: [],
          pending: [],
          _heritage: inherited,
          _nextYear: nextYearBonus,
        };
      });

      // ── Filet de sécurité : upgrade "low cost" toujours disponible
      // Marqué dans le save pour que rd.html puisse l'afficher
      save._safetyUpgradeAvailable = true;

      // Reset nextYearDev
      save.nextYearDev = {};
      save.rdBudget      = Math.round((team.budget || 200) * (F1Data.rdBudgetRatio || 0.4));
      save.rdBudgetTotal = save.rdBudget;

      // Log héritage dans les news
      const inheritedTotal = DOMAINS.reduce((s,d)=>s+(save.carDev[d]?._heritage||0),0);
      if (inheritedTotal > 0) {
        save.news = save.news || [];
        save.news.push({
          icon:'🔧', category:'technical', title:'Héritage technique conservé',
          text:`Votre équipe conserve ${inheritedTotal.toFixed(1)} pts de développement pour la nouvelle saison.`,
        });
      }
    }

    // ── IA progresse chaque saison (course perpétuelle)
    // Budget-dépendant : grosses équipes progressent plus vite
    this.progressAITeams(save, currentSeason);

    // ── Filet de sécurité budget : droits TV minimum garanti
    // Même au pire classement, l'équipe touche 18M€ (TV rights plancher)
    const TV_FLOOR = 18;
    if ((save.budget || 0) < TV_FLOOR) {
      const boost = TV_FLOOR - (save.budget || 0);
      save.budget = TV_FLOOR;
      save.news = save.news || [];
      save.news.push({
        icon:'📺', category:'finance', title:'Droits TV — plancher garanti',
        text:`La FIA verse ${boost.toFixed(1)}M€ de droits TV minimum. L'équipe peut continuer à opérer.`,
      });
    }

    // ── Token de consolation si 3 GP sans points consécutifs
    save._noPointsStreak = save._noPointsStreak || 0;
    const lastRaces = (save.raceResults || []).slice(-3);
    const allZero = lastRaces.length === 3 && lastRaces.every(r => (r.teamPoints||0) === 0);
    if (allZero && save._noPointsStreak >= 2) {
      save.tokens = (save.tokens || 0) + 1;
      save._noPointsStreak = 0;
      save.news = save.news || [];
      save.news.push({
        icon:'🔬', category:'technical', title:'Compensation technique FIA',
        text:'La FIA alloue un token R&D supplémentaire aux équipes en difficulté.',
      });
    } else if (allZero) {
      save._noPointsStreak++;
    } else {
      save._noPointsStreak = 0;
    }

    // 11. Traiter le staff généré (vieillissement + nouveaux + mouvements IA)
    const staffReport          = this.processStaffEndOfSeason(save);
    report.retiredStaff        = staffReport.retired   || [];
    report.newStaff            = staffReport.newStaff  || [];
    report.progressedStaff     = staffReport.progressed|| [];

    Save.save(save);
    return report;
  },

  // ── PROGRESSION IA ANNUELLE ──────────────────────────────
  // Les équipes rivales progressent chaque saison — budget-dépendant
  // Crée une course perpétuelle, empêche le joueur d'atteindre un mur fixe
  progressAITeams(save, season) {
    const DOMAINS = ['aero','chassis','engine','reliability'];
    F1Data.teams.forEach(team => {
      if (team.id === save.playerTeamId) return; // joueur géré séparément

      // Progression basée sur le budget : riche = +2 à +3 pts/domaine, pauvre = +0.5 à +1.5
      const richness = Math.min(1, (team.budget || 100) / 210); // 0→1
      const baseGain = 0.5 + richness * 2.5; // 0.5 à 3.0 pts
      const variance = (Math.random() - 0.5) * 1.5; // ±0.75

      // 20% de chance de stagnation IA (rend le jeu moins prévisible)
      const stagnates = Math.random() < 0.20;

      DOMAINS.forEach(d => {
        if (!team[d]) return;
        if (stagnates && Math.random() < 0.5) return; // stagnation partielle
        const gain = Math.round((baseGain + variance) * 10) / 10;
        // Plafond 99, plancher = valeur actuelle (pas de régression IA)
        team[d] = Math.max(team[d], Math.min(99, Math.round((team[d] + gain) * 10) / 10));
      });

      // Recalcul performance globale
      team.performance = Math.round(
        (team.aero * 0.3 + team.chassis * 0.3 + team.engine * 0.3 + team.reliability * 0.1)
      );

      // Croissance budget IA (plus modérée que le joueur pour ne pas trop s'envoler)
      const budgetGain = Math.round(richness * 8 + Math.random() * 5);
      team.budget = Math.min(350, (team.budget || 100) + budgetGain);
    });
  },

  // ── UPGRADE LOW-COST (filet sécurité) ────────────────────
  // Toujours disponible, gain minimal, gratuit en tokens
  // Empêche le blocage total sur budget serré
  getLowCostUpgrades() {
    const DOMAINS = ['aero','chassis','engine','reliability'];
    return DOMAINS.map(d => ({
      id:         `lowcost_${d}`,
      domain:     d,
      name:       'Optimisation de base',
      desc:       'Petit ajustement sans grande R&D. Gain modeste mais garanti.',
      cost:       4,    // M€ seulement
      tokens:     0,    // gratuit en tokens
      gain:       1,    // +1 pt
      deliveryGps:1,
      isLowCost:  true,
    }));
  },

  // ── RÉSUMÉ DE FIN DE SAISON (pour affichage) ─────────────
  getSeasonSummary(save, report) {
    if (!save) return '';
    const DOMAINS = ['aero','chassis','engine','reliability'];
    const lines = DOMAINS.map(d => {
      const h = save.carDev?.[d]?._heritage || 0;
      const n = save.carDev?.[d]?._nextYear || 0;
      const lvl = save.carDev?.[d]?.level || 0;
      return `${d.toUpperCase()} → ${lvl.toFixed(0)} pts (héritage +${h.toFixed(1)}, nextYear +${n})`;
    });
    const stag = report?.stagnation ? `⚠️ Stagnation : ${report.stagnation.domain}` : '✅ Pas de stagnation';
    return lines.join(' · ') + ' · ' + stag;
  },

  // ── RECRUTER UN PILOTE ───────────────────────────────────
  signDriver(save, driverId, slot) {
    if (!save) return { ok: false, msg: 'Pas de sauvegarde' };

    const driver = F1Data.drivers.find(d => d.id === driverId);
    if (!driver) return { ok: false, msg: 'Pilote introuvable' };
    if (driver.retired) return { ok: false, msg: 'Pilote retraité' };

    const signingFee = Math.round(driver.salary * 1.5); // frais de transfert
    if ((save.budget || 0) < signingFee) {
      return { ok: false, msg: `Budget insuffisant (frais : ${signingFee}M€)` };
    }

    const team = F1Data.teams.find(t => t.id === save.playerTeamId);
    if (!team) return { ok: false, msg: 'Équipe joueur introuvable' };

    const oldTeam = driver.teamId;
    const transfer = this.replacePlayerDriver(save, driver, slot === 'replace' ? '' : slot, {
      salary: driver.salary,
      years: 2,
      role: 'pilote2',
    });
    if (!transfer.ok) return transfer;

    save.budget = Math.round((save.budget - signingFee) * 10) / 10;

    if (typeof CareerEvents !== 'undefined') {
      CareerEvents.log(save, {
        phase: 'mercato',
        title: 'Transfert signé',
        text: `${driver.firstName} ${driver.name} rejoint l'équipe${oldTeam ? ` depuis ${oldTeam}` : ''} pour ${signingFee}M€.${transfer.replaced ? ` ${transfer.replaced.firstName} ${transfer.replaced.name} devient agent libre.` : ''}`,
      });
    }

    this.persistDriverStates(save);
    Save.save(save);
    return { ok: true, msg: `${driver.firstName} ${driver.name} recruté pour ${signingFee}M€${transfer.replaced ? `, ${transfer.replaced.firstName} ${transfer.replaced.name} devient agent libre` : ''} !`, signingFee };
  },



  // ── CONTRATS / NÉGOCIATIONS ──────────────────────────────
  persistDriverStates(save) {
    if (!save) return;
    save.driverStates = save.driverStates || {};
    F1Data.drivers.forEach(d => {
      save.driverStates[d.id] = {
        age: d.age, pace: d.pace, consistency: d.consistency, wetSkill: d.wetSkill,
        overtaking: d.overtaking, defending: d.defending, salary: d.salary,
        trait: d.trait, potential: d.potential, retired: d.retired, teamId: d.teamId,
        seasons: d.seasons || 0, contractYears: d.contractYears || 0, personality: d.personality,
      };
    });
  },

  ensureContractSystem(save) {
    if (!save) return;
    save.contracts = save.contracts || {};
    save.negotiations = save.negotiations || {};
    save.reputation = save.reputation ?? 50;

    const personalities = ['loyal', 'mercenaire', 'ambitieux', 'prudent', 'jeune_loup'];
    F1Data.drivers.forEach(d => {
      if (!d.personality) {
        const score = this.getDriverScore(d);
        if ((d.age || 25) <= 23) d.personality = 'jeune_loup';
        else if (score >= 88) d.personality = 'ambitieux';
        else if ((d.seasons || 0) >= 2) d.personality = 'loyal';
        else d.personality = personalities[Math.floor(Math.random() * personalities.length)];
      }
      if (!save.contracts[d.id]) {
        const baseYears = d.teamId ? 1 + Math.floor(Math.random() * 3) : 0;
        save.contracts[d.id] = {
          years: baseYears,
          salary: Number(d.salary) || 1,
          status: 'pilote2',
          refus: 0,
          cooldownUntilSeason: 0,
          satisfaction: d.teamId === save.playerTeamId ? 58 : 50,
        };
      }
    });
    this.persistDriverStates(save);
  },

  getPersonalityInfo(driver) {
    const map = {
      loyal:      { label:'Loyal', icon:'🤝', desc:'Préfère la stabilité, plus simple à prolonger.' },
      mercenaire: { label:'Mercenaire', icon:'💰', desc:'Très sensible au salaire et aux primes.' },
      ambitieux:  { label:'Ambitieux', icon:'🏆', desc:'Veut une équipe compétitive et un vrai statut.' },
      prudent:    { label:'Prudent', icon:'🧠', desc:'Aime les contrats longs et le risque faible.' },
      jeune_loup: { label:'Jeune loup', icon:'🌱', desc:'Cherche du temps de piste et une progression rapide.' },
    };
    return map[driver.personality] || map.prudent;
  },

  getTeamRank(save) {
    const standings = save?.teamStandings || {};
    if (!save?.playerTeamId) return 10;
    const ranked = [...F1Data.teams].sort((a,b)=>(standings[b.id]||0)-(standings[a.id]||0));
    const pos = ranked.findIndex(t=>t.id===save.playerTeamId);
    if (Object.values(standings).every(v => !v)) {
      const team = F1Data.teams.find(t=>t.id===save.playerTeamId);
      return Math.max(1, Math.round((100 - (team?.performance || 70)) / 5));
    }
    return pos >= 0 ? pos + 1 : 10;
  },

  evaluateContractOffer(save, driverId, offer = {}) {
    this.ensureContractSystem(save);
    const d = F1Data.drivers.find(x=>x.id===driverId);
    if (!d || d.retired) return { ok:false, msg:'Pilote indisponible' };
    const c = save.contracts[d.id] || {};
    const score = this.getDriverScore(d);
    const salary = Math.max(1, Number(offer.salary) || Number(d.salary) || 1);
    const years = Math.max(1, Number(offer.years) || 2);
    const role = offer.role || 'pilote2';
    const bonus = Math.max(0, Number(offer.bonus) || 0);
    const isRenewal = d.teamId === save.playerTeamId;
    const baseSalary = Math.max(1, Number(d.salary) || 1);
    const salaryRatio = isNaN(salary/baseSalary) ? 1 : salary / baseSalary;
    const teamRank = this.getTeamRank(save);
    // reputation peut être un objet {sport, media, tech, finance} ou un nombre
    const _rep = save.reputation;
    const rep = typeof _rep === 'object' && _rep !== null
      ? Math.round((_rep.sport + _rep.media + _rep.tech + _rep.finance) / 4)
      : Number(_rep ?? 50);

    let chance = isRenewal ? 55 : 38;
    chance += Math.max(-25, Math.min(30, (salaryRatio - 1) * 55));
    chance += Math.max(0, Math.min(12, bonus * 0.8));
    chance += (rep - 50) * 0.35;
    chance += Math.max(-18, 12 - teamRank * 3);
    if (role === 'pilote1') chance += 11;
    if (role === 'egal') chance += 5;
    if (years >= 3) chance += 4;
    if (years <= 1) chance -= 5;
    chance -= Math.max(0, score - 82) * 1.4;
    chance -= (c.refus || 0) * 7;
    if ((c.cooldownUntilSeason || 0) > (save.season || 2025)) chance -= 18;
    if (isRenewal) chance += Math.max(-15, Math.min(18, ((c.satisfaction ?? 58) - 50) * 0.45));

    switch (d.personality) {
      case 'loyal':
        if (isRenewal) chance += 14; else chance -= 4;
        if (salaryRatio < 0.95) chance -= 5;
        break;
      case 'mercenaire':
        chance += (salaryRatio - 1) * 25 + bonus * 0.5;
        if (salaryRatio < 1.1) chance -= 8;
        break;
      case 'ambitieux':
        if (teamRank > 5) chance -= 18;
        if (role !== 'pilote1') chance -= 8;
        break;
      case 'prudent':
        if (years >= 3) chance += 10;
        if (years <= 1) chance -= 8;
        break;
      case 'jeune_loup':
        if (role === 'pilote1' || role === 'egal') chance += 8;
        if (score > 82 && teamRank > 7) chance -= 8;
        break;
    }

    const demandSalary = Math.max(baseSalary, Math.ceil(baseSalary * (1.05 + Math.max(0, score - 80) / 90 + (d.personality === 'mercenaire' ? 0.18 : 0))));
    const demandBonus = Math.max(0, Math.round((score - 78) / 5));
    const demandYears = d.personality === 'prudent' ? 3 : (d.personality === 'ambitieux' ? 2 : years);
    // Protection finale contre NaN
    if (isNaN(chance)) chance = 25;
    chance = Math.round(Math.max(5, Math.min(92, chance)));
    const safeDemandSalary = isNaN(demandSalary) ? Math.ceil((d.salary||1) * 1.1) : demandSalary;
    return { ok:true, chance, isRenewal, score, teamRank, demand:{ salary:safeDemandSalary, bonus:demandBonus||0, years:demandYears||2, role: score >= 86 ? 'pilote1' : 'egal' } };
  },

  replacePlayerDriver(save, incomingDriver, replaceDriverId, contractData = {}) {
    if (!save || !incomingDriver) return { ok:false, msg:'Transfert impossible.' };

    const playerTeamId = save.playerTeamId;
    // Exclure le pilote entrant du comptage pour eviter faux positif
    const teamDrivers = F1Data.drivers.filter(x => x.teamId && x.teamId && x.teamId !== 'free_agent' && x.teamId === playerTeamId && !x.retired && x.id !== incomingDriver.id);
    let replaced = null;

    // Si l'équipe a déjà 2 pilotes, le joueur doit choisir le siège à remplacer.
    if (teamDrivers.length >= 2) {
      if (!replaceDriverId) return { ok:false, msg:'Choisis le pilote de ton équipe à remplacer.' };
      replaced = F1Data.drivers.find(x => x.id === replaceDriverId && x.teamId && x.teamId !== 'free_agent' && x.teamId === playerTeamId && !x.retired);
      if (!replaced) return { ok:false, msg:'Le pilote à remplacer est introuvable dans ton équipe.' };
      if (replaced.id === incomingDriver.id) return { ok:false, msg:'Ce pilote est déjà dans ton équipe.' };
    }

    const oldTeamId = incomingDriver.teamId || null;

    // L'ancien pilote du joueur devient agent libre.
    if (replaced) {
      replaced.teamId = 'free_agent';
      replaced.contractYears = 0;
      save.contracts = save.contracts || {};
      save.contracts[replaced.id] = {
        ...(save.contracts[replaced.id] || {}),
        years: 0,
        status: 'agent libre',
        satisfaction: Math.max(25, (save.contracts[replaced.id]?.satisfaction ?? 50) - 12),
      };
      // Persister teamId null dans driverStates et generatedDrivers
      if (!save.driverStates) save.driverStates = {};
      if (!save.driverStates[replaced.id]) save.driverStates[replaced.id] = {};
      save.driverStates[replaced.id].teamId  = 'free_agent';
      save.driverStates[replaced.id].retired = false;
      if (Array.isArray(save.generatedDrivers)) {
        const gi = save.generatedDrivers.findIndex(d => d.id === replaced.id);
        if (gi >= 0) { save.generatedDrivers[gi].teamId = 'free_agent'; save.generatedDrivers[gi].retired = false; }
      }
      // Nettoyer moral et effets de l'ancien pilote
      if (save.immersion?.driverMorale?.[replaced.id]) {
        delete save.immersion.driverMorale[replaced.id];
      }
      if (save.driverEffects?.[replaced.id]) {
        delete save.driverEffects[replaced.id];
      }
      if (save.driverConfidence?.[replaced.id]) {
        delete save.driverConfidence[replaced.id];
      }
      if (save.driverLoyalty?.[replaced.id]) {
        delete save.driverLoyalty[replaced.id];
      }
    }

    // Le nouveau pilote prend exactement ce siège.
    incomingDriver.teamId = playerTeamId;
    incomingDriver.salary = Number(contractData.salary ?? incomingDriver.salary ?? 1);
    incomingDriver.contractYears = Number(contractData.years ?? 1);

    // Persister le teamId dans generatedDrivers et driverStates si c'est un junior
    if (incomingDriver.generated || incomingDriver.fromAcademy) {
      if (!save.driverStates) save.driverStates = {};
      if (!save.driverStates[incomingDriver.id]) save.driverStates[incomingDriver.id] = {};
      save.driverStates[incomingDriver.id].teamId = playerTeamId;
      if (Array.isArray(save.generatedDrivers)) {
        const gi = save.generatedDrivers.findIndex(d => d.id === incomingDriver.id);
        if (gi >= 0) save.generatedDrivers[gi].teamId = playerTeamId;
      }
    }
    save.contracts[incomingDriver.id] = {
      ...(save.contracts[incomingDriver.id] || {}),
      years: Number(contractData.years ?? 1),
      salary: Number(contractData.salary ?? incomingDriver.salary ?? 1),
      status: contractData.role || 'pilote2',
      refus: 0,
      cooldownUntilSeason: 0,
      satisfaction: Math.min(95, (save.contracts[incomingDriver.id]?.satisfaction ?? 58) + 10),
    };

    // Si le pilote recruté venait d'une autre équipe, l'IA peut combler le siège vide.
    // Cela permet notamment à l'ancien pilote du joueur d'être recruté ailleurs.
    if (oldTeamId && oldTeamId !== playerTeamId) {
      this.fillEmptySeats(save);
    }

    return { ok:true, replaced, oldTeamId };
  },

  makeContractOffer(save, driverId, offer = {}) {
    const evalResult = this.evaluateContractOffer(save, driverId, offer);
    if (!evalResult.ok) return evalResult;
    const d = F1Data.drivers.find(x=>x.id===driverId);
    const salary = Number(offer.salary ?? d.salary ?? 1);
    const years = Number(offer.years ?? 2);
    const bonus = Number(offer.bonus ?? 0);
    const role = offer.role || 'pilote2';
    const isRenewal = d.teamId === save.playerTeamId;
    const upfront = isRenewal ? bonus : Math.round((Number(d.salary)||1) * 1.2 + bonus);
    if ((save.budget || 0) < upfront) return { ok:false, msg:`Budget insuffisant : il faut ${upfront}M€ maintenant.` };

    const roll = Math.floor(Math.random() * 100) + 1;
    const c = save.contracts[d.id] || {};
    if (roll <= evalResult.chance) {
      let transfer = { ok:true, replaced:null, oldTeamId:d.teamId || null };
      if (!isRenewal) {
        transfer = this.replacePlayerDriver(save, d, offer.replaceDriverId, { salary, years, role });
        if (!transfer.ok) return transfer;
      } else {
        d.salary = salary;
        d.contractYears = years;
        save.contracts[d.id] = { ...c, years, salary, status: role, refus:0, cooldownUntilSeason:0, satisfaction: Math.min(95, (c.satisfaction ?? 58) + 10) };
      }
      save.budget = Math.round(((save.budget || 0) - upfront) * 10) / 10;
      save.finances = save.finances || { income:0, expenses:0 };
      save.finances.expenses = Math.round(F1Data.drivers.filter(x=>x.teamId===save.playerTeamId&&!x.retired).reduce((sum,x)=>sum+(Number(x.salary)||0),0)*10)/10;
      this.persistDriverStates(save);
      if (typeof CareerEvents !== 'undefined') CareerEvents.log(save, { phase:'contrats', title: isRenewal ? 'Prolongation signée' : 'Contrat signé', text:`${d.firstName} ${d.name} signe ${years} an(s), ${salary}M€/an.${transfer?.replaced ? ' Il remplace '+transfer.replaced.firstName+' '+transfer.replaced.name+', désormais agent libre.' : ''}` });
      Save.save(save);
      return { ok:true, accepted:true, replaced:transfer?.replaced?.id || null, msg:`${d.firstName} ${d.name} accepte l'offre !${transfer?.replaced ? ' '+transfer.replaced.firstName+' '+transfer.replaced.name+' devient agent libre.' : ''}`, cost:upfront, chance:evalResult.chance };
    }

    save.contracts[d.id] = { ...c, refus:(c.refus||0)+1, cooldownUntilSeason:(save.season || 2025) + 1, salary:c.salary || d.salary, years:c.years || 0, status:c.status || 'pilote2', satisfaction: Math.max(15, (c.satisfaction ?? 50) - 6) };
    const counter = roll <= evalResult.chance + 22 ? evalResult.demand : null;
    Save.save(save);
    return { ok:true, accepted:false, counter, chance:evalResult.chance, msg: counter ? `${d.firstName} ${d.name} refuse mais propose une contre-offre.` : `${d.firstName} ${d.name} refuse l'offre.` };
  },

  // ── LICENCIER UN PILOTE ──────────────────────────────────
  releaseDriver(save, driverId) {
    if (!save) return { ok: false, msg: 'Pas de sauvegarde' };
    const driver = F1Data.drivers.find(d => d.id === driverId);
    if (!driver || driver.teamId !== save.playerTeamId) {
      return { ok: false, msg: 'Ce pilote n\'est pas dans ton équipe' };
    }

    const teamDrivers = F1Data.drivers.filter(d => d.teamId && d.teamId !== 'free_agent' && d.teamId === save.playerTeamId && !d.retired);
    if (teamDrivers.length <= 1) {
      return { ok: false, msg: 'Tu dois garder au moins 1 pilote' };
    }

    // Indemnité de licenciement
    const penalty = Math.round(driver.salary * 0.5);
    save.budget = Math.round(((save.budget || 0) - penalty) * 10) / 10;
    driver.teamId  = 'free_agent';
    driver.retired = true;
    if (!save.driverStates) save.driverStates = {};
    if (!save.driverStates[driver.id]) save.driverStates[driver.id] = {};
    save.driverStates[driver.id].teamId  = 'free_agent';
    save.driverStates[driver.id].retired = false;
    if (Array.isArray(save.generatedDrivers)) {
      const gi = save.generatedDrivers.findIndex(d => d.id === driver.id);
      if (gi >= 0) { save.generatedDrivers[gi].teamId = 'free_agent'; save.generatedDrivers[gi].retired = false; }
    }

    if (typeof CareerEvents !== 'undefined') {
      CareerEvents.log(save, {
        phase: 'mercato',
        title: 'Pilote libéré',
        text:  `${driver.firstName} ${driver.name} quitte l'équipe. Indemnité : ${penalty}M€.`,
      });
    }

    this.persistDriverStates(save);
    Save.save(save);
    return { ok: true, msg: `${driver.firstName} ${driver.name} libéré (indemnité : ${penalty}M€)` };
  },

  // ── STATS AFFICHABLES ───────────────────────────────────
  getDriverScore(driver) {
    const pace        = driver.pace        || 70;
    const consistency = driver.consistency || 70;
    const wetSkill    = driver.wetSkill    || 70;
    const overtaking  = driver.overtaking  || 70;
    const defending   = driver.defending   || 70;
    return Math.round(pace * 0.35 + consistency * 0.25 + wetSkill * 0.15 + overtaking * 0.15 + defending * 0.10);
  },

  getPotentialLabel(potential) {
    const p = potential || 80;
    if (p >= 97) return { label: 'Légendaire', color: '#ff6600' };
    if (p >= 93) return { label: 'Champion',   color: '#ffd700' };
    if (p >= 88) return { label: 'Excellent',  color: '#00e676' };
    if (p >= 83) return { label: 'Solide',     color: '#2979ff' };
    if (p >= 78) return { label: 'Correct',    color: '#6a6a8a' };
    return              { label: 'Limité',     color: '#444'    };
  },

  getAgePhase(age) {
    const a = age || 25;
    if (a <= 22) return { label: 'Jeune talent', color: '#00e676', icon: '🌱' };
    if (a <= 28) return { label: 'Prime',        color: '#ffd700', icon: '⭐' };
    if (a <= 33) return { label: 'Expérimenté',  color: '#2979ff', icon: '🔵' };
    if (a <= 37) return { label: 'Déclin',       color: '#ff9944', icon: '📉' };
    return              { label: 'Vétéran',      color: '#ff4444', icon: '⚠️' };
  },

  // ══════════════════════════════════════════════════════════
  //  SYSTÈME STAFF — GÉNÉRATION & ÉVOLUTION
  // ══════════════════════════════════════════════════════════

  // ── BASE DE NOMS STAFF ────────────────────────────────────
  staffNames: {
    firstNames: [
      'Thomas','Lucas','Emma','Sophie','Liam','Noah','Olivia','James','Isabella','Oliver',
      'Charlotte','Elijah','Amelia','William','Mia','Benjamin','Harper','Mason','Evelyn',
      'Logan','Aria','Ethan','Ella','Michael','Scarlett','Alexander','Grace','Daniel',
      'Chloe','Henry','Victoria','Jackson','Riley','Sebastian','Zoey','Aiden','Nora',
      'Mateo','Lily','Jack','Eleanor','Owen','Hannah','Samuel','Lillian','David','Addison',
      'Joseph','Aubrey','Luke','Ellie','Julian','Stella','Levi','Natalie','Isaac',
      'Zoe','Gabriel','Leah','Anthony','Hazel','Dylan','Violet','Lincoln','Aurora',
      'Jaxon','Savannah','Asher','Audrey','Christopher','Brooklyn','Josiah','Bella',
      'Andrew','Claire','John','Skylar','Ryan','Lucy','Nathan','Paisley','Adrian',
      'Everly','Christian','Anna','Wyatt','Caroline','Caleb','Genesis','Jayden','Aaliyah',
      'Ryo','Yuki','Kenji','Sakura','Haruto','Aoi','Lars','Ingrid','Erik','Astrid',
      'Carlos','Sofia','Miguel','Isabella','Alejandro','Valentina','Marco','Giulia',
      'Priya','Arjun','Ananya','Vikram','Fatima','Omar','Yasmin','Ahmed',
      'François','Marie','Pierre','Camille','Antoine','Léa','Nicolas','Chloé',
    ],
    lastNames: [
      'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson',
      'Anderson','Taylor','Thomas','Hernandez','Moore','Martin','Jackson','Lee','Perez',
      'Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker',
      'Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green',
      'Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
      'Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz',
      'Tanaka','Sato','Suzuki','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi',
      'Marchetti','Ferrari','Romano','Conti','Ricci','Esposito','Bianchi','Colombo',
      'Dubois','Dupont','Laurent','Lefebvre','Moreau','Simon','Michel','Leroy',
      'García','Martínez','López','González','Rodríguez','Fernández','Sánchez',
      'Silva','Santos','Oliveira','Pereira','Costa','Ferreira','Alves','Carvalho',
      'Nielsen','Andersen','Jensen','Larsen','Sørensen','Christensen','Poulsen',
      'Eriksson','Johansson','Lindqvist','Bergström','Gustafsson','Persson','Magnusson',
      'Kowalski','Nowak','Wiśniewski','Wójcik','Kowalczyk','Kamiński','Lewandowski',
      'Nair','Patel','Shah','Kumar','Sharma','Mehta','Singh','Gupta','Joshi',
    ],
  },

  // Icônes et labels par spécialité
  staffSpecialties: {
    aero:        { icon:'🌊', label:'Aérodynamique', roles:['Ingénieur Aéro','Analyste CFD','Responsable Soufflerie','Chef Aérodynamicien'] },
    chassis:     { icon:'🏗️', label:'Châssis',       roles:['Ingénieur Châssis','Spécialiste Suspensions','Ingénieur Setup','Dynamicien Véhicule'] },
    engine:      { icon:'⚡', label:'Moteur/ERS',    roles:['Ingénieur Moteur','Spécialiste ERS','Thermicien','Responsable Groupe Propulseur'] },
    pitstop:     { icon:'⏱️', label:'Pit Stop',      roles:['Chef Mécanicien','Responsable Pit Stop','Coordinateur Stand','Chef d\'Équipe Pit'] },
    reliability: { icon:'🛡️', label:'Fiabilité',     roles:['Ingénieur Fiabilité','Analyste Données','Responsable Qualité','Chef Maintenance'] },
  },

  // ── GÉNÉRER UN MEMBRE DE STAFF ────────────────────────────
  generateStaff(save) {
    const names    = this.staffNames;
    const specs    = Object.keys(this.staffSpecialties);
    const specialty= specs[Math.floor(Math.random() * specs.length)];
    const specData = this.staffSpecialties[specialty];

    const firstName = names.firstNames[Math.floor(Math.random() * names.firstNames.length)];
    const lastName  = names.lastNames [Math.floor(Math.random() * names.lastNames.length)];
    const role      = specData.roles  [Math.floor(Math.random() * specData.roles.length)];

    // Âge : 25-45 ans (staff plus mature que les pilotes)
    const age = 25 + Math.floor(Math.random() * 20);

    // Niveau selon l'âge (expérience = niveau plus élevé)
    const ageBonus = Math.min(15, Math.floor((age - 25) / 2));
    const baseLevel = 58 + Math.floor(Math.random() * 20) + ageBonus; // 58-93

    // Potentiel : plafond de progression (moins varié que les pilotes)
    const potential = Math.min(97, baseLevel + 2 + Math.floor(Math.random() * 12));

    // Elite très rare (2%)
    const isElite = Math.random() < 0.02;

    // Niveau d'impact basé sur le level
    const impactBase = Math.round((baseLevel - 55) / 4); // 1-9
    const impacts    = { [specialty]: impactBase };

    // Parfois impact secondaire
    if (Math.random() > 0.5) {
      const secondarySpecs = specs.filter(s => s !== specialty);
      const secondary      = secondarySpecs[Math.floor(Math.random() * secondarySpecs.length)];
      impacts[secondary]   = Math.max(1, Math.round(impactBase * 0.4));
    }

    const salary = Math.max(1, Math.round(baseLevel * 0.08));
    const cost   = Math.max(3, Math.round(salary * 2.2));

    const passives = {
      aero:        [`Améliore l'efficacité aéro de ${impactBase}%`, `+${Math.ceil(impactBase/3)} token R&D / 4 courses`, `Réduit l'écart soufflerie/piste`],
      chassis:     [`Améliore la dégradation pneus de ${impactBase}%`, `Optimise le comportement en virage`, `Réduit les coûts d'upgrade châssis`],
      engine:      [`Réduit les DNF moteur de ${impactBase*5}%`, `Optimise le déploiement ERS`, `Améliore la gestion thermique`],
      pitstop:     [`Réduit le pitLoss de ${(impactBase*0.15).toFixed(1)}s`, `Améliore la coordination mécaniciens`, `Réduit les erreurs de pit de ${impactBase*8}%`],
      reliability: [`Réduit les DNF de ${impactBase*4}%`, `Détecte les pannes prématurément`, `Améliore la durabilité des pièces`],
    };
    const passive = passives[specialty][Math.floor(Math.random() * passives[specialty].length)];

    return {
      id:        `STAFF_${Date.now()}_${Math.floor(Math.random()*9999)}`,
      name:      lastName,
      firstName,
      fullName:  `${firstName} ${lastName}`,
      icon:      specData.icon,
      role,
      specialty,
      age,
      yearsInF1: 0,
      level:     baseLevel,
      potential,
      salary,
      cost,
      elite:     isElite,
      generated: true,
      retired:   false,
      impacts,
      passive,
      desc:      `${role} spécialisé en ${specData.label.toLowerCase()}. ${age} ans d'expérience progressive.`,
    };
  },

  // ── VIEILLISSEMENT DU STAFF ───────────────────────────────
  ageAllStaff(save) {
    if (!save) return { retired:[], progressed:[] };
    save.generatedStaff = save.generatedStaff || [];

    const retired    = [];
    const progressed = [];

    save.generatedStaff.forEach(st => {
      if (st.retired) return;

      st.age       = (st.age || 35) + 1;
      st.yearsInF1 = (st.yearsInF1 || 0) + 1;

      // Progression lente du level (réaliste : +0.3 à +0.8/an)
      if (st.level < st.potential) {
        const gain = 0.2 + Math.random() * 0.6;
        st.level   = Math.min(st.potential, Math.round((st.level + gain) * 10) / 10);
        // Mise à jour des impacts
        Object.keys(st.impacts).forEach(spec => {
          const newImpact = Math.round((st.level - 55) / 4);
          if (newImpact > st.impacts[spec]) {
            st.impacts[spec] = newImpact;
            progressed.push(st);
          }
        });
      }

      // Retraite : possible à partir de 58 ans
      if (st.age >= 58) {
        const retireChance = (st.age - 57) * 0.20;
        if (Math.random() < retireChance) {
          st.retired = true;
          // Libérer de l'équipe joueur si recruté
          if (save.staff?.includes(st.id)) {
            save.staff = save.staff.filter(id => id !== st.id);
          }
          retired.push(st);
        }
      }

      // Mise à jour du salary
      st.salary = Math.max(1, Math.round(st.level * 0.08));
      st.cost   = Math.max(3, Math.round(st.salary * 2.2));
    });

    return { retired, progressed };
  },

  // ── GÉNÉRER DE NOUVEAUX STAFFS ────────────────────────────
  // Appelé en fin de saison — génère 3-6 nouveaux membres
  generateNewStaff(save) {
    save.generatedStaff = save.generatedStaff || [];
    const season        = save.season || 2025;

    // Générer tous les 1-2 ans (pas forcément chaque saison)
    // Mais on génère toujours au moins 2 la première fois
    const isFirst  = (save.generatedStaff?.length ?? 0) === 0;
    const count    = isFirst
      ? 25  // Pool initial large
      : 4 + Math.floor(Math.random() * 5); // 4-8 nouveaux par saison

    const newStaff = [];
    for (let i = 0; i < count; i++) {
      const st = this.generateStaff(save);
      save.generatedStaff.push(st);
      newStaff.push(st);
    }

    return newStaff;
  },

  // ── DÉBAUCHAGES IA ────────────────────────────────────────
  // Certains staffs générés sont "recrutés" par des équipes IA
  aiStaffMovements(save) {
    if (!save?.generatedStaff) return;

    // 10% de chance qu'un staff libre soit "approché" par une IA
    const freeStaff = save.generatedStaff.filter(st =>
      !st.retired && !save.staff?.includes(st.id)
    );

    freeStaff.forEach(st => {
      if (Math.random() < 0.08) {
        // Staff "pris" par une IA — on le marque comme non disponible pendant 1-3 saisons
        st.aiContracted    = true;
        st.aiContractUntil = (save.season||2025) + 1 + Math.floor(Math.random() * 3);

        if (typeof CareerEvents !== 'undefined' && save) {
          CareerEvents.log(save, {
            phase:'mercato', icon:'🔄', category:'competitor',
            title:'Staff débauché',
            text:`${st.firstName} ${st.name} (${st.role}) a rejoint une équipe rivale.`,
          });
        }
      }

      // Libérer si contrat IA expiré
      if (st.aiContracted && (save.season||2025) >= (st.aiContractUntil||9999)) {
        st.aiContracted    = false;
        st.aiContractUntil = null;
      }
    });
  },

  // ── FIN DE SAISON STAFF ───────────────────────────────────
  // Intégré dans endOfSeason
  processStaffEndOfSeason(save) {
    const report = { retired:[], progressed:[], newStaff:[] };
    if (!save) return report;

    // 1. Vieillir tous les staffs générés
    const ageResult = this.ageAllStaff(save);
    report.retired   = ageResult.retired;
    report.progressed= ageResult.progressed;

    // 2. Nouveaux staffs disponibles
    report.newStaff  = this.generateNewStaff(save);

    // 3. Mouvements IA
    this.aiStaffMovements(save);

    // 4. Persister
    save.staffStates = {};
    (save.generatedStaff || []).forEach(st => {
      save.staffStates[st.id] = { ...st };
    });

    return report;
  },

  // ── RESTAURER LES STAFFS GÉNÉRÉS ─────────────────────────
  // À appeler au chargement de chaque page
  restoreGeneratedStaff(save) {
    if (!save?.generatedStaff) return;

    // Mettre à jour depuis staffStates si disponible
    if (save.staffStates) {
      save.generatedStaff.forEach((st, idx) => {
        const state = save.staffStates[st.id];
        if (state) save.generatedStaff[idx] = { ...state };
      });
    }
  },

  // ── HELPER : staffs disponibles au recrutement ────────────
  getAvailableGeneratedStaff(save) {
    if (!save?.generatedStaff) return [];
    const season = save.season || 2025;
    return save.generatedStaff.filter(st =>
      !st.retired &&
      !save.staff?.includes(st.id) &&
      !(st.aiContracted && season < (st.aiContractUntil||0))
    );
  },

  // ── LABEL NIVEAU STAFF ────────────────────────────────────
  getStaffLevelLabel(level) {
    if (level >= 92) return { label:'Légendaire', color:'#ff6600' };
    if (level >= 85) return { label:'Élite',      color:'#ffd700' };
    if (level >= 78) return { label:'Expert',     color:'#00e676' };
    if (level >= 70) return { label:'Confirmé',   color:'#2979ff' };
    if (level >= 62) return { label:'Junior',     color:'#6a6a8a' };
    return                  { label:'Stagiaire',  color:'#444'    };
  },

  getStaffAgePhase(age) {
    if (age <= 28) return { label:'Prometteur', color:'#00e676', icon:'🌱' };
    if (age <= 38) return { label:'Prime',      color:'#ffd700', icon:'⭐' };
    if (age <= 48) return { label:'Expérimenté',color:'#2979ff', icon:'🔵' };
    if (age <= 55) return { label:'Senior',     color:'#ff9944', icon:'📉' };
    return                { label:'Retraite proche', color:'#ff4444', icon:'⚠️' };
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


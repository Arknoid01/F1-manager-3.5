// ============================================================
//  F1 Manager — race.js  (v3 — écarts réalistes)
//
//  LOGIQUE DES GAPS :
//  totalTime = temps cumulé réel depuis le départ (en secondes)
//  gap = totalTime(car) - totalTime(leader) = écart réel en secondes
//  Exemple réaliste : P1 finit en ~5400s, P20 en ~5440s → gap = 40s ✓
// ============================================================

// ============================================================
//  PATCH sécurité grille complète
//  Corrige les anciennes sauvegardes avec grille incomplète
// ============================================================
function ensureFullGrid(save){
  if(!save || !save.qualiGrid) return;

  const allDrivers = (window.F1Data && window.F1Data.drivers) ? window.F1Data.drivers : [];
  const missing = allDrivers.filter(d =>
    !save.qualiGrid.find(g => g.driverId === d.id)
  );

  if(missing.length){
    let lastPos = save.qualiGrid.length;

    missing.forEach(d => {
      lastPos++;
      save.qualiGrid.push({
        driverId: d.id,
        teamId: d.teamId,
        gridPos: lastPos,
        qualiTime: 999999,
        isPlayer: d.teamId === save.playerTeamId,
        eliminatedIn: 'Q1'
      });
    });

    console.warn('[FIX] Pilotes manquants réajoutés à la grille:', missing.length);
  }
}


const Race = {

  state: null,

  // ── APPLIQUER LES AMÉLIORATIONS JOUEUR ───────────────────
  getEffectiveTeam(team) {
    const effective = { ...team };
    try {
      const save = (typeof Save !== 'undefined' && Save.load) ? Save.load() : null;
      if (save && save.playerTeamId === team.id && save.carDev) {
        ['aero', 'chassis', 'engine', 'reliability'].forEach(stat => {
          if (save.carDev[stat] && Number.isFinite(save.carDev[stat].level)) {
            const staffBonus = Number(save.staffBonuses?.[stat] || 0);
            effective[stat] = Math.max(1, Math.min(100, save.carDev[stat].level + staffBonus));
          }
        });
        effective.performance = Math.round((effective.aero + effective.chassis + effective.engine) / 3);
      }
    } catch (e) {
      console.warn('[Race] Impossible d’appliquer le développement joueur', e);
    }
    return effective;
  },

  // ── INITIALISATION ────────────────────────────────────────
  init(circuitId, weather = 'dry', playerStrategies = {}) {
    const circuit = F1Data.circuits.find(c => c.id === circuitId);
    if (!circuit) throw new Error('Circuit introuvable : ' + circuitId);

    try { if (typeof CareerEvents !== 'undefined') { const save = Save.load(); CareerEvents.applyAiDevelopment(save); } } catch(e) {}

    const grid = [];

    const activeDrivers = F1Data.drivers.filter(d => d.teamId && !d.retired);
    activeDrivers.forEach((baseDriver, driverIndex) => {
      const driver = (typeof CareerEvents !== 'undefined') ? CareerEvents.effectiveDriver(baseDriver) : baseDriver;
      const baseTeam = F1Data.teams.find(t => t.id === driver.teamId);
      if (!baseTeam) return;
      const team     = this.getEffectiveTeam(baseTeam);
      // Appliquer moral + confiance + loyauté (uniquement équipe joueur)
      try {
        const _sv = Save.load();
        if (_sv?.playerTeamId === driver.teamId) {
          const driverKey  = driver.id || driver.name;
          const moral      = _sv?.immersion?.driverMorale?.[driverKey]?.value ?? 70;
          const confiance  = _sv?.driverConfidence?.[driverKey] ?? 50;
          const loyalty    = _sv?.driverLoyalty?.[driverKey] ?? 50;

          // Moral : +0.2 pace par point au-dessus de 70
          const moralDelta = Math.round((moral - 70) * 0.2);
          // Confiance haute → régularité améliorée
          const confDelta  = Math.round((confiance - 50) * 0.1);
          // Loyauté basse → pilote moins motivé (-pace si < 30)
          const loyDelta   = loyalty < 30 ? -2 : loyalty < 40 ? -1 : 0;

          driver.pace        = Math.max(1, Math.min(100, (driver.pace||75)        + moralDelta + loyDelta));
          driver.consistency = Math.max(1, Math.min(100, (driver.consistency||75) + Math.round(moralDelta * 0.5) + confDelta));
        }
      } catch(e) {}
      let strategy = Engine.generateStrategy(circuit, team.performance, weather, driver.trait, driverIndex + 1);

      // Stratégie joueur : recherche robuste.
      // Certains écrans sauvegardent les clés en string, ou utilisent un nom/index
      // selon l'origine du pilote. Sans ça, la course repasse parfois sur une
      // stratégie auto IA, ce qui donne l'impression que le pilote ignore les consignes.
      const strategyKeyCandidates = [
        driver.id,
        String(driver.id),
        baseDriver?.id,
        String(baseDriver?.id),
        driver.name,
        `${driver.firstName || ''} ${driver.name || ''}`.trim(),
      ].filter(v => v !== undefined && v !== null && v !== '');
      const chosenStrategyKey = playerStrategies
        ? strategyKeyCandidates.find(k => Object.prototype.hasOwnProperty.call(playerStrategies, k))
        : null;
      if (chosenStrategyKey !== null && chosenStrategyKey !== undefined) {
        strategy = Engine.normalizeStrategy(playerStrategies[chosenStrategyKey], circuit, weather);
        strategy.source = 'player';
      }

      grid.push({
        driver,
        team,
        strategy,
        currentCompoundIndex: 0,
        tyre:        { compound: strategy.compounds[0], condition: 1.0, age: 0 },
        totalTime:   0,
        penaltyTime: 0,
        currentLap:  0,
        lapTimes:    [],
        pitStops:    [],
        position:    0,
        gap:         0,
        status:      'racing',
        pitThisLap:  false,
        dnfLap:      null,
        currentPace: 0,
        orderMode: 'normal',
        forcePit: false,
        requestedCompound: null,
        autoPitWeather: true,
        autoPitSafetyCar: true,
      });
    });

    // ── Grille de départ depuis qualiGrid ou simulation ────────
    const _svQ = typeof Save !== 'undefined' ? Save.load() : null;
    const savedGrid = _svQ?.qualiGrid || [];

    if (savedGrid.length > 0) {
      // Utiliser les vraies positions de qualifs
      grid.forEach(car => {
        const entry = savedGrid.find(g => g.driverId === car.driver.id);
        car._qualiTime = entry?.qualiTime || (circuit.baseLapTime + (savedGrid.length - (entry?.gridPos||20)) * 0.05);
        car._gridPos   = entry?.gridPos || 20;
      });
      grid.sort((a, b) => (a._gridPos||20) - (b._gridPos||20));
    } else {
      // Fallback : simulation
      grid.forEach(car => {
        const teamDelta   = (85 - car.team.performance) * 0.032;
        const driverDelta = (87 - (car.driver.pace||75)) * 0.013;
        const random      = (Math.random() - 0.5) * 0.40;
        car._qualiTime    = circuit.baseLapTime + teamDelta + driverDelta + random;
      });
      grid.sort((a, b) => a._qualiTime - b._qualiTime);
    }

    // Assigner positions et décalage de départ
    // En F1 le départ est en rang, pas de vrai décalage temporel —
    // on met juste 0.3s entre chaque voiture pour simuler l'effet de trafic initial
    grid.forEach((car, i) => {
      car.position  = i + 1;
      car.totalTime = i * 0.3; // P1=0s, P2=+0.3s, ..., P20=+5.7s au départ
    });

    this.state = {
      circuit,
      weather,
      currentLap: 0,
      totalLaps:  circuit.laps,
      grid,
      safetyCar:  { active: false, remainingLaps: 0 },
      finished:   false,
      events:     [],
      playerTeamId: (typeof Save !== 'undefined' && Save.load && Save.load()) ? Save.load().playerTeamId : null,
    };

    return this.state;
  },

  // ── SIMULER UN TOUR ───────────────────────────────────────
  simulateLap() {
    if (!this.state || this.state.finished) return null;

    const s   = this.state;
    const cir = s.circuit;
    s.currentLap++;
    const lap       = s.currentLap;
    const lapEvents = [];

    // ── Météo — synchronisée avec l'humidité (weather.js) ────
    // currentHumidity est mis à jour dans race.html avant simulateLap()
    if (typeof currentHumidity !== 'undefined') {
      const prevWeather = s.weather;
      if      (currentHumidity > 70) s.weather = 'heavy_rain';
      else if (currentHumidity >= 30) s.weather = 'light_rain';
      else                            s.weather = 'dry';

      if (prevWeather !== s.weather) {
        if (s.weather === 'heavy_rain')
          lapEvents.push({ lap, type:'weather', message:'⛈️ Forte pluie ! Safety Car déployée.' });
        else if (s.weather === 'light_rain')
          lapEvents.push({ lap, type:'weather', message:'🌧️ La pluie commence à tomber !' });
        else
          lapEvents.push({ lap, type:'weather', message:'☀️ La piste sèche !' });
      }
    }

    // ── Safety Car ────────────────────────────────────────────
    if (s.safetyCar.active) {
      s.safetyCar.remainingLaps--;
      if (s.safetyCar.remainingLaps <= 0) {
        s.safetyCar.active = false;
        lapEvents.push({ lap, type: 'safety_car_end', message: '🟢 Safety Car rentre aux stands !' });
      }
    }

    // ── Calcul chaque voiture ─────────────────────────────────
    let someoneJustPitted = false;

    s.grid.forEach(car => {
      if (car.status === 'dnf') return;
      car.pitThisLap = false;

      // Incidents
      const incidents = Engine.rollIncidents(car.driver, car.team, lap, s.totalLaps);
      const dnf = incidents.find(i => i.type === 'dnf');
      if (dnf) {
        car.status = 'dnf';
        car.dnfLap = lap;
        lapEvents.push({
          lap,
          type:    'dnf',
          message: `❌ ${car.driver.firstName} ${car.driver.name} — Abandon (${dnf.reason === 'crash' ? 'Accident' : 'Problème mécanique'}) Tour ${lap}`,
        });
        return;
      }

      // Pénalités
      const penalty = incidents.find(i => i.type === 'penalty');
      if (penalty) {
        car.penaltyTime += penalty.seconds;
        lapEvents.push({ lap, type: 'penalty', message: `⚠️ ${car.driver.firstName} ${car.driver.name} — Pénalité +${penalty.seconds}s` });
      }

      // ── Pit stop ─────────────────────────────────────────────
      const isPlayerCar  = car.driver.teamId?.toLowerCase() === (s.playerTeamId||'').toLowerCase();
      const maxPits      = (car.strategy?.compounds?.length || 2) - 1;
      const pitsDone     = car.pitStops?.length || 0;

      let pitDecision = Engine.shouldPit(
        car.tyre, lap, s.totalLaps, car.strategy, someoneJustPitted, s.weather, s.safetyCar.active
      );

      // Pour le joueur : priorité à la stratégie choisie.
      // Le moteur peut conseiller un undercut, une SC ou un arrêt météo, mais il ne doit
      // plus transformer tout seul une stratégie choisie en stratégie automatique.
      if (isPlayerCar && pitDecision.pit) {
        const plannedPits = Array.isArray(car.strategy?.pitLaps) ? car.strategy.pitLaps : [];
        const exactPlannedPit = plannedPits.some(pl => Number(pl) === lap);
        const closeToPlan = plannedPits.some(pl => Math.abs(Number(pl) - lap) <= 1);
        const hum = typeof currentHumidity !== 'undefined' ? currentHumidity : 0;
        const compound = car.tyre?.compound;
        const slick = ['SOFT','MEDIUM','HARD'].includes(compound);

        if (pitDecision.reason === 'planned') {
          // Arrêt prévu = toujours respecté.
          pitDecision = exactPlannedPit ? pitDecision : { pit: false };
        } else if (pitDecision.reason === 'team_order') {
          // Bouton manuel du joueur = toujours prioritaire.
          pitDecision = pitDecision;
        } else if (pitDecision.reason === 'weather_change') {
          // Météo : seulement quand c'est vraiment nécessaire, pas dès une petite humidité.
          // Ça évite les arrêts INTER/WET qui donnent l'impression que la stratégie est ignorée.
          const dangerousWeather = (slick && hum >= 55) || (compound === 'WET' && hum < 25) || (compound === 'INTER' && hum < 18);
          if (!dangerousWeather && !closeToPlan) pitDecision = { pit: false };
        } else if (pitDecision.reason === 'safety_car_opportunity') {
          // SC : opportunité seulement dans la fenêtre du plan.
          if (!closeToPlan) pitDecision = { pit: false };
        } else if (pitDecision.reason === 'tyre_dead') {
          // Sécurité pure : on force uniquement si le pneu est réellement au bord du KO.
          const criticalTyre = car.tyre.condition < 0.04;
          if (!criticalTyre && !closeToPlan) pitDecision = { pit: false };
        } else if (pitDecision.reason === 'undercut') {
          // Plus d'undercut automatique pour l'équipe joueur.
          pitDecision = { pit: false };
        } else {
          pitDecision = { pit: false };
        }

        if (pitDecision.pit && pitsDone >= maxPits && pitDecision.reason !== 'weather_change' && car.tyre.condition > 0.04) {
          pitDecision = { pit: false };
        }
      }

      // Sécurité douce IA : si une IA rate son arrêt prévu, on la ramène
      // dans une stratégie normale avant que les pneus soient complètement morts.
      // Ça évite les arrêts de sécurité tardifs causés par une fenêtre stratégique manquée.
      if (!isPlayerCar && !pitDecision.pit && pitsDone < maxPits) {
        const nextPlannedPit = Array.isArray(car.strategy?.pitLaps) ? car.strategy.pitLaps[pitsDone] : null;
        const missedPlannedWindow = Number.isFinite(nextPlannedPit) && lap >= nextPlannedPit + 2;
        const wornButNotDead = car.tyre.condition > 0.12 && car.tyre.condition <= 0.40;
        const enoughLapsLeft = lap < s.totalLaps - 4;
        const dryOrSlickPhase = (typeof currentHumidity === 'undefined') || currentHumidity < 32 || ['SOFT','MEDIUM','HARD'].includes(car.tyre.compound);
        if (missedPlannedWindow && wornButNotDead && enoughLapsLeft && dryOrSlickPhase) {
          pitDecision = { pit: true, reason: 'delayed_strategy' };
        }
      }

      if (car.forcePit) pitDecision = { pit: true, reason: 'team_order' };
      const scWindow = isPlayerCar ? 1 : 3;
      if (car.autoPitSafetyCar && s.safetyCar.active && !pitDecision.pit && car.strategy?.pitLaps?.some(pl => Math.abs(pl - lap) <= scWindow)) {
        pitDecision = { pit: true, reason: 'safety_car_opportunity' };
      }

      if (pitDecision.pit && lap < s.totalLaps - 2) {
        car.pitThisLap = true;
        someoneJustPitted = true;

        const isWeatherPit = pitDecision.reason === 'weather_change';
        const isStrategicPit = !isWeatherPit;

        // Les arrêts météo ne consomment plus l'étape de stratégie sèche.
        // Exemple : stratégie MEDIUM -> HARD, pluie entre-temps : MEDIUM -> WET -> INTER,
        // puis retour au plan sec sans sauter l'étape HARD.
        let targetStrategyIndex = car.currentCompoundIndex;
        if (isStrategicPit) {
          targetStrategyIndex = Math.min(car.currentCompoundIndex + 1, car.strategy.compounds.length - 1);
          car.currentCompoundIndex = targetStrategyIndex;
        }

        let nextCompound = car.requestedCompound || car.strategy.compounds[targetStrategyIndex];

        // Pneu météo prioritaire uniquement quand les conditions l'imposent vraiment.
        // Sinon, on respecte le composé prévu par la stratégie.
        if (!car.requestedCompound) {
          const hum = typeof currentHumidity !== 'undefined' ? currentHumidity : 0;
          if (hum >= 70) {
            nextCompound = 'WET';
          } else if (hum >= 32) {
            nextCompound = 'INTER';
          } else if (isWeatherPit && ['INTER','WET'].includes(car.tyre.compound)) {
            // Retour au sec : reprendre le prochain pneu prévu par la stratégie.
            const nextPlannedLap = car.strategy?.pitLaps?.find(pl => pl >= lap - 2);
            if (nextPlannedLap && lap >= nextPlannedLap - 2) {
              car.currentCompoundIndex = Math.min(car.currentCompoundIndex + 1, car.strategy.compounds.length - 1);
            }
            nextCompound = car.strategy.compounds[car.currentCompoundIndex] || 'MEDIUM';
          }
        }

        car.pitStops.push({
          lap,
          fromCompound: car.tyre.compound,
          toCompound:   nextCompound,
          reason:       pitDecision.reason,
        });

        car.tyre = { compound: nextCompound, condition: 1.0, age: 0 };
        car.forcePit = false;
        car.requestedCompound = null;

        // ── Calcul du temps pit réaliste ─────────────────────
        // pitLoss = temps total incluant pit lane traversée
        // Le temps mécanique (changement pneus) est ~2.5s min
        // La pit lane traversée est incompressible (~15-22s selon circuit)
        // Total minimum réaliste : ~17-22s

        const basePitLoss   = cir.pitLoss; // déjà calibré par circuit
        const minPitTime    = basePitLoss - 4.0; // max 4s de gain possible (staff élite)
        let pitTime         = basePitLoss;

        // Bonus staff pit stop (depuis save.staffBonuses)
        try {
          const sv = Save.load();
          const sb = sv?.staffBonuses;

          // Staff bonus : plafonné à -3s max (réaliste)
          if (sb?.pitLossReduction) {
            pitTime -= Math.min(3.0, sb.pitLossReduction);
          }

          // Bonus carDev pitstop : plafonné à -1s max
          const pitDev = sv?.carDev?.pitstop;
          if (pitDev?.upgrades) {
            pitTime -= Math.min(1.0, pitDev.upgrades * 0.4);
          }

          // Jamais en dessous du minimum réaliste
          pitTime = Math.max(minPitTime, pitTime);

          // ── Arrêt raté ──────────────────────────────────────
          const pitLevel    = pitDev?.level || 50;
          const staffBonus  = sb?.pitstop   || 0;
          const effectiveLvl= Math.min(100, pitLevel + staffBonus);
          const missChance  = Math.max(0.01, 0.15 - effectiveLvl * 0.0014);

          if (Math.random() < missChance) {
            const severity = Math.random();
            const penalty  = severity > 0.8 ? 10 + Math.random() * 5
                           : severity > 0.5 ? 4  + Math.random() * 4
                           :                  2  + Math.random() * 2;
            pitTime += penalty;
            lapEvents.push({
              lap,
              type: 'pit',
              message: `⚠️ ${car.driver.firstName} ${car.driver.name} — Arrêt raté ! (+${penalty.toFixed(1)}s)`,
            });
          }
        } catch(e) { /* ignore */ }

        car.totalTime += pitTime;

        // Supprimer les pitLaps proches pour éviter un double arrêt
        if (car.strategy?.pitLaps) {
          car.strategy.pitLaps = car.strategy.pitLaps.filter(pl => pl > lap + 5);
        }

        const pitReasonMessages = {
          planned: 'arrêt planifié selon la stratégie',
          undercut: 'on couvre l’undercut d’un rival',
          safety_car_opportunity: 'opportunité sous Safety Car : perte de temps réduite',
          weather_change: 'changement météo : pneu adapté aux conditions',
          tyre_dead: 'pneus critiques : arrêt de sécurité',
          team_order: 'consigne du muret : arrêt demandé',
        };
        const pitReasonText = pitReasonMessages[pitDecision.reason] || 'ajustement stratégique';

        lapEvents.push({
          lap,
          type:    'pit',
          reason:  pitDecision.reason,
          driverId: car.driver.id,
          teamId:   car.driver.teamId,
          compound: nextCompound,
          message: `🔧 ${car.driver.firstName} ${car.driver.name} — Pit stop → ${F1Data.tyres[nextCompound].name} (${pitReasonText})`,
        });
      }

      // ── Temps au tour ─────────────────────────────────────────
      // Pas de fuel load — en F1 moderne c'est calculé avant la course
      let lapTime = Engine.calcLapTime(
        car.driver, car.team, cir, car.tyre, 0, s.weather, lap, car.orderMode || 'normal'
      );

      // Safety Car : tout le monde roule au même rythme lent
      if (s.safetyCar.active) {
        lapTime = cir.baseLapTime * 1.38 + (Math.random() - 0.5) * 0.3;
      }

      // ── Aspiration — effet sillage sur le temps au tour ──
      // Si une voiture est dans le sillage d'une autre (<1.5s)
      // elle gagne 0.1 à 0.3s grâce à la réduction de traînée
      if (!s.safetyCar.active && car.gap !== null && car.gap > 0) {
        const carAhead = s.grid.find(c =>
          c.status !== 'dnf' && c.position === car.position - 1
        );
        if (carAhead && carAhead.gap !== null) {
          const gapToAhead = car.gap - carAhead.gap;
          if (gapToAhead > 0 && gapToAhead < 1.5) {
            // Plus on est proche, plus le sillage est fort
            const slipEffect = 0.25 * (1 - gapToAhead / 1.5);
            // Modifié par le nombre de zones DRS du circuit
            const drsMultiplier = 1 + (cir.drsZones - 1) * 0.15;
            lapTime -= slipEffect * drsMultiplier;
          }
        }
      }

      car.currentPace  = lapTime;
      car.totalTime   += lapTime + car.penaltyTime;
      car.penaltyTime  = 0;
      car.lapTimes.push(parseFloat(lapTime.toFixed(3)));
      car.currentLap   = lap;

      if (!car.pitThisLap) {
        car.tyre = Engine.degradeTyre(car.tyre, cir, car.driver, s.weather, car.orderMode || 'normal');
      }
    });

    // ── Safety Car : regroupement ─────────────────────────────
    // Réduit progressivement les écarts — les voitures se rassemblent
    // derrière la SC. Chaque tour sous SC réduit l'écart de ~40%
    if (s.safetyCar.active) {
      const racing = s.grid
        .filter(c => c.status === 'racing')
        .sort((a, b) => a.totalTime - b.totalTime);

      if (racing.length > 1) {
        const leaderTime = racing[0].totalTime;

        racing.forEach((car, scIdx) => {
          if (scIdx === 0) return; // le leader garde son temps
          const currentGap = car.totalTime - leaderTime;
          if (currentGap <= 0) return;

          // Réduire l'écart de 35% par tour de SC (en ~3 tours tout le monde est regroupé)
          // Mais garder un écart minimum de 0.3s entre voitures (file indienne)
          const minGap     = scIdx * 0.3;
          const targetGap  = Math.max(minGap, currentGap * 0.65);
          car.totalTime    = leaderTime + targetGap;
        });
      }
    }

    // ── Dépassements actifs ───────────────────────────────────
    if (!s.safetyCar.active) {
      const racing = s.grid
        .filter(c => c.status === 'racing')
        .sort((a, b) => a.totalTime - b.totalTime);

      // Bonus DRS : plus de zones = dépassements plus faciles
      const drsBonus = Math.min(0.25, (cir.drsZones || 1) * 0.08);

      for (let i = 1; i < racing.length; i++) {
        const attacker = racing[i];
        const defender = racing[i - 1];

        // Écart en temps — le dépassement n'est possible que si proche
        const gap = attacker.totalTime - defender.totalTime;
        if (gap > 1.2) continue; // trop loin, pas de bataille

        // Tentative de dépassement via engine.js
        // On passe un circuit modifié avec le bonus DRS
        const circuitWithDRS = { ...cir, overtakingDifficulty: Math.max(0.05, cir.overtakingDifficulty - drsBonus) };
        const overtook = Engine.attemptOvertake(attacker, defender, circuitWithDRS);

        if (overtook) {
          // Échanger les temps pour refléter le dépassement
          // Penalty de temps pour le défenseur (résistance perdue)
          const timePenalty = 0.3 + Math.random() * 0.4;
          defender.totalTime += timePenalty;
          attacker.totalTime -= timePenalty * 0.3;

          lapEvents.push({
            lap,
            type: 'overtake',
            message: `🏎️ ${attacker.driver.firstName} ${attacker.driver.name} dépasse ${defender.driver.firstName} ${defender.driver.name}${cir.overtakingDifficulty > 0.7 ? ' — dépassement exceptionnel !' : ''}`,
          });
        }
      }
    }

    // Safety Car aléatoire
    const scRoll = Engine.rollSafetyCar(lap, s.totalLaps, []);
    if (scRoll.active && !s.safetyCar.active) {
      s.safetyCar = { active: true, remainingLaps: 3 + Math.floor(Math.random() * 2) }; // 3-4 tours
      lapEvents.push({ lap, type: 'safety_car', message: '🟡 Safety Car déployée !' });
    }

    // Classement
    this.updateStandings();

    if (lap >= s.totalLaps) {
      s.finished = true;
      lapEvents.push({ lap, type: 'finish', message: '🏁 Drapeau à damiers !' });
    }

    s.events.push(...lapEvents);
    return { lap, events: lapEvents, standings: this.getStandings() };
  },

  // ── CLASSEMENT ────────────────────────────────────────────
  updateStandings() {
    const racing = this.state.grid.filter(c => c.status === 'racing');
    const dnf    = this.state.grid.filter(c => c.status === 'dnf');

    // Trier par temps total cumulé (le moins = en tête)
    racing.sort((a, b) => a.totalTime - b.totalTime);

    const leaderTime = racing.length > 0 ? racing[0].totalTime : 0;

    racing.forEach((car, i) => {
      car.position = i + 1;
      // Gap = différence de temps réelle avec le leader
      // Exemple : leader=5400s, P2=5412s → gap=12s ✓
      car.gap = i === 0 ? 0 : parseFloat((car.totalTime - leaderTime).toFixed(3));
    });

    // DNF triés par tour d'abandon (plus loin = mieux classé)
    dnf.sort((a, b) => (b.dnfLap || 0) - (a.dnfLap || 0));
    dnf.forEach((car, i) => {
      car.position = racing.length + i + 1;
      car.gap      = null;
    });
  },

  getStandings() {
    return [...this.state.grid].sort((a, b) => a.position - b.position);
  },

  // ── SIMULATION COMPLÈTE ───────────────────────────────────
  simulateAll(onLapComplete = null) {
    if (!this.state) return null;
    while (!this.state.finished) {
      const result = this.simulateLap();
      if (onLapComplete) onLapComplete(result, this.state);
    }
    return this.getStandings();
  },


  // ── ORDRES MANUELS ÉQUIPE JOUEUR ─────────────────────────
  setDriverMode(driverId, mode) {
    if (!this.state) return false;
    const car = this.state.grid.find(c => c.driver.id === driverId);
    if (!car || car.status !== 'racing') return false;
    car.orderMode = ['attack','normal','save'].includes(mode) ? mode : 'normal';
    this.state.events.push({ lap: this.state.currentLap, type: 'team_order', message: `📻 ${car.driver.firstName} ${car.driver.name} reçoit l'ordre : ${car.orderMode === 'attack' ? 'attaque' : car.orderMode === 'save' ? 'économie pneus' : 'rythme normal'}` });
    return true;
  },

  forcePitStop(driverId, compound = 'MEDIUM') {
    if (!this.state) return false;
    const car = this.state.grid.find(c => c.driver.id === driverId);
    if (!car || car.status !== 'racing') return false;
    car.forcePit = true;
    car.requestedCompound = compound;
    this.state.events.push({ lap: this.state.currentLap, type: 'team_order', message: `📻 ${car.driver.firstName} ${car.driver.name} appelé aux stands pour ${F1Data.tyres[compound]?.name || compound}` });
    return true;
  },

  // ── POINTS ────────────────────────────────────────────────
  assignPoints() {
    const all    = this.getStandings();
    const racing = all.filter(c => c.status === 'racing');
    const dnf    = all.filter(c => c.status === 'dnf');
    const results = [];

    racing.forEach((car, i) => {
      results.push({
        position:  i + 1,
        driver:    car.driver,
        team:      car.team,
        points:    F1Data.pointsSystem[i] || 0,
        totalTime: car.totalTime,
        gap:       car.gap,
        pitStops:  car.pitStops,
        bestLap:   car.lapTimes.length > 0 ? Math.min(...car.lapTimes) : null,
        status:    'racing',
      });
    });

    dnf.sort((a, b) => (b.dnfLap || 0) - (a.dnfLap || 0));
    dnf.forEach((car, i) => {
      results.push({
        position: racing.length + i + 1,
        driver:   car.driver,
        team:     car.team,
        points:   0,
        dnfLap:   car.dnfLap,
        pitStops: car.pitStops,
        bestLap:  car.lapTimes.length > 0 ? Math.min(...car.lapTimes) : null,
        status:   'dnf',
      });
    });

    return results;
  },

};


document.addEventListener('DOMContentLoaded', () => {
  try {
    const save = window.F1Save?.load ? window.F1Save.load() : null;
    ensureFullGrid(save);
  } catch(e) {}
});

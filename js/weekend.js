// ============================================================
//  F1 Manager — weekend.js
//  Système weekend complet : EL1/EL2/EL3 + Qualifications
// ============================================================

const Weekend = {

  // ── CONSTANTES ────────────────────────────────────────────
  SETUP_OPTIONS: [
    { id:'balanced',   label:'Équilibré',      desc:'Setup polyvalent — bon partout',             aeroBonus:0,    tyreBonus:0,     setupBonus:0  },
    { id:'low_drag',   label:'Faible traînée', desc:'Meilleur en ligne droite, moins en virage',  aeroBonus:-0.15, tyreBonus:-0.03, setupBonus:0.12 },
    { id:'high_df',    label:'Forte charge',   desc:'Meilleur en virage, plus lent en ligne',     aeroBonus:0.12, tyreBonus:0.04,  setupBonus:-0.10 },
    { id:'quali_mode', label:'Mode qualif',    desc:'Setup optimisé pour un tour rapide',          aeroBonus:0.20, tyreBonus:-0.05, setupBonus:0    },
    { id:'race_mode',  label:'Mode course',    desc:'Meilleure gestion pneus sur la durée',        aeroBonus:-0.05, tyreBonus:0.08, setupBonus:0    },
  ],

  PROGRAM_OPTIONS: [
    { id:'quali_sim',  label:'Simulation qualif', desc:'Tour lancé → données temps par compound',  laps:3,  tyreWear:0.15 },
    { id:'long_run',   label:'Long run',           desc:'Simulation course → données dégradation', laps:15, tyreWear:0.55 },
    { id:'setup_work', label:'Travail de setup',   desc:'Réglages fins → améliore le setup',       laps:6,  tyreWear:0.25 },
  ],

  // ── SIMULER UNE SÉANCE D'ESSAIS LIBRES ───────────────────
  simulateFP(save, circuit, driver, compound, program, setup) {
    const team     = F1Data.teams.find(t => t.id === save.playerTeamId);
    const tyre     = F1Data.tyres[compound];
    const prog     = this.PROGRAM_OPTIONS.find(p => p.id === program) || this.PROGRAM_OPTIONS[0];
    const setupOpt = this.SETUP_OPTIONS.find(s => s.id === setup) || this.SETUP_OPTIONS[0];

    if (!team || !tyre || !circuit) return null;

    const laps      = prog.laps;
    const lapTimes  = [];
    const tyreData  = [];

    let tyreCondition = 1.0;
    let bestLap       = Infinity;
    let bestCompound  = compound;

    for (let lap = 1; lap <= laps; lap++) {
      const tyreState = { compound, condition: tyreCondition, age: lap - 1 };

      // Temps au tour via engine (sans fuel)
      let lapTime = Engine.calcLapTime(
        driver, team, circuit, tyreState, 0,
        save.weekendWeather || 'dry', lap, 'normal'
      );

      // Bonus/malus setup
      lapTime -= setupOpt.aeroBonus * 0.1;

      // EL : pas à 100% (pilotes apprennent le circuit, pas en mode quali)
      const explorationFactor = prog.id === 'quali_sim' ? 0.97 : 0.99;
      lapTime /= explorationFactor;

      // Amélioration progressive (pilote apprend la piste)
      lapTime -= lap * 0.012;

      // Variabilité
      lapTime += (Math.random() - 0.5) * 0.3;

      lapTimes.push(parseFloat(lapTime.toFixed(3)));
      tyreData.push(parseFloat((tyreCondition * 100).toFixed(1)));

      if (lapTime < bestLap) { bestLap = lapTime; bestCompound = compound; }

      // Dégradation
      const degradeRate = tyre.degradationRate * circuit.tyreDegradation * (prog.tyreWear / prog.laps);
      tyreCondition = Math.max(0, tyreCondition - degradeRate * (1 - setupOpt.tyreBonus));
    }

    const avgLap    = lapTimes.length > 0 ? lapTimes.reduce((s,l)=>s+l,0) / lapTimes.length : 0;
    const finalWear = 100 - tyreCondition * 100;

    return {
      driver:      driver.id,
      compound,
      program,
      setup,
      laps,
      lapTimes,
      tyreData,
      bestLap:    parseFloat(bestLap.toFixed(3)),
      avgLap:     parseFloat(avgLap.toFixed(3)),
      finalWear:  parseFloat(finalWear.toFixed(1)),
      tyreLife:   parseFloat((tyreCondition * 100).toFixed(1)),
    };
  },

  // ── SIMULER QUALIFICATIONS ────────────────────────────────
  simulateQuali(save, circuit) {
    const playerTeamId = save.playerTeamId;
    const weather      = save.weekendWeather || 'dry';
    const allDrivers   = F1Data.drivers.filter(d => !d.retired && d.teamId);
    const grid         = [];

    allDrivers.forEach(driver => {
      const team   = F1Data.teams.find(t => t.id === driver.teamId);
      if (!team) return;

      // Compound quali : toujours SOFT sauf si pluie
      const compound = weather === 'heavy_rain' ? 'WET' : weather === 'light_rain' ? 'INTER' : 'SOFT';
      const tyreState = { compound, condition: 1.0, age: 0 };

      // Temps quali = meilleur tour possible
      let baseTime = Engine.calcLapTime(driver, team, circuit, tyreState, 0, weather, 1, 'attack');

      // Bonus trait qualifier
      if (driver.trait === 'qualifier') baseTime -= 0.25;
      if (driver.trait === 'aggressive') baseTime -= 0.10;
      if (driver.trait === 'consistent') baseTime += 0.05;

      // Variabilité quali (moins qu'en course)
      baseTime += (Math.random() - 0.5) * 0.18;

      // Appliquer les bonus setup EL du joueur
      if (driver.teamId === playerTeamId && save.weekendSetup) {
        const setupOpt = this.SETUP_OPTIONS.find(s => s.id === save.weekendSetup);
        if (setupOpt) baseTime -= setupOpt.aeroBonus * 0.15;
      }

      // Appliquer le programme quali personnalisé
      if (driver.teamId === playerTeamId && save.qualiStrategy?.[driver.id]) {
        const qs = save.qualiStrategy[driver.id];
        if (qs.mode === 'push') {
          // Push : plus rapide mais risqué
          baseTime -= 0.25;  // gain significatif
          // Risque de trafic/erreur selon consistance du pilote
          const errorChance = Math.max(0.05, 0.20 - (driver.consistency||80) * 0.002);
          if (Math.random() < errorChance) {
            baseTime += 0.35 + Math.random() * 0.4; // erreur annule le gain
          }
        }
        if (qs.mode === 'normal') {
          baseTime += 0.08; // légèrement plus lent mais fiable
        }
      }

      grid.push({
        driverId:  driver.id,
        teamId:    driver.teamId,
        qualiTime: parseFloat(baseTime.toFixed(3)),
        compound,
        isPlayer:  driver.teamId === playerTeamId,
      });
    });

    // Trier par temps
    grid.sort((a, b) => a.qualiTime - b.qualiTime);

    // Simulation Q1/Q2/Q3
    const q1 = grid.slice(0, 20).sort((a,b)=>a.qualiTime-b.qualiTime);
    const q1Eliminated = q1.slice(15).map(d => ({ ...d, eliminatedIn:'Q1', finalPos: q1.indexOf(d) + 1 }));
    const q2 = q1.slice(0, 15).map(d => {
      const variance = (Math.random() - 0.5) * 0.08;
      return { ...d, qualiTime: parseFloat((d.qualiTime + variance).toFixed(3)) };
    }).sort((a,b)=>a.qualiTime-b.qualiTime);
    const q2Eliminated = q2.slice(10).map(d => ({ ...d, eliminatedIn:'Q2', finalPos: 11 + q2.indexOf(d) }));
    const q3 = q2.slice(0, 10).map(d => {
      const variance = (Math.random() - 0.5) * 0.06;
      return { ...d, qualiTime: parseFloat((d.qualiTime + variance).toFixed(3)) };
    }).sort((a,b)=>a.qualiTime-b.qualiTime);

    // Grille finale
    const finalGrid = [
      ...q3.map((d, i)      => ({ ...d, gridPos: i + 1,       eliminatedIn: 'Q3' })),
      ...q2Eliminated.map((d, i) => ({ ...d, gridPos: i + 11 })),
      ...q1Eliminated.map((d, i) => ({ ...d, gridPos: i + 16 })),
    ];

    // Trouver positions joueur
    const playerResults = finalGrid.filter(d => d.isPlayer);

    return {
      grid:          finalGrid,
      q1Results:     q1,
      q2Results:     q2,
      q3Results:     q3,
      playerResults,
      poleTime:      q3[0]?.qualiTime,
      poleDriver:    q3[0]?.driverId,
      weather,
    };
  },

  // ── BONUS CONNAISSANCE CIRCUIT (depuis les EL) ────────────
  calcKnowledgeBonus(fpResults) {
    if (!fpResults?.length) return { tyreBonus: 0, setupBonus: 0, paceBonus: 0 };

    const sessions   = fpResults.length;
    const longRuns   = fpResults.filter(r => r.program === 'long_run').length;
    const setupWork  = fpResults.filter(r => r.program === 'setup_work').length;
    const qualiSims  = fpResults.filter(r => r.program === 'quali_sim').length;

    return {
      tyreBonus:  parseFloat((longRuns  * 0.03).toFixed(3)),
      setupBonus: parseFloat((setupWork * 0.04).toFixed(3)),
      paceBonus:  parseFloat((qualiSims * 0.02).toFixed(3)),
      sessions,
      label: sessions >= 6 ? 'Excellente préparation' : sessions >= 3 ? 'Bonne préparation' : 'Préparation limitée',
    };
  },

  // ── MÉTÉO WEEKEND ─────────────────────────────────────────
  generateWeekendWeather(circuit) {
    const roll = Math.random();
    if (circuit.id === 'spa' || circuit.id === 'brazil' || circuit.id === 'silverstone') {
      if (roll < 0.40) return 'light_rain';
      if (roll < 0.55) return 'heavy_rain';
    } else if (circuit.id === 'monaco' || circuit.id === 'baku') {
      if (roll < 0.15) return 'light_rain';
    } else {
      if (roll < 0.10) return 'light_rain';
      if (roll < 0.14) return 'heavy_rain';
    }
    return 'dry';
  },

  // ── FORMAT TEMPS ─────────────────────────────────────────
  fmtTime(s) {
    const m   = Math.floor(s / 60);
    const sec = (s % 60).toFixed(3).padStart(6, '0');
    return `${m}:${sec}`;
  },

  fmtGap(base, t) {
    if (t === base) return 'POLE';
    return '+' + (t - base).toFixed(3) + 's';
  },
};

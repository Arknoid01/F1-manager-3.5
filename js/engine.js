// ============================================================
//  F1 Manager — engine.js  (v5 — personnalités réalistes)
//
//  TRAITS ACTIFS EN COURSE :
//  aggressive   → pace +0.15s, dégradation ×1.20, crash ×1.4
//  consistent   → dégradation ×0.88, variabilité réduite
//  qualifier    → pace +0.20s sur tour rapide, dégradation ×1.10
//  rain_master  → wetSkill +5 effectif, bonus ×1.5 sous pluie
//  defender     → défense +7, perd 0.15s en attaque
//  overtaker    → overtaking +7, bonus DRS ×1.4
//  prodigy      → progresse +0.05s/tour de confiance
//  technical    → gère mieux le cliff pneu, feedback setup
// ============================================================

const Engine = {

  // ── TRAIT HELPERS ─────────────────────────────────────────
  getTrait(driver) {
    return F1Data.traits?.[driver.trait] || { label:'Standard', icon:'🏎️',
      paceBonus:0, tyreMultiplier:1.0, overtakingBonus:0, wetPenalty:0 };
  },

  // ── CALCUL TEMPS AU TOUR ──────────────────────────────────
  calcLapTime(driver, team, circuit, tyreState, _fuelLoad, weather='dry', lap=1, orderMode='normal') {
    // _fuelLoad ignoré — géré avant la course en F1 moderne
    const tyre  = F1Data.tyres[tyreState.compound];
    const trait = this.getTrait(driver);

    // Garantir des stats valides — juniors générés peuvent avoir undefined
    if (!driver.pace        || isNaN(driver.pace))        driver.pace        = 72;
    if (!driver.consistency || isNaN(driver.consistency)) driver.consistency = 70;
    if (!driver.wetSkill    || isNaN(driver.wetSkill))    driver.wetSkill    = 68;
    if (!driver.overtaking  || isNaN(driver.overtaking))  driver.overtaking  = 68;
    if (!driver.defending   || isNaN(driver.defending))   driver.defending   = 68;
    if (!team.performance   || isNaN(team.performance))   team.performance   = 70;

    let lapTime = circuit.baseLapTime;

    // ── 1. Performance équipe ─────────────────────────────
    // Écart max top/backmarker : 0.75s/tour
    lapTime += (85 - team.performance) * 0.030;

    // ── 1b. Bonus sponsors techniques (engine, tyreDeg via save) ─
    try {
      const _sv = typeof Save !== 'undefined' ? Save.load() : null;
      if (_sv?.sponsorBonuses) {
        // Bonus moteur sponsor (Shell/Gulf/Petronas)
        if (_sv.sponsorBonuses.engine) {
          lapTime -= _sv.sponsorBonuses.engine * 0.015;
        }
      }
      const media = (_sv?.mediaEffects?.race === (_sv?.race||0) && _sv?.mediaEffects?.season === (_sv?.season||2025)) ? _sv.mediaEffects : null;
      if (media?.team && _sv?.playerTeamId === team?.id) {
        lapTime -= (media.team.pace || 0) * 0.020;
        lapTime -= (media.team.race || 0) * 0.030;
        if (weather !== 'dry') lapTime -= (media.team.weather || 0) * 0.035;
      }
    } catch(e) {}

    // ── 2. Skill pilote ───────────────────────────────────
    lapTime += (87 - driver.pace) * 0.012;

    // ── 3. Trait pilote — impact pace ─────────────────────
    lapTime -= trait.paceBonus * 0.10;

    // Qualifier : boost supplémentaire sur les softs
    if (driver.trait === 'qualifier' && tyreState.compound === 'SOFT') {
      lapTime -= 0.08;
    }
    // Defender : légèrement moins rapide en mode offensif
    if (driver.trait === 'defender' && orderMode === 'attack') {
      lapTime += 0.12;
    }
    // Prodigy : monte en confiance au fil des tours (+0.004s tous les 5 tours)
    if (driver.trait === 'prodigy' && lap > 1) {
      lapTime -= Math.min(0.15, Math.floor(lap / 5) * 0.004);
    }
    // Technical : tire mieux parti du setup (bonus aero équipe)
    if (driver.trait === 'technical') {
      const aeroBonus = Math.max(0, (team.aero - 75)) * 0.002;
      lapTime -= aeroBonus;
    }

    // ── 4. Pneus — grip de base ───────────────────────────
    lapTime += (1 - tyre.grip) * 1.5;

    // ── 5. Dégradation pneus ─────────────────────────────
    const degradation = (1 - tyreState.condition);
    let degradFactor  = circuit.tyreDegradation;

    // Technical gère mieux le cliff (détecte les limites)
    if (driver.trait === 'technical') degradFactor *= 0.92;

    lapTime += degradation * 2.8 * degradFactor;

    // ── 6. Phase de chauffe ───────────────────────────────
    if (tyreState.age < tyre.warmupLaps) {
      const warmupPenalty = (tyre.warmupLaps - tyreState.age) * 0.25;
      // Consistent réchauffe plus vite
      lapTime += driver.trait === 'consistent' ? warmupPenalty * 0.75 : warmupPenalty;
    }

    // ── 7. Cliff pneu ─────────────────────────────────────
    if (degradation > 0.80) {
      let cliffFactor = 10;
      if (driver.trait === 'technical')  cliffFactor = 7;   // gère mieux
      if (driver.trait === 'aggressive') cliffFactor = 13;  // pire
      lapTime += (degradation - 0.80) * cliffFactor;
    }


    // ── 8. Pénalité pneu / humidité piste ─────────────────
    // Si on est sur le mauvais pneu pour l'humidité actuelle
    if (typeof Weather !== 'undefined' && typeof currentHumidity !== 'undefined') {
      const mismatch = Weather.getTyreMismatchPenalty(tyreState.compound, currentHumidity);
      if (mismatch > 0) lapTime += mismatch;
    }

    // ── 9. Météo + trait pluie ────────────────────────────
    if (weather === 'light_rain') {
      let wetSkill = driver.wetSkill;
      if (driver.trait === 'rain_master') wetSkill = Math.min(99, wetSkill + 5);
      const wetBonus = (wetSkill - 82) * 0.020;
      lapTime += (driver.trait === 'rain_master' ? 2.0 : 3.0) - wetBonus;
      if (!['INTER', 'WET'].includes(tyreState.compound)) lapTime += 6.0;
    } else if (weather === 'heavy_rain') {
      let wetSkill = driver.wetSkill;
      if (driver.trait === 'rain_master') wetSkill = Math.min(99, wetSkill + 8);
      const wetBonus = (wetSkill - 82) * 0.040;
      lapTime += (driver.trait === 'rain_master' ? 5.5 : 9.0) - wetBonus;
      if (tyreState.compound !== 'WET') lapTime += 16.0;
    }

    // ── 9. Ordres pilote ─────────────────────────────────
    if (orderMode === 'attack') lapTime -= 0.28;
    if (orderMode === 'save')   lapTime += 0.22;


    // ── 9b. Setup week-end (équipe joueur uniquement) ────────
    try {
      const _svSetup = typeof Save !== 'undefined' ? Save.load() : null;
      if (_svSetup?.weekendSetup && _svSetup?.playerTeamId === team?.id) {
        if (_svSetup.weekendSetup === 'qualify') lapTime -= 0.08;
        if (_svSetup.weekendSetup === 'race')    lapTime += 0.05;
      }
    } catch(e) {}
    // ── 10. Consistance — variabilité ─────────────────────
    // Consistent = très peu de variation, aggressive = plus variable
    let variability = 0.20;
    if (driver.trait === 'consistent') variability = 0.10;
    if (driver.trait === 'aggressive') variability = 0.32;
    lapTime += (Math.random() - 0.5) * variability;

    return Math.max(lapTime, circuit.baseLapTime * 0.990);
  },

  // ── DÉGRADATION PNEUS ─────────────────────────────────────
  degradeTyre(tyreState, circuit, driver, weather='dry', orderMode='normal') {
    const tyre  = F1Data.tyres[tyreState.compound];
    const trait = this.getTrait(driver);

    let rate = tyre.degradationRate * circuit.tyreDegradation;

    // Trait pilote affecte la dégradation
    rate *= trait.tyreMultiplier;

    // Agressivité naturelle (overtaking élevé = plus de dégradation)
    const aggressionFactor = 1 + (driver.overtaking - 80) * 0.003;
    rate *= aggressionFactor;

    // Ordres pilote
    if (orderMode === 'attack') rate *= 1.28;
    if (orderMode === 'save')   rate *= 0.72;

    // Météo
    if (weather === 'light_rain') rate *= 0.70;
    if (weather === 'heavy_rain') rate *= 0.50;

    // Consistent gère mieux sur le long terme
    if (driver.trait === 'consistent' && tyreState.age > 15) rate *= 0.92;

    // Setup week-end affecte la dégradation (équipe joueur)
    try {
      const _svDeg = typeof Save !== 'undefined' ? Save.load() : null;
      if (_svDeg?.weekendSetup && _svDeg?.playerTeamId === driver?.teamId) {
        if (_svDeg.weekendSetup === 'qualify') rate *= 1.12; // pneus plus sollicités
        if (_svDeg.weekendSetup === 'race')    rate *= 0.90; // meilleure gestion pneus
      }
      const media = (_svDeg?.mediaEffects?.race === (_svDeg?.race||0) && _svDeg?.mediaEffects?.season === (_svDeg?.season||2025)) ? _svDeg.mediaEffects : null;
      if (media?.team && _svDeg?.playerTeamId === driver?.teamId) {
        rate *= Math.max(0.70, 1 - (media.team.tyres || 0) * 0.035);
        rate *= Math.min(1.40, 1 + (media.team.tyreMalus || 0) * 0.015);
      }
    } catch(e) {}

    // Variabilité
    // Bonus sponsor pneus (Pirelli Data)
    try {
      const _sv2 = typeof Save !== 'undefined' ? Save.load() : null;
      if (_sv2?.sponsorBonuses?.tyreDeg) {
        rate *= (1 + _sv2.sponsorBonuses.tyreDeg); // tyreDeg est négatif (-0.05)
      }
    } catch(e) {}

    rate *= (0.93 + Math.random() * 0.14);

    tyreState.condition = Math.max(0, tyreState.condition - rate);
    tyreState.age++;
    return tyreState;
  },

  // ── CALCUL FUEL ───────────────────────────────────────────
  calcFuelLoad(circuit, lap) {
    const totalFuel = circuit.fuelPerLap * circuit.laps;
    const consumed  = circuit.fuelPerLap * (lap - 1);
    return Math.max(0, totalFuel - consumed);
  },

  // ── DÉCISION PIT STOP ─────────────────────────────────────
  shouldPit(tyreState, lap, totalLaps, strategy, someoneJustPitted=false, weather='dry', safetyCarActive=false) {
    if (tyreState.condition < 0.22) return { pit: true, reason: 'tyre_dead' };

    // Changement météo — réaction basée sur l'humidité réelle.
    // Important : on utilise des seuils avec marge pour éviter que la météo
    // écrase trop souvent la stratégie programmée.
    if (typeof currentHumidity !== 'undefined') {
      const hum = currentHumidity;
      const compound = tyreState.compound;
      const isSlick = ['SOFT','MEDIUM','HARD'].includes(compound);

      // Piste vraiment sèche : quitter INTER/WET seulement quand les slicks sont clairement viables.
      if (hum < 25 && ['INTER','WET'].includes(compound)) {
        return { pit: true, reason: 'weather_change' };
      }
      // Piste humide : un slick devient dangereux, donc arrêt météo prioritaire.
      if (hum >= 32 && hum < 70 && isSlick) {
        return { pit: true, reason: 'weather_change' };
      }
      // Forte pluie : passer en WET si on n'y est pas déjà.
      if (hum >= 70 && compound !== 'WET') {
        return { pit: true, reason: 'weather_change' };
      }
      // La pluie baisse : WET -> INTER seulement quand le niveau est clairement sous la zone WET.
      if (hum >= 30 && hum < 55 && compound === 'WET') {
        return { pit: true, reason: 'weather_change' };
      }
    } else {
      // Fallback si currentHumidity non disponible
      if ((weather === 'light_rain' || weather === 'heavy_rain') &&
          !['INTER','WET'].includes(tyreState.compound)) {
        return { pit: true, reason: 'weather_change' };
      }
      if (weather === 'dry' && ['INTER','WET'].includes(tyreState.compound)) {
        return { pit: true, reason: 'weather_change' };
      }
    }

    if (lap > totalLaps - 4) return { pit: false };

    if (strategy && strategy.pitLaps) {
      for (const pitLap of strategy.pitLaps) {
        if (lap === pitLap) return { pit: true, reason: 'planned' };
        // Opportunité safety car : pitter si on est proche du pit planifié
        if (safetyCarActive && Math.abs(lap - pitLap) <= 3) {
          return { pit: true, reason: 'safety_car_opportunity' };
        }
        // Undercut
        if (someoneJustPitted && lap >= pitLap - 2 && lap < pitLap) {
          return { pit: true, reason: 'undercut' };
        }
      }
    }

    return { pit: false };
  },

  // ── INCIDENTS — TRAITS AFFECTENT LA PROBABILITÉ ───────────
  rollIncidents(driver, team, lap, totalLaps) {
    const events = [];
    const trait  = this.getTrait(driver);

    // Abandon mécanique
    const reliabilityFactor = (100 - team.reliability) / 100;
    let mediaDnfBoost = 0;
    try {
      const _svInc = typeof Save !== 'undefined' ? Save.load() : null;
      const media = (_svInc?.mediaEffects?.race === (_svInc?.race||0) && _svInc?.mediaEffects?.season === (_svInc?.season||2025)) ? _svInc.mediaEffects : null;
      if (_svInc?.playerTeamId === (team?.id || driver?.teamId)) mediaDnfBoost = (media?.team?.dnfRisk || 0) * 0.0008 + ((_svInc?._dnfRiskBoost||0) * 0.002);
    } catch(e) {}
    if (Math.random() < reliabilityFactor * 0.0015 + mediaDnfBoost) {
      events.push({ type: 'dnf', reason: 'mechanical' });
    }

    // Crash — aggressive plus susceptible, defender moins
    let crashBase = lap <= 2 ? 0.0020 : 0.00035;
    if (driver.trait === 'aggressive') crashBase *= 1.40;
    if (driver.trait === 'defender')   crashBase *= 0.60;
    if (driver.trait === 'consistent') crashBase *= 0.70;
    if (Math.random() < crashBase) {
      events.push({ type: 'dnf', reason: 'crash' });
    }

    // Pénalité — aggressive plus souvent pénalisé
    let penaltyBase = 0.0015;
    if (driver.trait === 'aggressive') penaltyBase *= 1.50;
    if (driver.trait === 'overtaker')  penaltyBase *= 1.20;
    if (Math.random() < penaltyBase) {
      events.push({ type: 'penalty', seconds: Math.random() > 0.5 ? 5 : 10 });
    }

    return events;
  },

  // ── DÉPASSEMENT — DRS + ASPIRATION + TRAITS ─────────────
  attemptOvertake(attacker, defender, circuit) {
    const speedDiff = defender.currentPace - attacker.currentPace;
    if (speedDiff <= 0) return false;

    const baseChance = speedDiff * 0.15;
    const circuitFactor = 1 - circuit.overtakingDifficulty;

    let attackerOv = attacker.driver.overtaking;
    let defenderDf = defender.driver.defending;

    // Traits
    if (attacker.driver.trait === 'overtaker')  attackerOv = Math.min(99, attackerOv + 7);
    if (attacker.driver.trait === 'aggressive') attackerOv = Math.min(99, attackerOv + 3);
    if (defender.driver.trait === 'defender')   defenderDf = Math.min(99, defenderDf + 7);
    if (defender.driver.trait === 'consistent') defenderDf = Math.min(99, defenderDf + 2);

    const attackerSkill = attackerOv / 100;
    const defenderSkill = defenderDf / 100;

    // ── DRS — selon le nombre de zones du circuit ──────────
    // 1 zone → +8%, 2 zones → +16%, 3 zones → +25%
    const drsZones  = circuit.drsZones || 1;
    const drsBonus  = drsZones * 0.08;

    // ── Aspiration (slipstream) ────────────────────────────
    // Si l'attaquant est dans le sillage (gap < 1s), il bénéficie
    // d'une réduction de traînée qui facilite le dépassement
    const gap = attacker.gap !== null && defender.gap !== null
      ? Math.abs(attacker.gap - defender.gap)
      : 2;
    const slipstreamBonus = gap < 1.0
      ? 0.18 * (1 - gap)   // max +18% si collé, diminue avec la distance
      : gap < 2.0
      ? 0.06               // léger effet à distance moyenne
      : 0;

    // ── Setup aéro joueur ──────────────────────────────────
    // low_drag → meilleur DRS (+5%), high_df → moins bon DRS (-5%)
    let setupBonus = 0;
    try {
      const sv = typeof Save !== 'undefined' ? Save.load() : null;
      if (sv?.weekendSetup && sv?.playerTeamId === attacker.driver.teamId) {
        if (sv.weekendSetup === 'low_drag') setupBonus =  0.05;
        if (sv.weekendSetup === 'high_df')  setupBonus = -0.05;
      }
    } catch(e) {}

    const chance = baseChance
      * circuitFactor
      * (0.5 + attackerSkill * 0.5)
      * (1 - defenderSkill * 0.3)
      * (1 + drsBonus + slipstreamBonus + setupBonus);

    return Math.random() < Math.max(0, Math.min(chance, 0.85));
  },

  // ── SAFETY CAR ────────────────────────────────────────────
  rollSafetyCar(lap, totalLaps, incidents) {
    const hasCrash = incidents.some(i => i.type === 'dnf' && i.reason === 'crash');
    if (hasCrash && Math.random() > 0.2) {
      return { active: true, laps: 4 + Math.floor(Math.random() * 3) };
    }
    if (Math.random() < 0.007) {
      return { active: true, laps: 3 + Math.floor(Math.random() * 2) };
    }
    return { active: false };
  },

  // ── GÉNÉRATION STRATÉGIE ──────────────────────────────────
  // gridPos : position de départ (1=pole, 20=dernier)
  generateStrategy(circuit, teamPerformance, weather='dry', driverTrait=null, gridPos=10) {
    if (weather === 'heavy_rain') return { compounds: ['WET'], pitLaps: [] };

    const L = circuit.laps;
    const D = circuit.tyreDegradation;

    // Nombre d'arrêts de base
    let stops = 1;
    if (D > 1.2 || L > 65) stops = 2;
    if (D > 1.45) stops = 3;

    // ── Variabilité selon la position grille ─────────────────
    // Top 3 : stratégie conservatrice (protéger la position)
    // P4-P10 : stratégie agressive (undercut possible)
    // P11-P15 : gamble medium (décalage de 1-2 tours)
    // P16-P20 : gamble total (overcut, 1 arrêt même si 2 optimal)

    let strategyBias = 'normal';
    if (gridPos <= 3)       strategyBias = 'conservative';
    else if (gridPos <= 10) strategyBias = 'aggressive';
    else if (gridPos <= 15) strategyBias = 'offset';
    else                    strategyBias = 'gamble';

    // Variabilité 3 arrêts → 2 arrêts selon le style et la position
    if (stops === 3 && strategyBias === 'conservative' && Math.random() < 0.5) stops = 2;
    if (stops === 3 && strategyBias === 'aggressive'   && Math.random() < 0.35) stops = 2;
    if (stops === 3 && teamPerformance > 85            && Math.random() < 0.4) stops = 2;
    // Gamble : les derniers tentent souvent 1 arrêt au lieu de 2
    if (strategyBias === 'gamble' && stops === 2 && Math.random() < 0.55) stops = 1;
    // Offset : décaler le pit de quelques tours
    const pitOffset = strategyBias === 'offset' ? Math.floor(Math.random() * 6) - 3 : 0;
    // Aggressive : essayer l'undercut (pit plus tôt)
    const earlyPit  = strategyBias === 'aggressive' && Math.random() < 0.4;

    // Top équipes peuvent faire moins d'arrêts
    if (teamPerformance > 87 && stops === 2 && Math.random() > 0.7) stops = 1;

    // Traits pilote
    if (driverTrait === 'consistent' && stops === 2 && Math.random() > 0.5) stops = 1;
    if (driverTrait === 'aggressive' && stops === 1 && Math.random() > 0.6) stops = 2;

    // ── Pools de stratégies ────────────────────────────────
    const strategies = {
      1: [
        { compounds: ['MEDIUM','HARD'],  pitLaps: [Math.round(L * (earlyPit?0.38:0.46) + pitOffset)] },
        { compounds: ['SOFT','HARD'],    pitLaps: [Math.round(L * (earlyPit?0.28:0.36) + pitOffset)] },
        { compounds: ['HARD','MEDIUM'],  pitLaps: [Math.round(L * (earlyPit?0.48:0.56) + pitOffset)] },
        { compounds: ['MEDIUM','SOFT'],  pitLaps: [Math.round(L * (earlyPit?0.50:0.60) + pitOffset)] },  // overcut gamble
      ],
      2: [
        { compounds: ['SOFT','MEDIUM','HARD'],  pitLaps: [Math.round(L*(earlyPit?0.22:0.27)+pitOffset), Math.round(L*0.57+pitOffset)] },
        { compounds: ['SOFT','HARD','MEDIUM'],  pitLaps: [Math.round(L*(earlyPit?0.20:0.24)+pitOffset), Math.round(L*0.59+pitOffset)] },
        { compounds: ['MEDIUM','SOFT','HARD'],  pitLaps: [Math.round(L*(earlyPit?0.28:0.35)+pitOffset), Math.round(L*0.63+pitOffset)] },
        { compounds: ['MEDIUM','HARD','SOFT'],  pitLaps: [Math.round(L*0.33+pitOffset), Math.round(L*0.66+pitOffset)] },
        { compounds: ['SOFT','SOFT','HARD'],    pitLaps: [Math.round(L*0.20+pitOffset), Math.round(L*0.42+pitOffset)] },  // agressif
      ],
      3: [
        { compounds: ['SOFT','SOFT','MEDIUM','HARD'],  pitLaps: [Math.round(L*0.19), Math.round(L*0.40), Math.round(L*0.64)] },
        { compounds: ['SOFT','MEDIUM','MEDIUM','HARD'], pitLaps: [Math.round(L*0.22), Math.round(L*0.44), Math.round(L*0.67)] },
        { compounds: ['SOFT','SOFT','HARD','MEDIUM'],   pitLaps: [Math.round(L*0.18), Math.round(L*0.38), Math.round(L*0.62)] },
        { compounds: ['MEDIUM','SOFT','SOFT','HARD'],   pitLaps: [Math.round(L*0.25), Math.round(L*0.45), Math.round(L*0.65)] },
        { compounds: ['SOFT','HARD','SOFT','MEDIUM'],   pitLaps: [Math.round(L*0.20), Math.round(L*0.48), Math.round(L*0.68)] },
      ],
    };

    const pool = strategies[stops] || strategies[1];
    const pick = pool[Math.floor(Math.random() * pool.length)];

    // Nettoyer les pitLaps hors limites
    pick.pitLaps = pick.pitLaps.map(p => Math.max(3, Math.min(L-4, p)));

    return pick;
  },

  // ── NORMALISATION STRATÉGIE PERSO ─────────────────────────
  normalizeStrategy(raw, circuit, weather='dry') {
    const valid = ['SOFT','MEDIUM','HARD','INTER','WET'];
    if (!raw || !circuit) return this.generateStrategy(circuit, 80, weather);
    let compounds = Array.isArray(raw.compounds)
      ? raw.compounds.filter(c => valid.includes(c)) : [];
    if (!compounds.length) {
      compounds = weather === 'heavy_rain' ? ['WET']
        : weather === 'light_rain' ? ['INTER','MEDIUM'] : ['MEDIUM','HARD'];
    }
    if (compounds.length === 1 && weather === 'dry') {
      compounds.push(compounds[0] === 'HARD' ? 'MEDIUM' : 'HARD');
    }
    let pitLaps = Array.isArray(raw.pitLaps)
      ? raw.pitLaps.map(n => parseInt(n,10)).filter(n => Number.isFinite(n)) : [];
    pitLaps = pitLaps
      .map(n => Math.max(2, Math.min(circuit.laps - 3, n)))
      .sort((a,b) => a - b)
      .slice(0, Math.max(0, compounds.length - 1));
    while (pitLaps.length < compounds.length - 1) {
      if (compounds.length > 0) pitLaps.push(Math.round(circuit.laps * ((pitLaps.length + 1) / compounds.length)));
    }
    return { compounds, pitLaps };
  },

  // ── DÉVELOPPEMENT IA ──────────────────────────────────────
  // Appelé en fin de course pour faire progresser les équipes IA
  advanceAI(save) {
    if (!save) return;
    save.aiDevelopment = save.aiDevelopment || {};

    F1Data.teams.forEach(team => {
      if (team.id === save.playerTeamId) return;

      // Chaque équipe IA investit selon son budget
      const investRate = team.budget / 500; // Red Bull = 1.0, Williams = 0.4
      save.aiDevelopment[team.id] = save.aiDevelopment[team.id] || {};

      // 5% chance par course d'upgrade sur un composant aléatoire
      if (Math.random() < 0.055 * investRate) {
        const comps = ['aero','chassis','engine','reliability'];
        const comp  = comps[Math.floor(Math.random() * comps.length)];
        save.aiDevelopment[team.id][comp] = (save.aiDevelopment[team.id][comp] || 0) + 1;
      }

      // Appliquer le développement accumulé
      const ai = save.aiDevelopment[team.id];
      ['aero','chassis','engine','reliability'].forEach(k => {
        if (ai[k]) {
          team[k] = Math.min(99, (team[k] || 70) + ai[k]);
          ai[k]   = 0; // reset après application
        }
      });
      team.performance = Math.round((team.aero + team.chassis + team.engine) / 3);
    });
  },

};

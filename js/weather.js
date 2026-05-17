// ============================================================
//  F1 Manager — weather.js
//  Système météo dynamique avec humidité de piste
//
//  Humidité 0-100% :
//    0-30%  → Slicks (Soft/Medium/Hard)
//    30-70% → Intermédiaire recommandé
//    70%+   → Full Wet obligatoire
// ============================================================

const Weather = {

  // ── INIT MÉTÉO WEEKEND ────────────────────────────────────
  // Génère le scénario météo complet pour toute la course
  initRaceWeather(circuit, totalLaps) {
    const rainChance = circuit.rainChance || 0.15;
    const dryingRate = circuit.dryingRate || 5.0; // %/tour par défaut
    const trackTemp  = circuit.trackTemp  || 28;

    // Décider si et quand il pleut
    const willRain = Math.random() < rainChance;
    let rainStart  = null;
    let rainEnd    = null;
    let rainIntensity = 0; // 0=sec, 1=légère, 2=forte

    if (willRain) {
      rainStart     = Math.floor(Math.random() * (totalLaps * 0.6)) + 1;
      const duration= Math.floor(5 + Math.random() * 20); // 5-25 tours
      rainEnd       = Math.min(rainStart + duration, totalLaps);
      rainIntensity = Math.random() < 0.35 ? 2 : 1; // 35% forte pluie
    }

    // Humidité initiale (piste peut déjà être légèrement humide)
    const initialHumidity = willRain && rainStart === 1 ? 0 : 0;

    // Vitesse de séchage selon température et conditions
    const tempFactor  = Math.max(0.5, trackTemp / 28);
    const actualDryRate = dryingRate * tempFactor;

    return {
      willRain,
      rainStart,
      rainEnd,
      rainIntensity,
      initialHumidity,
      dryingRate: actualDryRate,
      trackTemp,
      // Générer le profil d'humidité tour par tour
      humidityProfile: this.generateHumidityProfile(totalLaps, {
        willRain, rainStart, rainEnd, rainIntensity, initialHumidity, dryingRate: actualDryRate
      }),
    };
  },

  // ── PROFIL HUMIDITÉ TOUR PAR TOUR ────────────────────────
  generateHumidityProfile(totalLaps, config) {
    const profile = [];
    let humidity  = config.initialHumidity || 0;

    for (let lap = 1; lap <= totalLaps; lap++) {
      const isRaining = config.willRain &&
        lap >= config.rainStart &&
        lap <= config.rainEnd;

      if (isRaining) {
        // Montée d'humidité selon l'intensité
        const riseRate = config.rainIntensity === 2 ? 14 : 8; // %/tour
        humidity = Math.min(100, humidity + riseRate + (Math.random() - 0.5) * 3);
      } else {
        // Séchage progressif
        const dryRate = config.dryingRate + (Math.random() - 0.5) * 1.5;
        humidity = Math.max(0, humidity - dryRate);
      }

      profile.push(parseFloat(humidity.toFixed(1)));
    }

    return profile;
  },

  // ── HUMIDITÉ → ÉTAT PISTE ─────────────────────────────────
  getTrackCondition(humidity) {
    if (humidity <= 0)   return { label: 'Sec',        weather: 'dry',        color: '#00e676', icon: '☀️',  optimalTyre: 'slick'  };
    if (humidity <= 15)  return { label: 'Légèrement humide', weather: 'dry',  color: '#88cc44', icon: '🌤️', optimalTyre: 'slick'  };
    if (humidity <= 30)  return { label: 'Humide',     weather: 'dry',        color: '#ffcc00', icon: '⛅',  optimalTyre: 'slick'  };
    if (humidity <= 55)  return { label: 'Piste mouillée', weather: 'light_rain', color: '#ff9944', icon: '🌧️', optimalTyre: 'inter' };
    if (humidity <= 75)  return { label: 'Forte pluie', weather: 'light_rain', color: '#ff6633', icon: '🌧️', optimalTyre: 'inter' };
    return                      { label: 'Détrempée',  weather: 'heavy_rain', color: '#ff3344', icon: '⛈️', optimalTyre: 'wet'   };
  },

  // ── PNEU OPTIMAL SELON HUMIDITÉ ───────────────────────────
  getOptimalTyre(humidity) {
    if (humidity <= 30) return 'slick'; // Soft/Medium/Hard
    if (humidity <= 70) return 'INTER';
    return 'WET';
  },

  // ── PÉNALITÉ SI MAUVAIS PNEU ─────────────────────────────
  // Retourne les secondes perdues par tour si on est sur le mauvais pneu
  getTyreMismatchPenalty(compound, humidity) {
    const optimal = this.getOptimalTyre(humidity);

    // Slick sur piste mouillée
    if (['SOFT','MEDIUM','HARD'].includes(compound) && humidity > 30) {
      if (humidity <= 50) return 2.5 + humidity * 0.05;
      if (humidity <= 70) return 6.0 + humidity * 0.08;
      return 15.0 + humidity * 0.10; // catastrophique
    }

    // Inter sur piste sèche (lent mais utilisable)
    if (compound === 'INTER' && humidity < 20) {
      return 2.0 + (20 - humidity) * 0.15;
    }

    // Full wet sur piste légèrement mouillée (sous-optimal mais OK)
    if (compound === 'WET' && humidity < 30) {
      return 3.5 + (30 - humidity) * 0.10;
    }

    // Inter dans la bonne fenêtre (30-70%)
    if (compound === 'INTER' && humidity >= 30 && humidity <= 70) return 0;

    // Wet dans la bonne fenêtre (70%+)
    if (compound === 'WET' && humidity >= 70) return 0;

    return 0;
  },

  // ── DÉCISION PIT MÉTÉO (IA) ───────────────────────────────
  // Retourne si l'IA devrait pitter et quel pneu mettre
  shouldPitForWeather(compound, humidity, gridPos=10, lap=1) {
    const optimal  = this.getOptimalTyre(humidity);
    const isSlick  = ['SOFT','MEDIUM','HARD'].includes(compound);
    const isInter  = compound === 'INTER';
    const isWet    = compound === 'WET';

    // Urgence absolue : slick sur piste très mouillée.
    // Important : tester le WET avant l'INTER, sinon une piste à 80%+ repasse en INTER.
    if (isSlick && humidity >= 70) return { pit: true, compound: 'WET',   reason: 'emergency' };
    if (isSlick && humidity > 30)  return { pit: true, compound: 'INTER', reason: 'emergency' };

    // Séchage : inter sur piste qui sèche
    if (isInter && humidity < 25) {
      // Top 5 conservative → attendent que ça sèche complètement
      if (gridPos <= 5 && humidity > 15) return { pit: false };
      return { pit: true, compound: this.pickDryTyre(gridPos), reason: 'drying' };
    }

    // Wet sur piste qui sèche vers inter
    if (isWet && humidity < 55) {
      if (gridPos <= 3 && humidity > 45) return { pit: false };
      return { pit: true, compound: 'INTER', reason: 'drying' };
    }

    // Slick dans la fenêtre à risque (15-30%) → certains gamblent
    if (isSlick && humidity >= 15 && humidity <= 30) {
      const gambleChance = gridPos >= 15 ? 0.7 : gridPos >= 10 ? 0.3 : 0.1;
      if (Math.random() < gambleChance) return { pit: false }; // gamble = rester en slick
      return { pit: true, compound: 'INTER', reason: 'caution' };
    }

    return { pit: false };
  },

  pickDryTyre(gridPos) {
    // Top positions → Medium (stable), fond de grille → Soft (gamble vitesse)
    if (gridPos <= 5)  return Math.random() > 0.3 ? 'MEDIUM' : 'HARD';
    if (gridPos <= 12) return Math.random() > 0.5 ? 'MEDIUM' : 'SOFT';
    return 'SOFT'; // gamble pour remonter
  },

  // ── PRÉVISION MÉTÉO ───────────────────────────────────────
  // Retourne une prévision texte pour l'interface
  getForecast(humidityProfile, currentLap, totalLaps) {
    if (!humidityProfile || !humidityProfile.length) return null;

    const currentHumidity = humidityProfile[currentLap - 1] || 0;
    const remaining       = totalLaps - currentLap;
    const forecast        = { currentHumidity, predictions: [] };

    // Trouver quand la piste va sécher (<30%)
    let dryingLap = null;
    for (let i = currentLap; i < humidityProfile.length; i++) {
      if (humidityProfile[i] < 30 && humidityProfile[i - 1] >= 30) {
        dryingLap = i + 1;
        break;
      }
    }

    // Trouver quand la pluie arrive (>30%)
    let rainLap = null;
    for (let i = currentLap; i < humidityProfile.length; i++) {
      if (humidityProfile[i] > 30 && humidityProfile[i - 1] <= 30) {
        rainLap = i + 1;
        break;
      }
    }

    // Prévision par tranches de 5 tours
    for (let lap = currentLap + 1; lap <= Math.min(currentLap + 20, totalLaps); lap += 5) {
      const h = humidityProfile[lap - 1] || 0;
      const c = this.getTrackCondition(h);
      forecast.predictions.push({ lap, humidity: h, condition: c });
    }

    // Messages clés
    forecast.dryingLap  = dryingLap;
    forecast.rainLap    = rainLap;
    forecast.messages   = [];

    if (dryingLap && dryingLap <= currentLap + 15) {
      const uncertainty = Math.floor(Math.random() * 3) + 1;
      forecast.messages.push({
        type: 'drying',
        icon: '☀️',
        text: `Piste sèche estimée vers le tour ${dryingLap} (±${uncertainty} tours)`,
        color: '#00e676',
      });
      forecast.messages.push({
        type: 'strategy',
        icon: '🎯',
        text: `Fenêtre optimale slick : tours ${dryingLap - 1}–${dryingLap + 3}`,
        color: '#ffd700',
      });
      forecast.messages.push({
        type: 'warning',
        icon: '⚠️',
        text: `Attention : si tout le monde rentre tour ${dryingLap}, les stands seront chargés`,
        color: '#ff9944',
      });
    }

    if (rainLap && rainLap <= currentLap + 10) {
      forecast.messages.push({
        type: 'rain',
        icon: '🌧️',
        text: `Pluie attendue vers le tour ${rainLap}`,
        color: '#88aaff',
      });
    }

    if (currentHumidity > 30 && currentHumidity < 70) {
      forecast.messages.push({
        type: 'inter',
        icon: '🟡',
        text: `Zone inter (${currentHumidity.toFixed(0)}%) — fenêtre cruciale !`,
        color: '#ffcc00',
      });
    }

    return forecast;
  },
};

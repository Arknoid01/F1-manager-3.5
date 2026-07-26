// ============================================================
// F1 Manager — feeder.js
// F3 / F2 simulés, équipe réserve, pipeline académie (FM-style)
// ============================================================

const Feeder = {
  VERSION: 3,
  SCOUT_COST: 0.35,
  SCOUT_GAIN: 28,
  ACADEMY_BUDGET_START: 4,
  ACADEMY_BUDGET_HQ: [0, 1.5, 3, 5, 8],
  INCOMING_LOAN_GP: 4,
  PERF_REWARDS: {
    f2: {
      win: { academy: 0.45, f1: 0.2, junior: 2 },
      podium: { academy: 0.22, f1: 0.1, junior: 1 },
      points: { academy: 0.06, f1: 0, junior: 0.4 },
    },
    f3: {
      win: { academy: 0.2, f1: 0, junior: 1.5 },
      podium: { academy: 0.12, f1: 0, junior: 1 },
      points: { academy: 0.04, f1: 0, junior: 0.3 },
    },
  },
  SEASON_TEAM_REWARDS: {
    f2: { p1: { f1: 2.5, academy: 1.5 }, p3: { f1: 1.2, academy: 0.8 }, p5: { f1: 0, academy: 0.5 } },
    f3: { p1: { f1: 0, academy: 0.8 }, p3: { f1: 0, academy: 0.4 }, p5: { f1: 0, academy: 0.2 } },
  },
  PERSONALITY_LABELS: {
    jeune_loup: 'Jeune loup — valorise les contrats longs',
    ambitieux: 'Ambitieux — veut une équipe compétitive',
    prudent: 'Prudent — sensible à la sécurité du contrat',
    mercenaire: 'Mercenaire — priorité au salaire',
  },
  DEV_PLANS: [
    { id: 'pace', label: 'Vitesse pure', stat: 'pace', icon: '⚡' },
    { id: 'consistency', label: 'Régularité', stat: 'consistency', icon: '🎯' },
    { id: 'wet', label: 'Pluie', stat: 'wetSkill', icon: '🌧️' },
    { id: 'racecraft', label: 'Racecraft', stat: 'consistency', icon: '🏎️', also: 'pace', bonus: 0.5 },
  ],
  F3_ROUNDS: 10,
  F2_ROUNDS: 14,
  POINTS: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  RESERVE_MAX: 2,

  F3_TEAMS: [
    { id: 'prema', name: 'Prema Racing' },
    { id: 'art', name: 'ART Grand Prix' },
    { id: 'trident', name: 'Trident' },
    { id: 'hitech', name: 'Hitech Pulse-Eight' },
    { id: 'campos', name: 'Campos Racing' },
    { id: 'jenzer', name: 'Jenzer Motorsport' },
    { id: 'mp', name: 'MP Motorsport' },
    { id: 'dams', name: 'DAMS' },
    { id: 'charouz', name: 'Charouz Racing' },
    { id: 'academy', name: 'Academy' }, // slot remplacé par l'équipe joueur
  ],

  F2_TEAMS: [
    { id: 'prema', name: 'Prema Racing' },
    { id: 'art', name: 'ART Grand Prix' },
    { id: 'dams', name: 'DAMS' },
    { id: 'hitech', name: 'Hitech Taponen' },
    { id: 'invicta', name: 'Invicta Racing' },
    { id: 'trident', name: 'Trident' },
    { id: 'campos', name: 'Campos Racing' },
    { id: 'djenne', name: 'Djenne Racing' },
    { id: 'var', name: 'Van Amersfoort' },
    { id: 'rodin', name: 'Rodin Motorsport' },
    { id: 'academy', name: 'Academy' },
  ],

  FIRST: ['Oscar', 'Léo', 'Theo', 'Noah', 'Enzo', 'Luca', 'Alex', 'Kimi', 'Gabriel', 'Isack', 'Jak', 'Zane', 'Pepe', 'Sam', 'Oliver', 'Dino', 'Rafael', 'Victor', 'Tim', 'Milan', 'Sacha', 'Ilyes', 'Hugo', 'Ethan', 'Mateo'],
  LAST: ['Martins', 'Bearman', 'Antonelli', 'Bortoleto', 'Hadjar', 'Colapinto', 'Dunne', 'Fittipaldi', 'Maini', 'Verschoor', 'Daruvala', 'Lawson', 'Pourchaire', 'Piastri', 'Leclerc', 'Sato', 'Weber', 'Rossi', 'Tanaka', 'Moreau', 'Costa', 'Brooks', 'King', 'Bernard'],
  FLAGS: ['🇫🇷', '🇬🇧', '🇮🇹', '🇩🇪', '🇪🇸', '🇧🇷', '🇳🇱', '🇧🇪', '🇯🇵', '🇦🇺', '🇺🇸', '🇨🇭', '🇦🇹', '🇩🇰', '🇫🇮'],

  ensure(save) {
    if (!save) return save;
    save.feeder = save.feeder || {};
    const f = save.feeder;
    f.version = f.version || this.VERSION;
    f.f3 = f.f3 || this.emptySeries('f3', save);
    f.f2 = f.f2 || this.emptySeries('f2', save);
    f.reserve = f.reserve || { driverIds: [], maxSlots: this.RESERVE_MAX };
    f.watchlist = Array.isArray(f.watchlist) ? f.watchlist : [];
    f.history = Array.isArray(f.history) ? f.history : [];
    f.scoutReports = f.scoutReports || {};
    f.devPlans = f.devPlans || {};
    f.poachingAlerts = Array.isArray(f.poachingAlerts) ? f.poachingAlerts : [];
    f.loans = Array.isArray(f.loans) ? f.loans : [];
    f.incomingLoans = Array.isArray(f.incomingLoans) ? f.incomingLoans : [];
    f.negotiations = f.negotiations || {};
    if (f.academyBudget == null) f.academyBudget = this.ACADEMY_BUDGET_START;
    f.seasonBonuses = f.seasonBonuses || { academy: 0, f1: 0, junior: 0 };
    f.lastPerformanceBonus = f.lastPerformanceBonus || null;

    const season = save.season || 2025;
    if (f.f3.season !== season || !f.f3.drivers?.length) this.initSeries(save, 'f3');
    if (f.f2.season !== season || !f.f2.drivers?.length) this.initSeries(save, 'f2');

    return save;
  },

  emptySeries(series, save) {
    const rounds = series === 'f3' ? this.F3_ROUNDS : this.F2_ROUNDS;
    return {
      season: save.season || 2025,
      round: 0,
      totalRounds: rounds,
      drivers: [],
      results: [],
      lastRound: null,
    };
  },

  playerAcademyTeamName(save) {
    const team = typeof F1Data !== 'undefined' ? F1Data.teams.find(t => t.id === save.playerTeamId) : null;
    return team ? `${team.shortName || team.name} Academy` : 'Academy Racing';
  },

  getAcademyBoost(save) {
    const lvl = save?.hq?.academy?.level || 0;
    if (!lvl) return 0;
    const bonuses = [0.10, 0.22, 0.38, 0.55];
    return bonuses[Math.min(lvl - 1, bonuses.length - 1)] || 0;
  },

  rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  genDriverId(series) {
    return `${series}_${Date.now()}_${Math.floor(Math.random() * 99999)}`;
  },

  genFeederDriver(series, team, idx, save, overrides = {}) {
    const pot = 62 + Math.floor(Math.random() * 28);
    const base = 58 + Math.floor(pot * 0.15);
    return {
      id: overrides.id || this.genDriverId(series),
      series,
      firstName: overrides.firstName || this.rand(this.FIRST),
      name: overrides.name || this.rand(this.LAST),
      flag: overrides.flag || this.rand(this.FLAGS),
      age: overrides.age ?? (series === 'f3' ? 17 + Math.floor(Math.random() * 3) : 19 + Math.floor(Math.random() * 4)),
      teamId: team.id,
      teamName: team.name,
      pace: Math.min(88, base + Math.floor(Math.random() * 8)),
      consistency: Math.min(88, base - 2 + Math.floor(Math.random() * 10)),
      wetSkill: Math.min(88, base - 4 + Math.floor(Math.random() * 14)),
      potential: overrides.potential ?? pot,
      points: 0,
      wins: 0,
      podiums: 0,
      rounds: 0,
      ownedBy: overrides.ownedBy || null,
      academyJuniorId: overrides.academyJuniorId || null,
      askingFee: overrides.askingFee ?? (series === 'f3' ? 0.8 + Math.random() * 1.2 : 1.5 + Math.random() * 2.5),
      salaryAsk: overrides.salaryAsk ?? (series === 'f3' ? 0.3 + Math.random() * 0.4 : 0.6 + Math.random() * 0.8),
      contractYearsAsk: overrides.contractYearsAsk ?? (2 + Math.floor(Math.random() * 2)),
      personality: overrides.personality || ['jeune_loup', 'ambitieux', 'prudent', 'mercenaire'][Math.floor(Math.random() * 4)],
      scoutLevel: overrides.scoutLevel ?? (overrides.ownedBy ? 100 : 0),
      note: overrides.note || '',
    };
  },

  scoutKey(series, driverId) { return `${series}:${driverId}`; },

  getScoutLevel(save, series, driverId) {
    this.ensure(save);
    const d = save.feeder[series]?.drivers?.find(x => x.id === driverId);
    if (d?.ownedBy === save.playerTeamId) return 100;
    return save.feeder.scoutReports[this.scoutKey(series, driverId)]?.level ?? d?.scoutLevel ?? 0;
  },

  personalityLabel(key) {
    return this.PERSONALITY_LABELS[key] || key || '—';
  },

  replenishAcademyBudget(save) {
    this.ensure(save);
    const hq = save?.hq?.academy?.level || 0;
    const bonus = this.ACADEMY_BUDGET_HQ[Math.min(hq, this.ACADEMY_BUDGET_HQ.length - 1)] || 0;
    const base = this.ACADEMY_BUDGET_START + bonus;
    save.feeder.academyBudget = Math.round((base + (save.feeder.academyBudget || 0) * 0.15) * 10) / 10;
    return save.feeder.academyBudget;
  },

  scoutDriver(save, series, driverId) {
    this.ensure(save);
    const cost = this.SCOUT_COST;
    const budget = save.feeder.academyBudget ?? 0;
    if (budget < cost) {
      return { ok: false, msg: `Budget académie insuffisant (${cost}M€ requis, ${budget.toFixed(1)}M€ dispo).` };
    }
    const key = this.scoutKey(series, driverId);
    const rep = save.feeder.scoutReports[key] || { level: 0 };
    if (rep.level >= 100) return { ok: false, msg: 'Rapport scouting déjà complet.' };
    rep.level = Math.min(100, rep.level + this.SCOUT_GAIN);
    save.feeder.scoutReports[key] = rep;
    save.feeder.academyBudget = Math.round((budget - cost) * 10) / 10;
    Save.save(save);
    return { ok: true, level: rep.level, msg: `Scouting avancé — dossier à ${rep.level}% (−${cost}M€ académie)` };
  },

  visibleStats(save, series, d) {
    const lvl = this.getScoutLevel(save, series, d.id);
    const mask = (v, minLvl) => (lvl >= minLvl ? v : '?');
    return {
      level: lvl,
      pace: mask(d.pace, 40),
      consistency: mask(d.consistency, 55),
      wetSkill: mask(d.wetSkill, 70),
      potential: mask(d.potential, 85),
      personality: lvl >= 95 ? d.personality : null,
      salaryAsk: lvl >= 60 ? d.salaryAsk : '?',
      full: lvl >= 100,
    };
  },

  setDevPlan(save, juniorId, planId) {
    this.ensure(save);
    if (!this.DEV_PLANS.find(p => p.id === planId)) return { ok: false, msg: 'Plan invalide.' };
    save.feeder.devPlans[juniorId] = planId;
    Save.save(save);
    return { ok: true };
  },

  applyDevPlans(save) {
    this.ensure(save);
    const im = save.immersion;
    if (!im?.juniorAcademy) return;
    im.juniorAcademy.forEach(j => {
      if (j.promoted) return;
      const planId = save.feeder.devPlans[j.id];
      if (!planId) return;
      const plan = this.DEV_PLANS.find(p => p.id === planId);
      if (!plan) return;
      const boost = 0.4 + this.getAcademyBoost(save) * 0.3;
      j.progress = Math.min(100, (j.progress || 0) + boost);
      if (j.feederId) {
        const f3d = save.feeder.f3.drivers.find(x => x.id === j.feederId);
        const f2d = save.feeder.f2.drivers.find(x => x.id === j.feederId);
        const fd = f3d || f2d;
        if (fd && plan.stat && fd[plan.stat] != null) {
          fd[plan.stat] = Math.min(92, fd[plan.stat] + (Math.random() < 0.35 ? 1 : 0));
        }
        if (fd && plan.also && fd[plan.also] != null && Math.random() < 0.2) {
          fd[plan.also] = Math.min(92, fd[plan.also] + 1);
        }
      }
    });
  },

  evaluateFeederOffer(save, series, driverId, offer = {}) {
    this.ensure(save);
    const fd = save.feeder[series]?.drivers?.find(x => x.id === driverId);
    if (!fd) return { ok: false, msg: 'Pilote introuvable.' };
    if (fd.ownedBy === save.playerTeamId) return { ok: false, msg: 'Déjà sous contrat avec votre académie.' };

    const fee = Math.max(0, Number(offer.fee) || fd.askingFee || 2);
    const salary = Math.max(0.5, Number(offer.salary) || fd.salaryAsk || 1);
    const years = Math.max(1, Number(offer.years) || fd.contractYearsAsk || 2);
    const scout = this.getScoutLevel(save, series, driverId);
    const pot = fd.potential || 70;
    const pos = this.getStandings(save, series).find(x => x.id === driverId)?.position || 15;

    let chance = 35 + scout * 0.25;
    chance += Math.max(-15, Math.min(20, (fee / (fd.askingFee || 2) - 1) * 30));
    chance += Math.max(-10, Math.min(15, (salary / (fd.salaryAsk || 1) - 1) * 25));
    chance += years >= (fd.contractYearsAsk || 2) ? 6 : -4;
    chance += Math.max(0, (15 - pos) * 1.2);
    chance += (this.getAcademyBoost(save) * 100) * 0.08;

    switch (fd.personality) {
      case 'mercenaire': chance += (salary / (fd.salaryAsk || 1) - 1) * 20; break;
      case 'ambitieux': chance += pos <= 5 ? 8 : -6; break;
      case 'jeune_loup': chance += years >= 3 ? 10 : 0; break;
      case 'prudent': chance += years >= 2 ? 5 : -3; break;
      default: break;
    }
    chance = Math.round(Math.max(8, Math.min(94, chance)));

    return {
      ok: true,
      chance,
      demand: {
        fee: Math.round((fd.askingFee || 2) * 10) / 10,
        salary: Math.round((fd.salaryAsk || 1) * 10) / 10,
        years: fd.contractYearsAsk || 2,
      },
      offer: { fee, salary, years },
      scoutLevel: scout,
    };
  },

  checkRivalInterest(save) {
    this.ensure(save);
    const race = save.race || 0;
    if (race < 2) return;

    ['f3', 'f2'].forEach(series => {
      const owned = (save.feeder[series].drivers || []).filter(d => d.ownedBy === save.playerTeamId);
      owned.forEach(d => {
        if ((d.points || 0) < 12 && (d.podiums || 0) < 1) return;
        if (save.feeder.poachingAlerts.some(a => a.driverId === d.id && a.status === 'pending')) return;
        if (Math.random() > 0.22) return;

        const rivals = F1Data.teams.filter(t => t.id !== save.playerTeamId);
        const rival = rivals[Math.floor(Math.random() * rivals.length)];
        const buyout = Math.round((2 + (d.potential || 70) / 18 + (d.points || 0) / 25) * 10) / 10;

        save.feeder.poachingAlerts.push({
          id: `poach_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          driverId: d.id,
          feederId: d.id,
          series,
          rivalTeamId: rival.id,
          rivalTeamName: rival.name,
          buyout,
          keepCost: Math.round(buyout * 0.55 * 10) / 10,
          deadlineRace: race + 2 + Math.floor(Math.random() * 2),
          status: 'pending',
          createdRace: race,
        });

        if (typeof Immersion !== 'undefined') {
          Immersion.addNews(save, '👀', 'Convoitise rivale',
            `${rival.name} s'intéresse à ${d.firstName} ${d.name} (${series.toUpperCase()}, ${d.points} pts). Répondez depuis l'académie.`,
            'feeder');
        }
      });
    });

    save.feeder.poachingAlerts = save.feeder.poachingAlerts.filter(a => {
      if (a.status !== 'pending') return true;
      if (race > a.deadlineRace) {
        this.executePoaching(save, a.id, 'expired');
        return false;
      }
      return true;
    });
  },

  executePoaching(save, alertId, outcome) {
    const alert = save.feeder.poachingAlerts.find(a => a.id === alertId);
    if (!alert) return { ok: false };

    const s = save.feeder[alert.series];
    const d = s?.drivers?.find(x => x.id === alert.driverId);
    if (!d) { alert.status = 'cancelled'; return { ok: false }; }

    if (outcome === 'accept') {
      save.budget = (save.budget || 0) + alert.buyout;
      s.drivers = s.drivers.filter(x => x.id !== alert.driverId);
      if (d.academyJuniorId && save.immersion?.juniorAcademy) {
        const j = save.immersion.juniorAcademy.find(x => x.id === d.academyJuniorId);
        if (j) { j.note = `Recruté par ${alert.rivalTeamName}.`; j.stage = 'released'; j.feederId = null; }
      }
      if (typeof Immersion !== 'undefined') {
        Immersion.addNews(save, '💸', 'Départ vers rival',
          `${d.firstName} ${d.name} rejoint l'programme ${alert.rivalTeamName} (+${alert.buyout}M€ indemnité).`, 'feeder');
      }
    } else if (outcome === 'expired' && Math.random() < 0.55) {
      s.drivers = s.drivers.filter(x => x.id !== alert.driverId);
      if (typeof Immersion !== 'undefined') {
        Immersion.addNews(save, '😤', 'Talent perdu',
          `${d.firstName} ${d.name} signe chez ${alert.rivalTeamName} — vous n'avez pas répondu à temps.`, 'feeder');
      }
    } else if (outcome === 'keep') {
      if (typeof Immersion !== 'undefined') {
        Immersion.addNews(save, '🔒', 'Talent conservé',
          `${d.firstName} ${d.name} reste dans votre programme feeder.`, 'feeder');
      }
    }
    alert.status = outcome;
    Save.save(save);
    return { ok: true };
  },

  respondPoaching(save, alertId, action) {
    this.ensure(save);
    const alert = save.feeder.poachingAlerts.find(a => a.id === alertId && a.status === 'pending');
    if (!alert) return { ok: false, msg: 'Alerte expirée.' };

    if (action === 'accept') {
      this.executePoaching(save, alertId, 'accept');
      return { ok: true, msg: `Indemnité de ${alert.buyout}M€ encaissée.` };
    }
    if (action === 'keep') {
      if ((save.budget || 0) < alert.keepCost) return { ok: false, msg: `Il faut ${alert.keepCost}M€ pour le garder (prime de fidélité).` };
      save.budget -= alert.keepCost;
      this.executePoaching(save, alertId, 'keep');
      return { ok: true, msg: `${alert.keepCost}M€ — pilote conservé.` };
    }
    if (action === 'decline') {
      alert.status = 'declined';
      if (Math.random() < 0.35) this.executePoaching(save, alertId, 'expired');
      Save.save(save);
      return { ok: true, msg: 'Offre refusée — le pilote pourrait quand même partir.' };
    }
    return { ok: false, msg: 'Action inconnue.' };
  },

  loanReserveToFeeder(save, reserveDriverId, series = 'f2') {
    this.ensure(save);
    if (!save.feeder.reserve.driverIds?.includes(reserveDriverId)) {
      return { ok: false, msg: 'Pilote non réserve.' };
    }
    if (save.feeder.loans.some(l => l.driverId === reserveDriverId && l.active)) {
      return { ok: false, msg: 'Déjà en prêt.' };
    }
    const d = F1Data.drivers.find(x => x.id === reserveDriverId);
    if (!d) return { ok: false, msg: 'Pilote introuvable.' };

    const teams = (series === 'f2' ? this.F2_TEAMS : this.F3_TEAMS).filter(t => t.id !== 'academy' && t.id !== 'player_academy');
    const team = teams[Math.floor(Math.random() * teams.length)];
    const start = save.race || 0;
    const duration = series === 'f2' ? 4 : 3;

    save.feeder.loans.push({
      id: `loan_${reserveDriverId}_${start}`,
      driverId: reserveDriverId,
      series,
      teamName: team.name,
      startRace: start,
      endRace: start + duration,
      active: true,
    });

    save.feeder.reserve.driverIds = save.feeder.reserve.driverIds.filter(x => x !== reserveDriverId);
    d._onLoan = true;
    d._loanTeam = team.name;

    if (typeof Immersion !== 'undefined') {
      Immersion.addNews(save, '🔄', 'Prêt feeder',
        `${d.firstName} ${d.name} prêté à ${team.name} en ${series.toUpperCase()} pour ${duration} GP.`, 'feeder');
    }
    Save.save(save);
    return { ok: true, team: team.name, duration };
  },

  processLoans(save) {
    this.ensure(save);
    const race = save.race || 0;
    save.feeder.loans.filter(l => l.active && race >= l.endRace).forEach(l => {
      l.active = false;
      const d = F1Data.drivers.find(x => x.id === l.driverId);
      if (d) {
        d.pace = Math.min(80, (d.pace || 68) + 1 + Math.floor(Math.random() * 2));
        d.consistency = Math.min(80, (d.consistency || 66) + 1);
        delete d._onLoan;
        delete d._loanTeam;
        const reserveIds = save.feeder.reserve.driverIds || [];
        if (!reserveIds.includes(l.driverId)) reserveIds.push(l.driverId);
        save.feeder.reserve.driverIds = reserveIds;
        if (typeof Immersion !== 'undefined') {
          Immersion.addNews(save, '↩️', 'Fin de prêt',
            `${d.firstName} ${d.name} revient de ${l.teamName} avec de l'expérience (+stats).`, 'feeder');
        }
      }
    });
  },

  getPendingPoaching(save) {
    this.ensure(save);
    return (save.feeder.poachingAlerts || []).filter(a => a.status === 'pending');
  },

  getDriverDossier(save, series, driverId) {
    this.ensure(save);
    const d = save.feeder[series]?.drivers?.find(x => x.id === driverId);
    if (!d) return null;
    const standings = this.getStandings(save, series);
    const row = standings.find(x => x.id === driverId);
    const vis = this.visibleStats(save, series, d);
    const history = (d.roundHistory || []).slice(-8);
    const trend = history.length >= 2
      ? history[history.length - 1].position - history[0].position
      : 0;
    return {
      driver: d,
      series,
      position: row?.position || '—',
      points: d.points || 0,
      wins: d.wins || 0,
      podiums: d.podiums || 0,
      visible: vis,
      personalityLabel: vis.personality ? this.personalityLabel(d.personality) : null,
      roundHistory: history,
      trend,
      owned: d.ownedBy === save.playerTeamId,
    };
  },

  requestIncomingLoan(save, series, driverId) {
    this.ensure(save);
    if (series !== 'f2') return { ok: false, msg: 'Prêt entrant disponible en F2 uniquement.' };
    const reserve = save.feeder.reserve;
    if ((reserve.driverIds || []).length >= (reserve.maxSlots || this.RESERVE_MAX)) {
      return { ok: false, msg: `Maximum ${this.RESERVE_MAX} pilotes réserve.` };
    }
    const s = save.feeder[series];
    const fd = s?.drivers?.find(x => x.id === driverId);
    if (!fd) return { ok: false, msg: 'Pilote introuvable.' };
    if (fd.ownedBy === save.playerTeamId) return { ok: false, msg: 'Déjà dans votre programme.' };
    const scout = this.getScoutLevel(save, series, driverId);
    if (scout < 60) return { ok: false, msg: 'Scoutez ce pilote à 60% minimum avant un prêt entrant.' };
    if ((save.feeder.incomingLoans || []).some(l => l.active && l.feederId === driverId)) {
      return { ok: false, msg: 'Prêt déjà en cours sur ce pilote.' };
    }

    const loanFee = Math.round((0.65 + (fd.potential || 70) / 45) * 10) / 10;
    if ((save.feeder.academyBudget || 0) < loanFee) {
      return { ok: false, msg: `Budget académie insuffisant (${loanFee}M€ requis).` };
    }

    const f1d = this.feederToF1Driver({ ...fd, series }, save);
    f1d.teamId = save.playerTeamId;
    if (typeof F1Data !== 'undefined') F1Data.drivers.push(f1d);
    save.generatedDrivers = save.generatedDrivers || [];
    save.generatedDrivers.push({ ...f1d });

    const endRace = (save.race || 0) + this.INCOMING_LOAN_GP;
    const buyout = Math.round(((fd.askingFee || 2) * 1.35 + (fd.points || 0) / 40) * 10) / 10;

    save.contracts = save.contracts || {};
    save.contracts[f1d.id] = {
      years: 0,
      salary: Math.round((fd.salaryAsk || 0.8) * 10) / 10,
      status: 'loan_in',
      satisfaction: 58,
      loanBuyout: buyout,
      loanEndRace: endRace,
    };
    save.driverStates = save.driverStates || {};
    save.driverStates[f1d.id] = {
      pace: f1d.pace, consistency: f1d.consistency, wetSkill: f1d.wetSkill,
      overtaking: f1d.overtaking, defending: f1d.defending, potential: f1d.potential,
      age: f1d.age, teamId: save.playerTeamId, retired: false,
    };

    reserve.driverIds = [...(reserve.driverIds || []), f1d.id];
    s.drivers = s.drivers.filter(x => x.id !== driverId);
    save.feeder.academyBudget = Math.round(((save.feeder.academyBudget || 0) - loanFee) * 10) / 10;

    save.feeder.incomingLoans.push({
      id: `inloan_${driverId}_${save.race || 0}`,
      driverId: f1d.id,
      feederId: driverId,
      series,
      original: { ...fd },
      startRace: save.race || 0,
      endRace,
      buyout,
      loanFee,
      active: true,
    });

    if (typeof Immersion !== 'undefined') {
      Immersion.addNews(save, '📥', 'Prêt entrant F2',
        `${f1d.firstName} ${f1d.name} rejoint la réserve pour ${this.INCOMING_LOAN_GP} GP (option achat ${buyout}M€).`, 'feeder');
    }
    Save.save(save);
    return { ok: true, driver: f1d, duration: this.INCOMING_LOAN_GP, buyout, fee: loanFee };
  },

  buyIncomingLoan(save, reserveDriverId) {
    this.ensure(save);
    const loan = (save.feeder.incomingLoans || []).find(l => l.active && l.driverId === reserveDriverId);
    if (!loan) return { ok: false, msg: 'Ce n\'est pas un prêt entrant actif.' };
    if ((save.budget || 0) < loan.buyout) return { ok: false, msg: `Budget F1 insuffisant (${loan.buyout}M€ option d\'achat).` };

    save.budget = (save.budget || 0) - loan.buyout;
    save.contracts[reserveDriverId] = {
      ...(save.contracts[reserveDriverId] || {}),
      years: 2,
      status: 'reserve',
      satisfaction: 65,
      signingFee: loan.buyout,
    };
    delete save.contracts[reserveDriverId].loanBuyout;
    delete save.contracts[reserveDriverId].loanEndRace;
    loan.active = false;
    loan.bought = true;

    if (typeof Immersion !== 'undefined') {
      const d = F1Data.drivers.find(x => x.id === reserveDriverId);
      Immersion.addNews(save, '✅', 'Option d\'achat levée',
        `${d?.firstName || ''} ${d?.name || 'Pilote'} reste dans votre réserve (${loan.buyout}M€).`, 'feeder');
    }
    Save.save(save);
    return { ok: true, buyout: loan.buyout };
  },

  processIncomingLoans(save) {
    this.ensure(save);
    const race = save.race || 0;
    (save.feeder.incomingLoans || []).filter(l => l.active && race >= l.endRace).forEach(l => {
      l.active = false;
      const d = F1Data.drivers.find(x => x.id === l.driverId);
      save.feeder.reserve.driverIds = (save.feeder.reserve.driverIds || []).filter(x => x !== l.driverId);
      if (d) {
        d.teamId = 'free_agent';
        if (save.driverStates?.[l.driverId]) save.driverStates[l.driverId].teamId = 'free_agent';
      }
      if (save.contracts?.[l.driverId]) {
        save.contracts[l.driverId].status = 'agent libre';
        save.contracts[l.driverId].years = 0;
      }

      const teams = this.F2_TEAMS.filter(t => t.id !== 'academy');
      const team = teams[Math.floor(Math.random() * teams.length)];
      const restored = this.genFeederDriver('f2', team, 0, save, {
        ...l.original,
        id: l.feederId,
        teamId: team.id,
        teamName: team.name,
        ownedBy: null,
        note: 'Retour après prêt',
      });
      save.feeder.f2.drivers.push(restored);

      if (typeof Immersion !== 'undefined') {
        Immersion.addNews(save, '↩️', 'Fin de prêt entrant',
          `${l.original.firstName} ${l.original.name} retourne en F2 chez ${team.name}. Option non levée.`, 'feeder');
      }
    });
  },

  initSeries(save, series) {
    this.ensure(save);
    const teams = (series === 'f3' ? this.F3_TEAMS : this.F2_TEAMS).map(t => ({ ...t }));
    const academyIdx = teams.findIndex(t => t.id === 'academy');
    const academyName = this.playerAcademyTeamName(save);
    if (academyIdx >= 0) teams[academyIdx] = { id: 'player_academy', name: academyName, player: true };

    const perTeam = series === 'f3' ? 3 : 2;
    const drivers = [];
    teams.forEach(team => {
      for (let i = 0; i < perTeam; i++) {
        drivers.push(this.genFeederDriver(series, team, i, save, {
          ownedBy: team.player ? save.playerTeamId : null,
        }));
      }
    });

    save.feeder[series] = {
      season: save.season || 2025,
      round: 0,
      totalRounds: series === 'f3' ? this.F3_ROUNDS : this.F2_ROUNDS,
      drivers,
      results: [],
      lastRound: null,
    };
    return save.feeder[series];
  },

  getSeries(save, series) {
    this.ensure(save);
    return save.feeder[series];
  },

  getStandings(save, series) {
    const s = this.getSeries(save, series);
    return [...(s.drivers || [])]
      .sort((a, b) => (b.points - a.points) || (b.wins - a.wins) || (a.age - b.age))
      .map((d, i) => ({ ...d, position: i + 1 }));
  },

  getTeamStandings(save, series) {
    this.ensure(save);
    const s = save.feeder[series];
    const byTeam = {};
    (s?.drivers || []).forEach(d => {
      const tid = d.teamId || 'unknown';
      if (!byTeam[tid]) {
        byTeam[tid] = { teamId: tid, teamName: d.teamName, points: 0, wins: 0, player: tid === 'player_academy' };
      }
      byTeam[tid].points += d.points || 0;
      byTeam[tid].wins += d.wins || 0;
    });
    return Object.values(byTeam)
      .sort((a, b) => (b.points - a.points) || (b.wins - a.wins))
      .map((t, i) => ({ ...t, position: i + 1 }));
  },

  roundMoney(n) {
    return Math.round((n || 0) * 10) / 10;
  },

  applyPerformanceBonuses(save, series, roundNum, roundName, top10) {
    this.ensure(save);
    const pid = save.playerTeamId;
    const playerResults = top10
      .map((d, i) => ({ ...d, position: i + 1, pts: this.POINTS[i] || 0 }))
      .filter(d => d.ownedBy === pid);
    if (!playerResults.length) return null;

    const tier = this.PERF_REWARDS[series] || this.PERF_REWARDS.f3;
    const bonus = { academy: 0, f1: 0, junior: 0, highlights: [] };

    playerResults.forEach(r => {
      let slice;
      if (r.position === 1) slice = tier.win;
      else if (r.position <= 3) slice = tier.podium;
      else if (r.pts > 0) slice = tier.points;
      else return;

      bonus.academy += slice.academy;
      bonus.f1 += slice.f1;
      bonus.junior += slice.junior;
      bonus.highlights.push(`${r.firstName} ${r.name} P${r.position}`);
    });

    if (bonus.academy + bonus.f1 + bonus.junior <= 0) return null;

    save.feeder.academyBudget = this.roundMoney((save.feeder.academyBudget || 0) + bonus.academy);
    save.budget = this.roundMoney((save.budget || 0) + bonus.f1);
    save.feeder.seasonBonuses.academy = this.roundMoney((save.feeder.seasonBonuses.academy || 0) + bonus.academy);
    save.feeder.seasonBonuses.f1 = this.roundMoney((save.feeder.seasonBonuses.f1 || 0) + bonus.f1);
    save.feeder.seasonBonuses.junior = this.roundMoney((save.feeder.seasonBonuses.junior || 0) + bonus.junior);

    const im = save.immersion;
    if (im?.juniorAcademy && bonus.junior > 0) {
      im.juniorAcademy.forEach(j => {
        if (j.promoted) return;
        j.progress = Math.min(100, (j.progress || 0) + Math.round(bonus.junior));
      });
    }

    save.feeder.lastPerformanceBonus = {
      series,
      round: roundNum,
      name: roundName,
      academy: bonus.academy,
      f1: bonus.f1,
      junior: bonus.junior,
      highlights: bonus.highlights,
      atRace: save.race || 0,
    };

    if (typeof Immersion !== 'undefined' && (bonus.academy >= 0.1 || bonus.f1 >= 0.05)) {
      const parts = [];
      if (bonus.academy) parts.push(`+${bonus.academy}M€ académie`);
      if (bonus.f1) parts.push(`+${bonus.f1}M€ F1`);
      if (bonus.junior) parts.push(`+${Math.round(bonus.junior)}% juniors`);
      Immersion.addNews(save, series === 'f2' ? '🏎️' : '🏁',
        `${series.toUpperCase()} — Bonus ${this.playerAcademyTeamName(save)}`,
        `${bonus.highlights.join(', ')} · ${parts.join(' · ')}`,
        'feeder');
    }

    return bonus;
  },

  applySeasonFeederBonuses(save, report) {
    this.ensure(save);
    const bonus = { f1: 0, academy: 0, notes: [] };

    ['f3', 'f2'].forEach(series => {
      const teams = this.getTeamStandings(save, series);
      const playerTeam = teams.find(t => t.teamId === 'player_academy');
      if (!playerTeam) return;

      const rewards = this.SEASON_TEAM_REWARDS[series];
      if (playerTeam.position === 1) {
        bonus.f1 += rewards.p1.f1;
        bonus.academy += rewards.p1.academy;
        bonus.notes.push(`${series.toUpperCase()} équipe P1 (${playerTeam.points} pts)`);
      } else if (playerTeam.position <= 3) {
        bonus.f1 += rewards.p3.f1;
        bonus.academy += rewards.p3.academy;
        bonus.notes.push(`${series.toUpperCase()} équipe P${playerTeam.position}`);
      } else if (playerTeam.position <= 5) {
        bonus.f1 += rewards.p5.f1;
        bonus.academy += rewards.p5.academy;
        bonus.notes.push(`${series.toUpperCase()} équipe P${playerTeam.position}`);
      }

      const champ = report[series === 'f2' ? 'f2Champion' : 'f3Champion'];
      if (champ?.ownedBy === save.playerTeamId) {
        if (series === 'f2') {
          bonus.f1 += 1.5;
          bonus.academy += 0.5;
          bonus.notes.push(`Champion pilote F2 : ${champ.firstName} ${champ.name}`);
        } else {
          bonus.academy += 0.35;
          bonus.notes.push(`Champion pilote F3 : ${champ.firstName} ${champ.name}`);
        }
      }
    });

    if (bonus.f1 + bonus.academy <= 0) return bonus;

    save.feeder.academyBudget = this.roundMoney((save.feeder.academyBudget || 0) + bonus.academy);
    save.budget = this.roundMoney((save.budget || 0) + bonus.f1);
    save.feeder.seasonBonuses.academy = this.roundMoney((save.feeder.seasonBonuses.academy || 0) + bonus.academy);
    save.feeder.seasonBonuses.f1 = this.roundMoney((save.feeder.seasonBonuses.f1 || 0) + bonus.f1);

    if (typeof Immersion !== 'undefined') {
      Immersion.addNews(save, '🏆', 'Bilan feeder — primes de saison',
        `${bonus.notes.join(' · ')} → +${bonus.academy}M€ académie${bonus.f1 ? ` · +${bonus.f1}M€ F1` : ''}.`,
        'feeder');
    }

    report.seasonBonus = bonus;
    return bonus;
  },

  getPerformanceSummary(save) {
    this.ensure(save);
    const f2Team = this.getTeamStandings(save, 'f2').find(t => t.teamId === 'player_academy');
    const f3Team = this.getTeamStandings(save, 'f3').find(t => t.teamId === 'player_academy');
    return {
      teamName: this.playerAcademyTeamName(save),
      f2TeamPos: f2Team?.position || null,
      f2TeamPts: f2Team?.points || 0,
      f3TeamPos: f3Team?.position || null,
      f3TeamPts: f3Team?.points || 0,
      seasonBonuses: { ...(save.feeder.seasonBonuses || {}) },
      lastBonus: save.feeder.lastPerformanceBonus || null,
    };
  },

  getReserveDrivers(save) {
    this.ensure(save);
    const ids = save.feeder.reserve.driverIds || [];
    return ids.map(id => {
      const d = typeof F1Data !== 'undefined' ? F1Data.drivers.find(x => x.id === id) : null;
      return d ? { ...d, contract: save.contracts?.[id] } : null;
    }).filter(Boolean);
  },

  simRaceScore(d, weather) {
    let score = (d.pace || 70) * 0.55 + (d.consistency || 68) * 0.25 + (Math.random() - 0.5) * 14;
    if (weather === 'wet' || weather === 'light_rain') score += ((d.wetSkill || 65) - 68) * 0.2;
    if (d.ownedBy) score += 1.2;
    return score;
  },

  simulateRound(save, series) {
    this.ensure(save);
    const s = save.feeder[series];
    if (!s || s.round >= s.totalRounds) return null;

    const weatherRoll = Math.random();
    const weather = weatherRoll > 0.88 ? 'wet' : weatherRoll > 0.72 ? 'light_rain' : 'dry';
    const roundNum = s.round + 1;
    const raceNames = series === 'f3'
      ? ['Bahreïn', 'Barcelone', 'Monaco', 'Spielberg', 'Silverstone', 'Budapest', 'Spa', 'Monza', 'Zandvoort', 'Abu Dhabi']
      : ['Bahreïn', 'Jeddah', 'Melbourne', 'Imola', 'Monaco', 'Barcelone', 'Spielberg', 'Silverstone', 'Hungaroring', 'Spa', 'Monza', 'Zandvoort', 'Suzuka', 'Abu Dhabi'];

    const ranked = [...s.drivers]
      .map(d => ({ ...d, raceScore: this.simRaceScore(d, weather) }))
      .sort((a, b) => b.raceScore - a.raceScore);

    const top10 = ranked.slice(0, 10);
    top10.forEach((d, i) => {
      const drv = s.drivers.find(x => x.id === d.id);
      if (!drv) return;
      const pts = this.POINTS[i] || 0;
      drv.points = (drv.points || 0) + pts;
      drv.rounds = (drv.rounds || 0) + 1;
      if (i === 0) drv.wins = (drv.wins || 0) + 1;
      if (i < 3) drv.podiums = (drv.podiums || 0) + 1;
      drv.roundHistory = drv.roundHistory || [];
      drv.roundHistory.push({
        round: roundNum,
        name: raceNames[(roundNum - 1) % raceNames.length],
        position: i + 1,
        points: pts,
        weather,
      });
      if (drv.roundHistory.length > 16) drv.roundHistory = drv.roundHistory.slice(-16);
    });

    const roundResult = {
      round: roundNum,
      name: raceNames[(roundNum - 1) % raceNames.length],
      weather,
      top3: top10.slice(0, 3).map(d => ({
        id: d.id,
        name: `${d.firstName} ${d.name}`,
        team: d.teamName,
        points: this.POINTS[[0, 1, 2][top10.indexOf(d)] ?? 0],
      })),
    };

    s.results = [...(s.results || []), roundResult].slice(-20);
    s.lastRound = roundResult;
    s.round = roundNum;

    const playerWin = top10.find(d => d.ownedBy === save.playerTeamId);
    if (playerWin && typeof Immersion !== 'undefined') {
      Immersion.addNews(save, series === 'f3' ? '🏁' : '🏎️',
        `${series.toUpperCase()} R${roundNum} — ${roundResult.name}`,
        `${playerWin.firstName} ${playerWin.name} termine P${top10.indexOf(playerWin) + 1} pour ${playerWin.teamName}.`,
        'feeder');
    }

    this.applyPerformanceBonuses(save, series, roundNum, roundResult.name, top10);

    return roundResult;
  },

  afterRace(save) {
    if (!save) return save;
    this.ensure(save);
    this.simulateRound(save, 'f3');
    this.simulateRound(save, 'f2');
    this.checkAutoPromotions(save);
    this.applyDevPlans(save);
    this.checkRivalInterest(save);
    this.processLoans(save);
    this.processIncomingLoans(save);
    Save.save(save);
    return save;
  },

  checkAutoPromotions(save) {
    const im = save.immersion;
    if (!im?.juniorAcademy) return;

    im.juniorAcademy.forEach(j => {
      if (j.promoted || j.feederId) return;
      const paliers = j.paliers || 0;
      if (paliers >= 1 && !j.feederId) {
        this.enrollAcademyJuniorInF3(save, j);
      }
    });
  },

  enrollAcademyJuniorInF3(save, junior) {
    this.ensure(save);
    const s = save.feeder.f3;
    const teamName = this.playerAcademyTeamName(save);
    let slot = s.drivers.find(d => d.teamId === 'player_academy' || d.ownedBy === save.playerTeamId);
    if (!slot) {
      slot = this.genFeederDriver('f3', { id: 'player_academy', name: teamName }, 0, save, {
        firstName: junior.firstName,
        name: junior.name,
        flag: junior.flag,
        age: junior.age || 17,
        potential: junior.potential || 75,
        ownedBy: save.playerTeamId,
        academyJuniorId: junior.id,
        note: 'Produit académie',
      });
      s.drivers.push(slot);
    } else {
      Object.assign(slot, {
        firstName: junior.firstName,
        name: junior.name,
        flag: junior.flag,
        age: junior.age || slot.age,
        potential: Math.max(slot.potential || 70, junior.potential || 75),
        ownedBy: save.playerTeamId,
        academyJuniorId: junior.id,
        teamId: 'player_academy',
        teamName,
      });
    }
    junior.feederId = slot.id;
    junior.stage = 'f3';
    junior.note = `Engagé en F3 avec ${teamName}.`;
    if (typeof Immersion !== 'undefined') {
      Immersion.addNews(save, '🌱', 'Académie → F3',
        `${junior.firstName} ${junior.name} débute en Formule 3 sous vos couleurs.`,
        'feeder');
    }
  },

  promoteF3toF2(save, driverId) {
    this.ensure(save);
    const f3 = save.feeder.f3;
    const d = f3.drivers.find(x => x.id === driverId);
    if (!d) return { ok: false, msg: 'Pilote F3 introuvable.' };

    const f2team = { id: d.ownedBy ? 'player_academy' : this.rand(this.F2_TEAMS.filter(t => t.id !== 'academy')), name: d.ownedBy ? this.playerAcademyTeamName(save) : this.rand(this.F2_TEAMS).name };
    if (f2team.id === 'player_academy' || d.ownedBy) f2team.name = this.playerAcademyTeamName(save);

    const nd = this.genFeederDriver('f2', f2team, 0, save, {
      firstName: d.firstName,
      name: d.name,
      flag: d.flag,
      age: (d.age || 18) + 1,
      potential: d.potential,
      pace: Math.min(90, (d.pace || 70) + 2 + Math.floor(Math.random() * 4)),
      consistency: Math.min(90, (d.consistency || 68) + 1 + Math.floor(Math.random() * 3)),
      wetSkill: d.wetSkill,
      ownedBy: d.ownedBy,
      academyJuniorId: d.academyJuniorId,
      note: 'Promu depuis F3',
    });

    f3.drivers = f3.drivers.filter(x => x.id !== driverId);
    save.feeder.f2.drivers.push(nd);

    if (d.academyJuniorId && save.immersion?.juniorAcademy) {
      const j = save.immersion.juniorAcademy.find(x => x.id === d.academyJuniorId);
      if (j) { j.stage = 'f2'; j.feederId = nd.id; j.note = 'Promu en Formule 2.'; }
    }

    if (typeof Immersion !== 'undefined') {
      Immersion.addNews(save, '📈', 'Promotion F3 → F2', `${d.firstName} ${d.name} monte en Formule 2.`, 'feeder');
    }
    return { ok: true, driver: nd };
  },

  feederToF1Driver(feederDriver, save) {
    const ovr = Math.min(77, Math.round(((feederDriver.pace || 70) + (feederDriver.consistency || 68)) / 2));
    return {
      id: `FD_${feederDriver.id}`,
      firstName: feederDriver.firstName,
      name: feederDriver.name,
      flag: feederDriver.flag || '🏁',
      nationality: feederDriver.flag,
      teamId: 'free_agent',
      number: 10 + Math.floor(Math.random() * 89),
      age: feederDriver.age || 20,
      potential: feederDriver.potential || 80,
      trait: ['aggressive', 'consistent', 'qualifier', 'rain_master', 'prodigy'][Math.floor(Math.random() * 5)],
      retired: false,
      generated: true,
      fromFeeder: true,
      feederSeries: feederDriver.series,
      pace: Math.min(77, feederDriver.pace || 68),
      consistency: Math.min(77, feederDriver.consistency || 66),
      wetSkill: Math.min(77, feederDriver.wetSkill || 64),
      overtaking: Math.min(77, (feederDriver.pace || 68) - 2),
      defending: Math.min(77, (feederDriver.consistency || 66) - 1),
      salary: Math.max(1, Math.min(4, Math.round(ovr * 0.04))),
      contractYears: 0,
      seasons: 0,
    };
  },

  signToReserve(save, feederDriverId, series, offer = null) {
    this.ensure(save);
    const reserve = save.feeder.reserve;
    if ((reserve.driverIds || []).length >= (reserve.maxSlots || this.RESERVE_MAX)) {
      return { ok: false, msg: `Maximum ${this.RESERVE_MAX} pilotes réserve.` };
    }

    const s = save.feeder[series];
    const fd = s?.drivers?.find(x => x.id === feederDriverId);
    if (!fd) return { ok: false, msg: 'Pilote introuvable.' };

    if (fd.ownedBy === save.playerTeamId) {
      return this.promoteFeederOwnedToReserve(save, feederDriverId, series);
    }

    const evalResult = offer
      ? this.evaluateFeederOffer(save, series, feederDriverId, offer)
      : null;
    if (offer && evalResult?.ok && Math.random() * 100 > evalResult.chance) {
      return { ok: false, msg: `Offre refusée (${evalResult.chance}% acceptation). Augmentez fee/salaire.` };
    }

    const fee = Math.round((offer?.fee ?? fd.askingFee ?? 2) * 10) / 10;
    const salary = Math.round((offer?.salary ?? fd.salaryAsk ?? 1) * 10) / 10;
    const years = offer?.years ?? fd.contractYearsAsk ?? 2;

    if ((save.budget || 0) < fee) return { ok: false, msg: `Budget insuffisant (${fee}M€ droits requis).` };

    const f1d = this.feederToF1Driver({ ...fd, series }, save);
    f1d.salary = salary;
    if (typeof F1Data !== 'undefined') F1Data.drivers.push(f1d);
    save.generatedDrivers = save.generatedDrivers || [];
    save.generatedDrivers.push({ ...f1d });

    f1d.teamId = save.playerTeamId;
    save.budget = (save.budget || 0) - fee;
    save.contracts = save.contracts || {};
    save.contracts[f1d.id] = {
      years,
      salary,
      status: 'reserve',
      satisfaction: 62,
      refus: 0,
      cooldownUntilSeason: 0,
      signingFee: fee,
    };

    if (!save.driverStates) save.driverStates = {};
    save.driverStates[f1d.id] = {
      pace: f1d.pace, consistency: f1d.consistency, wetSkill: f1d.wetSkill,
      overtaking: f1d.overtaking, defending: f1d.defending, potential: f1d.potential,
      age: f1d.age, teamId: save.playerTeamId, retired: false, salary,
    };

    reserve.driverIds = [...(reserve.driverIds || []), f1d.id];
    s.drivers = s.drivers.filter(x => x.id !== feederDriverId);

    if (fd.academyJuniorId && save.immersion?.juniorAcademy) {
      const j = save.immersion.juniorAcademy.find(x => x.id === fd.academyJuniorId);
      if (j) { j.stage = 'reserve'; j.driverId = f1d.id; j.promotable = true; j.feederId = null; }
    }

    if (typeof Immersion !== 'undefined') {
      Immersion.addNews(save, '🔵', 'Contrat réserve signé',
        `${f1d.firstName} ${f1d.name} — ${years} ans, ${salary}M€/an, droits ${fee}M€.`, 'feeder');
    }
    Save.save(save);
    return { ok: true, driver: f1d, fee, salary, years };
  },

  promoteFeederOwnedToReserve(save, feederDriverId, series) {
    const s = save.feeder[series];
    const fd = s?.drivers?.find(x => x.id === feederDriverId);
    if (!fd || fd.ownedBy !== save.playerTeamId) return { ok: false, msg: 'Pilote académie introuvable.' };

    const f1d = this.feederToF1Driver({ ...fd, series }, save);
    if (typeof F1Data !== 'undefined') F1Data.drivers.push(f1d);
    save.generatedDrivers = save.generatedDrivers || [];
    save.generatedDrivers.push({ ...f1d });
    f1d.teamId = save.playerTeamId;

    save.contracts = save.contracts || {};
    save.contracts[f1d.id] = { years: 2, salary: f1d.salary, status: 'reserve', satisfaction: 70 };
    save.driverStates = save.driverStates || {};
    save.driverStates[f1d.id] = { ...f1d, teamId: save.playerTeamId, retired: false };

    save.feeder.reserve.driverIds = [...(save.feeder.reserve.driverIds || []), f1d.id];
    s.drivers = s.drivers.filter(x => x.id !== feederDriverId);

    if (fd.academyJuniorId && save.immersion?.juniorAcademy) {
      const j = save.immersion.juniorAcademy.find(x => x.id === fd.academyJuniorId);
      if (j) { j.stage = 'reserve'; j.driverId = f1d.id; j.promotable = true; j.feederId = null; }
    }
    Save.save(save);
    return { ok: true, driver: f1d, fee: 0 };
  },

  promoteReserveToF1(save, driverId, replaceDriverId) {
    this.ensure(save);
    const ids = save.feeder.reserve.driverIds || [];
    if (!ids.includes(driverId)) return { ok: false, msg: 'Ce pilote n\'est pas en réserve.' };

    const d = F1Data.drivers.find(x => x.id === driverId);
    if (!d) return { ok: false, msg: 'Pilote introuvable.' };

    if (typeof Career !== 'undefined' && Career.replacePlayerDriver) {
      const transfer = Career.replacePlayerDriver(save, d, replaceDriverId, {
        salary: d.salary,
        years: 2,
        role: 'pilote2',
      });
      if (!transfer.ok) return transfer;
    } else {
      d.teamId = save.playerTeamId;
    }

    save.feeder.reserve.driverIds = ids.filter(x => x !== driverId);
    save.contracts[driverId] = { ...(save.contracts[driverId] || {}), status: 'pilote2', years: 2 };

    if (typeof Immersion !== 'undefined') {
      Immersion.addNews(save, '🏁', 'Réserve → Titulaire',
        `${d.firstName} ${d.name} est promu pilote titulaire.`, 'promotion');
    }
    Save.save(save);
    return { ok: true, driver: d };
  },

  releaseReserve(save, driverId) {
    this.ensure(save);
    const loan = (save.feeder.incomingLoans || []).find(l => l.active && l.driverId === driverId);
    if (loan) {
      loan.active = false;
      const teams = this.F2_TEAMS.filter(t => t.id !== 'academy');
      const team = teams[Math.floor(Math.random() * teams.length)];
      save.feeder.f2.drivers.push(this.genFeederDriver('f2', team, 0, save, {
        ...loan.original,
        id: loan.feederId,
        teamId: team.id,
        teamName: team.name,
        ownedBy: null,
      }));
    }
    save.feeder.reserve.driverIds = (save.feeder.reserve.driverIds || []).filter(x => x !== driverId);
    const d = F1Data.drivers.find(x => x.id === driverId);
    if (d) {
      d.teamId = 'free_agent';
      save.contracts[driverId] = { ...(save.contracts[driverId] || {}), status: 'agent libre', years: 0 };
      if (save.driverStates?.[driverId]) save.driverStates[driverId].teamId = 'free_agent';
    }
    Save.save(save);
    return { ok: true };
  },

  toggleWatchlist(save, feederDriverId, series) {
    this.ensure(save);
    const key = `${series}:${feederDriverId}`;
    const wl = save.feeder.watchlist;
    const idx = wl.indexOf(key);
    if (idx >= 0) wl.splice(idx, 1);
    else wl.push(key);
    Save.save(save);
    return wl.includes(key);
  },

  isWatched(save, feederDriverId, series) {
    return (save.feeder?.watchlist || []).includes(`${series}:${feederDriverId}`);
  },

  endOfSeason(save) {
    this.ensure(save);
    const report = { f3Champion: null, f2Champion: null };

    const f3Top = this.getStandings(save, 'f3');
    const f2Top = this.getStandings(save, 'f2');
    report.f3Champion = f3Top[0] || null;
    report.f2Champion = f2Top[0] || null;

    const playerTeamId = save.playerTeamId;
    const playerF3 = f3Top.filter(d => d.ownedBy === playerTeamId);
    const playerF2 = f2Top.filter(d => d.ownedBy === playerTeamId);

    this.applySeasonFeederBonuses(save, report);

    const f2TeamStandings = this.getTeamStandings(save, 'f2');
    const f3TeamStandings = this.getTeamStandings(save, 'f3');
    const playerF2Team = f2TeamStandings.find(t => t.teamId === 'player_academy');
    const playerF3Team = f3TeamStandings.find(t => t.teamId === 'player_academy');

    save.feeder.history = save.feeder.history || [];
    save.feeder.history.push({
      season: save.season || 2025,
      f3: {
        champion: report.f3Champion ? {
          name: `${report.f3Champion.firstName} ${report.f3Champion.name}`,
          team: report.f3Champion.teamName,
          points: report.f3Champion.points,
        } : null,
        teamPos: playerF3Team?.position || null,
        teamPts: playerF3Team?.points || 0,
        top10: f3Top.slice(0, 10).map(d => ({
          name: `${d.firstName} ${d.name}`, team: d.teamName, points: d.points, player: d.ownedBy === playerTeamId,
        })),
        playerBest: playerF3[0] ? { name: `${playerF3[0].firstName} ${playerF3[0].name}`, pos: playerF3[0].position, points: playerF3[0].points } : null,
      },
      f2: {
        champion: report.f2Champion ? {
          name: `${report.f2Champion.firstName} ${report.f2Champion.name}`,
          team: report.f2Champion.teamName,
          points: report.f2Champion.points,
        } : null,
        teamPos: playerF2Team?.position || null,
        teamPts: playerF2Team?.points || 0,
        top10: f2Top.slice(0, 10).map(d => ({
          name: `${d.firstName} ${d.name}`, team: d.teamName, points: d.points, player: d.ownedBy === playerTeamId,
        })),
        playerBest: playerF2[0] ? { name: `${playerF2[0].firstName} ${playerF2[0].name}`, pos: playerF2[0].position, points: playerF2[0].points } : null,
      },
      reserveCount: (save.feeder.reserve.driverIds || []).length,
      seasonBonus: report.seasonBonus || null,
    });
    save.feeder.history = save.feeder.history.slice(-12);

    this.initSeries(save, 'f3');
    this.initSeries(save, 'f2');
    save.feeder.poachingAlerts = (save.feeder.poachingAlerts || []).filter(a => a.status === 'pending');
    save.feeder.scoutReports = {};
    save.feeder.seasonBonuses = { academy: 0, f1: 0, junior: 0 };
    save.feeder.lastPerformanceBonus = null;
    this.replenishAcademyBudget(save);

    if (typeof Immersion !== 'undefined') {
      if (report.f3Champion) {
        Immersion.addNews(save, '🏆', `Champion F3 ${save.season}`,
          `${report.f3Champion.firstName} ${report.f3Champion.name} (${report.f3Champion.teamName}) — ${report.f3Champion.points} pts.`, 'feeder');
      }
      if (report.f2Champion) {
        Immersion.addNews(save, '🏆', `Champion F2 ${save.season}`,
          `${report.f2Champion.firstName} ${report.f2Champion.name} (${report.f2Champion.teamName}) — ${report.f2Champion.points} pts.`, 'feeder');
      }
      if (playerF3[0]?.position <= 3 || playerF2[0]?.position <= 3) {
        Immersion.addNews(save, '🌟', 'Bilan feeder joueur',
          `Meilleurs résultats : F3 P${playerF3[0]?.position || '—'} · F2 P${playerF2[0]?.position || '—'}.`, 'feeder');
      }
    }

    Save.save(save);
    return report;
  },

  getPipelineSummary(save) {
    this.ensure(save);
    const im = save.immersion || {};
    const academy = (im.juniorAcademy || []).filter(j => !j.promoted).length;
    const f3owned = (save.feeder.f3.drivers || []).filter(d => d.ownedBy === save.playerTeamId).length;
    const f2owned = (save.feeder.f2.drivers || []).filter(d => d.ownedBy === save.playerTeamId).length;
    const reserve = (save.feeder.reserve.driverIds || []).length;
    const titulaires = typeof F1Data !== 'undefined'
      ? F1Data.drivers.filter(d => d.teamId === save.playerTeamId && !d.retired).length : 0;
    return { academy, f3owned, f2owned, reserve, titulaires };
  },

  fmtPoints(n) { return n ?? 0; },
};

if (typeof window !== 'undefined') window.Feeder = Feeder;

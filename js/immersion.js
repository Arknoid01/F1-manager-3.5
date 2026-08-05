// ============================================================
// F1 Manager — immersion.js
// Couche narrative SAFE : ne modifie pas le moteur de course.
// Alimente : paddock news, réputation, moral, historique, records,
// interviews, sponsors vivants et académie junior.
// ============================================================

const Immersion = {
  ensure(save){
    if(!save) return save;
    save.immersion = save.immersion || {};
    const im = save.immersion;
    im.version = im.version || 1;
    im.paddockNews = Array.isArray(im.paddockNews) ? im.paddockNews : [];
    im.interviews = Array.isArray(im.interviews) ? im.interviews : [];
    im.gpHistory = Array.isArray(im.gpHistory) ? im.gpHistory : [];
    im.records = im.records || { wins:{}, podiums:{}, points:{}, poles:{}, bestResults:{}, teamWins:{}, teamPodiums:{} };
    // Extraire la réputation selon son format (objet ou nombre)
    const repBase = typeof save.reputation === 'object'
      ? Math.round(((save.reputation.sport||50) + (save.reputation.media||50) + (save.reputation.tech||50)) / 3)
      : (save.reputation || 50);
    im.teamReputation = im.teamReputation || { value: repBase, tags: [] };
    im.driverMorale = im.driverMorale || {};
    im.staffMorale = im.staffMorale || { value: 60, note:'Ambiance stable dans le garage.' };
    im.sponsorMood = im.sponsorMood || { value: 60, note:'Les partenaires attendent des résultats réguliers.' };
    if (!Array.isArray(im.juniorAcademy) || im.juniorAcademy.length === 0) {
      im.juniorAcademy = this.defaultJuniors(save);
    }
    im.seasonStory = im.seasonStory || [];
    im.moodEffects = im.moodEffects || { sponsorPenaltyActive: false, staffStrategyRisk: false };
    im.lastGpChoice = im.lastGpChoice || null;
    // Rivalité saison (1× par saison)
    if (!im.seasonRivals || im.seasonRivals.setAtSeason !== (save.season || 2025)) {
      this.initSeasonRivals(save);
    }
    return save;
  },

  defaultJuniors(save){
    // Génération aléatoire à chaque nouvelle partie — 3 juniors de départ
    const juniors = [];
    for(let i = 0; i < 3; i++){
      juniors.push(this.generateNewJunior(save, i));
    }
    return juniors;
  },

  driverName(r){ return r?.driverName || [r?.driver?.firstName, r?.driver?.name].filter(Boolean).join(' ') || 'Pilote'; },
  teamName(r){ return r?.teamName || r?.team?.name || 'Équipe'; },
  esc(s){ return String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },

  afterRace(save, gp){
    if(!save || !gp) return save;
    this.ensure(save);
    const im = save.immersion;
    const key = `${gp.season || save.season}-${gp.raceNumber || save.race}-${gp.circuitId || gp.circuitName}`;
    if(im.lastProcessedGpKey === key) return save; // évite les doublons si la page résultat est rouverte
    im.lastProcessedGpKey = key;

    const results = Array.isArray(gp.results) ? gp.results : [];
    const winner = results[0] || gp.winner;
    const podium = results.slice(0,3);
    const player = Array.isArray(gp.playerResults) ? gp.playerResults : [];
    const bestPlayer = player.slice().sort((a,b)=>(a.position||99)-(b.position||99))[0];
    const teamPts = Number(gp.teamPoints || 0);
    const dnf = results.filter(r=>r.status==='dnf');
    const sc = Number(gp.safetyCarLaps || 0);
    const wet = /pluie|humide/i.test(gp.weather || '');

    im.gpHistory.push({
      key, season: gp.season || save.season, raceNumber: gp.raceNumber || save.race || 0,
      circuitName: gp.circuitName || 'Grand Prix', date: gp.date || new Date().toISOString(),
      winner: winner ? this.driverName(winner) : '—', winnerTeam: winner ? this.teamName(winner) : '—',
      podium: podium.map(r=>this.driverName(r)), playerBest: bestPlayer?.position || null,
      teamPoints: teamPts, weather: gp.weather || '—', safetyCarLaps: sc, dnf: dnf.length
    });
    im.gpHistory = im.gpHistory.slice(-80);

    this.updateRecords(im, results);
    this.updateMoraleAndReputation(save, gp, results, player, teamPts);
    this.applyMoodEffects(save);
    this.generatePaddockNews(save, gp, results, player, teamPts, dnf, sc, wet);
    this.maybeRivalPaddockNews(save, gp, player, bestPlayer);
    this.generateInterview(save, gp, results, player, teamPts, dnf, sc, wet);
    this.pushSeasonStory(save, gp, bestPlayer, teamPts, im.teamReputation.tags);
    this.progressJuniors(save);
    if (typeof Feeder !== 'undefined' && Feeder.afterRace) {
      const feederReport = Feeder.afterRace(save, gp);
      if (feederReport && gp && !gp.feeder) gp.feeder = feederReport;
    }
    return save;
  },

  updateRecords(im, results){
    results.forEach(r=>{
      const id = r.driver?.id || r.driverId || r.driverName;
      if(!id) return;
      const name = this.driverName(r);
      im.records.points[id] = { name, value:(im.records.points[id]?.value||0)+(r.points||0) };
      if(r.position===1) im.records.wins[id] = { name, value:(im.records.wins[id]?.value||0)+1 };
      if(r.position<=3) im.records.podiums[id] = { name, value:(im.records.podiums[id]?.value||0)+1 };
      const prev = im.records.bestResults[id];
      if(!prev || r.position < prev.value) im.records.bestResults[id] = { name, value:r.position };
      const tid = r.team?.id || r.teamId || r.teamName;
      if(tid && r.position===1) im.records.teamWins[tid] = { name:this.teamName(r), value:(im.records.teamWins[tid]?.value||0)+1 };
      if(tid && r.position<=3) im.records.teamPodiums[tid] = { name:this.teamName(r), value:(im.records.teamPodiums[tid]?.value||0)+1 };
    });
  },

  updateMoraleAndReputation(save, gp, results, player, teamPts){
    const im = save.immersion;
    const best = player.slice().sort((a,b)=>(a.position||99)-(b.position||99))[0];
    const rep = im.teamReputation;
    let delta = 0;
    if(teamPts>=20) delta += 5; else if(teamPts>=10) delta += 3; else if(teamPts>0) delta += 1; else delta -= 2;
    if(best?.position<=3) delta += 3;
    if(player.some(r=>r.status==='dnf')) delta -= 3;
    rep.value = Math.max(0, Math.min(100, Math.round((rep.value ?? save.reputation ?? 50) + delta)));
    const tags=[];
    const avgPos = player.length ? player.reduce((s,r)=>s+(r.position||20),0)/player.length : 20;
    if(teamPts>=15) tags.push('Équipe en forme');
    if(best?.position<=3) tags.push('Candidate au podium');
    if(player.some(r=>r.pitStops?.length>=2)) tags.push('Stratégie agressive');
    if(player.some(r=>r.status==='dnf')) tags.push('Fiabilité sous surveillance');
    if(avgPos>12) tags.push('Week-end difficile');
    rep.tags = tags.length ? tags : ['Projet stable'];

    player.forEach(r=>{
      const id = r.driver?.id || r.driverId || r.driverName;
      const base = im.driverMorale[id]?.value ?? 60;
      let md = 0;
      if(r.position<=3) md+=8; else if(r.position<=6) md+=5; else if(r.points>0) md+=2; else md-=2;
      if(r.status==='dnf') md-=8;
      im.driverMorale[id] = { name:this.driverName(r), value:Math.max(5,Math.min(100,base+md)), note:this.moraleNote(base+md, r) };
    });

    const staffBase = im.staffMorale.value ?? 60;
    im.staffMorale.value = Math.max(0, Math.min(100, staffBase + (teamPts>=10?3:teamPts>0?1:-1)));
    im.staffMorale.note = teamPts>=10 ? 'Le garage croit au projet après ce résultat.' : teamPts>0 ? 'Le staff reste positif, mais veut plus.' : 'Le staff veut comprendre où le week-end a été perdu.';

    const spBase = im.sponsorMood.value ?? 60;
    const moodDelta = teamPts>=10 ? 4 : teamPts>0 ? 1 : -3;
    im.sponsorMood.value = Math.max(0, Math.min(100, spBase + moodDelta));
    im.sponsorMood.note = teamPts>=10 ? 'Les sponsors sont très satisfaits de la visibilité.' : teamPts>0 ? 'Les sponsors valident le résultat, sans euphorie.' : 'Les sponsors attendent une réaction au prochain GP.';
  },

  moraleNote(v,r){
    if(r.status==='dnf') return 'Frustré par l’abandon.';
    if(r.position<=3) return 'Très motivé après le podium.';
    if(r.position<=6) return 'Confiant, le rythme était là.';
    if(r.points>0) return 'Satisfait d’avoir marqué des points.';
    return 'A besoin d’un meilleur week-end.';
  },

  addNews(save, icon, title, text, type='paddock'){
    this.ensure(save);
    const item = { icon, title, text, type, date:new Date().toISOString(), season:save.season, race:save.race };
    save.immersion.paddockNews.push(item);
    save.immersion.paddockNews = save.immersion.paddockNews.slice(-60);
    save.news = Array.isArray(save.news) ? save.news : [];
    save.news.push({ icon, title, text, date:item.date, type });
    save.news = save.news.slice(-80);
  },

  generatePaddockNews(save,gp,results,player,teamPts,dnf,sc,wet){
    const winner = results[0] || gp.winner;
    const best = player.slice().sort((a,b)=>(a.position||99)-(b.position||99))[0];
    this.addNews(save,'📰',`Paddock — ${gp.circuitName || 'Grand Prix'}`,`${this.driverName(winner)} s’impose pour ${this.teamName(winner)}. ${teamPts>0?`Votre équipe repart avec ${teamPts} point${teamPts>1?'s':''}.`:'Votre équipe quitte le circuit sans point.'}`);
    if(best){
      if(best.position<=3) this.addNews(save,'🏆','Réaction paddock',`${this.driverName(best)} offre un podium qui change le regard du paddock sur votre projet.`,'reaction');
      else if(best.points>0) this.addNews(save,'✅','Objectif points atteint',`${this.driverName(best)} termine P${best.position}. Résultat solide pour la dynamique de l’équipe.`,'reaction');
      else this.addNews(save,'⚠️','Week-end à analyser',`Meilleur résultat P${best.position}. Le board attend une réponse dès le prochain Grand Prix.`,'reaction');
    }
    if(sc>0) this.addNews(save,'🚨','Course neutralisée',`La Safety Car a pesé sur le rythme du GP pendant ${sc} tour${sc>1?'s':''}. Les stratèges en parlent encore.`,'fia');
    if(dnf.length) this.addNews(save,'💥','Abandons en course',`${dnf.length} abandon${dnf.length>1?'s':''} recensé${dnf.length>1?'s':''}. ${this.driverName(dnf[0])} fait partie des pilotes piégés.`,'fia');
    if(wet) this.addNews(save,'🌧️','Météo sous surveillance',`Les conditions humides ont rendu les choix pneus plus tendus que prévu.`,'weather');
    const rep = save.immersion.teamReputation;
    if(rep.value>=75) this.addNews(save,'📈','Réputation en hausse',`Le paddock commence à considérer votre équipe comme une menace sérieuse.`,'reputation');
    if(save.immersion.sponsorMood.value<45) this.addNews(save,'💼','Sponsors exigeants',`Les partenaires veulent plus de visibilité et surveilleront le prochain week-end.`,'sponsor');
  },

  generateInterview(save,gp,results,player,teamPts,dnf,sc,wet){
    this.ensure(save);
    const best = player.slice().sort((a,b)=>(a.position||99)-(b.position||99))[0];
    const q = best?.position<=3 ? 'Un podium qui confirme le potentiel de l’équipe.' : teamPts>0 ? 'Des points importants pour le championnat.' : 'Un week-end difficile mais riche en enseignements.';
    const _dn = best ? this.driverName(best) : 'Team Principal';
    const _gp = save.race || 0;
    const _qi = _gp % 8;
    const _dqDnf  = [`« On avait le rythme, mais la course nous a echappé. »`,`« La mécanique a lâché. On reviendra plus forts. »`,`« C'est frustrant. On ne peut rien faire quand ça casse. »`,`« J'étais en bonne position avant l'abandon. On doit comprendre. »`,`« Pas les mots ce soir. On en reparle demain. »`,`« Ça fait partie du sport. La réponse viendra au prochain GP. »`,`« Les sensations étaient bonnes jusqu'au problème. C'est ça le plus dur. »`,`« On avait une stratégie claire. Dommage de ne pas avoir pu l'exécuter. »`];
    const _dqPod  = [`« La voiture était incroyable, on a maximisé chaque opportunité. »`,`« Ce résultat se construit GP après GP. L'équipe le mérite autant que moi. »`,`« Je savais qu'on avait le rythme. La stratégie était parfaite. »`,`« Incroyable journée. C'est pour ça qu'on fait ce sport. »`,`« Je ne pouvais pas rêver mieux. La voiture était à son meilleur. »`,`« Ce podium appartient à tout le garage, pas seulement à moi. »`,`« On a dû se battre jusqu'au bout. C'est le plus beau des podiums. »`,`« La stratégie était audacieuse mais elle a payé. Merci à toute l'équipe. »`];
    const _dqPts  = [`« Ce n'est pas spectaculaire, mais ces points comptent. »`,`« On a fait le maximum avec ce qu'on avait. On progresse. »`,`« Points marqués, voiture dans le garage. C'est le minimum qu'on se devait. »`,`« Une course propre, sans prise de risque inutile. On a exécuté le plan. »`,`« Je suis satisfait. Ce n'est pas le top mais on a fait notre travail. »`,`« Ces points peuvent compter gros en fin de saison. »`,`« On a géré. Pas d'erreur, pas d'aventure. C'est ce qu'on voulait. »`,`« Chaque unité compte. On repart avec des points précieux. »`];
    const _dqHard = [`« Il faut comprendre pourquoi nous manquions de rythme. »`,`« Ce n'est pas le week-end qu'on espérait. On doit retravailler. »`,`« Difficile d'expliquer. On va analyser et revenir. »`,`« Je n'avais pas les sensations. La voiture ne répondait pas. »`,`« Un week-end à oublier, mais une leçon à retenir. »`,`« On a manqué de rythme et ça s'est vu. On va bosser. »`,`« Je comprends ce qui n'a pas marché. On corrige. »`,`« C'est frustrant. Il va falloir tout revoir. »`];
    const _dq = best ? (best.status==='dnf' ? _dqDnf[_qi] : best.position<=3 ? _dqPod[_qi] : best.points>0 ? _dqPts[_qi] : _dqHard[_qi]) : `« On va analyser et revenir plus forts. »`;
    const driverQuote = `${_dq} — ${_dn}`;
    const _pGood = [`« Le garage a exécuté un week-end très propre. »`,`« L'équipe a répondu présent quand ça comptait. »`,`« On ne pouvait pas demander mieux à tout le monde. »`,`« Un week-end dont on peut être fiers collectivement. »`,`« La préparation paie. On recommence comme ça. »`];
    const _pOk   = [`« On prend les points, mais on sait qu'il reste du travail. »`,`« Ce n'est pas notre meilleur week-end mais on ne repart pas bredouilles. »`,`« On exécute, on progresse. Le prochain GP sera mieux. »`,`« Points pris, leçons tirées. On repart avec un objectif clair. »`,`« On s'est battus pour chaque point. L'équipe a tout donné. »`];
    const _pBad  = [`« Ce résultat ne reflète pas nos ambitions. »`,`« On doit faire mieux. Tout le monde le sait. »`,`« Un week-end difficile mais on ne baisse pas les bras. »`,`« On va comprendre et on repart plus forts. »`,`« Ce n'est pas acceptable de notre part. On va réagir. »`];
    const _pi = _gp % 5;
    const principal = (teamPts>=10 ? _pGood[_pi] : teamPts>0 ? _pOk[_pi] : _pBad[_pi]) + ' — Team Principal';
    save.immersion.interviews.push({
      date:new Date().toISOString(), season:gp.season||save.season,
      raceNumber: gp.raceNumber ?? save.race ?? 0,
      circuitName:gp.circuitName||'Grand Prix',
      headline:q, quotes:[principal, driverQuote], context:{teamPts, safetyCarLaps:sc, wet, dnf:dnf.length}
    });
    save.immersion.interviews = save.immersion.interviews.slice(-30);
  },

  // ══════════════════════════════════════════════════════════
  //  SYSTÈME ACADÉMIE JUNIOR — étapes 1 à 6
  // ══════════════════════════════════════════════════════════

  JUNIOR_TRAITS: [
    { id:'rain',       label:'Très rapide sous pluie',     icon:'🌧️', stat:'wetSkill',    bonus:+8 },
    { id:'aggressive', label:'Agressif',                   icon:'🔥', stat:'overtaking',  bonus:+6 },
    { id:'tyres',      label:'Mauvaise gestion pneus',     icon:'⚠️', stat:'consistency', bonus:-5 },
    { id:'quali',      label:'Excellent en qualif',        icon:'⚡', stat:'pace',        bonus:+6 },
    { id:'consistent', label:'Régulier',                   icon:'🎯', stat:'consistency', bonus:+7 },
    { id:'smart',      label:'Intelligent tactiquement',   icon:'🧠', stat:'defending',   bonus:+5 },
    { id:'pressure',   label:'Fort sous pression',         icon:'💪', stat:'consistency', bonus:+5 },
    { id:'rookie',     label:'Inexpérimenté en F1',        icon:'😬', stat:'overtaking',  bonus:-4 },
    { id:'marketing',  label:'Gros potentiel marketing',   icon:'📸', stat:null,          bonus:0  },
    { id:'fragile',    label:'Parfois tête brûlée',        icon:'💥', stat:'consistency', bonus:-3 },
  ],

  PADDOCK_BUZZ: [
    n => `Mercedes surveille votre junior ${n}.`,
    n => `Red Bull s'intéresse de près à ${n}.`,
    n => `Les médias parlent de ${n} comme futur crack.`,
    n => `${n} épate les ingénieurs lors des tests.`,
    n => `La presse classe ${n} parmi les meilleurs espoirs.`,
    n => `Ferrari serait prête à faire une offre pour ${n}.`,
    n => `${n} impressionne en F2 — les équipes top se réveillent.`,
  ],

  generateJuniorProfile(j, save){
    const base = 62 + Math.round((j.potential||75) * 0.12);
    const ovr = Math.min(77, base + Math.floor(Math.random()*8));
    const shuffled = [...this.JUNIOR_TRAITS].sort(()=>Math.random()-0.5);
    const traits = shuffled.slice(0, 2 + Math.floor(Math.random()*2));
    const stats = {
      pace:        Math.min(j.potential, Math.max(55, base + (Math.random()>0.5?3:-2))),
      consistency: Math.min(j.potential, Math.max(52, base + (Math.random()>0.5?2:-3))),
      wetSkill:    Math.min(j.potential, Math.max(50, base + (Math.random()>0.5?4:-1))),
      overtaking:  Math.min(j.potential, Math.max(50, base + (Math.random()>0.5?3:-2))),
      defending:   Math.min(j.potential, Math.max(50, base + (Math.random()>0.5?2:-2))),
    };
    traits.forEach(t=>{ if(t.stat && stats[t.stat]!==undefined) stats[t.stat]=Math.max(40,Math.min(j.potential,stats[t.stat]+t.bonus)); });
    // Équilibrage academy : un rookie sort talentueux mais jamais déjà élite.
    // Peu importe sa progression, son niveau actuel est plafonné à 77.
    Object.keys(stats).forEach(k=>{ stats[k] = Math.min(77, Math.round(stats[k] || 60)); });
    return { ovr, stats, traits: traits.map(t=>t.id) };
  },

  progressJuniors(save){
    this.ensure(save);
    const im = save.immersion;
    im.juniorAcademy.forEach(j=>{
      const boost = typeof Feeder !== 'undefined' ? Feeder.getAcademyBoost(save) : 0;
      const base = 1 + Math.floor(Math.random()*3);
      const prev = j.progress||0;
      j.progress = Math.min(100, prev + Math.round(base * (1 + boost)));
      j.age = j.age || 17;

      if(j.progress >= 100 && prev < 100){
        j.potential = Math.min(99,(j.potential||70)+1);
        j.progress = 30;
        j.paliers = (j.paliers||0) + 1;
        j.note = ['Franchit un cap décisif en F2.','Meilleur temps aux tests de Jerez.','Sa régularité impressionne les recruteurs.'][Math.floor(Math.random()*3)];
      }

      const paliers = j.paliers||0;
      const wasPromotable = j.promotable;
      j.promotable = !j.promoted && (paliers >= 3 || (j.potential||70) >= 88);

      if(j.promotable && !wasPromotable && !j.profile){
        j.profile = this.generateJuniorProfile(j, save);
        j.stage = 'reserve';
        const fn = `${j.firstName} ${j.name}`;
        const buzz = this.PADDOCK_BUZZ[Math.floor(Math.random()*this.PADDOCK_BUZZ.length)](fn);
        this.addNews(save,'🌟',`Académie — ${fn} promouvable`, buzz);
      }

      if(!j.promotable && Math.random()<0.18){
        const fn = `${j.firstName} ${j.name}`;
        const buzzes = [
          `${fn} signe un hat-trick de poles en Formule 3.`,
          `${fn} marque les esprits avec une remontée spectaculaire.`,
          `L'académie note des progrès constants chez ${fn}.`,
        ];
        this.addNews(save,'🌱','Académie — Progression', buzzes[Math.floor(Math.random()*buzzes.length)]);
      }
    });

    if((save.race||0) > 4){
      const promotables = im.juniorAcademy.filter(j=>j.promotable && !j.promoted);
      if(promotables.length && Math.random()<0.25){
        const j = promotables[Math.floor(Math.random()*promotables.length)];
        const msg = this.PADDOCK_BUZZ[Math.floor(Math.random()*this.PADDOCK_BUZZ.length)](`${j.firstName} ${j.name}`);
        this.addNews(save,'👀','Intérêt extérieur — paddock', msg);
      }
    }

    // Évolution des juniors déjà promus
    this.evolvePromotedJuniors(save);
  },

  FP_PER_SEASON: 2,   // max de sessions EL par saison pour un junior

  juniorFP(save, juniorId, session='fp1'){
    this.ensure(save);
    const im = save.immersion;
    const j = im.juniorAcademy.find(x=>x.id===juniorId);
    if(!j || !j.promotable) return { ok:false, msg:'Ce junior n\'est pas encore promouvable.' };
    if(j.promoted) return { ok:false, msg:'Ce pilote est déjà titulaire.' };

    // Limite : 2 sessions EL par saison
    const currentSeason = save.season || 2025;
    if((j.fpSeasonYear||0) !== currentSeason){
      j.fpSeasonYear  = currentSeason;
      j.fpSeasonCount = 0;
    }
    if((j.fpSeasonCount||0) >= this.FP_PER_SEASON){
      return { ok:false, msg:`Ce junior a déjà utilisé ses ${this.FP_PER_SEASON} sessions EL pour la saison ${currentSeason}. Attendez la prochaine saison.` };
    }
    j.fpSeasonCount = (j.fpSeasonCount||0) + 1;
    j.fpSessions    = (j.fpSessions||0) + 1;  // total historique

    // Résultat narratif — pas d'amélioration de stats (la progression vient des GP)
    const crash   = Math.random() < 0.08;
    const t       = (Math.random()*1.2-0.6);
    const timeStr = (t>=0?'+':'')+t.toFixed(3)+'s';
    const repGain = crash ? -2 : (t<0 ? 5 : 2);
    if(im.teamReputation) im.teamReputation.value = Math.max(0,Math.min(100,(im.teamReputation.value||50)+repGain));

    const fn       = `${j.firstName} ${j.name}`;
    const lbl      = { fp1:'EL1', fp2:'EL2', rookie:'Session rookie' }[session]||session.toUpperCase();
    const sessLeft = this.FP_PER_SEASON - j.fpSeasonCount;
    let title, text;
    if(crash){
      title = `${fn} accroche lors des ${lbl}`;
      text  = `Erreur de jeunesse. Voiture endommagée, pilote indemne. ${sessLeft > 0 ? `Il reste ${sessLeft} session${sessLeft>1?'s':''} EL cette saison.` : 'Quota EL de la saison épuisé.'}`;
    } else if(t<-0.2){
      title = `${fn} impressionne aux ${lbl}`;
      text  = `${timeStr} vs leader. L'ingénieur de piste est enthousiaste. ${sessLeft > 0 ? `Il reste ${sessLeft} session${sessLeft>1?'s':''} EL cette saison.` : 'Quota EL de la saison épuisé.'}`;
    } else {
      title = `${fn} — ${lbl} terminés`;
      text  = `${timeStr} vs leader. Session correcte, données récupérées. ${sessLeft > 0 ? `Il reste ${sessLeft} session${sessLeft>1?'s':''} EL cette saison.` : 'Quota EL de la saison épuisé.'}`;
    }
    this.addNews(save, crash?'💥':'🏎️', title, text, 'junior');
    Save.save(save);
    return { ok:true, crash, timeStr, repGain, session:lbl, sessionsLeft:sessLeft };
  },

  promoteJunior(save, juniorId, replaceDriverId=null){
    this.ensure(save);
    const im = save.immersion;
    const j = im.juniorAcademy.find(x=>x.id===juniorId);
    if(!j || !j.promotable) return { ok:false, msg:'Ce junior n\'est pas promouvable.' };
    if(j.promoted) return { ok:false, msg:'Déjà promu.' };
    if(typeof F1Data === 'undefined') return { ok:false, msg:'Données pilotes indisponibles.' };

    const stats = j.profile?.stats || {};
    const ovr = Math.min(77, Math.round(j.profile?.ovr || 68));
    const rookieSalary = Math.max(1, Math.min(3, Math.round(ovr * 0.035)));
    const newDriver = {
      id:`JR_${j.id}`, name:j.name, firstName:j.firstName, nationality:j.flag,
      flag: j.flag || '🏁',
      teamId:'free_agent', number:10+Math.floor(Math.random()*89),
      age:j.age||18, potential:j.potential||80, trait:j.profile?.traits?.[0]||'prodigy',
      retired:false, generated:true, fromAcademy:true,
      pace:Math.min(77, stats.pace||68), consistency:Math.min(77, stats.consistency||65),
      wetSkill:Math.min(77, stats.wetSkill||65), overtaking:Math.min(77, stats.overtaking||63),
      defending:Math.min(77, stats.defending||62),
      salary:rookieSalary, contractYears:2, seasons:0,
    };

    F1Data.drivers.push(newDriver);
    save.generatedDrivers = Array.isArray(save.generatedDrivers) ? save.generatedDrivers : [];
    // Eviter les doublons
    if (!save.generatedDrivers.find(d => d.id === newDriver.id)) {
      save.generatedDrivers.push({...newDriver});
    } else {
      const gi = save.generatedDrivers.findIndex(d => d.id === newDriver.id);
      save.generatedDrivers[gi] = {...newDriver};
    }
    save.contracts = save.contracts || {};

    let transfer = { ok:true, replaced:null };
    if(typeof Career !== 'undefined' && Career.replacePlayerDriver){
      transfer = Career.replacePlayerDriver(save, newDriver, replaceDriverId, { salary:rookieSalary, years:2, role:'pilote2' });
      if(!transfer.ok){
        // Annule l'ajout au marché si le joueur n'a pas encore choisi le siège.
        F1Data.drivers = F1Data.drivers.filter(d=>d.id!==newDriver.id);
        save.generatedDrivers = save.generatedDrivers.filter(d=>d.id!==newDriver.id);
        return transfer;
      }
    } else {
      newDriver.teamId = save.playerTeamId;
      save.contracts[newDriver.id] = { years:2, salary:rookieSalary, status:'pilote2', satisfaction:65 };
    }

    j.promoted=true; j.promotedSeason=save.season||2025; j.driverId=newDriver.id; j.stage='f1';

    // Synchroniser APRES que replacePlayerDriver a assigné le bon teamId
    const _syncTeamId = newDriver.teamId || save.playerTeamId;
    // generatedDrivers
    const gdIdx = save.generatedDrivers.findIndex(d => d.id === newDriver.id);
    if (gdIdx >= 0) {
      save.generatedDrivers[gdIdx].teamId = _syncTeamId;
      save.generatedDrivers[gdIdx].flag   = newDriver.flag || j.flag || '🏁';
    }
    // driverStates
    if (!save.driverStates) save.driverStates = {};
    save.driverStates[newDriver.id] = {
      pace: newDriver.pace, consistency: newDriver.consistency,
      wetSkill: newDriver.wetSkill, overtaking: newDriver.overtaking,
      defending: newDriver.defending, potential: newDriver.potential,
      age: newDriver.age, teamId: _syncTeamId, retired: false,
      salary: newDriver.salary, flag: newDriver.flag || j.flag || '🏁',
    };
    const fn=`${j.firstName} ${j.name}`;
    const promoNewsId = `promo_${newDriver.id}_${save.season||2025}`;
    if (!(save.news||[]).some(n => n.id === promoNewsId)) {
      this.addNews(save,'🏁','Promotion en F1 !',`${fn} rejoint l'equipe avec un contrat rookie de 2 ans (${rookieSalary}M/an).${transfer.replaced ? ` ${transfer.replaced.firstName} ${transfer.replaced.name} devient agent libre.` : ''}`,'promotion');
      if (save.news?.length) save.news[0].id = promoNewsId;
    }
    if(im.staffMorale){ im.staffMorale.value=Math.min(100,(im.staffMorale.value||60)+8); im.staffMorale.note=`L'équipe est fière de voir ${j.firstName} franchir le pas.`; }
    if(im.sponsorMood){ im.sponsorMood.value=Math.min(100,(im.sponsorMood.value||60)+5); im.sponsorMood.note=`Les sponsors voient d'un bon œil la promotion d'un jeune talent maison.`; }
    if(im.teamReputation){ im.teamReputation.value=Math.min(100,(im.teamReputation.value||50)+6); if(!im.teamReputation.tags.includes('Formation jeunes')) im.teamReputation.tags.push('Formation jeunes'); }
    if(typeof Save !== 'undefined' && Save.persistDriverStates) Save.persistDriverStates(save);
    Save.save(save);
    return { ok:true, driver:newDriver, replaced:transfer.replaced||null, msg:`${fn} est officiellement en Formule 1 !` };
  },

  academyEndOfSeason(save){
    // À chaque fin de saison : 1 jeune quitte l'académie au hasard,
    // devient agent libre, puis un nouveau profil arrive pour garder le centre vivant.
    this.ensure(save);
    const im = save.immersion;
    const pool = im.juniorAcademy.filter(j=>!j.promoted);
    const report = { released:null, replacement:null };

    // Les juniors restants vieillissent doucement. Ils ne sont pas ajoutés au marché.
    im.juniorAcademy.forEach(j=>{ if(!j.promoted) j.age = (j.age || 17) + 1; });

    if(pool.length && typeof F1Data !== 'undefined'){
      const j = pool[Math.floor(Math.random()*pool.length)];
      if(!j.profile) j.profile = this.generateJuniorProfile(j, save);
      const stats = j.profile?.stats || {};
      const ovr = Math.min(77, Math.round(j.profile?.ovr || 66));
      const freeDriver = {
        id:`FA_${j.id}_${save.season||2025}`, name:j.name, firstName:j.firstName, nationality:j.flag,
        teamId:'free_agent', number:10+Math.floor(Math.random()*89), age:j.age||18,
        potential:j.potential||78, trait:j.profile?.traits?.[0]||'prodigy', retired:false,
        generated:true, fromAcademy:true, academyReleased:true,
        pace:Math.min(77, stats.pace||66), consistency:Math.min(77, stats.consistency||64),
        wetSkill:Math.min(77, stats.wetSkill||63), overtaking:Math.min(77, stats.overtaking||63),
        defending:Math.min(77, stats.defending||62), salary:Math.max(1,Math.min(3,Math.round(ovr*0.035))),
        contractYears:0, seasons:0,
      };
      F1Data.drivers.push(freeDriver);
      save.generatedDrivers = Array.isArray(save.generatedDrivers) ? save.generatedDrivers : [];
      save.generatedDrivers.push({...freeDriver});
      save.contracts = save.contracts || {};
      save.contracts[freeDriver.id] = { years:0, salary:freeDriver.salary, status:'agent libre', satisfaction:50 };
      im.juniorAcademy = im.juniorAcademy.filter(x=>x.id!==j.id);
      report.released = freeDriver;
      this.addNews(save,'🎓','Académie — départ',`${j.firstName} ${j.name} quitte votre académie et devient agent libre. Il pourra être recruté par n'importe quelle équipe.`,'junior');
    }

    const replacement = this.generateNewJunior(save);
    im.juniorAcademy.push(replacement);
    report.replacement = replacement;
    this.addNews(save,'🌱','Académie — nouveau talent',`${replacement.firstName} ${replacement.name} rejoint votre centre de formation. Potentiel encore à confirmer.`,'junior');
    return report;
  },

  generateNewJunior(save, idx){
    const first = ['Léo','Noah','Mateo','Ethan','Hugo','Alex','Oscar','Luca','Sacha','Ilyes','Tom','Milan','Nico','Enzo','Rafael'];
    const last  = ['Martins','Keller','Rossi','Brooks','Sato','Moreau','Costa','Dubois','Weber','Tanaka','Schmidt','Pereira','Haddad','King','Bernard'];
    const flags = ['🇫🇷','🇩🇪','🇮🇹','🇬🇧','🇯🇵','🇪🇸','🇧🇷','🇳🇱','🇧🇪','🇨🇭'];
    const i = Math.floor(Math.random()*first.length);
    const id = `jr_${save.season||2025}_${Date.now()}_${Math.floor(Math.random()*999)}_${idx??0}`;
    const junior = {
      id, firstName:first[i], name:last[Math.floor(Math.random()*last.length)], flag:flags[Math.floor(Math.random()*flags.length)],
      age:16+Math.floor(Math.random()*3), potential:70+Math.floor(Math.random()*20),
      racecraft:54+Math.floor(Math.random()*24), focus:52+Math.floor(Math.random()*26),
      cost:1+Math.floor(Math.random()*4), progress:5+Math.floor(Math.random()*26),
      note:['À évaluer en F3','Bon retour simulateur','Potentiel brut intéressant','Travailleur discret','Très bon feeling sous pluie'][Math.floor(Math.random()*5)]
    };
    if (typeof Feeder !== 'undefined') {
      save.feeder = save.feeder || {};
      save.feeder.devPlans = save.feeder.devPlans || {};
      save.feeder.devPlans[id] = 'pace';
    }
    return junior;
  },

  evolvePromotedJuniors(save){
    this.ensure(save);
    const im = save.immersion;
    im.juniorAcademy.filter(j=>j.promoted&&j.driverId).forEach(j=>{
      const d = typeof F1Data!=='undefined' ? F1Data.drivers.find(x=>x.id===j.driverId) : null;
      if(!d||d.retired) return;
      if((d.age||18)<=22 && Math.random()<0.4){
        const stat=['pace','consistency','wetSkill','overtaking'][Math.floor(Math.random()*4)];
        d[stat]=Math.min(d.potential||90,(d[stat]||65)+1);
      }
      const race=save.race||0;
      if(race>0 && race%6===0 && j._lastStoryRace!==race){
        j._lastStoryRace=race;
        const fn=`${j.firstName} ${j.name}`;
        const roll=Math.random();
        if(roll<0.15)      this.addNews(save,'🚀','Percée !',`${fn} signe sa meilleure course. Le paddock retient son nom.`,'junior');
        else if(roll<0.25) this.addNews(save,'📉','Passage à vide',`${fn} traverse une période difficile. L'adaptation à la F1 prend du temps.`,'junior');
        else if(roll<0.35) this.addNews(save,'💬','Médias',`La presse compare déjà ${fn} aux grands noms de sa génération.`,'junior');
      }
    });
  },

  syncLatestGp(save){
    // Compatibilité avec les pages qui appellent Immersion.syncLatestGp() au chargement.
    // Si un GP a déjà été sauvegardé mais pas encore traité par la couche immersion,
    // on l'injecte une seule fois grâce à lastProcessedGpKey.
    if(!save || !save.lastGpSummary) return save;
    this.ensure(save);
    const gp = save.lastGpSummary;
    const key = `${gp.season || save.season}-${gp.raceNumber || save.race}-${gp.circuitId || gp.circuitName}`;
    if(save.immersion.lastProcessedGpKey !== key){
      this.afterRace(save, gp);
    }
    return save;
  },

  top(obj, n=5, asc=false){
    return Object.entries(obj||{}).map(([id,v])=>({id, name:v.name||id, value:v.value||0}))
      .sort((a,b)=>asc?a.value-b.value:b.value-a.value).slice(0,n);
  },

  initSeasonRivals(save) {
    if (!save) return null;
    if (typeof F1Data === 'undefined') return null;
    save.immersion = save.immersion || {};
    const pid = save.playerTeamId;
    const rivals = F1Data.drivers.filter(d => !d.retired && d.teamId && d.teamId !== pid && d.teamId !== 'free_agent');
    const topDrv = [...rivals].sort((a, b) => (b.pace || 0) - (a.pace || 0))[0];
    const playerPts = save.teamStandings?.[pid] || 0;
    const teams = F1Data.teams.filter(t => t.id !== pid);
    let teamRival = teams.map(t => ({ ...t, pts: save.teamStandings?.[t.id] || 0 }))
      .sort((a, b) => Math.abs(a.pts - playerPts) - Math.abs(b.pts - playerPts))[0] || teams[0];
    save.immersion.seasonRivals = {
      driverId: topDrv?.id || null,
      driverName: topDrv ? `${topDrv.firstName} ${topDrv.name}` : null,
      teamId: teamRival?.id || null,
      teamName: teamRival?.name || null,
      setAtSeason: save.season || 2025,
    };
    return save.immersion.seasonRivals;
  },

  pushSeasonStory(save, gp, bestPlayer, teamPts, tags) {
    this.ensure(save);
    const circuit = gp.circuitName || 'Grand Prix';
    const race = gp.raceNumber || save.race || 0;
    let headline;
    let tone = 'neutral';
    if (bestPlayer?.position === 1) {
      headline = `Après ${circuit}, le paddock s'accorde : votre projet a signé un week-end majeur.`;
      tone = 'triumph';
    } else if (bestPlayer?.position <= 3) {
      headline = `Après ${circuit}, on parle surtout du podium de ${this.driverName(bestPlayer)} — momentum visible.`;
      tone = 'solid';
    } else if (teamPts >= 10) {
      headline = `Après ${circuit}, la narrative est claire : régularité et points, même sans flash.`;
      tone = 'solid';
    } else if (bestPlayer?.status === 'dnf' || (tags || []).includes('Week-end difficile')) {
      headline = `Après ${circuit}, le paddock questionne votre capacité à rebondir rapidement.`;
      tone = 'crisis';
    } else if (/pluie|humide/i.test(gp.weather || '')) {
      headline = `Après ${circuit}, les stratèges relancent le débat météo — week-end tactique exigeant.`;
      tone = 'drama';
    } else {
      headline = `Après ${circuit}, votre saison avance sans coup de théâtre — ni panique, ni euphorie.`;
    }
    save.immersion.seasonStory.push({
      season: gp.season || save.season, race, circuitName: circuit, headline, tone,
      date: gp.date || new Date().toISOString(),
    });
    save.immersion.seasonStory = save.immersion.seasonStory.slice(-24);
  },

  applyMoodEffects(save) {
    this.ensure(save);
    const im = save.immersion;
    const prev = { ...(im.moodEffects || {}) };
    im.moodEffects = {
      sponsorPenaltyActive: (im.sponsorMood?.value ?? 60) < 45,
      staffStrategyRisk: (im.staffMorale?.value ?? 60) < 45,
    };
    if (im.moodEffects.sponsorPenaltyActive && !prev.sponsorPenaltyActive) {
      this.addNews(save, '💼', 'Sponsors — clause activée',
        'Visibilité insuffisante : les gains course subissent un malus (−8 %) jusqu\'à amélioration.', 'sponsor');
    }
    if (im.moodEffects.staffStrategyRisk && !prev.staffStrategyRisk) {
      this.addNews(save, '🔧', 'Garage tendu',
        'Le staff est sous pression — risque d\'erreur au stand si l\'ambiance ne s\'améliore pas.', 'paddock');
    }
    return im.moodEffects;
  },

  getRaceRewardMultiplier(save) {
    this.ensure(save);
    return (save.immersion.sponsorMood?.value ?? 60) < 45 ? 0.92 : 1;
  },

  getBriefingStakes(save) {
    this.ensure(save);
    const im = save.immersion;
    const stakes = [];
    const pressure = save.boardPressure || 0;
    if (pressure > 60) {
      stakes.push({ icon: '🏛️', text: `Le board exerce une forte pression (${Math.round(pressure)}%). Un week-end faible aggraverait la situation.` });
    } else if (pressure > 40) {
      stakes.push({ icon: '👁️', text: `La direction vous surveille (${Math.round(pressure)}%). Les objectifs restent exigeants.` });
    }
    if ((im.sponsorMood?.value ?? 60) < 45) {
      stakes.push({ icon: '💼', text: `Sponsors mécontents — ${im.sponsorMood.note || 'Ils attendent de la visibilité ce week-end.'}` });
    }
    if (typeof Save !== 'undefined' && Save.getPlayerDrivers) {
      Save.getPlayerDrivers(save, save.playerTeamId).forEach(d => {
        const conf = save.driverConfidence?.[d.id] ?? 50;
        const moral = im.driverMorale?.[d.id]?.value ?? 60;
        if (conf < 40 || moral < 40) {
          stakes.push({ icon: '😤', text: `${d.firstName} ${d.name} en crise de confiance (conf. ${conf}, moral ${moral}).` });
        }
      });
    }
    const riv = im.seasonRivals;
    if (riv?.driverName) {
      stakes.push({ icon: '⚔️', text: `Rivalité saison : ${riv.driverName} (${riv.teamName || '—'}) reste la référence.` });
    }
    return stakes.slice(0, 4);
  },

  getUrgentAlerts(save) {
    if (!save?.playerTeamId) return [];
    const alerts = [];
    if (typeof Feeder !== 'undefined' && Feeder.getPendingPoaching) {
      const n = Feeder.getPendingPoaching(save).length;
      if (n) alerts.push({ level: 'high', text: `${n} alerte(s) poaching sur vos juniors`, href: 'academy.html' });
    }
    if (typeof CareerEvents !== 'undefined' && CareerEvents.evaluateObjectives) {
      const ev = CareerEvents.evaluateObjectives(save);
      if (ev.racesDone >= 3 && ev.score < 40) {
        alerts.push({ level: 'high', text: 'Objectifs board en danger', href: 'board.html' });
      }
    }
    if ((save.boardPressure || 0) > 65) {
      alerts.push({ level: 'high', text: `Pression direction : ${Math.round(save.boardPressure)}%`, href: 'board.html' });
    }
    if (typeof Feeder !== 'undefined' && Feeder.getPerformanceSummary) {
      const perf = Feeder.getPerformanceSummary(save);
      if (perf.f2TeamPos === 1) {
        alerts.push({ level: 'info', text: `${perf.teamName} — leader F2`, href: 'academy.html' });
      } else if (perf.f2TeamPos && perf.f2TeamPos <= 3) {
        alerts.push({ level: 'info', text: `Écurie F2 satellite P${perf.f2TeamPos}`, href: 'academy.html' });
      }
    }
    if (typeof SocialNotifications !== 'undefined') {
      const n = SocialNotifications.getPendingCount(save);
      if (n > 0) alerts.push({ level: 'medium', text: `${n} message(s) pilote en attente`, href: 'social.html' });
    }
    return alerts;
  },

  renderUrgentBannerHtml(alerts) {
    if (!alerts?.length) return '';
    return alerts.slice(0, 3).map(a =>
      `<a href="${a.href}" style="display:block;padding:10px 12px;margin-bottom:6px;border-radius:8px;text-decoration:none;font-size:12px;border:1px solid ${a.level === 'high' ? 'var(--accent)' : 'var(--gold)'};background:${a.level === 'high' ? 'rgba(232,0,61,.08)' : 'rgba(245,200,66,.06)'};color:#ddd">⚠ ${this.esc(a.text)} →</a>`
    ).join('');
  },

  getInterviewForGp(save, gp) {
    this.ensure(save);
    if (!gp) return null;
    const season = gp.season || save.season;
    const rn = gp.raceNumber ?? save.race;
    const cn = gp.circuitName;
    return (save.immersion.interviews || []).slice().reverse().find(i =>
      i.season === season && (i.raceNumber === rn || i.circuitName === cn)
    ) || null;
  },

  buildJournalExtras(gp, save) {
    const lines = [];
    if (/pluie|humide/i.test(gp.weather || '')) {
      lines.push({ title: 'Météo', msg: `Conditions ${gp.weather} — stratégie pneus et visibilité au cœur du week-end.` });
    }
    if ((gp.safetyCarLaps || 0) > 0) {
      lines.push({ title: 'Safety Car', msg: `${gp.safetyCarLaps} tour(s) neutralisé(s) — fenêtres pit décisives.` });
    }
    const before = gp.constructorPosBefore;
    const after = gp.constructorPosAfter;
    if (before && after && after < before) {
      lines.push({ title: 'Championnat', msg: `Gain de ${before - after} place(s) constructeurs (P${before} → P${after}).` });
    } else if (before && after && after > before) {
      lines.push({ title: 'Championnat', msg: `Recul constructeurs P${before} → P${after}.` });
    }
    const riv = save.immersion?.seasonRivals;
    if (riv?.teamName && after > before) {
      lines.push({ title: 'Rivalité', msg: `${riv.teamName} capitalise dans la course au classement.` });
    }
    const story = (save.immersion?.seasonStory || []).slice(-1)[0];
    if (story?.headline) lines.push({ title: 'Fil de saison', msg: story.headline });
    const im = save.immersion;
    if ((im?.staffMorale?.value ?? 60) < 45) {
      lines.push({ title: 'Garage', msg: `Ambiance tendue (${im.staffMorale.value}/100) — ${im.staffMorale.note}` });
    }
    return lines;
  },

  maybeRivalPaddockNews(save, gp, player, bestPlayer) {
    const riv = save.immersion?.seasonRivals;
    if (!riv?.driverId || Math.random() > 0.4) return;
    const results = gp.results || [];
    const rivRes = results.find(r => (r.driverId || r.driver?.id) === riv.driverId);
    if (!rivRes) return;
    const best = bestPlayer || player.slice().sort((a, b) => (a.position || 99) - (b.position || 99))[0];
    if (rivRes.position < (best?.position || 99)) {
      this.addNews(save, '⚔️', 'Rivalité — week-end',
        `${riv.driverName} (${riv.teamName}) vous coiffe — P${rivRes.position} vs votre P${best?.position || '—'}.`, 'paddock');
    } else if (best && best.position < rivRes.position) {
      this.addNews(save, '⚔️', 'Rivalité — week-end',
        `Vous devancez ${riv.driverName} (P${best.position} vs P${rivRes.position}).`, 'paddock');
    }
  },

  getContextRadioLines(save) {
    this.ensure(save);
    const lines = [];
    const im = save.immersion;
    if ((save.boardPressure || 0) > 60) lines.push('🎧 Radio : le board attend des points — pas de marge.');
    if ((im.sponsorMood?.value ?? 60) < 45) lines.push('🎧 Radio : sponsors nerveux — visibilité à maximiser.');
    const riv = im.seasonRivals;
    if (riv?.driverName) lines.push(`🎧 Radio : ${riv.driverName} est la cible directe.`);
    if (typeof Save !== 'undefined' && Save.getPlayerDrivers) {
      Save.getPlayerDrivers(save, save.playerTeamId).forEach(d => {
        if ((im.driverMorale?.[d.id]?.value ?? 60) < 40) {
          lines.push(`🎧 Radio : ${d.firstName} semble fragile — restez factuel.`);
        }
      });
    }
    return lines;
  },

  getGpChoiceOptions(save, gp) {
    const race = gp?.raceNumber ?? save.race;
    if (save.immersion?.lastGpChoice?.race === race) return null;
    return [
      { id: 'defend_driver', icon: '🎤', label: 'Défendre le pilote en conférence', desc: 'Média +4 · Sponsors +3', effects: { media: 4, sponsor: 3 } },
      { id: 'stay_quiet', icon: '🤐', label: 'Rester discret', desc: 'Pas de risque médiatique.', effects: {} },
      { id: 'blame_car', icon: '🔧', label: 'Pointer la voiture / stratégie', desc: 'Tech +4 · Moral pilotes −3', effects: { tech: 4, moral: -3 } },
    ];
  },

  applyGpChoice(save, choiceId, gp) {
    this.ensure(save);
    const raceNum = gp?.raceNumber ?? save.race;
    if (save.immersion?.lastGpChoice?.race === raceNum) {
      return { ok: false, msg: 'Choix déjà effectué pour ce GP.' };
    }
    const allOpts = [
      { id: 'defend_driver', icon: '🎤', label: 'Défendre le pilote en conférence', desc: 'Média +4 · Sponsors +3', effects: { media: 4, sponsor: 3 } },
      { id: 'stay_quiet', icon: '🤐', label: 'Rester discret', desc: 'Pas de risque médiatique.', effects: {} },
      { id: 'blame_car', icon: '🔧', label: 'Pointer la voiture / stratégie', desc: 'Tech +4 · Moral pilotes −3', effects: { tech: 4, moral: -3 } },
    ];
    const choice = allOpts.find(o => o.id === choiceId);
    if (!choice) return { ok: false, msg: 'Choix invalide.' };
    if (!save.reputation || typeof save.reputation !== 'object') {
      save.reputation = { sport: 50, media: 50, tech: 50, finance: 50 };
    }
    const r = save.reputation;
    if (choice.effects.media) r.media = Math.min(100, (r.media || 50) + choice.effects.media);
    if (choice.effects.tech) r.tech = Math.min(100, (r.tech || 50) + choice.effects.tech);
    if (choice.effects.sponsor) {
      save.immersion.sponsorMood.value = Math.min(100, (save.immersion.sponsorMood.value || 60) + choice.effects.sponsor);
    }
    if (choice.effects.moral) {
      Object.values(save.immersion.driverMorale || {}).forEach(m => {
        if (m) m.value = Math.max(5, Math.min(100, (m.value || 60) + choice.effects.moral));
      });
    }
    save.immersion.lastGpChoice = {
      race: gp?.raceNumber ?? save.race, choiceId, label: choice.label,
      at: new Date().toISOString(),
    };
    this.addNews(save, '📋', 'Débrief média', choice.label, 'paddock');
    return { ok: true, choice };
  },

  getSeasonReviewNarrative(save) {
    this.ensure(save);
    const im = save.immersion;
    const stories = (im.seasonStory || []).slice(-5);
    const promoted = (im.juniorAcademy || []).filter(j => j.promoted);
    const feederHist = save.feeder?.history?.slice(-1)[0];
    const parts = [];
    if (stories.length) {
      parts.push(`<strong>Fil de saison</strong> — ${stories.map(s => this.esc(s.headline)).join(' ')}`);
    }
    if (promoted.length) {
      parts.push(`<strong>Académie</strong> — ${promoted.map(j => `${j.firstName} ${j.name} promu F1`).join(', ')}.`);
    }
    if (feederHist?.f2?.teamPos) {
      parts.push(`<strong>Feeder</strong> — Écurie F2 P${feederHist.f2.teamPos} (${feederHist.f2.teamPts || 0} pts).`);
    }
    parts.push(`<strong>Garage</strong> — Sponsors ${im.sponsorMood?.value ?? '—'}/100 · Staff ${im.staffMorale?.value ?? '—'}/100 · Réputation ${im.teamReputation?.value ?? '—'}/100.`);
    return parts.join('<br><br>');
  },
};

if (typeof window !== 'undefined') window.Immersion = Immersion;

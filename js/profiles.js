// ============================================================
//  F1 Manager — profiles.js
//  Liens et fiches universelles : pilotes, écuries, staff
// ============================================================

const PROFILE_STAFF_DB = [

  // ══════════════════════════════════════════════════════════
  //  DIRECTEURS TECHNIQUES / TEAM PRINCIPALS (Élite)
  //  Sources : F1 2025, mouvements confirmés
  // ══════════════════════════════════════════════════════════

  // Adrian Newey — parti chez Aston Martin en 2025 (annoncé mars 2024)
  {
    id:'dt_newey', name:'Adrian Newey', icon:'🌊',
    role:'Directeur Technique — Aston Martin', specialty:'aero',
    desc:'Le génie de l\'aérodynamique F1. Auteur des Red Bull RB5→RB20. Désormais chez Aston Martin pour leur projet 2026.',
    level:98, salary:22, cost:50, elite:true, exclusive:true,
    impacts:{ aero:+14, chassis:+5, performance:+6 },
    passive:'Réduit le coût des upgrades aéro de 15% · +1 token R&D/saison automatiquement',
  },

  // Pierre Waché — DT Red Bull depuis départ de Newey
  {
    id:'dt_wache', name:'Pierre Waché', icon:'🔬',
    role:'Directeur Technique — Red Bull Racing', specialty:'chassis',
    desc:'Successeur de Newey chez Red Bull. Architecte du châssis des voitures championnes 2021-2024.',
    level:93, salary:14, cost:32, elite:true, exclusive:true,
    impacts:{ chassis:+11, aero:+4, reliability:+2 },
    passive:'Améliore la corrélation soufflerie/piste · Réduit les coûts d\'upgrade châssis de 10%',
  },

  // James Allison — DT Mercedes
  {
    id:'dt_allison', name:'James Allison', icon:'⚙️',
    role:'Directeur Technique — Mercedes', specialty:'chassis',
    desc:'Architecte du règne Mercedes 2014-2021. Toujours à la tête du département technique de Brackley.',
    level:94, salary:14, cost:32, elite:true, exclusive:true,
    impacts:{ chassis:+10, aero:+5, performance:+4 },
    passive:'Bonus de +0.15s/tour sur circuits haute vitesse · Améliore la gestion thermique',
  },

  // Enrico Cardile — DT Ferrari (nouveau depuis 2024)
  {
    id:'dt_cardile', name:'Enrico Cardile', icon:'🔴',
    role:'Directeur Technique — Ferrari', specialty:'aero',
    desc:'Nouveau DT Ferrari après la restructuration 2024. Spécialiste aéro, architecte de la SF-24.',
    level:88, salary:11, cost:26, elite:true, exclusive:true,
    impacts:{ aero:+9, chassis:+4, engine:+2 },
    passive:'Améliore l\'aéro en conditions chaudes · Bonus moteur Ferrari intégré',
  },

  // Neil Houldey — DT McLaren (nommé 2024)
  {
    id:'dt_houldey', name:'Neil Houldey', icon:'🧡',
    role:'Directeur Technique — McLaren', specialty:'aero',
    desc:'Architecte de la renaissance McLaren. Auteur de la MCL60 championne 2024.',
    level:89, salary:10, cost:24, elite:true, exclusive:true,
    impacts:{ aero:+9, chassis:+5, performance:+4 },
    passive:'Améliore la réactivité des upgrades en saison · +1 token R&D/4 courses',
  },

  // Andy Cowell — ex-Mercedes HPP, nouveau TP Aston Martin 2025
  {
    id:'dir_cowell', name:'Andy Cowell', icon:'💚',
    role:'Team Principal — Aston Martin', specialty:'engine',
    desc:'Ancien directeur Mercedes HPP, architecte des moteurs hybrides dominants 2014-2019. TP Aston Martin depuis 2025.',
    level:91, salary:10, cost:24, elite:true,
    impacts:{ engine:+8, reliability:+5, performance:+3 },
    passive:'+2 points de fiabilité/saison · Réduit les coûts moteur de 8%',
  },

  // ══════════════════════════════════════════════════════════
  //  INGÉNIEURS AÉRO
  // ══════════════════════════════════════════════════════════

  {
    id:'aero_1', name:'Luca Furbatto', icon:'🌬️',
    role:'Directeur Aéro — Alpine', specialty:'aero',
    desc:'Ancien responsable aéro chez McLaren et Alfa Romeo. Maintenant chez Alpine pour leur projet de renaissance.',
    level:83, salary:5, cost:12,
    impacts:{ aero:+6 },
    passive:'Améliore l\'efficacité des appendices en virage de 8%',
  },
  {
    id:'aero_2', name:'Jason Somerville', icon:'🔬',
    role:'Ingénieur CFD Senior', specialty:'aero',
    desc:'Spécialiste de la simulation numérique. Optimise la corrélation soufflerie/piste à très haut niveau.',
    level:80, salary:4, cost:9,
    impacts:{ aero:+4 },
    passive:'+1 token R&D toutes les 3 courses grâce aux simulations accélérées',
  },
  {
    id:'aero_3', name:'Dirk de Beer', icon:'💨',
    role:'Responsable Aéro — Sauber/Audi', specialty:'aero',
    desc:'Ex-DT Haas et McLaren, maintenant chez Sauber dans le cadre du projet Audi 2026.',
    level:78, salary:4, cost:9,
    impacts:{ aero:+4 },
    passive:'Réduit le coût des upgrades aéro de 4M€',
  },
  {
    id:'aero_4', name:'Ben Agathangelou', icon:'🏹',
    role:'Responsable Aéro — Haas', specialty:'aero',
    desc:'Architecte aéro de la Haas depuis la création de l\'équipe. Maître de l\'aéro à petit budget.',
    level:76, salary:3, cost:8,
    impacts:{ aero:+3 },
    passive:'Optimise le ratio performance/coût des upgrades aéro',
  },

  // ══════════════════════════════════════════════════════════
  //  INGÉNIEURS CHÂSSIS / SETUP
  // ══════════════════════════════════════════════════════════

  {
    id:'chas_1', name:'Tom McCullough', icon:'🏗️',
    role:'Directeur Performance — Aston Martin', specialty:'chassis',
    desc:'Ex-ingénieur performance Sauber/Alfa. Rejoint Aston Martin pour optimiser le comportement dynamique.',
    level:83, salary:5, cost:11,
    impacts:{ chassis:+6, reliability:+2 },
    passive:'Réduit les dommages mécaniques en course de 5%',
  },
  {
    id:'chas_2', name:'David Sanchez', icon:'🔧',
    role:'DT Voiture — McLaren/Ferrari', specialty:'chassis',
    desc:'Ex-ingénieur aéro Ferrari passé chez McLaren. Spécialiste du comportement en virage lent.',
    level:82, salary:5, cost:11,
    impacts:{ chassis:+5, aero:+2 },
    passive:'Améliore la dégradation pneus de 4% sur circuits urbains',
  },
  {
    id:'chas_3', name:'Jon Marshall', icon:'📐',
    role:'Directeur Technique Williams', specialty:'chassis',
    desc:'Pilier technique de Williams sous l\'ère Vowles. Construction d\'une nouvelle base technique solide.',
    level:77, salary:4, cost:9,
    impacts:{ chassis:+4 },
    passive:'Bonus de +0.05s/tour sur circuits à faible appui',
  },
  {
    id:'chas_4', name:'Guillaume Cattelani', icon:'⚖️',
    role:'DT Adjoint Performance — Racing Bulls', specialty:'chassis',
    desc:'Prend en charge une partie des responsabilités de Jody Egginton parti chez Red Bull Advanced Tech.',
    level:74, salary:3, cost:7,
    impacts:{ chassis:+3 },
    passive:'Améliore l\'adaptation setup d\'un circuit à l\'autre',
  },

  // ══════════════════════════════════════════════════════════
  //  INGÉNIEURS MOTEUR / ERS
  // ══════════════════════════════════════════════════════════

  {
    id:'eng_1', name:'Hywel Thomas', icon:'⚡',
    role:'Directeur Moteur — Mercedes HPP', specialty:'engine',
    desc:'Successeur d\'Andy Cowell à la tête de Mercedes High Performance Powertrains. Architecte du moteur 2026.',
    level:90, salary:9, cost:20, elite:true,
    impacts:{ engine:+9, reliability:+4 },
    passive:'Moteur Mercedes : réduit la consommation de 3% → vitesse de pointe +0.8km/h',
  },
  {
    id:'eng_2', name:'Enrico Gualtieri', icon:'🔋',
    role:'Directeur Moteur — Ferrari', specialty:'engine',
    desc:'Patron de Ferrari Gestione Sportiva (moteur). Spécialiste du V6 turbo-hybride de Maranello.',
    level:88, salary:8, cost:18,
    impacts:{ engine:+7, reliability:+3 },
    passive:'Moteur Ferrari : boost ERS +3% → meilleur déploiement en sortie de virage',
  },
  {
    id:'eng_3', name:'Remi Taffin', icon:'🔩',
    role:'Directeur Technique Moteur — Alpine/Renault', specialty:'engine',
    desc:'Ex-responsable moteur Renault F1 (2014-2021). Revenu pour piloter le projet moteur Alpine 2026.',
    level:83, salary:6, cost:14,
    impacts:{ engine:+5, reliability:+4 },
    passive:'Réduit les DNF moteur de 18% · +0.5 fiabilité/saison automatiquement',
  },
  {
    id:'eng_4', name:'Simon Roberts', icon:'🛠️',
    role:'Directeur des Opérations — Williams', specialty:'reliability',
    desc:'Ex-directeur opérations McLaren et Ferrari. Apporte une rigueur opérationnelle rare.',
    level:79, salary:5, cost:11,
    impacts:{ reliability:+6, engine:+2 },
    passive:'Réduit les erreurs de pit de 10% · Améliore la logistique course',
  },

  // ══════════════════════════════════════════════════════════
  //  PIT STOP / OPÉRATIONS TRACKSIDE
  // ══════════════════════════════════════════════════════════

  {
    id:'pit_1', name:'Jonathan Wheatley', icon:'⏱️',
    role:'Team Principal — Kick Sauber (ex-Chef Pit Red Bull)', specialty:'pitstop',
    desc:'20 ans chez Red Bull dont les arrêts sous 2s. Désormais TP Sauber mais son expertise pit stop est légendaire.',
    level:95, salary:9, cost:22, elite:true,
    impacts:{ pitstop:+14 },
    passive:'Réduit le pitLoss de 2.2s · Réduit les erreurs de pit de 25%',
  },
  {
    id:'pit_2', name:'Lee Stevenson', icon:'🔧',
    role:'Chef Mécanicien', specialty:'pitstop',
    desc:'Coordinateur des mécaniciens chez une équipe top. Précision et rapidité au stand.',
    level:83, salary:4, cost:10,
    impacts:{ pitstop:+7 },
    passive:'Réduit le pitLoss de 1.3s sur tous les circuits',
  },
  {
    id:'pit_3', name:'Mario Isola', icon:'🛞',
    role:'Responsable Compétition Pirelli', specialty:'pitstop',
    desc:'Chef de la compétition Pirelli. Connaissance parfaite des pneus pour optimiser les stratégies.',
    level:82, salary:5, cost:12,
    impacts:{ pitstop:+5 },
    passive:'Réduit la phase de chauffe de 0.20s/tour · Améliore le choix de composés',
  },
  {
    id:'pit_4', name:'Hannah Schmitz', icon:'📊',
    role:'Chef Stratège — Red Bull Racing', specialty:'pitstop',
    desc:'LA stratège de Red Bull. Auteure des décisions undercut et overcut qui ont fait les championnats Verstappen.',
    level:91, salary:7, cost:17, elite:true,
    impacts:{ pitstop:+6, aero:+1 },
    passive:'Double les opportunités de pit sous Safety Car · +1 point par podium grâce aux strategies',
  },

  // ══════════════════════════════════════════════════════════
  //  FIABILITÉ / DONNÉES
  // ══════════════════════════════════════════════════════════

  {
    id:'rel_1', name:'Ayao Komatsu', icon:'🛡️',
    role:'Team Principal — Haas (ex-chef ingénieur piste)', specialty:'reliability',
    desc:'TP Haas depuis 2024. Ex-ingénieur de course Grosjean. Rigueur opérationnelle et fiabilité au cœur de son management.',
    level:84, salary:6, cost:14,
    impacts:{ reliability:+7, pitstop:+2 },
    passive:'Réduit les DNF de 18% · Améliore la constance des performances sur le long terme',
  },
  {
    id:'rel_2', name:'Gianpiero Lambiase', icon:'🎧',
    role:'Ingénieur de Course — Red Bull (GP de Verstappen)', specialty:'reliability',
    desc:'L\'ingénieur de course de Max Verstappen depuis 2016. Maître de la gestion des pneus et de la régularité.',
    level:89, salary:7, cost:16, elite:true,
    impacts:{ reliability:+6, pitstop:+3 },
    passive:'Améliore la gestion pneus pilote n°1 de 5% · Moins de cliff pneu en fin de relais',
  },
  {
    id:'rel_3', name:'Riccardo Adami', icon:'📡',
    role:'Ingénieur de Course — Ferrari (GP de Leclerc)', specialty:'reliability',
    desc:'L\'ingénieur de course de Charles Leclerc. Excellente gestion des pneus et de la consommation carburant.',
    level:85, salary:6, cost:13,
    impacts:{ reliability:+5, pitstop:+2 },
    passive:'Réduit la dégradation pneus pilote n°1 de 4% · Optimise la consommation carburant',
  },
  {
    id:'rel_4', name:'Peter Bonnington', icon:'📻',
    role:'Ingénieur de Course — Mercedes (GP de Hamilton→Russell)', specialty:'reliability',
    desc:'L\'ingénieur de Lewis Hamilton pendant toute son ère Mercedes. Maintenant avec George Russell.',
    level:86, salary:6, cost:14,
    impacts:{ reliability:+5, chassis:+2 },
    passive:'Réduit les erreurs pilote · Meilleure cohérence sur les relais longs',
  },

  // ══════════════════════════════════════════════════════════
  //  DIRECTION / MANAGEMENT
  // ══════════════════════════════════════════════════════════

  {
    id:'dir_stella', name:'Andrea Stella', icon:'🏆',
    role:'Team Principal — McLaren', specialty:'chassis',
    desc:'TP McLaren depuis 2023. Architecte du retour au sommet et du titre constructeurs 2024. Ex-ingénieur Ferrari/Alonso.',
    level:92, salary:10, cost:23, elite:true,
    impacts:{ chassis:+4, aero:+4, performance:+4 },
    passive:'Réduit la pression du board de 8/saison · Améliore la cohésion technique',
  },
  {
    id:'dir_vowles', name:'James Vowles', icon:'📈',
    role:'Team Principal — Williams', specialty:'reliability',
    desc:'TP Williams depuis 2023. Ex-stratège Mercedes. Reconstruction culturelle et technique de Williams.',
    level:85, salary:7, cost:17,
    impacts:{ reliability:+5, pitstop:+3 },
    passive:'+12M€ de revenus sponsors/saison · Accélère le développement de la voiture',
  },
  {
    id:'dir_vasseur', name:'Frédéric Vasseur', icon:'🔴',
    role:'Team Principal — Ferrari', specialty:'aero',
    desc:'TP Ferrari depuis 2023. Connu pour avoir travaillé avec Hamilton, Leclerc, Räikkönen. Bâtisseur de champions.',
    level:88, salary:9, cost:21, elite:true,
    impacts:{ aero:+3, chassis:+3, performance:+5 },
    passive:'Facilite le recrutement de pilotes top · Réduit le coût des contrats pilotes de 10%',
  },
  {
    id:'dir_binotto', name:'Mattia Binotto', icon:'🎯',
    role:'COO/CTO — Audi/Sauber', specialty:'engine',
    desc:'Ex-TP Ferrari. Maintenant COO & CTO du projet Audi F1 2026. Expert moteur et stratégie long terme.',
    level:86, salary:8, cost:18,
    impacts:{ engine:+6, reliability:+4 },
    passive:'Vision long terme : améliore le développement de la voiture suivante · +2 tokens/saison',
  },

];

// Compatibilité anciennes sauvegardes : l'ancienne page utilisait des IDs
// comme "newey", "wache", etc. Cette page utilise maintenant
// "dt_newey", "dt_wache"... Sans cette conversion, le compteur

(function() {
  const LEGACY_STAFF_IDS = {
    newey: 'dt_newey',
    wache: 'dt_wache',
    allison: 'dt_allison',
    seidl: 'pit_2',
    wheatley: 'pit_1',
    stella: 'dir_stella'
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  }

  function normalizeStaffId(id) {
    const key = String(id || '');
    return LEGACY_STAFF_IDS[key] || key;
  }

  function loadSave() {
    try { return typeof Save !== 'undefined' ? Save.load() : JSON.parse(localStorage.getItem('f1-manager-save') || 'null'); }
    catch(e) { return null; }
  }

  function restoreDrivers(save) {
    if (!save || typeof F1Data === 'undefined') return;
    if (save.generatedDrivers?.length) {
      save.generatedDrivers.forEach(gd => {
        const i = F1Data.drivers.findIndex(d => String(d.id) === String(gd.id));
        if (i === -1) F1Data.drivers.push(gd);
        else Object.assign(F1Data.drivers[i], gd);
      });
    }
    if (save.driverStates) {
      F1Data.drivers.forEach(d => { if (save.driverStates[d.id]) Object.assign(d, save.driverStates[d.id]); });
    }
  }

  function restoreStaff(save) {
    if (!save) return;
    save.generatedStaff = save.generatedStaff || [];
    if (typeof Career !== 'undefined' && typeof Career.restoreGeneratedStaff === 'function') Career.restoreGeneratedStaff(save);
  }

  function getStaff(save, id) {
    const nid = normalizeStaffId(id);
    return PROFILE_STAFF_DB.find(s => String(s.id) === nid)
      || (save?.generatedStaff || []).find(s => String(s.id) === nid)
      || null;
  }

  function fullName(entity) {
    if (!entity) return '—';
    if (entity.firstName) return `${entity.firstName} ${entity.name || ''}`.trim();
    if (entity.fullName) return entity.fullName;
    return entity.name || entity.shortName || entity.id || '—';
  }

  function getEntity(type, id, save = loadSave()) {
    if (typeof F1Data === 'undefined') return null;
    restoreDrivers(save);
    restoreStaff(save);
    const t = String(type || '').toLowerCase();
    const sid = String(id || '');
    if (t === 'driver' || t === 'pilote') return F1Data.drivers.find(d => String(d.id) === sid) || null;
    if (t === 'team' || t === 'ecurie' || t === 'écurie') return F1Data.teams.find(tm => String(tm.id) === sid) || null;
    if (t === 'staff') return getStaff(save, sid);
    return null;
  }

  function link(type, id, label, extraClass = '') {
    if (!id) return esc(label);
    return `<a class="entity-link ${esc(extraClass)}" href="profile.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}">${esc(label)}</a>`;
  }

  function linkDriver(d) { return d ? link('driver', d.id, fullName(d)) : '—'; }
  function linkTeam(t) { return t ? link('team', t.id, t.name || t.shortName) : '—'; }
  function linkStaff(s) { return s ? link('staff', normalizeStaffId(s.id), fullName(s)) : '—'; }

  window.Profiles = {
    STAFF_DB: PROFILE_STAFF_DB, LEGACY_STAFF_IDS, normalizeStaffId, escapeHtml: esc, loadSave, restoreDrivers, restoreStaff,
    getEntity, getStaff, fullName, link, linkDriver, linkTeam, linkStaff
  };
})();

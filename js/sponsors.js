// ============================================================
//  F1 Manager — sponsors.js
//  Système de sponsors complet
// ============================================================

const Sponsors = {

  // ── BASE DE DONNÉES SPONSORS ──────────────────────────────
  DB: [
    // ── TITLE SPONSORS (1 seul possible) ─────────────────────
    {
      id:'oracle',       name:'Oracle',         logo:'🔵', category:'tech',
      type:'title',      baseValue:31, maxValue:42, duration:3,
      reputationMin:{ sport:55, media:45, tech:60, finance:50 },
      personality:'opportunist',
      techBonus:{ tokens:1 },
      desc:'Leader mondial du cloud. Exige des résultats en piste et une visibilité maximale.',
      clauses:[
        { type:'podiums',    target:6,  bonus:8,   penalty:-6  },
        { type:'quali_top5', target:10, bonus:3,   penalty:0   },
        { type:'dnf_max',    target:4,  bonus:0,   penalty:-8  },
      ],
      exclusivity:'tech', breakClause:true,
    },
    {
      id:'aramco',       name:'Aramco',          logo:'🟢', category:'energy',
      type:'title',      baseValue:38, maxValue:52, duration:3,
      reputationMin:{ sport:60, media:50, tech:45, finance:55 },
      personality:'loyal',
      techBonus:{ engine:2 },
      desc:'Géant pétrolier. Partenariat technique avec carburant optimisé.',
      clauses:[
        { type:'points',     target:80, bonus:10,  penalty:-5  },
        { type:'podiums',    target:4,  bonus:5,   penalty:0   },
        { type:'points_finishes', target:12, bonus:4,  penalty:-3  },
      ],
      exclusivity:'energy', breakClause:false,
    },
    {
      id:'petronas',     name:'Petronas',         logo:'🔷', category:'energy',
      type:'title',      baseValue:35, maxValue:46, duration:2,
      reputationMin:{ sport:50, media:40, tech:50, finance:45 },
      personality:'developer',
      techBonus:{ engine:1, reliability:1 },
      desc:'Partenaire technique moteur. Offre augmente avec tes performances.',
      clauses:[
        { type:'points',     target:60, bonus:8,   penalty:-4  },
        { type:'dnf_max',    target:5,  bonus:0,   penalty:-6  },
        { type:'position_up',target:2,  bonus:12,  penalty:0   }, // gagner 2 places au constructeur
      ],
      exclusivity:'energy', breakClause:false,
    },
    {
      id:'cognizant',    name:'Cognizant',         logo:'🟠', category:'tech',
      type:'title',      baseValue:24, maxValue:35, duration:2,
      reputationMin:{ sport:40, media:35, tech:45, finance:40 },
      personality:'developer',
      techBonus:{ tokens:1 },
      desc:'Société IT en croissance. Idéal pour les équipes en progression.',
      clauses:[
        { type:'points',     target:40, bonus:5,   penalty:-3  },
        { type:'position_up',target:1,  bonus:8,   penalty:0   },
      ],
      exclusivity:'tech', breakClause:false,
    },

    // ── PRINCIPAL SPONSORS (2-3 max) ──────────────────────────
    {
      id:'heineken',     name:'Heineken 0.0',      logo:'🍺', category:'beverage',
      type:'principal',  baseValue:15, maxValue:21, duration:2,
      reputationMin:{ sport:35, media:45, tech:20, finance:30 },
      personality:'loyal',
      techBonus:{},
      desc:'Sponsor historique F1. Priorité à la visibilité TV et aux podiums.',
      clauses:[
        { type:'points_finishes', target:10, bonus:4,  penalty:-2  },
        { type:'podiums',    target:2,  bonus:3,   penalty:0   },
        { type:'top10',      target:12, bonus:2,   penalty:-2  },
      ],
      exclusivity:'beverage', breakClause:false,
    },
    {
      id:'monster',      name:'Monster Energy',    logo:'🟢', category:'beverage',
      type:'principal',  baseValue:18, maxValue:24, duration:2,
      reputationMin:{ sport:40, media:45, tech:20, finance:30 },
      personality:'opportunist',
      techBonus:{},
      desc:'Marque lifestyle agressive. Paye bien mais part si les résultats ne suivent pas.',
      clauses:[
        { type:'podiums',    target:4,  bonus:6,   penalty:-5  },
        { type:'top5',       target:6,  bonus:3,   penalty:-3  },
        { type:'points_finishes', target:8,  bonus:2,  penalty:0   },
      ],
      exclusivity:'beverage', breakClause:true,
    },
    {
      id:'aws',          name:'AWS',               logo:'🟡', category:'tech',
      type:'principal',  baseValue:13, maxValue:20, duration:2,
      reputationMin:{ sport:25, media:25, tech:35, finance:30 },
      personality:'developer',
      techBonus:{ tokens:1 },
      desc:'Amazon Web Services. Bonus tokens R&D pour l\'analyse de données.',
      clauses:[
        { type:'races',      target:20, bonus:3,   penalty:-1  },
        { type:'top10',      target:8,  bonus:2,   penalty:0   },
      ],
      exclusivity:'tech', breakClause:false,
    },
    {
      id:'dhl',          name:'DHL',               logo:'🟠', category:'logistics',
      type:'principal',  baseValue:10, maxValue:15, duration:3,
      reputationMin:{ sport:20, media:20, tech:20, finance:25 },
      personality:'loyal',
      techBonus:{ logistics:0.1 }, // -10% coût opérationnel GP
      desc:'Logistique officielle F1. Réduit tes coûts opérationnels.',
      clauses:[
        { type:'races',      target:23, bonus:2,   penalty:-1  },
        { type:'top10',      target:5,  bonus:1,   penalty:0   },
      ],
      exclusivity:'logistics', breakClause:false,
    },
    {
      id:'rolex',        name:'Rolex',             logo:'⌚', category:'luxury',
      type:'principal',  baseValue:21, maxValue:28, duration:3,
      reputationMin:{ sport:60, media:55, tech:30, finance:60 },
      personality:'loyal',
      techBonus:{},
      desc:'Prestige et tradition. Ne signe qu\'avec les meilleures équipes.',
      clauses:[
        { type:'podiums',    target:5,  bonus:6,   penalty:-8  },
        { type:'position',   target:5,  bonus:4,   penalty:-10 }, // rester top 5 constructeurs
        { type:'dnf_max',    target:3,  bonus:0,   penalty:-5  },
      ],
      exclusivity:'luxury', breakClause:true,
    },
    {
      id:'shell',        name:'Shell',             logo:'🔴', category:'energy',
      type:'principal',  baseValue:14, maxValue:20, duration:2,
      reputationMin:{ sport:30, media:25, tech:35, finance:35 },
      personality:'developer',
      techBonus:{ engine:1 },
      desc:'Carburant et lubrifiants. Améliore les performances moteur.',
      clauses:[
        { type:'points',     target:30, bonus:4,   penalty:-2  },
        { type:'races',      target:18, bonus:2,   penalty:0   },
      ],
      exclusivity:'energy', breakClause:false,
    },
    {
      id:'bwt',          name:'BWT',               logo:'🩷', category:'tech',
      type:'principal',  baseValue:8, maxValue:13, duration:2,
      reputationMin:{ sport:15, media:15, tech:20, finance:15 },
      personality:'loyal',
      techBonus:{},
      desc:'Traitement de l\'eau. Sponsor accessible, idéal pour démarrer.',
      clauses:[
        { type:'races',      target:15, bonus:2,   penalty:-1  },
      ],
      exclusivity:'water', breakClause:false,
    },

    // ── TECHNICAL PARTNERS (illimité) ─────────────────────────
    {
      id:'pirelli_p',    name:'Pirelli Data',      logo:'🛞', category:'tyre',
      type:'partner',    baseValue:4,  maxValue:6,  duration:1,
      reputationMin:{ sport:15, media:10, tech:25, finance:15 },
      personality:'loyal',
      techBonus:{ tyreDeg:-0.05 }, // -5% dégradation
      desc:'Données pneumatiques partagées. Améliore ta gestion des pneus.',
      clauses:[
        { type:'races',      target:20, bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'google',       name:'Google Chrome',     logo:'🌐', category:'tech',
      type:'partner',    baseValue:6,  maxValue:10, duration:2,
      reputationMin:{ sport:25, media:35, tech:35, finance:30 },
      personality:'opportunist',
      techBonus:{ tokens:1 },
      desc:'Visibilité digitale mondiale. Bonus tokens via analyse data.',
      clauses:[
        { type:'points_finishes', target:6,  bonus:2,  penalty:-2  },
        { type:'top10',      target:6,  bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:true,
    },
    {
      id:'castore',      name:'Castore',           logo:'👕', category:'apparel',
      type:'partner',    baseValue:4,  maxValue:7, duration:2,
      reputationMin:{ sport:15, media:20, tech:10, finance:15 },
      personality:'developer',
      techBonus:{},
      desc:'Équipementier sportif. Évolue avec ta popularité.',
      clauses:[
        { type:'races',      target:15, bonus:1,   penalty:0   },
        { type:'points_finishes', target:4,  bonus:2,  penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'santander',    name:'Santander',         logo:'🏦', category:'finance',
      type:'partner',    baseValue:10, maxValue:14, duration:2,
      reputationMin:{ sport:40, media:35, tech:25, finance:50 },
      personality:'loyal',
      techBonus:{},
      desc:'Banque internationale. Stabilité financière et loyauté.',
      clauses:[
        { type:'points',     target:25, bonus:3,   penalty:-2  },
        { type:'position',   target:8,  bonus:2,   penalty:-3  },
      ],
      exclusivity:null, breakClause:false,
    },

    // ── NOUVEAUX SPONSORS ─────────────────────────────────────

    // Title
    {
      id:'lng_energy',   name:'LNG Energy',        logo:'⚡', category:'energy',
      type:'title',      baseValue:27, maxValue:36, duration:2,
      reputationMin:{ sport:50, media:45, tech:45, finance:50 },
      personality:'developer',
      techBonus:{ engine:1 },
      desc:'Groupe énergétique en expansion. Cherche une équipe en progression.',
      clauses:[
        { type:'position_up', target:2,  bonus:12,  penalty:0   },
        { type:'points',      target:50, bonus:6,   penalty:-4  },
        { type:'dnf_max',     target:5,  bonus:0,   penalty:-5  },
      ],
      exclusivity:'energy', breakClause:false,
    },
    {
      id:'stakes',       name:'Stakes.com',         logo:'🎰', category:'betting',
      type:'title',      baseValue:29, maxValue:41, duration:2,
      reputationMin:{ sport:48, media:55, tech:35, finance:42 },
      personality:'opportunist',
      techBonus:{},
      desc:'Plateforme de paris en ligne. Très généreux mais exigeant.',
      clauses:[
        { type:'podiums',    target:5,  bonus:10,  penalty:-8  },
        { type:'points_finishes', target:11, bonus:5,  penalty:-4  },
        { type:'dnf_max',    target:4,  bonus:0,   penalty:-6  },
      ],
      exclusivity:'betting', breakClause:true,
    },

    // Principal
    {
      id:'crypto_com',   name:'Crypto.com',         logo:'💎', category:'crypto',
      type:'principal',  baseValue:14, maxValue:21, duration:2,
      reputationMin:{ sport:38, media:42, tech:38, finance:35 },
      personality:'opportunist',
      techBonus:{},
      desc:'Exchange crypto. Gros budget mais attend des résultats visibles.',
      clauses:[
        { type:'points_finishes', target:8,  bonus:5,  penalty:-4  },
        { type:'top10',      target:10, bonus:3,   penalty:-3  },
      ],
      exclusivity:'crypto', breakClause:true,
    },
    {
      id:'msport',       name:'MSport',             logo:'🏁', category:'motorsport',
      type:'principal',  baseValue:11, maxValue:17, duration:3,
      reputationMin:{ sport:32, media:28, tech:28, finance:28 },
      personality:'loyal',
      techBonus:{},
      desc:'Équipementier motorsport. Partenaire de longue date.',
      clauses:[
        { type:'races',      target:20, bonus:3,   penalty:-1  },
        { type:'top10',      target:8,  bonus:2,   penalty:0   },
      ],
      exclusivity:'motorsport', breakClause:false,
    },
    {
      id:'netapp',       name:'NetApp',             logo:'🔷', category:'tech',
      type:'principal',  baseValue:10, maxValue:14, duration:2,
      reputationMin:{ sport:28, media:28, tech:38, finance:32 },
      personality:'developer',
      techBonus:{ tokens:1 },
      desc:'Solutions de stockage data. Bonus tokens via data analytics.',
      clauses:[
        { type:'races',      target:18, bonus:2,   penalty:-1  },
        { type:'top10',      target:5,  bonus:2,   penalty:0   },
      ],
      exclusivity:'data', breakClause:false,
    },
    {
      id:'crowdstrike',  name:'CrowdStrike',        logo:'🦅', category:'tech',
      type:'principal',  baseValue:13, maxValue:18, duration:2,
      reputationMin:{ sport:35, media:32, tech:42, finance:35 },
      personality:'loyal',
      techBonus:{},
      desc:'Cybersécurité. Partenaire tech discret mais solide.',
      clauses:[
        { type:'races',      target:20, bonus:3,   penalty:-1  },
        { type:'dnf_max',    target:4,  bonus:0,   penalty:-3  },
      ],
      exclusivity:'cybersec', breakClause:false,
    },
    {
      id:'tissot',       name:'Tissot',             logo:'⌛', category:'luxury',
      type:'principal',  baseValue:8, maxValue:13, duration:2,
      reputationMin:{ sport:38, media:35, tech:18, finance:38 },
      personality:'loyal',
      techBonus:{},
      desc:'Horloger officiel F1. Accessible, fidèle et régulier.',
      clauses:[
        { type:'podiums',    target:2,  bonus:3,   penalty:-2  },
        { type:'races',      target:18, bonus:1,   penalty:0   },
      ],
      exclusivity:'watch', breakClause:false,
    },
    {
      id:'sabic',        name:'SABIC',              logo:'🟦', category:'chemical',
      type:'principal',  baseValue:10, maxValue:15, duration:3,
      reputationMin:{ sport:35, media:28, tech:38, finance:38 },
      personality:'loyal',
      techBonus:{ reliability:1 },
      desc:'Matériaux composites. Améliore la fiabilité des pièces.',
      clauses:[
        { type:'races',      target:20, bonus:2,   penalty:-1  },
        { type:'dnf_max',    target:4,  bonus:3,   penalty:-4  },
      ],
      exclusivity:'chemical', breakClause:false,
    },
    {
      id:'salesforce',   name:'Salesforce',         logo:'☁️', category:'tech',
      type:'principal',  baseValue:15, maxValue:22, duration:2,
      reputationMin:{ sport:42, media:38, tech:45, finance:42 },
      personality:'developer',
      techBonus:{ tokens:1 },
      desc:'CRM cloud. Investit dans les équipes qui progressent.',
      clauses:[
        { type:'position_up', target:2,  bonus:8,   penalty:0   },
        { type:'top10',       target:8,  bonus:3,   penalty:-2  },
      ],
      exclusivity:'crm', breakClause:false,
    },

    // Partners
    {
      id:'sparco',       name:'Sparco',             logo:'🔥', category:'apparel',
      type:'partner',    baseValue:4,  maxValue:6,  duration:2,
      reputationMin:{ sport:18, media:18, tech:12, finance:15 },
      personality:'loyal',
      techBonus:{},
      desc:'Équipements pilotes. Accessible à toutes les équipes.',
      clauses:[
        { type:'races',      target:15, bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'omp',          name:'OMP Racing',         logo:'🏎️', category:'apparel',
      type:'partner',    baseValue:3,  maxValue:5,  duration:2,
      reputationMin:{ sport:15, media:12, tech:10, finance:12 },
      personality:'loyal',
      techBonus:{},
      desc:'Combinaisons et équipements motorsport. Partenaire entrée de gamme.',
      clauses:[
        { type:'races',      target:12, bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'sofina',       name:'Sofina Foods',       logo:'🍜', category:'food',
      type:'partner',    baseValue:5,  maxValue:8, duration:2,
      reputationMin:{ sport:22, media:25, tech:12, finance:20 },
      personality:'loyal',
      techBonus:{},
      desc:'Agroalimentaire. Sponsor accessible, fidèle et peu exigeant.',
      clauses:[
        { type:'races',      target:18, bonus:1,   penalty:0   },
        { type:'points_finishes', target:3,  bonus:1,  penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'dstelecom',    name:'DS Telecom',         logo:'📱', category:'telecom',
      type:'partner',    baseValue:6,  maxValue:10, duration:2,
      reputationMin:{ sport:28, media:28, tech:28, finance:25 },
      personality:'developer',
      techBonus:{},
      desc:'Opérateur télécom. Visibilité digitale et croissance.',
      clauses:[
        { type:'points_finishes', target:5,  bonus:2,  penalty:-1  },
        { type:'top10',      target:5,  bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'hertz',        name:'Hertz',              logo:'🚗', category:'auto',
      type:'partner',    baseValue:7, maxValue:10, duration:2,
      reputationMin:{ sport:25, media:22, tech:15, finance:25 },
      personality:'loyal',
      techBonus:{},
      desc:'Location de véhicules. Partenariat logistique stable.',
      clauses:[
        { type:'races',      target:16, bonus:2,   penalty:-1  },
        { type:'points',     target:15, bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },

    // ── SPONSORS SUPPLÉMENTAIRES (total ~55) ─────────────────

    // Title supplémentaires
    {
      id:'mbs_capital',  name:'MBS Capital',        logo:'💰', category:'finance2',
      type:'title',      baseValue:28, maxValue:38, duration:2,
      reputationMin:{ sport:52, media:45, tech:40, finance:55 },
      personality:'loyal',
      techBonus:{},
      desc:'Fonds d\'investissement. Recherche la stabilité et la croissance.',
      clauses:[
        { type:'points',     target:60, bonus:8,   penalty:-5  },
        { type:'position',   target:6,  bonus:6,   penalty:-4  },
      ],
      exclusivity:'finance2', breakClause:false,
    },
    {
      id:'socios',       name:'Socios.com',          logo:'🪙', category:'crypto2',
      type:'title',      baseValue:24, maxValue:34, duration:2,
      reputationMin:{ sport:45, media:50, tech:35, finance:38 },
      personality:'opportunist',
      techBonus:{},
      desc:'Fan tokens et engagement communautaire. Très médiatique.',
      clauses:[
        { type:'points_finishes', target:10, bonus:8,  penalty:-5  },
        { type:'podiums',    target:3,  bonus:5,   penalty:-3  },
      ],
      exclusivity:'crypto2', breakClause:true,
    },
    {
      id:'mrf_tyres',    name:'MRF Tyres',           logo:'🛞', category:'tyre2',
      type:'title',      baseValue:21, maxValue:29, duration:3,
      reputationMin:{ sport:40, media:35, tech:42, finance:38 },
      personality:'loyal',
      techBonus:{ tyreDeg:-0.05 },
      desc:'Manufacturier de pneus. Partenariat technique et loyauté garantie.',
      clauses:[
        { type:'races',      target:20, bonus:4,   penalty:-2  },
        { type:'dnf_max',    target:5,  bonus:3,   penalty:-3  },
      ],
      exclusivity:'tyre2', breakClause:false,
    },

    // Principal supplémentaires
    {
      id:'tag_heuer',    name:'TAG Heuer',           logo:'🕰️', category:'watch',
      type:'principal',  baseValue:13, maxValue:18, duration:2,
      reputationMin:{ sport:45, media:40, tech:20, finance:45 },
      personality:'loyal',
      techBonus:{},
      desc:'Horloger de prestige. Partenaire des grandes occasions.',
      clauses:[
        { type:'podiums',    target:3,  bonus:4,   penalty:-3  },
        { type:'races',      target:15, bonus:2,   penalty:0   },
      ],
      exclusivity:'watch', breakClause:false,
    },
    {
      id:'acer',         name:'Acer Predator',       logo:'💻', category:'pc',
      type:'principal',  baseValue:10, maxValue:14, duration:2,
      reputationMin:{ sport:30, media:32, tech:35, finance:28 },
      personality:'developer',
      techBonus:{},
      desc:'Gaming & PC. Popularité auprès des jeunes fans.',
      clauses:[
        { type:'points_finishes', target:6,  bonus:3,  penalty:-1  },
        { type:'top10',      target:8,  bonus:2,   penalty:0   },
      ],
      exclusivity:'pc', breakClause:false,
    },
    {
      id:'cognizant2',   name:'Infosys',             logo:'🔵', category:'it',
      type:'principal',  baseValue:11, maxValue:15, duration:2,
      reputationMin:{ sport:32, media:28, tech:40, finance:32 },
      personality:'developer',
      techBonus:{ tokens:1 },
      desc:'Services IT et consulting. Bonus tokens via optimisation data.',
      clauses:[
        { type:'races',      target:18, bonus:2,   penalty:-1  },
        { type:'top10',      target:6,  bonus:2,   penalty:0   },
      ],
      exclusivity:'it', breakClause:false,
    },
    {
      id:'banco_do_brasil', name:'Banco do Brasil',  logo:'🇧🇷', category:'bank2',
      type:'principal',  baseValue:10, maxValue:15, duration:2,
      reputationMin:{ sport:35, media:30, tech:20, finance:40 },
      personality:'loyal',
      techBonus:{},
      desc:'Banque nationale brésilienne. Forte visibilité à Interlagos.',
      clauses:[
        { type:'points',     target:20, bonus:3,   penalty:-2  },
        { type:'races',      target:16, bonus:1,   penalty:0   },
      ],
      exclusivity:'bank2', breakClause:false,
    },
    {
      id:'gulf',         name:'Gulf Oil',            logo:'🔵', category:'oil',
      type:'principal',  baseValue:12, maxValue:17, duration:2,
      reputationMin:{ sport:35, media:30, tech:38, finance:35 },
      personality:'loyal',
      techBonus:{ engine:1 },
      desc:'Huile moteur iconique. Améliore les performances moteur.',
      clauses:[
        { type:'races',      target:18, bonus:3,   penalty:-2  },
        { type:'dnf_max',    target:4,  bonus:2,   penalty:-3  },
      ],
      exclusivity:'oil', breakClause:false,
    },
    {
      id:'etihad',       name:'Etihad Airways',      logo:'✈️', category:'airline',
      type:'principal',  baseValue:14, maxValue:20, duration:2,
      reputationMin:{ sport:42, media:38, tech:28, finance:42 },
      personality:'loyal',
      techBonus:{},
      desc:'Compagnie aérienne. Réduit les coûts de déplacement.',
      clauses:[
        { type:'races',      target:20, bonus:3,   penalty:-2  },
        { type:'top10',      target:7,  bonus:2,   penalty:0   },
      ],
      exclusivity:'airline', breakClause:false,
    },
    {
      id:'emirates',     name:'Emirates',            logo:'✈️', category:'airline2',
      type:'principal',  baseValue:15, maxValue:21, duration:3,
      reputationMin:{ sport:45, media:42, tech:28, finance:45 },
      personality:'loyal',
      techBonus:{},
      desc:'Compagnie aérienne premium. Sponsor historique du sport.',
      clauses:[
        { type:'podiums',    target:3,  bonus:5,   penalty:-3  },
        { type:'races',      target:18, bonus:2,   penalty:0   },
      ],
      exclusivity:'airline2', breakClause:false,
    },
    {
      id:'adobe',        name:'Adobe',               logo:'🎨', category:'software',
      type:'principal',  baseValue:10, maxValue:15, duration:2,
      reputationMin:{ sport:28, media:35, tech:38, finance:30 },
      personality:'developer',
      techBonus:{},
      desc:'Logiciels créatifs. Boost la réputation médiatique.',
      clauses:[
        { type:'points_finishes', target:7,  bonus:3,  penalty:-1  },
        { type:'races',      target:15, bonus:1,   penalty:0   },
      ],
      exclusivity:'software', breakClause:false,
    },
    {
      id:'sabelt',       name:'Sabelt',              logo:'🪖', category:'safety',
      type:'principal',  baseValue:6,  maxValue:9, duration:2,
      reputationMin:{ sport:20, media:18, tech:22, finance:18 },
      personality:'loyal',
      techBonus:{ reliability:1 },
      desc:'Équipements de sécurité. Améliore la fiabilité.',
      clauses:[
        { type:'races',      target:18, bonus:1,   penalty:0   },
        { type:'dnf_max',    target:5,  bonus:2,   penalty:-1  },
      ],
      exclusivity:'safety', breakClause:false,
    },

    // Partners supplémentaires
    {
      id:'puma',         name:'Puma',                logo:'🐆', category:'sport_apparel',
      type:'partner',    baseValue:5,  maxValue:8, duration:2,
      reputationMin:{ sport:22, media:25, tech:12, finance:18 },
      personality:'loyal',
      techBonus:{},
      desc:'Équipementier sportif mondial. Partenaire accessible.',
      clauses:[
        { type:'races',      target:15, bonus:1,   penalty:0   },
        { type:'points_finishes', target:4,  bonus:1,  penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'alpinestars',  name:'Alpinestars',         logo:'⭐', category:'racing_gear',
      type:'partner',    baseValue:4,  maxValue:7, duration:2,
      reputationMin:{ sport:18, media:15, tech:15, finance:15 },
      personality:'loyal',
      techBonus:{},
      desc:'Équipements de course. Partenaire technique discret.',
      clauses:[
        { type:'races',      target:14, bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'ntt',          name:'NTT Data',            logo:'📡', category:'telecom2',
      type:'partner',    baseValue:7, maxValue:10, duration:2,
      reputationMin:{ sport:25, media:22, tech:32, finance:25 },
      personality:'developer',
      techBonus:{ tokens:1 },
      desc:'Data et télécommunications. Bonus tokens analyse de performance.',
      clauses:[
        { type:'races',      target:16, bonus:1,   penalty:0   },
        { type:'top10',      target:4,  bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'norton',       name:'Norton LifeLock',     logo:'🛡️', category:'security',
      type:'partner',    baseValue:6,  maxValue:10, duration:2,
      reputationMin:{ sport:22, media:20, tech:28, finance:22 },
      personality:'loyal',
      techBonus:{},
      desc:'Cybersécurité grand public. Partenaire tech discret.',
      clauses:[
        { type:'races',      target:15, bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'smartsheet',   name:'Smartsheet',          logo:'📊', category:'saas',
      type:'partner',    baseValue:6,  maxValue:8, duration:2,
      reputationMin:{ sport:20, media:18, tech:25, finance:20 },
      personality:'developer',
      techBonus:{},
      desc:'Gestion de projets SaaS. Partenaire en croissance.',
      clauses:[
        { type:'races',      target:14, bonus:1,   penalty:0   },
        { type:'position_up',target:1,  bonus:2,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'singha',       name:'Singha Beer',         logo:'🍻', category:'beverage2',
      type:'partner',    baseValue:6,  maxValue:8, duration:2,
      reputationMin:{ sport:20, media:22, tech:10, finance:18 },
      personality:'loyal',
      techBonus:{},
      desc:'Bière thaïlandaise. Présence forte en Asie.',
      clauses:[
        { type:'races',      target:15, bonus:1,   penalty:0   },
        { type:'points_finishes', target:3,  bonus:1,  penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'chandon',      name:'Chandon',             logo:'🍾', category:'champagne',
      type:'partner',    baseValue:4,  maxValue:7, duration:2,
      reputationMin:{ sport:25, media:28, tech:10, finance:22 },
      personality:'loyal',
      techBonus:{},
      desc:'Champagne officiel du podium. Bonus si podiums réguliers.',
      clauses:[
        { type:'podiums',    target:2,  bonus:2,   penalty:0   },
        { type:'races',      target:12, bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'lenovo',       name:'Lenovo',              logo:'💡', category:'hardware',
      type:'partner',    baseValue:8, maxValue:11, duration:2,
      reputationMin:{ sport:25, media:22, tech:30, finance:25 },
      personality:'developer',
      techBonus:{},
      desc:'Hardware et solutions tech. Partenaire R&D.',
      clauses:[
        { type:'races',      target:16, bonus:1,   penalty:0   },
        { type:'top10',      target:5,  bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
    {
      id:'zoom',         name:'Zoom',                logo:'📹', category:'comms',
      type:'partner',    baseValue:5,  maxValue:8, duration:2,
      reputationMin:{ sport:18, media:25, tech:28, finance:18 },
      personality:'loyal',
      techBonus:{},
      desc:'Communications vidéo. Visibilité dans le paddock digital.',
      clauses:[
        { type:'points_finishes', target:4,  bonus:1,  penalty:0   },
        { type:'races',      target:14, bonus:1,   penalty:0   },
      ],
      exclusivity:null, breakClause:false,
    },
  ],

  // ── COMPÉTITION IA POUR LES SPONSORS ──────────────────────
  // Les équipes IA "occupent" certains sponsors selon leur niveau
  initAISponsors(save) {
    if (save.aiSponsors) return; // déjà initialisé
    save.aiSponsors = {};

    // Assignation réaliste : top équipes ont les gros sponsors
    const aiAssignments = [
      { teamId:'mclaren',     sponsorIds:['oracle','monster','dhl','acer','chandon'] },
      { teamId:'ferrari',     sponsorIds:['shell','santander','rolex','adobe','tag_heuer'] },
      { teamId:'redbull',     sponsorIds:['heineken','crypto_com','lenovo','norton','zoom'] },
      { teamId:'mercedes',    sponsorIds:['petronas','crowdstrike','ntt','emirates','sabelt'] },
      { teamId:'aston',       sponsorIds:['aramco','cognizant','etihad','salesforce','mbs_capital'] },
      { teamId:'alpine',      sponsorIds:['bwt','dstelecom','singha','puma','socios'] },
      { teamId:'williams',    sponsorIds:['sofina','omp','smartsheet','gulf','banco_do_brasil'] },
      { teamId:'haas',        sponsorIds:['msport','sparco','sabelt','norton','alpinestars'] },
      { teamId:'sauber',      sponsorIds:['netapp','hertz','cognizant2','mrf_tyres','sabic'] },
      { teamId:'racingbulls', sponsorIds:['stakes','tissot','cognizant2','castore','google'] },
      { teamId:'cadillac',    sponsorIds:['lng_energy','pirelli_p','aws','zoom','lenovo'] },
    ];

    aiAssignments.forEach(a => {
      a.sponsorIds.forEach(sid => {
        save.aiSponsors[sid] = { teamId: a.teamId, until: (save.season||2025) + 2 };
      });
    });
  },

  // Vérifier si un sponsor est pris par une IA
  isTakenByAI(save, sponsorId) {
    const ai = save.aiSponsors?.[sponsorId];
    if (!ai) return false;
    if (ai.until < (save.season||2025)) {
      delete save.aiSponsors[sponsorId];
      return false;
    }
    return ai;
  },

  // Débaucher un sponsor d'une équipe IA (coûte de la réputation)
  poachFromAI(save, sponsorId) {
    const ai = save.aiSponsors?.[sponsorId];
    if (!ai) return true; // libre
    // Débaucher coûte -5 réputation sportive (friction)
    if (save.reputation) {
      save.reputation.sport   = Math.max(10, (save.reputation.sport||40) - 3);
      save.reputation.finance = Math.max(10, (save.reputation.finance||40) - 2);
    }
    delete save.aiSponsors[sponsorId];
    if (save.news) save.news.push({
      icon:'⚔️', category:'sponsor',
      title:`Débauche de sponsor`,
      text:`Tu as convaincu un sponsor de quitter ${ai.teamId}. Légère tension dans le paddock.`,
    });
    return true;
  },

  // Fin de saison IA : les équipes IA renouvellent ou perdent des sponsors
  updateAISponsorships(save, playerPos) {
    if (!save.aiSponsors) return;
    // Renouvellement aléatoire
    Object.entries(save.aiSponsors).forEach(([sid, ai]) => {
      if (Math.random() < 0.3) {
        // 30% de chance de libérer le sponsor
        delete save.aiSponsors[sid];
      } else {
        ai.until = (save.season||2025) + 1 + Math.floor(Math.random() * 2);
      }
    });
    // Top équipes IA signent de nouveaux sponsors
    const topAI = ['mclaren','ferrari','redbull','mercedes'];
    const bigSponsors = this.DB.filter(s => s.type === 'title' || s.baseValue >= 30);
    topAI.forEach(teamId => {
      if (Math.random() < 0.4) {
        const free = bigSponsors.filter(s => !save.aiSponsors?.[s.id] && !(save.sponsors||[]).find(sp=>sp.id===s.id));
        if (free.length) {
          const pick = free[Math.floor(Math.random()*free.length)];
          save.aiSponsors[pick.id] = { teamId, until: (save.season||2025) + 2 };
        }
      }
    });
  },

  // ── INITIALISER LES SPONSORS D'UNE NOUVELLE CARRIÈRE ──────
  initCareer(save) {
    if (!save) return;

    // Réputation initiale selon l'équipe
    const team = F1Data.teams.find(t => t.id === save.playerTeamId);
    const baseRep = Math.round((team?.performance || 70) * 0.7);

    save.reputation = save.reputation || {
      sport:    Math.max(30, baseRep),
      media:    Math.max(25, baseRep - 5),
      tech:     Math.max(25, baseRep - 3),
      finance:  Math.max(25, baseRep - 5),
    };

    save.sponsors     = save.sponsors     || [];
    save.sponsorOffers= save.sponsorOffers|| [];
    save.sponsorHistory = save.sponsorHistory || [];

    // Générer les offres initiales selon la réputation
    this.generateMarketOffers(save);
    this.initAISponsors(save);
    Save.save(save);
  },

  // ── GÉNÉRER LES OFFRES DU MARCHÉ ──────────────────────────
  generateMarketOffers(save) {
    const rep   = save.reputation || { sport:40, media:40, tech:40, finance:40 };
    const active = (save.sponsors||[]).map(s => s.id);
    const excls  = (save.sponsors||[]).map(s => s.exclusivity).filter(Boolean);

    const available = this.DB.filter(sp => {
      if (active.includes(sp.id)) return false;
      if (sp.exclusivity && excls.includes(sp.exclusivity)) return false;
      const r = sp.reputationMin;
      if (rep.sport   < (r.sport   || 0)) return false;
      if (rep.media   < (r.media   || 0)) return false;
      if (rep.tech    < (r.tech    || 0)) return false;
      if (rep.finance < (r.finance || 0)) return false;
      return true;
    });

    const inaccessible = this.DB.filter(sp => {
      if (active.includes(sp.id)) return false;
      if (sp.exclusivity && excls.includes(sp.exclusivity)) return false;
      return !available.includes(sp);
    }).slice(0, 12);

    // Stocker SEULEMENT l'id et la valeur négociée — pas l'objet complet
    // Les détails sont toujours lus depuis le DB frais dans renderMarket
    save.sponsorOffers = [...available, ...inaccessible].map(sp => ({
      id:         sp.id,
      offerValue: Math.round(sp.baseValue * (0.9 + Math.random() * 0.2)),
      expiresAt:  (save.race || 0) + 4,
      accessible: available.includes(sp),
    }));
  },

  // ── SIGNER UN CONTRAT ─────────────────────────────────────
  sign(save, sponsorId, negotiatedValue, negotiatedObjectives) {
    const sp = this.DB.find(s => s.id === sponsorId);
    if (!sp) return { ok:false, reason:'Sponsor introuvable' };

    // Limites par type
    const activeTypes = (save.sponsors||[]).map(s => s.type);
    const titleCount     = activeTypes.filter(t => t === 'title').length;
    const principalCount = activeTypes.filter(t => t === 'principal').length;
    const partnerCount   = activeTypes.filter(t => t === 'partner').length;

    if (sp.type === 'title' && titleCount >= 1) {
      return { ok:false, reason:'Déjà un title sponsor actif !' };
    }
    if ((save.sponsors||[]).length >= 6) {
      return { ok:false, reason:'Maximum 6 sponsors atteint !' };
    }
    if (sp.type === 'principal' && principalCount >= 2) {
      return { ok:false, reason:'Maximum 2 principal sponsors atteint !' };
    }
    if (sp.type === 'partner' && partnerCount >= 3) {
      return { ok:false, reason:'Maximum 3 technical partners atteint !' };
    }

    // Vérifier exclusivité
    const excls = (save.sponsors||[]).map(s => s.exclusivity).filter(Boolean);
    if (sp.exclusivity && excls.includes(sp.exclusivity)) {
      return { ok:false, reason:`Exclusivité ${sp.exclusivity} déjà prise` };
    }

    const contract = {
      id:          sp.id,
      name:        sp.name,
      logo:        sp.logo,
      category:    sp.category,
      type:        sp.type,
      exclusivity: sp.exclusivity,
      personality: sp.personality,
      techBonus:   sp.techBonus,
      value:       negotiatedValue || sp.baseValue,
      duration:    sp.duration,
      remainingSeasons: sp.duration,
      clauses:     negotiatedObjectives || sp.clauses.map(c => ({ ...c, progress:0 })),
      signedAt:    save.season || 2025,
      breakClause: sp.breakClause,
      satisfied:   true,
    };

    save.sponsors = save.sponsors || [];
    save.sponsors.push(contract);

    // Supprimer de la liste des offres
    save.sponsorOffers = (save.sponsorOffers||[]).filter(o => o.id !== sponsorId);

    // Appliquer les bonus techniques
    this.applyTechBonuses(save);
    // Créditer immédiatement les tokens bonus
    if (save.sponsorBonuses?.tokens > 0) {
      save.tokens = (save.tokens||0) + save.sponsorBonuses.tokens;
    }

    // Régénérer le marché avec les nouvelles exclusivités
    this.generateMarketOffers(save);

    // Sauvegarder
    Save.save(save);

    // Log news
    if (save.news) save.news.push({
      icon:'🤝', category:'sponsor',
      title:`Nouveau sponsor : ${sp.name}`,
      text:`Contrat ${sp.duration} an(s) signé pour ${contract.value}M€/an. ${sp.desc}`,
    });

    return { ok:true, contract };
  },

  // ── BONUS TECHNIQUES ──────────────────────────────────────
  applyTechBonuses(save) {
    save.sponsorBonuses = { tokens:0, engine:0, tyreDeg:0, logistics:0 };
    (save.sponsors||[]).forEach(sp => {
      if (!sp.techBonus) return;
      Object.entries(sp.techBonus).forEach(([key, val]) => {
        save.sponsorBonuses[key] = (save.sponsorBonuses[key]||0) + val;
      });
    });
  },

  // ── PROGRESSION OBJECTIFS APRÈS COURSE ────────────────────
  updateAfterRace(save, raceResult) {
    if (!save?.sponsors?.length || !raceResult) return;

    const playerResults = raceResult.results?.filter(r => (r.team?.id || r.teamId) === save.playerTeamId) || [];
    const bestPos       = playerResults.length ? Math.min(...playerResults.map(r => r.position||20)) : 20;
    const teamPoints    = playerResults.reduce((s,r) => s+(r.points||0), 0);
    const dnfs          = playerResults.filter(r => r.status === 'dnf').length;
    const mediaScore    = (bestPos <= 3 ? 3 : bestPos <= 10 ? 1 : 0);

    (save.sponsors||[]).forEach(sp => {
      (sp.clauses||[]).forEach(cl => {
        cl.progress = cl.progress || 0;
        const wasAlreadyMet = cl.type === 'dnf_max'
          ? cl.progress > cl.target
          : cl.progress >= cl.target;

        switch(cl.type) {
          case 'podiums':         if (bestPos <= 3)  cl.progress++; break;
          case 'top5':            if (bestPos <= 5)  cl.progress++; break;
          case 'top10':           if (bestPos <= 10) cl.progress++; break;
          case 'quali_top5':      if (save.lastQualiPos <= 5) cl.progress++; break;
          case 'points':          cl.progress += teamPoints; break;
          case 'races':           cl.progress++; break;
          case 'points_finishes': if (teamPoints > 0) cl.progress++; break;
          case 'media':           cl.progress += mediaScore; break;
          case 'dnf_max':         cl.progress += dnfs; break;
        }

        // Objectif atteint pour la première fois → bonus immédiat + nouvel objectif
        const isMet = cl.type === 'dnf_max'
          ? cl.progress <= cl.target
          : cl.progress >= cl.target;

        if (isMet && !wasAlreadyMet && !cl.bonusPaid) {
          // Verser le bonus immédiatement
          if (cl.bonus > 0) {
            save.budget = Math.round(((save.budget||0) + cl.bonus) * 10) / 10;
            cl.bonusPaid = true;
            save.news = save.news || [];
            save.news.unshift({
              icon: '🎯', category: 'sponsor', date: new Date().toISOString(),
              title: `Objectif atteint — ${sp.name} !`,
              text: `Bonus versé : +${cl.bonus}M€. ${sp.personality === 'developer' ? 'Un nouvel objectif bonus est disponible !' : ''}`,
            });
          }

          // Sponsor développeur → propose un objectif bonus plus difficile
          if (sp.personality === 'developer' && !cl.bonusObjective) {
            cl.bonusObjective = {
              target:     Math.round(cl.target * 1.5),
              bonus:      Math.round(cl.bonus * 1.3),
              progress:   cl.progress,
              unlocked:   true,
            };
          }
        }

        // Objectif bonus atteint
        if (cl.bonusObjective?.unlocked && !cl.bonusObjective.paid) {
          const bonusReached = cl.progress >= cl.bonusObjective.target;
          if (bonusReached) {
            save.budget = Math.round(((save.budget||0) + cl.bonusObjective.bonus) * 10) / 10;
            cl.bonusObjective.paid = true;
            save.news = save.news || [];
            save.news.unshift({
              icon: '🏆', category: 'sponsor', date: new Date().toISOString(),
              title: `Objectif bonus atteint — ${sp.name} !`,
              text: `Tu as dépassé les attentes ! Bonus exceptionnel : +${cl.bonusObjective.bonus}M€`,
            });
          }
        }
      });
    });

    // Réputation
    save.reputation = save.reputation || { sport:40, media:40, tech:40, finance:40 };
    if (bestPos <= 3) {
      save.reputation.sport = Math.min(100, save.reputation.sport + 1);
      save.reputation.media = Math.min(100, save.reputation.media + 1);
    }
    if (dnfs > 0) {
      save.reputation.tech = Math.max(10, save.reputation.tech - 1);
    }

    Save.save(save);
  },


  resetSeasonProgress(save) {
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

  // ── FIN DE SAISON ─────────────────────────────────────────
  endOfSeason(save, playerPos) {
    if (!save) return { gained:0, lost:0, renewed:0, bonuses:0 };

    let gained=0, lost=0, renewed=0, bonuses=0;

    (save.sponsors||[]).forEach(sp => {
      // Calculer si objectifs atteints
      let allMet=true, totalBonus=0, totalPenalty=0;

      (sp.clauses||[]).forEach(cl => {
        const isMet = cl.type === 'dnf_max'
          ? cl.progress <= cl.target  // inversé : pénalité si trop de DNF
          : cl.progress >= cl.target;

        if (isMet) {
          totalBonus += (cl.bonus || 0);
        } else {
          allMet = false;
          totalPenalty += Math.abs(cl.penalty || 0);
        }
      });

      // Vérifier break clause (chute classement)
      const breakTriggered = sp.breakClause && playerPos > 6 && sp.personality === 'opportunist';

      if (breakTriggered || (!allMet && sp.personality === 'opportunist' && totalPenalty > 10)) {
        // Sponsor opportuniste déçu → part
        save.sponsorHistory = save.sponsorHistory || [];
        save.sponsorHistory.push({ ...sp, endReason: breakTriggered ? 'break_clause' : 'objectives_missed', endSeason: save.season });
        save.sponsors = save.sponsors.filter(s => s.id !== sp.id);
        save.budget = Math.round(((save.budget||0) - totalPenalty) * 10) / 10;
        lost++;

        if (save.news) save.news.push({
          icon:'💔', category:'sponsor',
          title:`${sp.name} quitte l'équipe`,
          text:`Objectifs non atteints. Pénalité : ${totalPenalty}M€.`,
        });
      } else {
        // Appliquer bonus/pénalités
        const net = totalBonus - (allMet ? 0 : totalPenalty * 0.5); // pénalité réduite si loyal
        save.budget = Math.round(((save.budget||0) + net) * 10) / 10;
        bonuses += net;

        // Réduire la durée restante
        sp.remainingSeasons = (sp.remainingSeasons||sp.duration) - 1;

        if (sp.remainingSeasons <= 0) {
          // Contrat terminé — proposition de renouvellement ?
          if (allMet || sp.personality === 'loyal') {
            // Proposer un renouvellement amélioré
            const newValue = Math.round(sp.value * (allMet ? 1.15 : 1.0));
            sp.value    = Math.min(sp.maxValue || sp.value * 1.5, newValue);
            sp.remainingSeasons = sp.duration;
            
            sp.clauses.forEach(cl => {
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
            sp.progress = 0;
            sp.paid = false;
            sp._progressSeason = save.season || 2025;
            renewed++;
            if (save.news) save.news.push({
              icon:'🔄', category:'sponsor',
              title:`${sp.name} renouvelle !`,
              text:`Nouveau contrat ${sp.duration} ans à ${sp.value}M€/an.`,
            });
          } else {
            save.sponsors = save.sponsors.filter(s => s.id !== sp.id);
            lost++;
          }
        } else {
          // Reset progress pour la nouvelle saison
          
            sp.clauses.forEach(cl => {
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
            sp.progress = 0;
            sp.paid = false;
            sp._progressSeason = save.season || 2025;
        }

        // Sponsor développeur — augmente si progression classement
        if (sp.personality === 'developer' && playerPos <= 6) {
          sp.value = Math.min(sp.maxValue || sp.value*1.5, Math.round(sp.value * 1.08));
        }
      }
    });

    // Réputation fin de saison — changements significatifs mais rares
    const repBonus = playerPos <= 3 ? 4 : playerPos <= 6 ? 2 : playerPos <= 10 ? 1 : 0;
    const repPenalty = playerPos >= 10 ? -1 : 0; // pénalité seulement si vraiment en fond

    // Sportive et médiatique : selon classement
    save.reputation = {
      sport:   Math.max(10, Math.min(100, (rep.sport||40)   + repBonus + repPenalty)),
      media:   Math.max(15, Math.min(100, (rep.media||40)   + repBonus)), // jamais pénalisée
      tech:    Math.max(15, Math.min(100, (rep.tech||40)    + (repBonus > 0 ? 1 : 0)   // monte si bons résultats
                                        + (save._seasonDnfs||0) === 0 ? 1 : 0)),        // +1 si saison sans DNF
      finance: Math.max(15, Math.min(100, (rep.finance||40) + (playerPos <= 6 ? 2 : playerPos <= 10 ? 1 : 0))), // jamais pénalisée
    };

    // Générer de nouvelles offres pour la saison suivante
    this.generateMarketOffers(save);
    this.updateAISponsorships(save, playerPos);
    this.applyTechBonuses(save);
    Save.save(save);

    return { gained, lost, renewed, bonuses };
  },

  // ── CALCULER LE REVENU ANNUEL TOTAL ───────────────────────
  totalAnnualValue(save) {
    return (save.sponsors||[]).reduce((s, sp) => s + (sp.value||0), 0);
  },

  // ── NIVEAU DE RÉPUTATION EN TEXTE ─────────────────────────
  repLabel(val) {
    if (val >= 85) return { label:'Légendaire', color:'#f5c842' };
    if (val >= 70) return { label:'Excellente',  color:'#00d97e' };
    if (val >= 55) return { label:'Bonne',        color:'#3d7eff' };
    if (val >= 40) return { label:'Moyenne',      color:'#ff8c42' };
    return               { label:'Faible',        color:'#e8003d' };
  },

  // ── PROBABILITÉ D'ACCEPTATION CONTRE-OFFRE ────────────────
  acceptanceProbability(save, sp, offeredValue) {
    const rep = save.reputation || { sport:40, media:40, tech:40, finance:40 };
    const r   = sp.reputationMin || {};

    // Score de réputation (0-1)
    const repScore = (
      Math.min(1, rep.sport   / (r.sport   || 50)) +
      Math.min(1, rep.media   / (r.media   || 50)) +
      Math.min(1, rep.tech    / (r.tech    || 50)) +
      Math.min(1, rep.finance / (r.finance || 50))
    ) / 4;

    // Ratio valeur offerte vs valeur max
    const valueRatio = offeredValue / (sp.maxValue || sp.baseValue * 1.4);

    // Probabilité finale
    const prob = Math.min(0.95, repScore * 0.6 + valueRatio * 0.4);
    return Math.round(prob * 100);
  },
};

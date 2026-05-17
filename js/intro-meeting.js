
/* ============================================================
   INTRO MEETING — rencontre pilotes + staff à la création de partie
   ------------------------------------------------------------
   Objectif :
   - éviter le message pilote isolé au début
   - afficher une introduction complète seulement une fois par sauvegarde
   - ne rien casser si certaines données sont absentes
   ============================================================ */

(function(){
  const INTRO_KEY = "f1m_intro_meeting_seen_v1";
  const SAVE_KEYS = [
    "f1-manager-save",
    "f1_manager_save",
    "f1Save",
    "f1_save",
    "save",
    "careerSave"
  ];

  function readSave(){
    for(const key of SAVE_KEYS){
      try{
        const raw = localStorage.getItem(key);
        if(!raw) continue;
        const parsed = JSON.parse(raw);
        if(parsed && typeof parsed === "object"){
          return { key, save: parsed };
        }
      }catch(e){}
    }
    return { key: null, save: null };
  }

  function writeSave(key, save){
    if(!key || !save) return;
    try{ localStorage.setItem(key, JSON.stringify(save)); }catch(e){}
  }

  function getTeam(save){
    const teams = window.F1Data?.teams || window.teams || [];
    const teamId = save?.playerTeamId || save?.teamId || save?.playerTeam || save?.selectedTeamId;
    return teams.find(t => t.id === teamId || t.code === teamId || t.name === teamId) || teams[0] || null;
  }

  function getDrivers(save, team){
    const drivers = window.F1Data?.drivers || window.drivers || [];
    const teamId = team?.id || save?.playerTeamId || save?.teamId || save?.playerTeam || save?.selectedTeamId;
    let result = drivers.filter(d => d.teamId === teamId || d.team === teamId || d.teamCode === team?.code);

    if(!result.length && Array.isArray(save?.drivers)){
      result = save.drivers;
    }

    return result.slice(0,2);
  }

  function driverName(d, fallback){
    return d?.name || d?.fullName || d?.lastName || fallback;
  }

  function shouldShowIntro(save){
    if(!save) return false;

    // Déjà vu globalement ou dans la sauvegarde
    if(localStorage.getItem(INTRO_KEY) === "1") return false;
    if(save.introMeetingSeen || save.firstMeetingDone || save.onboardingDone) return false;

    // Indices de nouvelle partie : saison/tour/GP initial, peu de progression.
    const gp = Number(save.currentGp ?? save.gpIndex ?? save.round ?? 0);
    const seasonStarted = save.seasonStarted ?? save.careerStarted ?? true;
    const hasHistory = Array.isArray(save.history) && save.history.length > 0;

    return seasonStarted && gp <= 0 && !hasHistory;
  }

  function markSeen(saveInfo){
    localStorage.setItem(INTRO_KEY, "1");
    if(saveInfo?.save){
      saveInfo.save.introMeetingSeen = true;
      saveInfo.save.firstMeetingDone = true;
      writeSave(saveInfo.key, saveInfo.save);
    }
  }

  function removeLonelyStarterMessages(){
    // Nettoie uniquement les cartes/messages d'accueil isolés, pas le vrai journal de course.
    const selectors = [
      ".starter-message",
      ".welcome-driver-message",
      ".new-game-driver-message",
      ".intro-driver-message",
      "[data-intro-message='driver']"
    ];
    document.querySelectorAll(selectors.join(",")).forEach(el => el.remove());
  }

  function createModal(team, drivers){
    const existing = document.getElementById("introMeetingModal");
    if(existing) existing.remove();

    const d1 = driverName(drivers[0], "Pilote 1");
    const d2 = driverName(drivers[1], "Pilote 2");
    const teamName = team?.name || team?.code || "l'écurie";

    const overlay = document.createElement("div");
    overlay.id = "introMeetingModal";
    overlay.className = "intro-meeting-overlay";
    overlay.innerHTML = `
      <div class="intro-meeting-card">
        <div class="intro-meeting-kicker">Nouvelle carrière</div>
        <h2>Première réunion avec ${teamName}</h2>
        <p class="intro-meeting-lead">
          Bienvenue dans le garage. Avant le premier Grand Prix, les pilotes et le staff veulent poser les bases de la saison.
        </p>

        <div class="intro-meeting-grid">
          <div class="intro-person driver">
            <span class="role">Pilote</span>
            <strong>${d1}</strong>
            <p>“On a besoin d’une direction claire. Donne-nous une voiture régulière et on ira chercher les opportunités.”</p>
          </div>
          <div class="intro-person driver">
            <span class="role">Pilote</span>
            <strong>${d2}</strong>
            <p>“La saison sera longue. Si la stratégie est solide, on peut marquer gros même dans les week-ends difficiles.”</p>
          </div>
          <div class="intro-person staff">
            <span class="role">Ingénieur course</span>
            <strong>Mur des stands</strong>
            <p>“On surveillera pneus, météo et fenêtres d’arrêt. Les décisions rapides feront la différence.”</p>
          </div>
          <div class="intro-person staff">
            <span class="role">Direction sportive</span>
            <strong>Objectif saison</strong>
            <p>“Construire une base propre, éviter les erreurs et progresser Grand Prix après Grand Prix.”</p>
          </div>
        </div>

        <button id="introMeetingStartBtn" class="intro-meeting-btn">Commencer la saison</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#introMeetingStartBtn").addEventListener("click", () => {
      overlay.classList.add("closing");
      setTimeout(() => overlay.remove(), 180);
      const saveInfo = readSave();
      markSeen(saveInfo);
    });
  }

  function run(){
    removeLonelyStarterMessages();

    const saveInfo = readSave();
    const save = saveInfo.save;
    if(!shouldShowIntro(save)) return;

    const team = getTeam(save);
    const drivers = getDrivers(save, team);
    createModal(team, drivers);
  }

  // Laisse les données du jeu se charger avant de construire le contenu.
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(run, 350);
  });

  window.F1IntroMeeting = {
    reset(){
      localStorage.removeItem(INTRO_KEY);
      const info = readSave();
      if(info.save){
        delete info.save.introMeetingSeen;
        delete info.save.firstMeetingDone;
        writeSave(info.key, info.save);
      }
    },
    showNow(){
      const info = readSave();
      createModal(getTeam(info.save), getDrivers(info.save, getTeam(info.save)));
    }
  };
})();

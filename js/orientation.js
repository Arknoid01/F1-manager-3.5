/* ============================================================
   orientation.js — Force mode paysage sur mobile
   À inclure dans toutes les pages via <script src="js/orientation.js">
   ============================================================ */
(function(){

  /* 1. Tente de verrouiller via Screen Orientation API (Chrome Android) */
  function tryLock(){
    try{
      if(screen.orientation && screen.orientation.lock){
        screen.orientation.lock('landscape').catch(function(){});
      } else if(screen.lockOrientation){
        screen.lockOrientation('landscape');
      } else if(screen.mozLockOrientation){
        screen.mozLockOrientation('landscape');
      }
    }catch(e){}
  }

  /* 2. Injecte la bannière "Tourne ton téléphone" si pas déjà là */
  function injectHint(){
    if(document.getElementById('rotate-hint')) return;
    var div = document.createElement('div');
    div.id  = 'rotate-hint';
    div.innerHTML =
      '<div class="rh-icon">📱</div>'+
      '<div class="rh-title">Mode Paysage</div>'+
      '<div class="rh-sub">Tourne ton téléphone<br>pour une meilleure expérience</div>'+
      '<div class="rh-skip" id="rh-skip">Continuer en portrait →</div>';
    document.body.appendChild(div);

    document.getElementById('rh-skip').addEventListener('click', function(){
      div.style.display = 'none';
      /* Stocke le choix pour ne pas re-afficher */
      try{ sessionStorage.setItem('skipRotate','1'); }catch(e){}
    });
  }

  /* 3. Vérifie l'orientation et affiche/masque le hint */
  function checkOrientation(){
    /* Si l'utilisateur a dit "continuer en portrait" → on n'embête plus */
    try{ if(sessionStorage.getItem('skipRotate')) return; }catch(e){}

    var isPortrait = window.innerHeight > window.innerWidth;
    var hint = document.getElementById('rotate-hint');
    if(hint) hint.style.display = isPortrait ? 'flex' : 'none';
  }

  /* Init au chargement */
  document.addEventListener('DOMContentLoaded', function(){
    /* Ne pas afficher sur desktop (largeur > 900px) */
    if(window.innerWidth > 900) return;

    tryLock();
    injectHint();
    checkOrientation();

    window.addEventListener('resize',        checkOrientation);
    window.addEventListener('orientationchange', function(){
      setTimeout(checkOrientation, 300);
    });
  });

})();

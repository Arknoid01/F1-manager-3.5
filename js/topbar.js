/* ============================================================
   topbar.js — Topbar universelle F1 Manager
   À inclure dans toutes les pages AVANT les autres scripts.
   Injecte automatiquement :
   - La police Orbitron si absente
   - Les pills saison + budget dans .top-pills
   - Le logo standardisé
   ============================================================ */
(function(){

  /* ── 1. Orbitron si pas déjà chargé ── */
  if(!document.querySelector('link[href*="Orbitron"]')){
    var l = document.createElement('link');
    l.rel  = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap';
    document.head.appendChild(l);
  }

  /* ── 2. Standardise la topbar après le DOM ── */
  document.addEventListener('DOMContentLoaded', function(){
    var save = (typeof Save !== 'undefined') ? Save.load() : null;
    if(!save) return;

    var pid  = save.playerTeamId || '';
    var team = (typeof F1Data !== 'undefined')
      ? F1Data.teams.find(function(t){ return t.id === pid; })
      : null;

    /* ── Logo : ajoute Orbitron et couleur équipe ── */
    var logo = document.querySelector('.logo');
    if(logo){
      logo.style.fontFamily = "'Orbitron', sans-serif";
      /* Ajoute le point coloré équipe si pas déjà là */
      if(team && !logo.querySelector('.logo-dot')){
        var dot = document.createElement('span');
        dot.className = 'logo-dot';
        dot.style.cssText = 'display:inline-block;width:7px;height:7px;border-radius:50%;background:'+team.color+';margin-right:5px;margin-left:2px;flex-shrink:0;';
        /* Insère après le premier enfant (img ou premier text) */
        var firstImg = logo.querySelector('img');
        if(firstImg){
          firstImg.after(dot);
        } else {
          logo.insertBefore(dot, logo.firstChild);
        }
      }
    }

    /* ── Pills saison + budget ── */
    var pills = document.querySelector('.top-pills');
    if(pills){
      /* Met à jour les badges existants */
      var season = pills.querySelector('#seasonBadge, .season-badge, [id*="season"]');
      var budget = pills.querySelector('#budgetBadge, .budget-badge, [id*="budget"]');

      if(season) season.textContent = 'S.' + (save.season || 2025) + ' · GP' + (save.race || 0);
      if(budget){
        budget.textContent = Math.round(save.budget || 0) + 'M€';
        budget.classList.add('pill-budget');
      }

      /* Ajoute un badge équipe s'il n'y en a pas */
      if(team && !pills.querySelector('.pill-team')){
        var tp = document.createElement('div');
        tp.className = 'pill pill-team';
        tp.style.cssText = 'background:rgba('+hexRgb(team.color)+',.12);border-color:rgba('+hexRgb(team.color)+',.28);color:'+team.color;
        tp.innerHTML = '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:'+team.color+';margin-right:4px;vertical-align:middle;"></span>'+(team.shortName||team.name);
        pills.insertBefore(tp, pills.firstChild);
      }
    }

    /* ── nav-back : ajoute ← si texte vide ── */
    document.querySelectorAll('.nav-back, .back-home').forEach(function(el){
      if(!el.textContent.trim()) el.textContent = '← Accueil';
      if(!el.getAttribute('href') || el.getAttribute('href') === '#')
        el.setAttribute('href', 'index.html');
    });

    setupGlobalFullscreen();
  });



  /* ── Plein écran global ──
     Note navigateur : le plein écran doit être déclenché par un geste utilisateur.
     On mémorise donc le choix et on réessaie sur les pages suivantes quand le navigateur l'autorise. */
  function setupGlobalFullscreen(){
    if(document.getElementById('fsBtn')){
      attachFullscreenButton(document.getElementById('fsBtn'));
      return;
    }

    var host = document.querySelector('.top-pills, .tb-right, .topbar');
    if(!host) return;

    var btn = document.createElement('button');
    btn.className = 'fs-btn global-fs-btn';
    btn.id = 'fsBtn';
    btn.type = 'button';
    btn.title = 'Plein écran';
    btn.setAttribute('aria-label','Plein écran');
    btn.textContent = '⛶';

    if(host.classList.contains('topbar')) host.appendChild(btn);
    else host.insertBefore(btn, host.firstChild);

    attachFullscreenButton(btn);
  }

  function injectFullscreenCss(){
    if(document.getElementById('globalFullscreenCss')) return;
    var st = document.createElement('style');
    st.id = 'globalFullscreenCss';
    st.textContent = '.fs-btn{width:28px;height:24px;border-radius:20px;border:1px solid rgba(255,255,255,.18);background:rgba(7,7,13,.72);color:#fff;font-size:13px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);cursor:pointer;-webkit-tap-highlight-color:transparent;margin-right:4px;line-height:1}.fs-btn:active{transform:scale(.94)}';
    document.head.appendChild(st);
  }

  function fullscreenElement(){
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  function requestFullscreen(){
    var el = document.documentElement;
    try{
      if(el.requestFullscreen) return el.requestFullscreen();
      if(el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    }catch(e){}
    return Promise.resolve();
  }

  function exitFullscreen(){
    try{
      if(document.exitFullscreen) return document.exitFullscreen();
      if(document.webkitExitFullscreen) return document.webkitExitFullscreen();
    }catch(e){}
    return Promise.resolve();
  }

  function attachFullscreenButton(btn){
    injectFullscreenCss();
    if(btn.dataset.fsReady === '1') return;
    btn.dataset.fsReady = '1';

    function update(){
      var on = !!fullscreenElement();
      btn.textContent = on ? '×' : '⛶';
      btn.title = on ? 'Quitter le plein écran' : 'Plein écran';
      btn.setAttribute('aria-label', btn.title);
    }

    btn.addEventListener('click', function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(fullscreenElement()){
        localStorage.setItem('f1FullscreenWanted','0');
        exitFullscreen().finally(update);
      }else{
        localStorage.setItem('f1FullscreenWanted','1');
        requestFullscreen().finally(function(){ setTimeout(update,120); });
      }
    });

    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    update();

    // Si l'utilisateur a activé le mode plein écran depuis l'accueil, on mémorise son choix.
    // Certains navigateurs bloquent la relance automatique après un changement de page ; dans ce cas le bouton reste visible.
    if(localStorage.getItem('f1FullscreenWanted') === '1' && !fullscreenElement()){
      setTimeout(function(){ requestFullscreen().finally(update); }, 250);
    }
  }

  function hexRgb(h){
    if(!h || h.length < 7) return '232,0,61';
    return parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),16);
  }

})();

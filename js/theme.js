/**
 * F1 Manager — Thème dynamique par équipe
 * Injecte la couleur de l'équipe joueur comme variable CSS --accent
 * et génère un dégradé fond noir → couleur équipe
 * À inclure APRÈS data.js et save.js sur toutes les pages
 */

const Theme = {

  // Couleurs de fallback par équipe si data.js pas encore chargé
  TEAM_COLORS: {
    mclaren:    '#FF8000',
    ferrari:    '#CC0000',
    redbull:    '#3671C6',
    mercedes:   '#00D2BE',
    aston:      '#006F62',
    alpine:     '#0090FF',
    williams:   '#005AFF',
    haas:       '#E8002D',
    sauber:     '#BB0000',
    racingbulls:'#6692FF',
    cadillac:   '#6F6F78',
  },

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  },

  // Assombrir une couleur hex (factor 0-1)
  darken(hex, factor=0.3) {
    const r = Math.round(parseInt(hex.slice(1,3),16) * factor);
    const g = Math.round(parseInt(hex.slice(3,5),16) * factor);
    const b = Math.round(parseInt(hex.slice(5,7),16) * factor);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  },

  apply() {
    try {
      const save   = typeof Save !== 'undefined' ? Save.load() : null;
      const teamId = save?.playerTeamId || null;
      if (!teamId) return;

      // Trouver la couleur depuis F1Data ou fallback
      let color = this.TEAM_COLORS[teamId] || '#E8003D';
      if (typeof F1Data !== 'undefined' && F1Data.teams) {
        const team = F1Data.teams.find(t => t.id === teamId);
        if (team?.color) color = team.color;
      }

      const rgb     = this.hexToRgb(color);
      const dark    = this.darken(color, 0.25);
      const darker  = this.darken(color, 0.12);
      const darkRgb = this.hexToRgb(dark);

      const root = document.documentElement;

      // Couleur principale
      root.style.setProperty('--accent',       color);
      root.style.setProperty('--accent-rgb',   rgb);
      root.style.setProperty('--accent-dark',  dark);
      root.style.setProperty('--f1-red',       color);

      // Dégradé de fond : noir → légère teinte équipe
      root.style.setProperty('--bg',
        `#07070d`
      );
      root.style.setProperty('--team-glow',
        `rgba(${rgb}, 0.06)`
      );
      root.style.setProperty('--team-glow-strong',
        `rgba(${rgb}, 0.15)`
      );
      root.style.setProperty('--team-border',
        `rgba(${rgb}, 0.25)`
      );

      // Appliquer le dégradé subtil sur le body
      document.body.style.background =
        `linear-gradient(180deg, ${darker}18 0%, #07070d 120px)`;

      // Topbar avec léger reflet équipe
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.style.borderBottom = `1px solid rgba(${rgb}, 0.2)`;
        topbar.style.boxShadow    = `0 1px 20px rgba(${rgb}, 0.08)`;
      }

      // Stocker pour usage inline dans les pages
      window.__teamColor    = color;
      window.__teamColorRgb = rgb;

    } catch(e) {
      console.warn('[Theme] Erreur application thème:', e);
    }
  },

  // Appelé après render() pour re-appliquer si DOM mis à jour
  refresh() {
    this.apply();
  }
};

// Helper global pour afficher un logo d'équipe
function getTeamLogo(teamId, size=40) {
  if (typeof F1Data === 'undefined') return '';
  const team = F1Data.teams.find(t => t.id === teamId);
  if (!team?.logo) return '<span style="font-family:var(--fh);font-size:12px;color:'+(team?.color||'#ccc')+'">'+(team?.shortName||teamId)+'</span>';
  const fallback = team.shortName||teamId;
  return '<img src="'+team.logo+'" style="width:'+(size*2)+'px;height:'+size+'px;object-fit:contain" alt="'+fallback+'" onerror="this.style.display=\"none\"">';
}

// Auto-appliquer dès que le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Theme.apply());
} else {
  Theme.apply();
}

// ============================================================
//  F1 Manager — social-notifications.js
//  Compteur + affichage des messages pilotes en attente
// ============================================================

const SocialNotifications = {

  ENG_IDS: ['engineer', 'engineer2'],

  getActiveDriverIds(save) {
    if (!save?.playerTeamId) return [];
    return Object.entries(save.driverStates || {})
      .filter(([, v]) => v.teamId && v.teamId !== 'free_agent' && v.teamId === save.playerTeamId && !v.retired)
      .map(([k]) => k);
  },

  isPendingEvent(e, save) {
    if (!e || e.resolved) return false;
    const engIds = this.ENG_IDS;
    const activeIds = this.getActiveDriverIds(save);
    if (engIds.includes(e.driverId)) return true;
    if (activeIds.length === 0) return true;
    if (activeIds.includes(e.driverId)) return true;
    const d = typeof F1Data !== 'undefined'
      ? F1Data.drivers.find(x => x.id === e.driverId)
      : null;
    if (d && d.teamId && d.teamId !== 'free_agent' && d.teamId === save.playerTeamId) return true;
    const st = save.driverStates?.[e.driverId];
    if (st?.teamId === 'free_agent') return false;
    return false;
  },

  getPending(save) {
    if (!save) return [];
    return (save.socialEvents || []).filter(e => this.isPendingEvent(e, save));
  },

  getPendingCount(save) {
    return this.getPending(save).length;
  },

  hasUrgent(save) {
    return this.getPending(save).some(e => e.urgent);
  },

  getEventLabel(ev, save) {
    const isEng = ev.type === 'engineer' || ev.type === 'engineer2' || this.ENG_IDS.includes(ev.driverId);
    if (isEng) return 'Équipe technique';
    const d = typeof F1Data !== 'undefined'
      ? F1Data.drivers.find(x => x.id === ev.driverId)
      : null;
    if (d) return `${d.firstName} ${d.name}`;
    return 'Pilote';
  },

  escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },

  renderBanner(container, save) {
    if (!container) return;
    const pending = this.getPending(save);
    if (!pending.length) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    const urgent = pending.some(e => e.urgent);
    const preview = pending.slice(0, 3).map(ev => {
      const name = this.getEventLabel(ev, save);
      const trigger = ev.trigger || 'Message';
      return `<span class="hq-notif-chip${ev.urgent ? ' urgent' : ''}">${this.escapeHtml(name)} — ${this.escapeHtml(trigger)}</span>`;
    }).join('');

    const more = pending.length > 3 ? `<span class="hq-notif-more">+${pending.length - 3}</span>` : '';

    container.style.display = 'flex';
    container.innerHTML = `
      <a href="social.html" class="hq-notif-banner${urgent ? ' urgent' : ''}">
        <span class="hq-notif-icon">${urgent ? '⚠️' : '💬'}</span>
        <span class="hq-notif-body">
          <span class="hq-notif-title">${pending.length} discussion${pending.length > 1 ? 's' : ''} en attente</span>
          <span class="hq-notif-chips">${preview}${more}</span>
        </span>
        <span class="hq-notif-arrow">→</span>
      </a>`;
  },

  decoratePin(pinEl, count, urgent) {
    if (!pinEl) return;
    let badge = pinEl.querySelector('.pin-notif-badge');
    if (!count) {
      if (badge) badge.remove();
      pinEl.classList.remove('pin-has-notif', 'pin-urgent');
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'pin-notif-badge';
      const head = pinEl.querySelector('.pin-head') || pinEl;
      head.appendChild(badge);
    }
    badge.textContent = count > 9 ? '9+' : String(count);
    pinEl.classList.add('pin-has-notif');
    pinEl.classList.toggle('pin-urgent', !!urgent);
  },

  applyToHome(save) {
    const banner = document.getElementById('hqNotifBanner');
    this.renderBanner(banner, save);

    const count = this.getPendingCount(save);
    const urgent = this.hasUrgent(save);
    document.querySelectorAll('.pin').forEach(pin => {
      if ((pin.getAttribute('href') || '').includes('social.html')) {
        this.decoratePin(pin, count, urgent);
      }
    });
  }
};

window.SocialNotifications = SocialNotifications;

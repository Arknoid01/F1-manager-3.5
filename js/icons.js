/* ============================================================
   F1 Manager — icons.js
   Icônes SVG cohérentes (style Lucide) — pas d'emojis UI
   ============================================================ */
const F1Icons = (function () {
  const paths = {
    circuit: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1"/><path d="M4 9s1-1 4-1 5 2 8 2 4-1 4-1"/><circle cx="4" cy="9" r="1"/><circle cx="20" cy="15" r="1"/>',
    staff: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7-5-7 5v12z"/><path d="M12 22v-8"/><path d="M6 12h12"/>',
    training: '<path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M12 2v20"/><path d="M2 12h20"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    drivers: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    sponsors: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
    board: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/>',
    social: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    journal: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/>',
    hq: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    quali: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    race: '<path d="M4 15h16"/><path d="M5 9h14"/><path d="M7 5h10"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>',
    fp: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    briefing: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    positive: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    neutral: '<path d="M12 3v18"/><path d="M3 12h18"/>',
    negative: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  };

  function svg(name, sizeClass) {
    const p = paths[name];
    if (!p) return '';
    const cls = sizeClass ? ` ds-icon ${sizeClass}` : ' ds-icon';
    return `<span class="${cls.trim()}" aria-hidden="true"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${p}</svg></span>`;
  }

  function choiceIcon(type) {
    const map = { positive: 'positive', neutral: 'neutral', negative: 'negative' };
    return svg(map[type] || 'neutral', 'ds-icon--md');
  }

  return { svg, choiceIcon, paths };
})();

window.F1Icons = F1Icons;

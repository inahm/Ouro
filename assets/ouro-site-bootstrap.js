(function (w) {
  w.OuroSite = w.OuroSite || {};
  /** Meaningful overlap of any element with the layout viewport (vert + horiz). */
  function regionMostlyVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var vh = w.innerHeight || document.documentElement.clientHeight || 0;
    var vw = w.innerWidth || document.documentElement.clientWidth || 0;
    var vOverlap = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    var hOverlap = Math.min(r.right, vw) - Math.max(r.left, 0);
    if (vOverlap <= 0 || hOverlap <= 0) return false;
    return (
      vOverlap > Math.min(80, r.height * 0.12) &&
      hOverlap > Math.min(48, r.width * 0.1)
    );
  }
  w.OuroSite.regionMostlyVisible = regionMostlyVisible;
  w.OuroSite.cardMostlyVisible = function (cardEl) {
    return regionMostlyVisible(cardEl);
  };
  /**
   * Canonical copy for the “About this build” stats (panel typewriter + terminal `log` flow).
   * Update here when figures change; synced to DOM on site-meta init.
   */
  w.OuroSite.BUILD_STATS_LINES = [
    "Over 29 days, we worked through roughly:",
    "160 hours of tracked AI-assisted build sessions",
    "3,240 Composer requests",
    "85 conversations",
    "117 commits",
    "30,600+ AI-attributed code edits",
    "Tooling and models:",
    "Figma, Cursor, Composer 2, Claude Sonnet, GPT-5.3 Codex, Opus, and Pika 2.5.",
  ];
})(window);

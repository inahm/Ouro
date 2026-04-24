/**
 * Third-act micro terminal: server-assisted NL → bounded site state (OpenAI via Pages Function),
 * with a local rule fallback. Glitter = canvas; hiphop = lullaby + bouncier motion.
 */
(function () {
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {}

  var ACCENT_MAP = {
    green: '#0d8f4a',
    forest: '#2d6a4f',
    blue: '#3b82f6',
    navy: '#1e3a5f',
    cyan: '#0ea5e9',
    sky: '#60a5fa',
    'sky blue': '#60a5fa',
    'royal blue': '#1d4ed8',
    teal: '#06b6d4',
    gold: '#f4c025',
    yellow: '#f4c025',
    purple: '#8b5cf6',
    violet: '#8b5cf6',
    cream: '#e8ddd4',
    black: '#000000',
    red: '#FF1B00',
    orange: '#e63946',
    pink: '#e63946',
    default: '#FF1B00',
  };

  var glitterRaf = null;
  var glitterSparks = null;

  function ensureGlitterSparks(n) {
    if (glitterSparks && glitterSparks.length === n) return;
    glitterSparks = [];
    for (var i = 0; i < n; i++) {
      glitterSparks.push({
        x: Math.random(),
        y: Math.random(),
        s: 0.4 + Math.random() * 2.2,
        ph: Math.random() * Math.PI * 2,
        v: 0.02 + Math.random() * 0.05,
        hue: Math.random() > 0.65 ? 52 : 0,
      });
    }
  }

  function resizeGlitterCanvas(c) {
    if (!c) return;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (w < 2 || h < 2) return;
    c.width = Math.floor(w * d);
    c.height = Math.floor(h * d);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    var g = c.getContext('2d');
    if (g) g.setTransform(d, 0, 0, d, 0, 0);
  }

  function drawGlitterOnce(t) {
    var c = document.getElementById('third-act-fx-canvas');
    if (!c) return;
    var w = c.clientWidth || window.innerWidth;
    var h = c.clientHeight || window.innerHeight;
    var ctx2 = c.getContext('2d');
    if (!ctx2) return;
    ctx2.setTransform(1, 0, 0, 1, 0, 0);
    ctx2.clearRect(0, 0, c.width, c.height);
    var d = Math.min(window.devicePixelRatio || 1, 2);
    ctx2.setTransform(d, 0, 0, d, 0, 0);
    var n = reduceMotion ? 12 : 78;
    ensureGlitterSparks(n);
    for (var i = 0; i < n; i++) {
      var s = glitterSparks[i];
      s.ph += s.v;
      s.x += Math.sin(s.ph * 0.7) * 0.0008;
      s.y += Math.cos(s.ph * 0.4) * 0.0006;
      if (s.x < 0) s.x += 1;
      if (s.x > 1) s.x -= 1;
      if (s.y < 0) s.y += 1;
      if (s.y > 1) s.y -= 1;
      var a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.ph * 1.2 + t * 0.001));
      var x = s.x * w;
      var y = s.y * h;
      var r = s.s;
      var grd = ctx2.createRadialGradient(x, y, 0, x, y, r * 2.2);
      grd.addColorStop(0, 'hsla(' + s.hue + ', 100%, 95%, ' + a + ')');
      grd.addColorStop(0.45, 'hsla(220, 40%, 88%, ' + a * 0.45 + ')');
      grd.addColorStop(1, 'hsla(220, 20%, 50%, 0)');
      ctx2.fillStyle = grd;
      ctx2.beginPath();
      ctx2.arc(x, y, r * 2.2, 0, Math.PI * 2);
      ctx2.fill();
    }
  }

  function glitterLoop(ts) {
    var third = document.getElementById('third-act');
    if (!third || !third.classList.contains('third-act--fx-glitter')) {
      glitterRaf = null;
      return;
    }
    drawGlitterOnce(ts || 0);
    if (reduceMotion) {
      glitterRaf = null;
      return;
    }
    glitterRaf = requestAnimationFrame(glitterLoop);
  }

  function setGlitter(on) {
    var third = document.getElementById('third-act');
    var c = document.getElementById('third-act-fx-canvas');
    if (!third || !c) return;
    if (glitterRaf) {
      cancelAnimationFrame(glitterRaf);
      glitterRaf = null;
    }
    if (on) {
      third.classList.add('third-act--fx-glitter');
      resizeGlitterCanvas(c);
      drawGlitterOnce(0);
      if (!reduceMotion) {
        glitterRaf = requestAnimationFrame(glitterLoop);
      }
    } else {
      third.classList.remove('third-act--fx-glitter');
      try {
        var g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
      } catch (_) {}
    }
  }

  window.addEventListener(
    'resize',
    function () {
      var c = document.getElementById('third-act-fx-canvas');
      var third = document.getElementById('third-act');
      if (c && third && third.classList.contains('third-act--fx-glitter')) {
        resizeGlitterCanvas(c);
        drawGlitterOnce(performance.now());
      }
    },
    { passive: true }
  );

  function localInterpret(text) {
    var t = (text || '').toLowerCase();
    var out = {
      accent: '#FF1B00',
      typeface: 'grotesk',
      sound: 'default',
      flow: 'default',
      fx: 'none',
      summary: 'Applied a best-guess local preset (interpreter not reachable).',
    };
    for (var k in ACCENT_MAP) {
      if (k !== 'default' && t.indexOf(k) !== -1) {
        out.accent = ACCENT_MAP[k];
        break;
      }
    }
    if (/(mono|typewriter|code|console)/i.test(t)) out.typeface = 'mono';
    else if (/(serif|book|read|elegant|classic)/i.test(t)) out.typeface = 'serif';
    else if (/(inter|ui|swiss|clean|plain|sans|simple)/i.test(t)) out.typeface = 'sans';
    if (/(glitter|sparkle|spark|shine|glimmer|bokeh|sequin|gold\s*speck|stars?)/i.test(t)) {
      out.fx = 'glitter';
    }
    if (/(hip[\s-]?hop|rap\b|trap|beats?|rapper|808|boom|urban\s*beat)/i.test(t)) {
      out.sound = 'hiphop';
      if (out.flow === 'default') out.flow = 'chaos';
    } else if (/(calm|soft|quiet|slow|lull|gentle)/i.test(t)) {
      out.sound = 'calm';
      if (out.flow === 'default') out.flow = 'calm';
    } else if (/(pulse|fast|driving|dance|energy|club)/i.test(t)) {
      out.sound = 'pulse';
    } else if (/(bright|loud|open|big)/i.test(t)) {
      out.sound = 'bright';
    }
    if (/(chaos|wild|scattered|frenzy|storm)/i.test(t)) out.flow = 'chaos';
    else if (out.sound === 'calm' && /(order|gentle|slow)/i.test(t)) out.flow = 'calm';
    if (t.indexOf(' song') !== -1 && (t.indexOf('hip') !== -1 || t.indexOf('rap') !== -1)) {
      out.sound = 'hiphop';
    }
    return out;
  }

  function applyFlowToPhysics(flow) {
    if (!window.__ouroThirdActPhysics) return;
    var w = __ouroThirdActPhysics;
    if (flow === 'chaos') {
      w.set(1.12, 1.28, 0.99);
    } else if (flow === 'calm') {
      w.set(0.9, 0.72, 1.01);
    } else {
      w.set(1, 1, 1);
    }
  }

  function applyHiphopNudge() {
    if (!window.__ouroThirdActPhysics) return;
    __ouroThirdActPhysics.set(1.05, 1.16, 0.99);
  }

  function applyTypeface(third, tf) {
    third.classList.remove('third-act--font-sans', 'third-act--font-serif', 'third-act--font-mono');
    if (tf === 'sans') third.classList.add('third-act--font-sans');
    else if (tf === 'serif') third.classList.add('third-act--font-serif');
    else if (tf === 'mono') third.classList.add('third-act--font-mono');
  }

  function applyFromPayload(payload) {
    var third = document.getElementById('third-act');
    if (!third) return;
    if (payload.accent) {
      try {
        third.style.setProperty('--third-act-red', payload.accent);
      } catch (_) {}
    }
    applyTypeface(third, payload.typeface || 'grotesk');
    var flow = payload.flow || 'default';
    if (payload.sound === 'hiphop' && flow === 'default') {
      applyHiphopNudge();
    } else {
      applyFlowToPhysics(flow);
    }
    if (window.OuroRedLullaby && typeof OuroRedLullaby.applySoundMood === 'function') {
      OuroRedLullaby.applySoundMood(payload.sound || 'default');
    }
    setGlitter((payload.fx || 'none') === 'glitter');
  }

  function wire() {
    var tri = document.getElementById('third-act-term-trigger');
    var pan = document.getElementById('third-act-term-panel');
    var inp = document.getElementById('third-act-term-input');
    var outEl = document.getElementById('third-act-term-out');
    var form = document.getElementById('third-act-term-form');
    if (!tri || !pan || !inp || !outEl || !form) return;

    var open = false;
    function setOpen(v) {
      open = v;
      tri.setAttribute('aria-expanded', v ? 'true' : 'false');
      tri.classList.toggle('is-open', v);
      pan.hidden = !v;
      if (v) {
        setTimeout(function () {
          try {
            inp.focus();
          } catch (_) {}
        }, 0);
      }
    }
    tri.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        tri.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (open && pan && !pan.contains(e.target) && e.target !== tri) setOpen(false);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = (inp.value || '').trim();
      if (!raw) return;
      outEl.textContent = '…';
      var done = function (p, usedApi) {
        try {
          applyFromPayload(p);
        } catch (err) {
          outEl.textContent = 'Could not apply: ' + (err && err.message ? err.message : 'error');
          return;
        }
        outEl.textContent = (p.summary || 'Applied.') + (usedApi ? '' : ' (offline preset)');
      };
      fetch('/api/third-act-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: raw.slice(0, 500) }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { body: j };
          });
        })
        .then(function (o) {
          if (o.body && o.body.ok && o.body.accent) {
            done(
              {
                accent: o.body.accent,
                typeface: o.body.typeface,
                sound: o.body.sound,
                flow: o.body.flow,
                fx: o.body.fx,
                summary: o.body.summary,
              },
              true
            );
            return;
          }
          var loc = localInterpret(raw);
          loc.summary = 'Local: ' + (loc.summary || 'Applied heuristics.');
          done(loc, false);
        })
        .catch(function () {
          var loc = localInterpret(raw);
          loc.summary = 'Local: ' + (loc.summary || 'Applied heuristics.');
          done(loc, false);
        });
    });

    /* Copilot styling is in-memory only for this page load; refresh restores defaults. */
    try {
      window.sessionStorage.removeItem('ouroThirdActCopilot');
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();

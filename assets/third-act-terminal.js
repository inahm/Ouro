/**
 * Third-act micro terminal: server-assisted NL → bounded site state (OpenAI via Pages Function),
 * with a local rule fallback. Glitter = canvas; hiphop = lullaby + bouncier motion.
 */
(function () {
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {}

  /* Fallback when API unavailable — same axes as the server: color, type, sound, flow, fx. */
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
    yellow: '#fbbf24',
    purple: '#8b5cf6',
    violet: '#8b5cf6',
    cream: '#e8ddd4',
    black: '#000000',
    red: '#FF1B00',
    orange: '#e63946',
    pink: '#e63946',
    default: '#FF1B00',
  };

  var COLOR_RULES = [
    { re: /sky\s*blue|azure|cornflower/i, accent: '#60a5fa' },
    { re: /(royal|deep|midnight)\s*blue|navy\b/i, accent: '#1e3a5f' },
    { re: /lemon|canary|daffodil|buttercup/i, accent: '#facc15' },
    { re: /yellow|golden(\s+hour)?|yolk/i, accent: '#fbbf24' },
    { re: /sunny|sunshine|daylight|beach|morning\s*light|high\s*noon/i, accent: '#fde68a' },
    { re: /cream|vanilla|wheat|ivory|parchment/i, accent: '#fff7ed' },
    { re: /peach|apricot|tangerine|sunset(?!\s*orange)/i, accent: '#fef3c7' },
  ];

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
      summary: '',
    };
    var hasSunny = /(\bsunny\b|sunshine|daylight|beach|morning\s*light|high\s*noon)/.test(t);
    var hasYellow = /\b(yellow|lemon|canary|daffodil|golden|yolk|butter|buttery)\b/.test(t);

    if (hasSunny && hasYellow) {
      out.accent = '#facc15';
    } else {
      var colorHit = false;
      for (var ci = 0; ci < COLOR_RULES.length; ci++) {
        if (COLOR_RULES[ci].re.test(t)) {
          out.accent = COLOR_RULES[ci].accent;
          colorHit = true;
          break;
        }
      }
      if (!colorHit) {
        for (var k in ACCENT_MAP) {
          if (k === 'default') continue;
          if (t.indexOf(k) !== -1) {
            out.accent = ACCENT_MAP[k];
            break;
          }
        }
      }
    }

    if (/(hip[\s-]?hop|rap\b|trap|beats?|rapper|808|boom|urban\s*beat|grime)/.test(t)) {
      out.sound = 'hiphop';
      if (out.flow === 'default') out.flow = 'chaos';
    } else if (
      /(happy|joy|joyful|cheer|cheerful|upbeat|delight|bliss|playful|optimis|smile|grin|glee|jolly|merry|positiv|bubbl|bounc|celebrat|festi|feel\s*good|uplift|warm\s*and|cozy|sunny|sunshine|bright\s*mood|good\s*vibes|cheery)/.test(
        t
      ) ||
      (hasSunny && /(and\s*)?(happy|joy|cheer|feel|bright|light)/.test(t))
    ) {
      out.sound = 'bright';
    } else if (/(calm|soft|quiet|slow|lull|gentle|mellow|sad|melanch|gloom|grief|tired|sleep|insomnia|night|peace|rain|drizzle|still|lullab)/.test(t)) {
      out.sound = 'calm';
      if (out.flow === 'default') out.flow = 'calm';
    } else if (/(pulse|fast|driv|dance|energy|intense|club|electric|rush|run|workout|hype|adrenaline)/.test(t)) {
      out.sound = 'pulse';
    } else if (/(bright|loud|open|big|huge|flash)/.test(t)) {
      out.sound = 'bright';
    }

    if (/(mono|typewriter|code|console|terminal|dev\b|hacker|matrix)/i.test(t)) {
      out.typeface = 'mono';
    } else if (/(serif|elegant|editorial|magazine|formal|bookish|read\b|serious|classy|sophisticat|vogue|newspaper)/i.test(t)) {
      out.typeface = 'serif';
    } else if (
      /(sans|inter|ui|swiss|clean|plain|simple|round|friendly|playful|soft|airy|bubbl|sunny|happy|warm\s*and|comfy|cozy)/i.test(t) ||
      out.sound === 'bright' ||
      (hasSunny && out.sound === 'bright')
    ) {
      if (out.typeface === 'grotesk') out.typeface = 'sans';
    }

    if (/(glitter|sparkle|\bshine\b|glimmer|bokeh|sequin|stardust|twinkle|glam|disco|confetti|stars?)/i.test(t)) {
      out.fx = 'glitter';
    }
    if (/(chaos|wild|scattered|frenzy|storm|turbulen|messy|mayhem|untamed)/.test(t)) {
      out.flow = 'chaos';
    } else if (out.sound === 'calm' && /(float|drift|breeze|gentle|still)/.test(t)) {
      out.flow = 'calm';
    }
    if (t.indexOf(' song') !== -1 && (t.indexOf('hip') !== -1 || t.indexOf('rap') !== -1)) {
      out.sound = 'hiphop';
    }

    if (out.accent === '#FF1B00' && (/(happy|joy|cheer|upbeat|sunny|playful|positiv|warm|cozy|light\s*and)/.test(t) && !/(red|angry|horror|blood|dark|scary)/.test(t))) {
      out.accent = '#fef9c3';
    }

    out.summary = summarizeVibeLocal(out, hasSunny, hasYellow);
    return out;
  }

  function summarizeVibeLocal(out, hasSunny, hasYellow) {
    var bits = [];
    if (out.accent && out.accent !== '#FF1B00') {
      if (out.accent === '#facc15' || out.accent === '#fbbf24' || (hasSunny && hasYellow)) {
        bits.push('warm yellow field');
      } else if (hasSunny) {
        bits.push('sunny light');
      } else {
        bits.push('field color ' + out.accent);
      }
    }
    if (out.typeface === 'sans') bits.push('open sans-like type');
    else if (out.typeface === 'serif') bits.push('serif type');
    else if (out.typeface === 'mono') bits.push('mono type');
    if (out.sound === 'bright') bits.push('bright sound');
    else if (out.sound === 'calm') bits.push('soft calm sound');
    else if (out.sound === 'pulse') bits.push('driving pulse');
    else if (out.sound === 'hiphop') bits.push('beat-forward sound');
    if (out.fx === 'glitter') bits.push('glitter');
    if (!bits.length) bits.push('subtle default');
    return bits.join(' · ') + ' (local)';
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

  function applyBrightNudge() {
    if (!window.__ouroThirdActPhysics) return;
    __ouroThirdActPhysics.set(1.04, 1.1, 0.99);
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
    } else if (payload.sound === 'bright' && flow === 'default') {
      applyBrightNudge();
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
          done(loc, false);
        })
        .catch(function () {
          var loc2 = localInterpret(raw);
          done(loc2, false);
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

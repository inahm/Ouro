function splitToChars(source, target) {
  if (!target) target = source;
  var nodes = Array.from(source.childNodes);
  if (target === source) target.innerHTML = "";
  nodes.forEach(function (node) {
    if (node.nodeType === 3) {
      node.textContent.split(/([\u0020\t\n\r\f\v]+)/).forEach(function (part) {
        if (!part) return;
        if (/^[\u0020\t\n\r\f\v]+$/.test(part)) {
          var sp = document.createElement("span");
          sp.className = "hl-char hl-char--space";
          sp.textContent = "\u00a0";
          target.appendChild(sp);
        } else {
          var word = document.createElement("span");
          word.className = "hl-word";
          part.split("").forEach(function (ch) {
            var s = document.createElement("span");
            s.className = "hl-char";
            s.textContent = ch;
            word.appendChild(s);
          });
          target.appendChild(word);
        }
      });
    } else if (node.nodeType === 1) {
      var w = node.cloneNode(false);
      target.appendChild(w);
      splitToChars(node, w);
    }
  });
}
function staggerChars(chars) {
  chars.forEach(function (ch, i) {
    ch.style.transitionDelay = (i * 34 + Math.random() * 128).toFixed(0) + "ms";
    ch.style.setProperty(
      "--cd",
      (0.74 + Math.random() * 0.58).toFixed(2) + "s",
    );
    ch.style.setProperty("--cr", (Math.random() * 5 - 2.5).toFixed(1) + "deg");
  });
}
/** Staggered like entrance, slightly quicker durations for a crisp drop (no --cr). */
function staggerExitTiming(chars, reduce) {
  if (reduce) {
    chars.forEach(function (ch) {
      ch.style.transitionDelay = "0ms";
      ch.style.setProperty("--cd", "0.01s");
    });
    return;
  }
  chars.forEach(function (ch, i) {
    ch.style.transitionDelay = (i * 14 + Math.random() * 52).toFixed(0) + "ms";
    ch.style.setProperty("--cd", (0.2 + Math.random() * 0.22).toFixed(2) + "s");
  });
}
function attachHlCharExitHideAfterTransform(c) {
  var failSafe = setTimeout(function () {
    c.style.visibility = "hidden";
  }, 900);
  function onEnd(e) {
    if (e.propertyName !== "transform") return;
    clearTimeout(failSafe);
    c.removeEventListener("transitionend", onEnd);
    c.style.visibility = "hidden";
  }
  c.addEventListener("transitionend", onEnd);
}

(function () {
  var stage = document.getElementById("stage");
  var heroHl = document.getElementById("hero-hl");
  var secondParticleWrap = document.getElementById("second-hl-particles-wrap");
  var secondParticleCanvas = document.getElementById(
    "second-hl-particles-canvas",
  );
  if (!heroHl || !stage) return;

  function isLikelyIOSWebKit() {
    var ua = navigator.userAgent || "";
    var platform = navigator.platform || "";
    var touchPoints = navigator.maxTouchPoints || 0;
    var isIOS =
      /iP(hone|od|ad)/.test(ua) || (platform === "MacIntel" && touchPoints > 1);
    var isWebKit = /WebKit/i.test(ua);
    return isIOS && isWebKit;
  }
  var prefersDifferenceVideoBlend = !isLikelyIOSWebKit();

  /* ── Second-headline particle ring (canvas, mirrors index circle dot ribbon) ── */
  var spCtx,
    spParticles,
    spRaf = null;
  var spW,
    spH,
    spCx,
    spCy,
    spBaseR,
    spInnerR,
    spDpr = 1;
  var spTwistPhase = 0;
  var spMouse = { x: -9999, y: -9999, px: -9999, py: -9999, spd: 0 };
  var SP_DOT_R = 1.18;
  var SP_FORCE = 0.0032;
  var SP_DAMP = 0.94;
  var SP_MRAD = 100;
  var SP_MFORCE = 62;
  var SP_ROT = 0.001;
  /* Punch-through only - less downward “gravity”; ring size / spring physics unchanged */
  var PUNCH_GRAVITY_Y = 0.58;
  var PUNCH_GRAVITY_Y_JITTER = 0.72;
  var PUNCH_RADIAL_Y = 0.32;
  var spRedCache = null;
  var tpMouse = { x: -9999, y: -9999, px: -9999, py: -9999, spd: 0 };

  function spReadRed() {
    if (spRedCache) return spRedCache;
    spRedCache =
      (
        getComputedStyle(document.documentElement).getPropertyValue("--red") ||
        "#FF1B00"
      ).trim() || "#FF1B00";
    return spRedCache;
  }

  function spSpacing() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return 11;
    return window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth <= 600
      ? 7.5
      : 5;
  }

  function secondParticleSetup() {
    if (!secondParticleCanvas || !secondParticleWrap) return;
    spRedCache = null;
    spDpr = Math.min(window.devicePixelRatio || 1, 2);
    var rw = secondParticleWrap.clientWidth || window.innerWidth;
    var rh = secondParticleWrap.clientHeight || window.innerHeight;
    if (rw < 12 || rh < 12) return;
    var core = Math.min(rw, rh);
    /* Outer ring radius spBaseR = core * 0.36 → Ø = core * 0.72 (:root --particle-o-diam) */
    var pad = Math.max(64, Math.min(120, Math.round(core * 0.14)));
    spW = rw + pad * 2;
    spH = rh + pad * 2;
    secondParticleCanvas.width = Math.round(spW * spDpr);
    secondParticleCanvas.height = Math.round(spH * spDpr);
    secondParticleCanvas.style.width = spW + "px";
    secondParticleCanvas.style.height = spH + "px";
    spCtx = secondParticleCanvas.getContext("2d");
    spCx = rw / 2 + pad;
    spCy = rh / 2 + pad;
    SP_MRAD = Math.max(120, Math.min(280, Math.round(core * 0.52)));
    spBaseR = core * 0.36;
    spInnerR = spBaseR * (124.558 / 367);
    spParticles = [];
    var spacing = spSpacing();
    var numRings = Math.max(2, Math.round((spBaseR - spInnerR) / spacing));
    for (var ri = 0; ri <= numRings; ri++) {
      var r = spInnerR + (ri * (spBaseR - spInnerR)) / numRings;
      var numPts = Math.max(6, Math.round((2 * Math.PI * r) / spacing));
      for (var pi2 = 0; pi2 < numPts; pi2++) {
        var a = (pi2 / numPts) * Math.PI * 2;
        spParticles.push({
          angle: a,
          radius: r,
          x: spCx + Math.cos(a) * r,
          y: spCy + Math.sin(a) * r,
          vx: 0,
          vy: 0,
        });
      }
    }
  }

  function secondParticleBurst() {
    if (!spParticles || !spParticles.length) return;
    spParticles.forEach(function (p) {
      var dx = p.x - spCx,
        dy = p.y - spCy,
        d = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += (dx / d) * 18 * (0.55 + Math.random() * 0.75);
      p.vy += (dy / d) * 18 * (0.55 + Math.random() * 0.75);
    });
  }

  /** Downward scroll / swipe tears through the field (in addition to exit intent). */
  function secondParticlePunch(amount) {
    if (
      !secondParticleWrap ||
      !secondParticleWrap.classList.contains(
        "second-hl-particles-wrap--visible",
      )
    )
      return;
    if (!spParticles || !spParticles.length) return;
    var mag = Math.min(3.6, Math.max(0.28, amount / 88));
    spParticles.forEach(function (p) {
      p.vy += mag * (PUNCH_GRAVITY_Y + Math.random() * PUNCH_GRAVITY_Y_JITTER);
      p.vx += mag * (Math.random() - 0.5) * 1.5;
      var dx = p.x - spCx,
        dy = p.y - spCy,
        d = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += (dx / d) * mag * 0.55;
      p.vy += (dy / d) * mag * PUNCH_RADIAL_Y;
    });
  }

  function siteMetaPanelMutesParticleAudio() {
    return document.documentElement.classList.contains("site-meta-open");
  }

  /** After page unlocks, third-act may scroll off-screen while the particle RAF + shell--in stay active - gate audio on real visibility. */
  function thirdActParticleAudioAudible() {
    var el = document.getElementById("third-act");
    if (!el) return true;
    if (!document.documentElement.classList.contains("scroll-intro-scrollable"))
      return true;
    var vis =
      window.OuroSite && typeof window.OuroSite.cardMostlyVisible === "function"
        ? window.OuroSite.cardMostlyVisible
        : null;
    if (vis) return vis(el);
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var vw = window.innerWidth || document.documentElement.clientWidth || 0;
    var vOver = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    var hOver = Math.min(r.right, vw) - Math.max(r.left, 0);
    if (vOver <= 0 || hOver <= 0) return false;
    return (
      vOver > Math.min(80, r.height * 0.12) &&
      hOver > Math.min(48, r.width * 0.1)
    );
  }

  /** Second-headline ring: only while intro layout (no native scroll) and wrap is meaningfully on screen. */
  function secondActParticleAudioAudible() {
    if (document.documentElement.classList.contains("scroll-intro-scrollable"))
      return false;
    if (!secondParticleWrap) return true;
    var vis =
      window.OuroSite && typeof window.OuroSite.cardMostlyVisible === "function"
        ? window.OuroSite.cardMostlyVisible
        : null;
    if (vis) return vis(secondParticleWrap);
    var r = secondParticleWrap.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var vw = window.innerWidth || document.documentElement.clientWidth || 0;
    var vOver = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    var hOver = Math.min(r.right, vw) - Math.max(r.left, 0);
    if (vOver <= 0 || hOver <= 0) return false;
    return (
      vOver > Math.min(80, r.height * 0.12) &&
      hOver > Math.min(48, r.width * 0.1)
    );
  }

  function secondParticleFrame() {
    if (
      !secondParticleWrap ||
      !secondParticleWrap.classList.contains(
        "second-hl-particles-wrap--visible",
      )
    ) {
      spRaf = null;
      if (window.OuroSecondLullaby)
        window.OuroSecondLullaby.tick({ zone: false, mouseSpd: 0 });
      return;
    }
    /* scroll-intro-scrollable + stale --visible: second canvas is display:none (0×0), ring test must not run. */
    if (
      document.documentElement.classList.contains("scroll-intro-scrollable")
    ) {
      secondParticleWrap.classList.remove("second-hl-particles-wrap--visible");
      secondParticlesStop();
      return;
    }
    spRaf = requestAnimationFrame(secondParticleFrame);
    if (!spCtx || !spParticles || !spParticles.length) {
      if (window.OuroSecondLullaby) {
        var inRingEarly =
          spPointerInRingAudioZone() &&
          !siteMetaPanelMutesParticleAudio() &&
          secondActParticleAudioAudible();
        window.OuroSecondLullaby.tick({
          zone: inRingEarly,
          mouseSpd: inRingEarly ? spMouse.spd || 0 : 0,
        });
      }
      return;
    }

    var dxm = spMouse.x - spMouse.px,
      dym = spMouse.y - spMouse.py;
    spMouse.spd =
      spMouse.x === -9999 || spMouse.px === -9999
        ? 0
        : Math.min(1, Math.sqrt(dxm * dxm + dym * dym) / 12) * 0.85;
    spMouse.px = spMouse.x;
    spMouse.py = spMouse.y;

    spCtx.setTransform(spDpr, 0, 0, spDpr, 0, 0);
    spCtx.clearRect(0, 0, spW, spH);

    spTwistPhase += 0.012;
    var TWIST_AMP = (spBaseR - spInnerR) * 0.22;
    var TWIST_FREQ = 2;
    var ringSpan = spBaseR - spInnerR || 1;

    spCtx.save();
    spCtx.globalCompositeOperation = "source-over";
    spParticles.forEach(function (p) {
      p.angle -= SP_ROT;
      var radNorm = (p.radius - spInnerR) / ringSpan;
      var edgeFade = Math.sin(radNorm * Math.PI);
      var phase = TWIST_FREQ * p.angle + spTwistPhase - radNorm * Math.PI;
      var rEff = p.radius + TWIST_AMP * edgeFade * Math.sin(phase);
      var ox = spCx + Math.cos(p.angle) * rEff;
      var oy = spCy + Math.sin(p.angle) * rEff;
      p.vx += (ox - p.x) * SP_FORCE;
      p.vy += (oy - p.y) * SP_FORCE;
      var mdx = p.x - spMouse.x,
        mdy = p.y - spMouse.y;
      var md = Math.sqrt(mdx * mdx + mdy * mdy);
      var mr = Math.max(0, 1 - md / SP_MRAD);
      p.vx += md > 0 ? (mdx / md) * mr * mr * SP_MFORCE * spMouse.spd : 0;
      p.vy += md > 0 ? (mdy / md) * mr * mr * SP_MFORCE * spMouse.spd : 0;
      p.vx *= SP_DAMP;
      p.vy *= SP_DAMP;
      p.x += p.vx;
      p.y += p.vy;
      var z = Math.sin(phase);
      var t01 = z * 0.5 + 0.5;
      var depth = 0.15 + 0.85 * (0.5 - 0.5 * Math.cos(t01 * Math.PI));
      spCtx.globalAlpha = depth;
      spCtx.fillStyle = spReadRed();
      spCtx.beginPath();
      spCtx.arc(p.x, p.y, SP_DOT_R, 0, Math.PI * 2);
      spCtx.fill();
    });
    spCtx.globalAlpha = 1;
    spCtx.restore();

    if (window.OuroSecondLullaby) {
      var inRingSp =
        spPointerInRingAudioZone() &&
        !siteMetaPanelMutesParticleAudio() &&
        secondActParticleAudioAudible();
      window.OuroSecondLullaby.tick({
        zone: inRingSp,
        mouseSpd: inRingSp ? spMouse.spd || 0 : 0,
      });
    }
  }

  function secondParticlesStart() {
    if (!secondParticleWrap || !secondParticleCanvas) return;
    secondParticleSetup();
    spMouse.px = spMouse.x;
    spMouse.py = spMouse.y;
    secondParticleBurst();
    spTwistPhase = 0;
    if (spRaf) cancelAnimationFrame(spRaf);
    spRaf = requestAnimationFrame(secondParticleFrame);
  }

  function secondParticlesStop() {
    if (window.OuroSecondLullaby) window.OuroSecondLullaby.reset();
    if (spRaf) {
      cancelAnimationFrame(spRaf);
      spRaf = null;
    }
  }

  function spUpdatePointer(clientX, clientY) {
    if (
      !secondParticleCanvas ||
      !secondParticleWrap ||
      !secondParticleWrap.classList.contains(
        "second-hl-particles-wrap--visible",
      )
    )
      return;
    var r = secondParticleCanvas.getBoundingClientRect();
    spMouse.x = clientX - r.left;
    spMouse.y = clientY - r.top;
  }

  /** Same expanded O-disc as third-act audio: center + ring + outer buffer (canvas space). */
  function spPointerInRingAudioZone() {
    if (!secondParticleCanvas) return false;
    var _br = secondParticleCanvas.getBoundingClientRect();
    if (_br.width < 1 || _br.height < 1) return false;
    if (spMouse.x === -9999 || spMouse.y === -9999) return false;
    if (!(spBaseR > 0 && spInnerR > 0)) return false;
    var dx = spMouse.x - spCx;
    var dy = spMouse.y - spCy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var outerBuf = 76;
    return dist <= spBaseR + outerBuf;
  }

  function tpUpdatePointer(clientX, clientY) {
    var shell = document.getElementById("third-act-video-shell");
    var wrap = document.getElementById("third-act-particles-vp-wrap");
    var c = document.getElementById("third-act-particles-canvas");
    if (
      !c ||
      !wrap ||
      !wrap.classList.contains("third-act-particles-vp-wrap--visible") ||
      !shell ||
      !shell.classList.contains("third-act-video-shell--in")
    )
      return;
    var r = c.getBoundingClientRect();
    tpMouse.x = clientX - r.left;
    tpMouse.y = clientY - r.top;
  }

  var tpCtx,
    tpParticles,
    tpRaf = null;
  var tpW,
    tpH,
    tpCx,
    tpCy,
    tpBaseR,
    tpInnerR,
    tpDpr = 1;
  var tpParticleInk = "#000000";
  var tpTwistPhase = 0;
  var TP_DOT_R = 1.18;
  var TP_MRAD = 100;
  var tpBlasted = false;
  var tpDampOut = 0.96;
  var thirdExplodeMeter = 0;
  var thirdBurstTimer = null;
  var thirdActUnlockWheelAccum = 0;

  /** Pointer inside expanded O: center hole + ring + outer buffer (canvas space; not whole screen). */
  function tpPointerInRingAudioZone() {
    if (tpMouse.x === -9999 || tpMouse.y === -9999) return false;
    if (!(tpBaseR > 0 && tpInnerR > 0)) return false;
    var dx = tpMouse.x - tpCx;
    var dy = tpMouse.y - tpCy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var outerBuf = tpBlasted ? 200 : 76;
    return dist <= tpBaseR + outerBuf;
  }

  function thirdParticleSetup() {
    var wrap = document.getElementById("third-act-particles-vp-wrap");
    var c = document.getElementById("third-act-particles-canvas");
    if (!wrap || !c) return;
    tpDpr = Math.min(window.devicePixelRatio || 1, 2);
    /* Use layout viewport, not the padded flex box - matches --particle-o-core: min(100vw, 100dvh) with torus. */
    var rw = window.innerWidth;
    var rh = window.innerHeight;
    if (rw < 12 || rh < 12) return;
    var core = Math.min(rw, rh);
    var pad = Math.max(64, Math.min(120, Math.round(core * 0.14)));
    tpW = rw + pad * 2;
    tpH = rh + pad * 2;
    c.width = Math.round(tpW * tpDpr);
    c.height = Math.round(tpH * tpDpr);
    c.style.width = tpW + "px";
    c.style.height = tpH + "px";
    tpCtx = c.getContext("2d");
    tpParticleInk =
      (
        getComputedStyle(document.documentElement).getPropertyValue("--ink") ||
        "#000000"
      ).trim() || "#000000";
    tpCx = rw / 2 + pad;
    tpCy = rh / 2 + pad;
    TP_MRAD = Math.max(120, Math.min(280, Math.round(core * 0.52)));
    tpBaseR = core * 0.36;
    tpInnerR = tpBaseR * (124.558 / 367);
    tpParticles = [];
    var spacing = spSpacing();
    var numRings = Math.max(2, Math.round((tpBaseR - tpInnerR) / spacing));
    for (var ri = 0; ri <= numRings; ri++) {
      var rad = tpInnerR + (ri * (tpBaseR - tpInnerR)) / numRings;
      var numPts = Math.max(6, Math.round((2 * Math.PI * rad) / spacing));
      for (var pi2 = 0; pi2 < numPts; pi2++) {
        var a = (pi2 / numPts) * Math.PI * 2;
        tpParticles.push({
          angle: a,
          radius: rad,
          x: tpCx + Math.cos(a) * rad,
          y: tpCy + Math.sin(a) * rad,
          vx: 0,
          vy: 0,
        });
      }
    }
  }

  function thirdParticleBurst() {
    if (!tpParticles || !tpParticles.length) return;
    tpParticles.forEach(function (p) {
      var dx = p.x - tpCx,
        dy = p.y - tpCy,
        d = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += (dx / d) * 18 * (0.55 + Math.random() * 0.75);
      p.vy += (dy / d) * 18 * (0.55 + Math.random() * 0.75);
    });
  }

  /** Iris-style: kill ribbon springs, coast, radial kick - fills viewport like intro orange field */
  function thirdParticleExplode() {
    if (tpBlasted || !tpParticles || !tpParticles.length) return;
    tpBlasted = true;
    var BL = 24;
    tpParticles.forEach(function (p) {
      var dx = p.x - tpCx,
        dy = p.y - tpCy,
        d = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += (dx / d) * BL * (0.6 + Math.random() * 0.8);
      p.vy += (dy / d) * BL * (0.6 + Math.random() * 0.8);
    });
    if (phase === 5) {
      thirdActUnlockWheelAccum += 100;
      tryUnlockThirdActIfReady();
    }
  }

  function thirdParticlePunch(amount) {
    var wrap = document.getElementById("third-act-particles-vp-wrap");
    if (
      !wrap ||
      !wrap.classList.contains("third-act-particles-vp-wrap--visible")
    )
      return;
    if (!tpParticles || !tpParticles.length || tpBlasted) return;
    var mag = Math.min(3.6, Math.max(0.28, amount / 88));
    tpParticles.forEach(function (p) {
      p.vy += mag * (PUNCH_GRAVITY_Y + Math.random() * PUNCH_GRAVITY_Y_JITTER);
      p.vx += mag * (Math.random() - 0.5) * 1.5;
      var dx = p.x - tpCx,
        dy = p.y - tpCy,
        d = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += (dx / d) * mag * 0.55;
      p.vy += (dy / d) * mag * PUNCH_RADIAL_Y;
    });
    thirdExplodeMeter += Math.abs(amount);
    var exTh = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 120
      : 260;
    if (thirdExplodeMeter >= exTh) thirdParticleExplode();
  }

  function thirdParticleFrame() {
    var shell = document.getElementById("third-act-video-shell");
    var wrap = document.getElementById("third-act-particles-vp-wrap");
    if (
      !shell ||
      !shell.classList.contains("third-act-video-shell--in") ||
      !wrap ||
      !wrap.classList.contains("third-act-particles-vp-wrap--visible")
    ) {
      tpRaf = null;
      if (window.OuroRedLullaby)
        window.OuroRedLullaby.tick({ zone: false, mouseSpd: 0 });
      return;
    }
    tpRaf = requestAnimationFrame(thirdParticleFrame);
    if (!tpCtx || !tpParticles || !tpParticles.length) {
      if (window.OuroRedLullaby) {
        var inRingEarly =
          tpPointerInRingAudioZone() &&
          !siteMetaPanelMutesParticleAudio() &&
          thirdActParticleAudioAudible();
        window.OuroRedLullaby.tick({
          zone: inRingEarly,
          mouseSpd: inRingEarly ? tpMouse.spd || 0 : 0,
        });
      }
      return;
    }

    var dxm = tpMouse.x - tpMouse.px,
      dym = tpMouse.y - tpMouse.py;
    tpMouse.spd =
      tpMouse.x === -9999 || tpMouse.px === -9999
        ? 0
        : Math.min(1, Math.sqrt(dxm * dxm + dym * dym) / 12) * 0.85;
    tpMouse.px = tpMouse.x;
    tpMouse.py = tpMouse.y;

    tpCtx.setTransform(tpDpr, 0, 0, tpDpr, 0, 0);
    tpCtx.clearRect(0, 0, tpW, tpH);

    tpTwistPhase += 0.012;
    var TWIST_AMP = (tpBaseR - tpInnerR) * 0.22;
    var TWIST_FREQ = 2;
    var ringSpan = tpBaseR - tpInnerR || 1;

    tpCtx.save();
    tpCtx.globalCompositeOperation = "source-over";
    tpParticles.forEach(function (p) {
      p.angle -= SP_ROT;
      var radNorm = (p.radius - tpInnerR) / ringSpan;
      var edgeFade = Math.sin(radNorm * Math.PI);
      var phase = TWIST_FREQ * p.angle + tpTwistPhase - radNorm * Math.PI;
      var rEff = p.radius + TWIST_AMP * edgeFade * Math.sin(phase);
      var ox = tpCx + Math.cos(p.angle) * rEff;
      var oy = tpCy + Math.sin(p.angle) * rEff;
      if (!tpBlasted) {
        p.vx += (ox - p.x) * SP_FORCE;
        p.vy += (oy - p.y) * SP_FORCE;
        var mdx = p.x - tpMouse.x,
          mdy = p.y - tpMouse.y;
        var md = Math.sqrt(mdx * mdx + mdy * mdy);
        var mr = Math.max(0, 1 - md / TP_MRAD);
        p.vx += md > 0 ? (mdx / md) * mr * mr * SP_MFORCE * tpMouse.spd : 0;
        p.vy += md > 0 ? (mdy / md) * mr * mr * SP_MFORCE * tpMouse.spd : 0;
        p.vx *= SP_DAMP;
        p.vy *= SP_DAMP;
      } else {
        p.vx *= tpDampOut;
        p.vy *= tpDampOut;
      }
      p.x += p.vx;
      p.y += p.vy;
      var z = Math.sin(phase);
      var t01 = z * 0.5 + 0.5;
      var depth = 0.15 + 0.85 * (0.5 - 0.5 * Math.cos(t01 * Math.PI));
      tpCtx.globalAlpha = depth;
      tpCtx.fillStyle = tpParticleInk;
      tpCtx.beginPath();
      tpCtx.arc(p.x, p.y, TP_DOT_R, 0, Math.PI * 2);
      tpCtx.fill();
    });
    tpCtx.globalAlpha = 1;
    tpCtx.restore();

    if (window.OuroRedLullaby) {
      var inRing =
        tpPointerInRingAudioZone() &&
        !siteMetaPanelMutesParticleAudio() &&
        thirdActParticleAudioAudible();
      window.OuroRedLullaby.tick({
        zone: inRing,
        mouseSpd: inRing ? tpMouse.spd || 0 : 0,
      });
    }
  }

  function thirdParticlesStart() {
    var w = document.getElementById("third-act-particles-vp-wrap");
    var c = document.getElementById("third-act-particles-canvas");
    if (!w || !c) return;
    if (thirdBurstTimer) {
      clearTimeout(thirdBurstTimer);
      thirdBurstTimer = null;
    }
    w.classList.remove("third-act-particles-vp-wrap--visible");
    w.setAttribute("aria-hidden", "true");
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
    tpBlasted = false;
    thirdExplodeMeter = 0;
    if (tpRaf) {
      cancelAnimationFrame(tpRaf);
      tpRaf = null;
    }
    requestAnimationFrame(function () {
      thirdParticleSetup();
      if (!tpCtx || !tpParticles || !tpParticles.length) return;
      tpMouse.px = tpMouse.x;
      tpMouse.py = tpMouse.y;
      tpTwistPhase = 0;
      requestAnimationFrame(function () {
        w.classList.add("third-act-particles-vp-wrap--visible");
        w.setAttribute("aria-hidden", "false");
        tpRaf = requestAnimationFrame(thirdParticleFrame);
        var burstDel = window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches
          ? 48
          : 400;
        thirdBurstTimer = setTimeout(function () {
          thirdBurstTimer = null;
          var shell = document.getElementById("third-act-video-shell");
          if (
            w.classList.contains("third-act-particles-vp-wrap--visible") &&
            shell &&
            shell.classList.contains("third-act-video-shell--in")
          )
            thirdParticleBurst();
        }, burstDel);
      });
    });
  }

  function thirdParticlesStop() {
    if (window.OuroRedLullaby)
      window.OuroRedLullaby.tick({ zone: false, mouseSpd: 0 });
    if (thirdBurstTimer) {
      clearTimeout(thirdBurstTimer);
      thirdBurstTimer = null;
    }
    if (tpRaf) {
      cancelAnimationFrame(tpRaf);
      tpRaf = null;
    }
    var w = document.getElementById("third-act-particles-vp-wrap");
    if (w) {
      w.classList.remove("third-act-particles-vp-wrap--visible");
      w.setAttribute("aria-hidden", "true");
    }
    var c = document.getElementById("third-act-particles-canvas");
    if (c && tpCtx) {
      try {
        tpCtx.setTransform(tpDpr, 0, 0, tpDpr, 0, 0);
        tpCtx.clearRect(0, 0, c.width, c.height);
      } catch (_) {}
    }
    tpParticles = null;
    tpCtx = null;
    tpBlasted = false;
    thirdExplodeMeter = 0;
  }

  window.addEventListener(
    "mousemove",
    function (e) {
      if (document.documentElement.classList.contains("site-meta-open")) return;
      spUpdatePointer(e.clientX, e.clientY);
      tpUpdatePointer(e.clientX, e.clientY);
    },
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    function (e) {
      if (document.documentElement.classList.contains("site-meta-open")) return;
      if (e.touches.length !== 1) return;
      spUpdatePointer(e.touches[0].clientX, e.touches[0].clientY);
      tpUpdatePointer(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true },
  );
  function spClearPointer() {
    spMouse.x = -9999;
    spMouse.y = -9999;
    spMouse.spd = 0;
    tpMouse.x = -9999;
    tpMouse.y = -9999;
    tpMouse.spd = 0;
  }
  window.addEventListener("touchend", spClearPointer, { passive: true });
  window.addEventListener("touchcancel", spClearPointer, { passive: true });

  var spResizeT = null;
  window.addEventListener("resize", function () {
    clearTimeout(spResizeT);
    spResizeT = setTimeout(function () {
      if (
        secondParticleWrap &&
        secondParticleWrap.classList.contains(
          "second-hl-particles-wrap--visible",
        )
      ) {
        secondParticleSetup();
      }
      var tpw = document.getElementById("third-act-particles-vp-wrap");
      if (
        tpw &&
        tpw.classList.contains("third-act-particles-vp-wrap--visible")
      ) {
        thirdParticleSetup();
      }
      if (
        thirdActVideoShell &&
        thirdActVideoShell.classList.contains("third-act-video-shell--in")
      ) {
        thirdRingResize();
      }
    }, 120);
  });

  /** 0 pre-reveal, 1 primary, 2→25→3 second headline, 40 red iris, 5 third headline, 6 native scroll unlocked */
  var phase = 0;
  var exitInProgress = false;
  var scrollIntent = 0;
  var revealTimer = null;
  var SECOND_LINES = ["We are an AI-native", "product studio."];
  /** Mobile / small break (≤600px): line breaks match design (short nowrap rows). */
  var SECOND_LINES_MOBILE = ["We are an", "AI-native", "product", "studio"];
  function getSecondHeadlineLines() {
    return window.matchMedia("(max-width: 600px)").matches
      ? SECOND_LINES_MOBILE
      : SECOND_LINES;
  }
  /* One .hl-line each - same mask as hero. */
  var THIRD_LINES = ["Where play", "meets curiosity", "and craft."];
  /** Small / mobile (≤600px) only - extra rows; large breakpoints use THIRD_LINES. */
  var THIRD_LINES_MOBILE = ["Where play", "meets", "curiosity", "and craft."];
  function getThirdHeadlineLines() {
    return window.matchMedia("(max-width: 600px)").matches
      ? THIRD_LINES_MOBILE
      : THIRD_LINES;
  }
  /** Primary hero: built in JS so mobile can use more .hl-line rows (must stay in sync with templates). */
  var PRIMARY_LINE_SPECS_DESKTOP = [
    [{ k: "t", v: "Experimenting" }],
    [{ k: "t", v: "with new methods" }],
    [
      { k: "t", v: "of " },
      { k: "a", v: "creation." },
    ],
  ];
  var PRIMARY_LINE_SPECS_MOBILE = [
    [{ k: "t", v: "Experimenting" }],
    [{ k: "t", v: "with new" }],
    [{ k: "t", v: "methods" }],
    [
      { k: "t", v: "of " },
      { k: "a", v: "creation." },
    ],
  ];
  var primaryHeadlineBpMq = window.matchMedia("(max-width: 600px)");
  var lastPrimaryHeadlineMobile = primaryHeadlineBpMq.matches;
  /** Phases 2 / 25 / 3 = second headline; 40 = iris handoff (keep accent until red covers nav - avoids difference flash on grey). */
  function syncNavHeroSecondHeadline() {
    document.documentElement.classList.toggle(
      "nav-hero-second-hl",
      phase === 2 || phase === 25 || phase === 3 || phase === 40,
    );
  }
  var thirdAct = document.getElementById("third-act");
  var thirdActRed = document.getElementById("third-act-red");
  var thirdActHl = document.getElementById("third-act-hl");
  var thirdActVideoShell = document.getElementById("third-act-video-shell");
  var thirdActSoundBtn = document.getElementById("third-act-sound-btn");
  try {
    if (
      new URLSearchParams(window.location.search).get("thirdactnosound") ===
        "1" &&
      thirdAct
    ) {
      thirdAct.classList.add("third-act--hide-sound-control");
    }
  } catch (_) {}
  if (
    thirdActSoundBtn &&
    thirdAct &&
    thirdAct.classList.contains("third-act--hide-sound-control")
  ) {
    thirdActSoundBtn.setAttribute("aria-hidden", "true");
  }

  function syncThirdActTorusInFromShell() {
    if (!thirdAct || !thirdActVideoShell) return;
    thirdAct.classList.toggle(
      "third-act--torus-in",
      thirdActVideoShell.classList.contains("third-act-video-shell--in"),
    );
  }

  function syncThirdActSoundButton() {
    if (!thirdActSoundBtn || !window.OuroRedLullaby) return;
    var muted = OuroRedLullaby.isMuted();
    thirdActSoundBtn.setAttribute("aria-pressed", muted ? "false" : "true");
    thirdActSoundBtn.setAttribute(
      "aria-label",
      muted ? "Unmute interaction sound" : "Mute interaction sound",
    );
  }
  /** Rollover shows click action; do not refresh while :hover so the label does not flash on toggle. */
  function wireParticleSoundRollover(btn, getMuted) {
    if (!btn || !getMuted) return;
    var el = btn.querySelector(".particle-sound-btn__rollover");
    if (!el) return;
    function refresh() {
      el.textContent = getMuted() ? "SOUND ON" : "SOUND OFF";
    }
    btn.addEventListener("mouseenter", refresh);
    btn.addEventListener("focusin", refresh);
    btn.addEventListener("click", function () {
      if (!btn.matches(":hover")) {
        refresh();
      }
    });
    btn.addEventListener("mouseleave", function () {
      el.textContent = "";
    });
    btn.addEventListener("blur", function () {
      el.textContent = "";
    });
  }
  if (thirdActSoundBtn && window.OuroRedLullaby) {
    syncThirdActSoundButton();
    thirdActSoundBtn.addEventListener("click", function () {
      OuroRedLullaby.setMuted(!OuroRedLullaby.isMuted());
      syncThirdActSoundButton();
    });
    wireParticleSoundRollover(thirdActSoundBtn, function () {
      return OuroRedLullaby.isMuted();
    });
  }
  var secondActSoundBtn = document.getElementById("second-act-sound-btn");
  function syncSecondActSoundButton() {
    if (!secondActSoundBtn || !window.OuroSecondLullaby) return;
    var muted = OuroSecondLullaby.isMuted();
    secondActSoundBtn.setAttribute("aria-pressed", muted ? "false" : "true");
    secondActSoundBtn.setAttribute(
      "aria-label",
      muted ? "Unmute interaction sound" : "Mute interaction sound",
    );
  }
  if (secondActSoundBtn && window.OuroSecondLullaby) {
    syncSecondActSoundButton();
    secondActSoundBtn.addEventListener("click", function () {
      OuroSecondLullaby.setMuted(!OuroSecondLullaby.isMuted());
      syncSecondActSoundButton();
    });
    wireParticleSoundRollover(secondActSoundBtn, function () {
      return OuroSecondLullaby.isMuted();
    });
  }
  syncThirdActTorusInFromShell();
  var thirdRingCanvas = document.getElementById("third-act-ring-canvas");
  var thirdRingRaf = null;
  var thirdRingCtx = null;
  var thirdRingDpr = 1;
  var thirdRingCw = 0;
  var thirdRingCh = 0;
  /* iOS WebKit: difference + drawImage(video) often fails; blit video to bitmap first. */
  var orbBlendScratch = null;
  var thirdCycleVids = null;
  var thirdBgVid = null;
  var TA_CYCLE_HOLD = 4200;
  var TA_CYCLE_TRANS = 1800;
  var TA_CYCLE_SRCS = [
    "statue.mp4",
    "wyatt.mp4",
    "orb.mp4",
    "cycle-2.mp4",
    "cycle-4.mp4",
    "cycle-3.mp4",
  ];
  var TA_STATUE_IDX = TA_CYCLE_SRCS.indexOf("statue.mp4");
  var TA_ORB_IDX = TA_CYCLE_SRCS.indexOf("orb.mp4");
  var TA_CYCLE_EYE_IDX = TA_CYCLE_SRCS.indexOf("cycle-4.mp4");
  var taCycleIdx = TA_CYCLE_EYE_IDX;
  var taCycleFade = 0;
  var taCycleStart = 0;
  var taCycleTransDur = 1800;
  var taCyclePrevTs = null;
  var _taVidHide =
    "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;";
  var _mqNoBgInThirdRing = window.matchMedia("(max-width: 768px)");
  function thirdRingDrawBgMp4Layer() {
    return !_mqNoBgInThirdRing.matches;
  }

  /** Start bg.mp4 decode/buffer early so footer wordmark clip has frames ready. */
  function ensureBgVidWarm() {
    if (window.__bgVid) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var v = document.createElement("video");
    v.src = "bg.mp4";
    v.preload = "auto";
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.autoplay = true;
    v.setAttribute("playsinline", "");
    v.style.cssText = _taVidHide;
    document.body.appendChild(v);
    window.__bgVid = v;
    v.play().catch(function () {});
  }
  ensureBgVidWarm();

  function ensureThirdRingVideos() {
    if (thirdCycleVids) return;
    thirdCycleVids = TA_CYCLE_SRCS.map(function (src) {
      var v = document.createElement("video");
      v.src = src;
      v.preload = "auto";
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.autoplay = true;
      v.setAttribute("playsinline", "");
      v.style.cssText = _taVidHide;
      document.body.appendChild(v);
      v.play().catch(function () {});
      return v;
    });
    thirdBgVid = window.__bgVid;
    if (!thirdBgVid) {
      thirdBgVid = document.createElement("video");
      thirdBgVid.src = "bg.mp4";
      thirdBgVid.preload = "auto";
      thirdBgVid.muted = true;
      thirdBgVid.loop = true;
      thirdBgVid.playsInline = true;
      thirdBgVid.autoplay = true;
      thirdBgVid.setAttribute("playsinline", "");
      thirdBgVid.style.cssText = _taVidHide;
      document.body.appendChild(thirdBgVid);
      window.__bgVid = thirdBgVid;
    } else if (thirdBgVid.parentNode !== document.body) {
      document.body.appendChild(thirdBgVid);
    }
    thirdBgVid.play().catch(function () {});
  }
  /* Decode/buffer torus clips during idle scroll so the red beat isn’t stuck on a flat red fill. */
  ensureThirdRingVideos();

  function thirdRingResize() {
    if (!thirdRingCanvas || !thirdAct) return;
    var ring = thirdAct.querySelector(".third-act-video-ring");
    if (!ring) return;
    var cw = ring.clientWidth;
    var ch = ring.clientHeight;
    if (cw < 8 || ch < 8) return;
    thirdRingDpr = Math.min(window.devicePixelRatio || 1, 2);
    thirdRingCw = cw;
    thirdRingCh = ch;
    thirdRingCanvas.width = Math.round(cw * thirdRingDpr);
    thirdRingCanvas.height = Math.round(ch * thirdRingDpr);
    thirdRingCanvas.style.width = cw + "px";
    thirdRingCanvas.style.height = ch + "px";
    thirdRingCtx = thirdRingCanvas.getContext("2d");
  }

  function taIsLikelyIOSWebKitVideoBlendBug() {
    if (window.__ouroTaIOSVideoBlend != null)
      return window.__ouroTaIOSVideoBlend;
    var ua = navigator.userAgent || "";
    var iOSDevice = /iP(ad|hone|od)/.test(ua);
    var iPadDesktop =
      typeof navigator !== "undefined" &&
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1;
    window.__ouroTaIOSVideoBlend = !!(iOSDevice || iPadDesktop);
    return window.__ouroTaIOSVideoBlend;
  }
  /**
   * WebKit (esp. iOS): compositing from HTMLVideoElement with mode "difference" can draw blank/wrong.
   * Rasterize the frame to a bitmap canvas, then difference-composite that - matches desktop output.
   */
  function thirdRingDrawVideoDifference(ctx, vid, dx, dy, dw, dh) {
    if (!taIsLikelyIOSWebKitVideoBlendBug()) {
      ctx.globalCompositeOperation = "difference";
      ctx.drawImage(vid, dx, dy, dw, dh);
      return;
    }
    var sw = Math.max(1, Math.round(dw * thirdRingDpr));
    var sh = Math.max(1, Math.round(dh * thirdRingDpr));
    if (
      !orbBlendScratch ||
      orbBlendScratch.width !== sw ||
      orbBlendScratch.height !== sh
    ) {
      orbBlendScratch = document.createElement("canvas");
      orbBlendScratch.width = sw;
      orbBlendScratch.height = sh;
    }
    var os = orbBlendScratch.getContext("2d");
    os.setTransform(1, 0, 0, 1, 0, 0);
    os.globalCompositeOperation = "source-over";
    os.clearRect(0, 0, sw, sh);
    os.drawImage(vid, 0, 0, sw, sh);
    ctx.globalCompositeOperation = "difference";
    ctx.drawImage(orbBlendScratch, dx, dy, dw, dh);
  }

  function thirdRingStop() {
    if (thirdRingRaf) {
      cancelAnimationFrame(thirdRingRaf);
      thirdRingRaf = null;
    }
    taCyclePrevTs = null;
    if (thirdBgVid) {
      try {
        thirdBgVid.pause();
        thirdBgVid.currentTime = 0;
      } catch (_) {}
    }
    if (thirdRingCtx && thirdRingCanvas) {
      try {
        thirdRingCtx.setTransform(1, 0, 0, 1, 0, 0);
        thirdRingCtx.clearRect(
          0,
          0,
          thirdRingCanvas.width,
          thirdRingCanvas.height,
        );
      } catch (_) {}
    }
  }

  function thirdRingFrame(now) {
    if (
      !thirdActVideoShell ||
      !thirdActVideoShell.classList.contains("third-act-video-shell--in")
    ) {
      thirdRingRaf = null;
      return;
    }
    thirdRingRaf = requestAnimationFrame(thirdRingFrame);
    if (!thirdRingCtx || !thirdRingCanvas || !thirdCycleVids || !thirdBgVid)
      return;

    if (thirdRingCw < 8) thirdRingResize();
    var cw = thirdRingCw;
    var ch = thirdRingCh;
    if (cw < 8) return;
    var cx = cw / 2;
    var cy = ch / 2;
    /* #third-act-o-clip uses objectBoundingBox outer circle R=0.5 - canvas is already Ø=core*0.72, so outer R = min/2 (not *0.36, which is R/core on the larger viewport). */
    var clipR = Math.min(cw, ch) * 0.5;
    var imgSize = clipR * 2.2;

    var RED = (
      getComputedStyle(document.documentElement).getPropertyValue("--red") ||
      "#FF1B00"
    ).trim();

    var cycleDt = taCyclePrevTs !== null ? now - taCyclePrevTs : 0;
    taCyclePrevTs = now;

    var cycleElapsedBeforePause = now - taCycleStart;
    var mouseSpd = tpMouse.spd || 0;
    if (mouseSpd > 0.06 && cycleElapsedBeforePause <= TA_CYCLE_HOLD) {
      taCycleStart += cycleDt;
    }
    var cycleElapsed = now - taCycleStart;
    if (cycleElapsed >= TA_CYCLE_HOLD + taCycleTransDur) {
      taCycleIdx = (taCycleIdx + 1) % thirdCycleVids.length;
      taCycleStart = now;
      cycleElapsed = 0;
      taCycleFade = 0;
      taCycleTransDur = TA_CYCLE_TRANS;
    }
    taCycleFade =
      cycleElapsed > TA_CYCLE_HOLD
        ? Math.min(1, (cycleElapsed - TA_CYCLE_HOLD) / taCycleTransDur)
        : 0;

    thirdRingCtx.setTransform(thirdRingDpr, 0, 0, thirdRingDpr, 0, 0);
    thirdRingCtx.clearRect(0, 0, cw, ch);
    thirdRingCtx.fillStyle = RED;
    thirdRingCtx.fillRect(0, 0, cw, ch);

    var kbT = Math.min(1, cycleElapsed / (TA_CYCLE_HOLD + taCycleTransDur));
    var kbZoom = 1 + kbT * 0.04;
    var nextKb = 1 + (1 - taCycleFade) * 0.03;
    var imgA = thirdCycleVids[taCycleIdx];
    var imgB = thirdCycleVids[(taCycleIdx + 1) % thirdCycleVids.length];

    function drawCImg(img, alpha, zoom) {
      if (!img || img.readyState < 2 || alpha <= 0) return;
      var baseDiam = imgSize * zoom;
      var statueClip =
        TA_STATUE_IDX >= 0 && thirdCycleVids[TA_STATUE_IDX] === img;
      /* Medusa/statue clip: tighter framing, but keep zoom growth pinned to top-left. */
      var extraZoom = statueClip ? 1.24 : 1;
      var diam = baseDiam * extraZoom;
      var vw = img.videoWidth || diam;
      var vh = img.videoHeight || diam;
      var baseS = Math.max(baseDiam / vw, baseDiam / vh);
      var baseDw = vw * baseS;
      var baseDh = vh * baseS;
      var s = Math.max(diam / vw, diam / vh);
      var dw = vw * s;
      var dh = vh * s;
      var dx = cx - dw / 2;
      var dy = cy - dh / 2;
      if (statueClip) {
        dx += (dw - baseDw) / 2;
        dy += (dh - baseDh) / 2;
      }
      thirdRingCtx.save();
      thirdRingCtx.globalAlpha = alpha;
      if (TA_ORB_IDX >= 0 && thirdCycleVids[TA_ORB_IDX] === img) {
        thirdRingDrawVideoDifference(thirdRingCtx, img, dx, dy, dw, dh);
      } else {
        thirdRingCtx.globalCompositeOperation = "source-over";
        thirdRingCtx.drawImage(img, dx, dy, dw, dh);
      }
      thirdRingCtx.restore();
    }

    if (taCycleFade > 0) {
      drawCImg(imgA, 1 - taCycleFade, kbZoom);
      drawCImg(imgB, taCycleFade, nextKb);
    } else {
      drawCImg(imgA, 1, kbZoom);
    }

    if (thirdRingDrawBgMp4Layer() && thirdBgVid.readyState >= 2) {
      var vvw = thirdBgVid.videoWidth || imgSize;
      var vvh = thirdBgVid.videoHeight || imgSize;
      var diam2 = clipR * 2;
      var vs = Math.max(diam2 / vvw, diam2 / vvh);
      var vdw = vvw * vs;
      var vdh = vvh * vs;
      thirdRingCtx.globalAlpha = 0.6;
      thirdRingDrawVideoDifference(
        thirdRingCtx,
        thirdBgVid,
        cx - vdw / 2,
        cy - vdh / 2,
        vdw,
        vdh,
      );
      thirdRingCtx.globalAlpha = 1;
      thirdRingCtx.globalCompositeOperation = "source-over";
    }
  }

  function thirdRingStart() {
    if (!thirdRingCanvas) return;
    ensureThirdRingVideos();
    thirdRingResize();
    taCycleIdx = TA_CYCLE_EYE_IDX;
    taCycleFade = 0;
    taCycleStart = performance.now();
    taCycleTransDur = TA_CYCLE_TRANS;
    taCyclePrevTs = null;
    if (thirdBgVid) {
      thirdBgVid.currentTime = 0;
      thirdBgVid.play().catch(function () {});
    }
    thirdCycleVids.forEach(function (v) {
      try {
        v.play().catch(function () {});
      } catch (_) {}
    });
    if (thirdRingRaf) cancelAnimationFrame(thirdRingRaf);
    thirdRingRaf = requestAnimationFrame(thirdRingFrame);
  }

  var heroContentEl = document.querySelector(".hero-content");
  var heroHlMaskEl = document.getElementById("hero-hl-mask");
  var thirdActMaskEl = document.querySelector(".third-act-mask");
  var heroFitMeasureEl = null;
  var heroFitRaf = null;
  var HERO_PRIMARY_TEMPLATE_LINES = [
    "EXPERIMENTING",
    "WITH NEW METHODS",
    "OF CREATION.",
  ];
  var HERO_PRIMARY_TEMPLATE_LINES_MOBILE = [
    "EXPERIMENTING",
    "WITH NEW",
    "METHODS",
    "OF CREATION.",
  ];
  var HERO_SECOND_TEMPLATE_LINES = ["WE ARE AN AI-NATIVE", "PRODUCT STUDIO."];
  var HERO_SECOND_TEMPLATE_LINES_MOBILE = [
    "WE ARE AN",
    "AI-NATIVE",
    "PRODUCT",
    "STUDIO",
  ];

  function ensureHeroFitMeasureEl() {
    if (heroFitMeasureEl) return heroFitMeasureEl;
    heroFitMeasureEl = document.createElement("span");
    heroFitMeasureEl.setAttribute("aria-hidden", "true");
    heroFitMeasureEl.style.position = "fixed";
    heroFitMeasureEl.style.left = "-99999px";
    heroFitMeasureEl.style.top = "-99999px";
    heroFitMeasureEl.style.visibility = "hidden";
    heroFitMeasureEl.style.pointerEvents = "none";
    heroFitMeasureEl.style.whiteSpace = "nowrap";
    heroFitMeasureEl.style.padding = "0";
    heroFitMeasureEl.style.margin = "0";
    document.body.appendChild(heroFitMeasureEl);
    return heroFitMeasureEl;
  }

  function heroAutoFitTemplateLines() {
    /*
     * Fit to widest nowrap line across hero + second + third act so scaled size never overflows.
     */
    var mob = window.matchMedia("(max-width: 600px)").matches;
    var primary = mob
      ? HERO_PRIMARY_TEMPLATE_LINES_MOBILE
      : HERO_PRIMARY_TEMPLATE_LINES;
    var second = mob
      ? HERO_SECOND_TEMPLATE_LINES_MOBILE
      : HERO_SECOND_TEMPLATE_LINES;
    var third = mob ? THIRD_LINES_MOBILE : THIRD_LINES;
    return primary.concat(second).concat(third);
  }

  function heroAutoFitNow() {
    if (!heroHl) return;
    if (heroFitRaf) {
      cancelAnimationFrame(heroFitRaf);
      heroFitRaf = null;
    }

    heroHl.style.fontSize = "";
    if (thirdActHl) thirdActHl.style.fontSize = "";

    var cs = getComputedStyle(heroHl);
    var baseSizePx = parseFloat(cs.fontSize);
    if (!(baseSizePx > 0)) return;

    var avail = Infinity;
    if (heroHlMaskEl && heroHlMaskEl.clientWidth > 0)
      avail = Math.min(avail, heroHlMaskEl.clientWidth);
    if (thirdActMaskEl && thirdActMaskEl.clientWidth > 0)
      avail = Math.min(avail, thirdActMaskEl.clientWidth);
    if (!isFinite(avail) || avail <= 0) return;

    var meter = ensureHeroFitMeasureEl();
    meter.style.fontFamily = cs.fontFamily;
    meter.style.fontWeight = cs.fontWeight;
    meter.style.fontStyle = cs.fontStyle;
    meter.style.letterSpacing = cs.letterSpacing;
    meter.style.fontSize = baseSizePx + "px";
    meter.style.textTransform = "uppercase";

    var widest = 0;
    heroAutoFitTemplateLines().forEach(function (line) {
      meter.textContent = line;
      widest = Math.max(widest, meter.getBoundingClientRect().width);
    });
    if (!(widest > 0)) return;

    var scale = Math.min(1, (avail - 2) / widest);
    if (scale >= 0.999) {
      heroHl.style.fontSize = "";
      if (thirdActHl) thirdActHl.style.fontSize = "";
      return;
    }
    var fittedPx = Math.max(20, baseSizePx * scale);
    var px = fittedPx.toFixed(3) + "px";
    heroHl.style.fontSize = px;
    if (thirdActHl) thirdActHl.style.fontSize = px;
  }

  function scheduleHeroAutoFit() {
    if (heroFitRaf) cancelAnimationFrame(heroFitRaf);
    heroFitRaf = requestAnimationFrame(heroAutoFitNow);
  }

  function isThirdActTerminal() {
    return phase === 5 || phase === 40;
  }
  /** After second headline mounts, ignore exit scroll until entrance stagger completes (prevents one gesture skipping past the phrase). */
  var allowSecondaryScrollExit = false;
  var secondaryExitArmTimer = null;
  var autoSecondIntroTimer = null;

  function secondHeadlineEntranceGraceMs(charCount, reduce) {
    if (reduce) return 520;
    var n = charCount || 0;
    var maxStaggerMs = n ? (n - 1) * 26 + 105 : 0;
    var maxDurMs = 1100;
    return Math.min(2800, maxStaggerMs + maxDurMs + 480);
  }

  function buildPrimaryHeadlineFromSpecs(specs) {
    if (!heroHl) return;
    specs.forEach(function (segments) {
      var line = document.createElement("span");
      line.className = "hl-line";
      var inner = document.createElement("span");
      inner.className = "hl-inner";
      segments.forEach(function (seg) {
        if (seg.k === "a") {
          var ax = document.createElement("span");
          ax.className = "hero-hl-accent";
          ax.textContent = seg.v;
          inner.appendChild(ax);
        } else {
          inner.appendChild(document.createTextNode(seg.v));
        }
      });
      line.appendChild(inner);
      heroHl.appendChild(line);
    });
  }
  function mountPrimaryHeadlineForBreakpoint() {
    if (!heroHl || heroHl.classList.contains("hero-hl--second-block")) return;
    var mob = primaryHeadlineBpMq.matches;
    lastPrimaryHeadlineMobile = mob;
    heroHl.innerHTML = "";
    buildPrimaryHeadlineFromSpecs(
      mob ? PRIMARY_LINE_SPECS_MOBILE : PRIMARY_LINE_SPECS_DESKTOP,
    );
    heroHl.querySelectorAll(".hl-inner").forEach(function (inner) {
      splitToChars(inner);
    });
  }
  function maybeRemountPrimaryHeadlineIfBpChanged() {
    if (!heroHl || heroHl.classList.contains("hero-hl--second-block")) return;
    if (phase !== 0 && phase !== 1) return;
    var mob = primaryHeadlineBpMq.matches;
    if (mob === lastPrimaryHeadlineMobile) return;
    lastPrimaryHeadlineMobile = mob;
    var wasRevealed = heroHl.classList.contains("revealed");
    heroHl.classList.remove("revealed");
    heroHl.innerHTML = "";
    buildPrimaryHeadlineFromSpecs(
      mob ? PRIMARY_LINE_SPECS_MOBILE : PRIMARY_LINE_SPECS_DESKTOP,
    );
    heroHl.querySelectorAll(".hl-inner").forEach(function (inner) {
      splitToChars(inner);
    });
    var ch = Array.from(
      heroHl.querySelectorAll(".hl-char:not(.hl-char--space)"),
    );
    staggerChars(ch);
    if (wasRevealed || phase === 1) heroHl.classList.add("revealed");
    scheduleHeroAutoFit();
  }

  mountPrimaryHeadlineForBreakpoint();
  var allChars = Array.from(
    heroHl.querySelectorAll(".hl-char:not(.hl-char--space)"),
  );
  staggerChars(allChars);
  scheduleHeroAutoFit();
  window.addEventListener(
    "resize",
    function () {
      maybeRemountPrimaryHeadlineIfBpChanged();
      scheduleHeroAutoFit();
    },
    { passive: true },
  );
  window.addEventListener(
    "orientationchange",
    function () {
      maybeRemountPrimaryHeadlineIfBpChanged();
      scheduleHeroAutoFit();
    },
    { passive: true },
  );
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      scheduleHeroAutoFit();
    });
  }

  function isMobileIntent() {
    return (
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 600
    );
  }

  function exitThreshold() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return 80;
    var h = window.innerHeight || 640;
    if (isMobileIntent()) return Math.min(300, Math.max(95, h * 0.24));
    return Math.min(420, Math.max(180, h * 0.35));
  }

  function touchIntentMultiplier() {
    return isMobileIntent() ? 2.15 : 1.2;
  }

  function armPhaseAfterExit(chars, nextPhase) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var n = chars.length;
    var ms = reduce ? 120 : Math.min(1100, 200 + (n ? (n - 1) * 14 : 0) + 720);
    setTimeout(function () {
      exitInProgress = false;
      phase = nextPhase;
      syncNavHeroSecondHeadline();
      scrollIntent = 0;
      if (nextPhase === 2) {
        if (autoSecondIntroTimer) clearTimeout(autoSecondIntroTimer);
        var dwell = reduce ? 200 : 380;
        autoSecondIntroTimer = setTimeout(function () {
          autoSecondIntroTimer = null;
          if (phase === 2 && !exitInProgress) runSecondHeadlineIntro();
        }, dwell);
      }
    }, ms);
  }

  function fallHeadlineOut() {
    if (phase !== 1 || exitInProgress || !heroHl.classList.contains("revealed"))
      return;
    exitInProgress = true;
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
    var chars = Array.from(
      heroHl.querySelectorAll(".hl-char:not(.hl-char--space)"),
    );
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    staggerExitTiming(chars, reduce);
    chars.forEach(function (c) {
      attachHlCharExitHideAfterTransform(c);
      c.classList.add("hl-char-exit");
    });
    armPhaseAfterExit(chars, 2);
  }

  /** After red fill: scale in the circular video, then run `cb` (mount headline). */
  function playThirdActVideoCircleIn(cb) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var waitMs = reduce ? 90 : 100;
    if (!thirdActVideoShell) {
      if (typeof cb === "function") setTimeout(cb, 0);
      return;
    }
    thirdParticlesStop();
    thirdRingStop();
    thirdActVideoShell.classList.remove("third-act-video-shell--in");
    syncThirdActTorusInFromShell();
    void thirdActVideoShell.offsetWidth;
    thirdActVideoShell.classList.add("third-act-video-shell--in");
    thirdActVideoShell.setAttribute("aria-hidden", "false");
    syncThirdActTorusInFromShell();
    thirdRingStart();
    thirdParticlesStart();
    setTimeout(function () {
      if (typeof cb === "function") cb();
    }, waitMs);
  }

  function mountThirdHeadline() {
    if (!thirdActHl) return;
    thirdActHl.classList.remove("revealed");
    thirdActHl.innerHTML = "";
    getThirdHeadlineLines().forEach(function (lineText) {
      var line = document.createElement("span");
      line.className = "hl-line";
      var inner = document.createElement("span");
      inner.className = "hl-inner";
      inner.textContent = lineText;
      line.appendChild(inner);
      thirdActHl.appendChild(line);
    });
    thirdActHl.querySelectorAll(".hl-inner").forEach(function (inner) {
      splitToChars(inner);
    });
    var tChars = Array.from(
      thirdActHl.querySelectorAll(".hl-char:not(.hl-char--space)"),
    );
    staggerChars(tChars);
    scheduleHeroAutoFit();
    scrollIntent = 0;
    setTimeout(function () {
      requestAnimationFrame(function () {
        thirdActHl.classList.add("revealed");
        phase = 5;
        syncNavHeroSecondHeadline();
        exitInProgress = false;
        thirdActUnlockWheelAccum = 0;
        mobilePhase5FastUnlockDone = false;
      });
    }, 300);
  }

  function mountThirdHeadlineStatic() {
    if (!thirdActHl) return;
    if (thirdActHl.textContent && thirdActHl.textContent.trim()) {
      thirdActHl.classList.add("revealed");
      scheduleHeroAutoFit();
      return;
    }
    thirdActHl.classList.remove("revealed");
    thirdActHl.innerHTML = "";
    getThirdHeadlineLines().forEach(function (lineText) {
      var line = document.createElement("span");
      line.className = "hl-line";
      var inner = document.createElement("span");
      inner.className = "hl-inner";
      inner.textContent = lineText;
      line.appendChild(inner);
      thirdActHl.appendChild(line);
    });
    thirdActHl.classList.add("revealed");
    scheduleHeroAutoFit();
  }

  function thirdActUnlockNeedPx() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 85
      : 200;
  }
  /** Ouro Labs wordmark: mouse-repel physics + bg.mp4 clip (matches index.html). */
  function initScrollIntroWordmarkEffects(cont) {
    if (window.__scrollIntroWordmarkFxInit || !cont) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.__scrollIntroWordmarkFxInit = true;
      cont.classList.add("scroll-intro-continuation--wordmark-static");
      return;
    }

    var svgElWm = cont.querySelector(".wordmark-svg-physics");
    var canvasWm = document.getElementById("wm-vid-canvas-scroll-intro");
    if (!svgElWm || !canvasWm) return;

    window.__scrollIntroWordmarkFxInit = true;

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      var lettersWm = svgElWm.querySelectorAll(".wm-l");
      if (lettersWm.length) {
        var VWWm = 2374,
          VHWm = 433;
        var restsWm = [
          [165, 268],
          [329 + 165, 110.669 + 158],
          [674.518 + 120, 110.669 + 157],
          [906.7647 + 165, 268],
          [1336.7647 + 56, 220],
          [1447.7647 + 165, 268],
          [1773.7647 + 165, 217],
          [2068.7647 + 153, 268],
        ];
        var SPRINGWm = 0.035,
          DAMPWm = 0.88,
          REPELWm = 70000,
          MAX_FWm = 18,
          RADIUS_PX_Wm = 200;
        var mxWm = -99999,
          myWm = -99999;
        document.addEventListener("mousemove", function (e) {
          mxWm = e.clientX;
          myWm = e.clientY;
        });
        var statesWm = Array.from(lettersWm).map(function (el, i) {
          return { el: el, x: 0, y: 0, vx: 0, vy: 0, rest: restsWm[i] };
        });
        var wmPhysInViewWm = false,
          wmPhysRafWm = null;
        new IntersectionObserver(
          function (entries) {
            wmPhysInViewWm = entries[0].isIntersecting;
            if (wmPhysInViewWm && !wmPhysRafWm)
              wmPhysRafWm = requestAnimationFrame(tickWm);
          },
          { rootMargin: "0px" },
        ).observe(svgElWm);
        function tickWm() {
          if (!wmPhysInViewWm) {
            wmPhysRafWm = null;
            return;
          }
          wmPhysRafWm = requestAnimationFrame(tickWm);
          var r = svgElWm.getBoundingClientRect();
          var vb = svgElWm.viewBox.baseVal;
          var sx = r.width / (vb.width || VWWm);
          var sy = r.height / (vb.height || VHWm);
          var mxS = (mxWm - r.left) / sx + (vb.x || 0);
          var myS = (myWm - r.top) / sy + (vb.y || 0);
          statesWm.forEach(function (s) {
            var cx = s.rest[0] + s.x,
              cy = s.rest[1] + s.y;
            var dx = mxS - cx,
              dy = myS - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var radS = RADIUS_PX_Wm / sx;
            var fx = 0,
              fy = 0;
            if (dist < radS && dist > 0.5) {
              var mag = Math.min(REPELWm / (dist * dist), MAX_FWm);
              fx = -(dx / dist) * mag;
              fy = -(dy / dist) * mag;
            }
            fx -= SPRINGWm * s.x;
            fy -= SPRINGWm * s.y;
            s.vx = (s.vx + fx) * DAMPWm;
            s.vy = (s.vy + fy) * DAMPWm;
            s.x += s.vx;
            s.y += s.vy;
            s.el.setAttribute(
              "transform",
              "translate(" + s.x.toFixed(1) + "," + s.y.toFixed(1) + ")",
            );
          });
        }
        wmPhysRafWm = requestAnimationFrame(tickWm);
      }
    }

    var ctxWm = canvasWm.getContext("2d");
    var diffOKWm = (function () {
      if (!prefersDifferenceVideoBlend) return false;
      try {
        var c = document.createElement("canvas");
        c.width = c.height = 1;
        var x = c.getContext("2d");
        x.fillStyle = "#f00";
        x.fillRect(0, 0, 1, 1);
        x.globalCompositeOperation = "difference";
        x.fillStyle = "#f00";
        x.fillRect(0, 0, 1, 1);
        return x.getImageData(0, 0, 1, 1).data[0] < 10;
      } catch (e) {
        return false;
      }
    })();
    var dprWm = Math.min(window.devicePixelRatio || 1, 2);
    var VWWm2 = 2374,
      VHWm2 = 433,
      TOP_PAD_CSS_WM = 160,
      BOTTOM_PAD_CSS_WM = 0;
    var staticsWm = [
      { sx: 0, sy: 103 },
      { sx: 329, sy: 110.669 },
      { sx: 674.518, sy: 110.669 },
      { sx: 906.7647, sy: 103 },
      { sx: 1336.7647, sy: 7, isRect: true, rw: 111, rh: 426 },
      { sx: 1447.7647, sy: 103 },
      { sx: 1773.7647, sy: 0 },
      { sx: 2068.7647, sy: 102 },
    ];
    var wmlWm = svgElWm.querySelectorAll(".wm-l");
    var pathsWm = Array.from(wmlWm).map(function (el, i) {
      if (staticsWm[i].isRect) return null;
      var p = el.querySelector("path");
      return p ? new Path2D(p.getAttribute("d")) : null;
    });
    var vidWm =
      window.__bgVid ||
      (function () {
        var v = document.createElement("video");
        v.src = "bg.mp4";
        v.preload = "auto";
        v.autoplay = true;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.style.cssText = _taVidHide;
        document.body.appendChild(v);
        v.play().catch(function () {});
        return v;
      })();
    if (!window.__bgVid) window.__bgVid = vidWm;
    /* No bottom trim - index trims slack for a tighter crop; at full width it clipped descenders (S, B). */
    var VB_BOTTOM_TRIM_WM = 0;
    /* Must match inner <g transform="... scale(...)"> on the R .wm-l (canvas mask uses path only). */
    /* Match R cap height to U (322.331) - was 0.978, which made R visibly shorter. */
    var WM_R_PATH_SCALE = 322.331 / 322;

    function resizeWm() {
      var r = svgElWm.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      /* Full viewport (row) width - index uses --g inset; here we scale the mark edge-to-edge. */
      var gPx = 0;
      var eff = Math.max(r.width - 2 * gPx, r.width * 0.4);
      var sc = r.width / eff;
      var minX = -((gPx * VWWm2) / eff);
      var vbH = Math.max(220, VHWm2 * sc - VB_BOTTOM_TRIM_WM);
      svgElWm.setAttribute(
        "viewBox",
        minX.toFixed(1) +
          " 0 " +
          (VWWm2 * sc).toFixed(1) +
          " " +
          vbH.toFixed(1),
      );
      r = svgElWm.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      var totalH = r.height + TOP_PAD_CSS_WM + BOTTOM_PAD_CSS_WM;
      canvasWm.width = Math.round(r.width * dprWm);
      canvasWm.height = Math.round(totalH * dprWm);
      canvasWm.style.width = r.width + "px";
      canvasWm.style.height = totalH + "px";
      canvasWm.style.top = -TOP_PAD_CSS_WM + "px";
    }
    window.addEventListener("resize", resizeWm);
    window.addEventListener("load", resizeWm);
    setTimeout(resizeWm, 100);
    setTimeout(resizeWm, 600);
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(function () {
        resizeWm();
      }).observe(svgElWm);
    }
    ["loadedmetadata", "loadeddata"].forEach(function (ev) {
      vidWm.addEventListener(
        ev,
        function () {
          resizeWm();
        },
        { passive: true },
      );
    });

    var maskCanvasWm = document.createElement("canvas");
    var mctxWm = maskCanvasWm.getContext("2d");
    var wmVidInViewWm = false,
      wmVidRafWm = null;
    new IntersectionObserver(
      function (entries) {
        wmVidInViewWm = entries[0].isIntersecting;
        if (wmVidInViewWm && !wmVidRafWm)
          wmVidRafWm = requestAnimationFrame(wmVidFrameWm);
      },
      { rootMargin: "100px" },
    ).observe(svgElWm);

    var redHex =
      (
        getComputedStyle(document.documentElement).getPropertyValue("--red") ||
        ""
      ).trim() || "#FF1B00";
    var bgHex =
      (
        getComputedStyle(document.documentElement).getPropertyValue("--bg") ||
        ""
      ).trim() || "#DDDBD6";

    function wmVidFrameWm() {
      if (!wmVidInViewWm) {
        wmVidRafWm = null;
        return;
      }
      wmVidRafWm = requestAnimationFrame(wmVidFrameWm);
      if (vidWm.readyState < 2) return;
      if (!canvasWm.width || canvasWm.height < 8) {
        resizeWm();
        if (!canvasWm.width || canvasWm.height < 8) return;
      }

      var cw = canvasWm.width,
        ch = canvasWm.height;
      var pw = cw / dprWm;
      var ph_svg = ch / dprWm - TOP_PAD_CSS_WM - BOTTOM_PAD_CSS_WM;
      var vb = svgElWm.viewBox.baseVal;
      var vbW = vb.width || VWWm2,
        vbH = vb.height || VHWm2,
        vbX = vb.x || 0;
      var scaleX = pw / vbW,
        scaleY = ph_svg / vbH;

      if (maskCanvasWm.width !== cw || maskCanvasWm.height !== ch) {
        maskCanvasWm.width = cw;
        maskCanvasWm.height = ch;
      }

      mctxWm.clearRect(0, 0, cw, ch);
      mctxWm.save();
      mctxWm.scale(dprWm, dprWm);
      mctxWm.fillStyle = bgHex;
      Array.from(wmlWm).forEach(function (el, i) {
        var t = el.getAttribute("transform") || "translate(0,0)";
        var m = t.match(/translate\(([^,]+),([^)]+)\)/);
        var dx = m ? parseFloat(m[1]) : 0;
        var dy = m ? parseFloat(m[2]) : 0;
        var tx = (staticsWm[i].sx + dx - vbX) * scaleX;
        var ty = (staticsWm[i].sy + dy) * scaleY + TOP_PAD_CSS_WM;
        mctxWm.save();
        mctxWm.translate(tx, ty);
        if (staticsWm[i].isRect) {
          mctxWm.fillRect(
            0,
            0,
            staticsWm[i].rw * scaleX,
            staticsWm[i].rh * scaleY,
          );
        } else if (pathsWm[i]) {
          var ps = i === 2 ? WM_R_PATH_SCALE : 1;
          mctxWm.scale(scaleX * ps, scaleY * ps);
          mctxWm.fill(pathsWm[i]);
        }
        mctxWm.restore();
      });
      mctxWm.restore();

      var ph_total = ch / dprWm;
      ctxWm.clearRect(0, 0, cw, ch);
      ctxWm.save();
      ctxWm.scale(dprWm, dprWm);
      ctxWm.fillStyle = redHex;
      ctxWm.fillRect(0, 0, pw, ph_total);

      if (diffOKWm) {
        var vw = vidWm.videoWidth || pw,
          vh2 = vidWm.videoHeight || ph_svg;
        var s = Math.max(pw / vw, ph_total / vh2);
        ctxWm.globalAlpha = 0.5;
        ctxWm.globalCompositeOperation = "difference";
        ctxWm.drawImage(
          vidWm,
          (pw - vw * s) / 2,
          (ph_total - vh2 * s) / 2,
          vw * s,
          vh2 * s,
        );
        ctxWm.globalAlpha = 1;
        ctxWm.globalCompositeOperation = "source-over";
      }
      ctxWm.restore();

      ctxWm.globalCompositeOperation = "destination-in";
      ctxWm.drawImage(maskCanvasWm, 0, 0);
      ctxWm.globalCompositeOperation = "source-over";
    }
    resizeWm();
    requestAnimationFrame(function () {
      resizeWm();
      requestAnimationFrame(resizeWm);
    });
    wmVidRafWm = requestAnimationFrame(wmVidFrameWm);
  }

  function initScrollIntroContinuation() {
    if (window.__scrollIntroContInit) return;
    var cont = document.getElementById("scroll-intro-continuation");
    if (!cont) return;
    window.__scrollIntroContInit = true;

    var track = cont.querySelector(".hscroll-track");
    var pgNames = cont.querySelectorAll(".hscroll-track .pg-name");
    var kimSection = cont.querySelector(".kim-team-section");
    var kimLines = kimSection
      ? Array.from(kimSection.querySelectorAll(".kim-team-line"))
      : [];
    var wordmarkInitDone = false;
    var footerWordmarkIntroPlayed = false;
    function initWordmarkEffectsWhenNeeded() {
      if (wordmarkInitDone) return;
      wordmarkInitDone = true;
      initScrollIntroWordmarkEffects(cont);
    }
    function runFooterWordmarkLetterEntrance() {
      if (footerWordmarkIntroPlayed) return;
      footerWordmarkIntroPlayed = true;
      var wm = document.getElementById("wm-letters-scroll-intro");
      if (!wm) {
        initWordmarkEffectsWhenNeeded();
        return;
      }
      var groups = wm.querySelectorAll(".wordmark-svg-physics > .wm-l");
      if (!groups.length) {
        initWordmarkEffectsWhenNeeded();
        return;
      }
      var groupList = Array.from(groups);
      var reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      wm.classList.remove("wordmark--canvas-reveal");
      wm.classList.add("wordmark--letter-intro");
      if (reduce) {
        wm.classList.remove("wordmark--letter-intro");
        initWordmarkEffectsWhenNeeded();
        requestAnimationFrame(function () {
          wm.classList.add("wordmark--canvas-reveal");
        });
        return;
      }
      var wr = wm.getBoundingClientRect();
      var risePx = Math.max(120, window.innerHeight - wr.top + 28);
      var baseDelay = 68;
      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }
      var now0 = performance.now();
      var states = groupList.map(function (g, i) {
        var delayMs = Math.round(i * baseDelay + Math.random() * 16);
        var durMs = Math.round((0.42 + Math.random() * 0.32) * 1000);
        var startY = risePx + Math.random() * 24;
        g.style.opacity = "0";
        g.setAttribute("transform", "translate(0," + startY.toFixed(2) + ")");
        return {
          el: g,
          startMs: now0 + delayMs,
          durMs: durMs,
          startY: startY,
        };
      });
      function finishLetterIntro() {
        wm.classList.add("wordmark--handoff");
        wm.classList.remove("wordmark--letter-intro");
        states.forEach(function (s) {
          s.el.style.opacity = "";
          s.el.removeAttribute("transform");
        });
        initWordmarkEffectsWhenNeeded();
        requestAnimationFrame(function () {
          wm.classList.add("wordmark--canvas-reveal");
          setTimeout(function () {
            wm.classList.remove("wordmark--handoff");
          }, 1240);
        });
      }
      function tickLetterIntro(now) {
        var anyRunning = false;
        states.forEach(function (s) {
          var elapsed = now - s.startMs;
          if (elapsed <= 0) {
            anyRunning = true;
            return;
          }
          var t = Math.min(1, elapsed / s.durMs);
          var eased = easeOutCubic(t);
          var y = s.startY * (1 - eased);
          var alpha = t < 0.28 ? t / 0.28 : 1;
          s.el.setAttribute("transform", "translate(0," + y.toFixed(2) + ")");
          s.el.style.opacity = alpha.toFixed(3);
          if (t < 1) anyRunning = true;
        });
        if (anyRunning) {
          requestAnimationFrame(tickLetterIntro);
        } else {
          finishLetterIntro();
        }
      }
      requestAnimationFrame(tickLetterIntro);
    }
    function isNearBottomOfPage() {
      var de = document.documentElement;
      var bottomY = window.scrollY + (window.innerHeight || 0);
      var maxY = de ? de.scrollHeight : 0;
      return bottomY >= maxY - 2;
    }
    function maybeRunFooterWordmarkAtBottom(footerEl) {
      if (footerWordmarkIntroPlayed || !footerEl) return;
      var r = footerEl.getBoundingClientRect();
      var inView = r.top < (window.innerHeight || 0) && r.bottom > 0;
      if (inView && isNearBottomOfPage()) {
        runFooterWordmarkLetterEntrance();
      }
    }
    var statementBlocks = cont.querySelectorAll(
      ".scroll-intro-below__statements",
    );
    if (statementBlocks.length) {
      function hexToRgb(hex) {
        hex = (hex || "").trim().replace(/^#/, "");
        if (!hex) return [0, 0, 0];
        if (hex.length === 3) {
          hex = hex
            .split("")
            .map(function (ch) {
              return ch + ch;
            })
            .join("");
        }
        if (hex.length < 6) return [0, 0, 0];
        var n = parseInt(hex.slice(0, 6), 16);
        if (isNaN(n)) return [0, 0, 0];
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      function wrapScrollIntroStatementWords(p) {
        function appendWords(target, text, accent) {
          var parts = text.split(/(\s+)/);
          parts.forEach(function (part) {
            if (part === "") return;
            if (/^[\s\u00a0]+$/.test(part)) {
              target.appendChild(document.createTextNode(part));
              return;
            }
            var span = document.createElement("span");
            span.className = accent
              ? "scroll-intro-below__word scroll-intro-below__word--accent"
              : "scroll-intro-below__word";
            span.textContent = part;
            target.appendChild(span);
          });
        }
        var out = document.createDocumentFragment();
        Array.from(p.childNodes).forEach(function (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            appendWords(out, node.textContent, false);
          } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName === "EM"
          ) {
            var em = document.createElement("em");
            appendWords(em, node.textContent, true);
            out.appendChild(em);
          }
        });
        p.textContent = "";
        p.appendChild(out);
      }
      function smoothstep01(t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return t * t * (3 - 2 * t);
      }
      var statementWordsRaf = null;
      function updateScrollIntroStatementWordsForBlock(
        statementBelow,
        inkRgb,
        mutedRgb,
        redRgb,
      ) {
        var words = statementBelow.querySelectorAll(
          ".scroll-intro-below__word",
        );
        if (!words.length) return;
        var rect = statementBelow.getBoundingClientRect();
        var vh = window.innerHeight || 640;
        /* Progress as the block moves through mid-viewport (Evolve-style scroll scrub). */
        var focusY = rect.top + rect.height * 0.42;
        var start = vh * 0.92;
        var end = vh * 0.38;
        var raw = (start - focusY) / (start - end);
        var progress = smoothstep01(Math.max(0, Math.min(1, raw)));
        /* Past the block, pin full color (avoids tail words stuck mid-ramp). */
        if (rect.bottom < vh * 0.55) progress = 1;
        var n = words.length;
        /* Moving “read head” 0…(n-1+spread): at progress=1 every word reaches pw=1. */
        var spread = Math.max(1.15, Math.min(3.6, n * 0.13));
        var maxIx = Math.max(0, n - 1);
        var head = progress * (maxIx + spread);
        words.forEach(function (w, i) {
          var pw = (head - i) / spread;
          pw = smoothstep01(Math.max(0, Math.min(1, pw)));
          if (w.classList.contains("scroll-intro-below__word--accent")) {
            var r0 = mutedRgb[0],
              g0 = mutedRgb[1],
              b0 = mutedRgb[2];
            var r1 = redRgb[0],
              g1 = redRgb[1],
              b1 = redRgb[2];
            var rr = Math.round(r0 + (r1 - r0) * pw);
            var gg = Math.round(g0 + (g1 - g0) * pw);
            var bb = Math.round(b0 + (b1 - b0) * pw);
            w.style.color = "rgb(" + rr + "," + gg + "," + bb + ")";
          } else {
            var k0 = mutedRgb[0],
              k1 = mutedRgb[1],
              k2 = mutedRgb[2];
            var t0 = inkRgb[0],
              t1 = inkRgb[1],
              t2 = inkRgb[2];
            var rr = Math.round(k0 + (t0 - k0) * pw);
            var gg = Math.round(k1 + (t1 - k1) * pw);
            var bb = Math.round(k2 + (t2 - k2) * pw);
            w.style.color = "rgb(" + rr + "," + gg + "," + bb + ")";
          }
        });
      }
      function updateAllScrollIntroStatementWords() {
        statementWordsRaf = null;
        var rs = getComputedStyle(document.documentElement);
        var inkRgb = hexToRgb(rs.getPropertyValue("--ink") || "#000000");
        var mutedRgb = hexToRgb(
          rs.getPropertyValue("--ink-muted-statement") || "#B5AFA6",
        );
        var redRgb = hexToRgb(rs.getPropertyValue("--red") || "#FF1B00");
        statementBlocks.forEach(function (block) {
          updateScrollIntroStatementWordsForBlock(
            block,
            inkRgb,
            mutedRgb,
            redRgb,
          );
        });
      }
      function scheduleStatementWords() {
        if (statementWordsRaf != null) return;
        statementWordsRaf = requestAnimationFrame(
          updateAllScrollIntroStatementWords,
        );
      }
      statementBlocks.forEach(function (statementBelow) {
        statementBelow
          .querySelectorAll("p.scroll-intro-below__statement")
          .forEach(function (p) {
            wrapScrollIntroStatementWords(p);
          });
      });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.addEventListener("scroll", scheduleStatementWords, {
          passive: true,
        });
        window.addEventListener("resize", scheduleStatementWords, {
          passive: true,
        });
        scheduleStatementWords();
      }
    }

    function initKimTeamScrollMotion() {
      if (!kimSection || !kimLines.length) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        kimLines.forEach(function (line) {
          line.style.transform = "translate3d(0,0,0)";
        });
        return;
      }
      var kimRaf = null;
      var kimCurrent = [0, 0, 0];
      var kimTarget = [0, 0, 0];
      function computeKimTargets() {
        var rect = kimSection.getBoundingClientRect();
        var vh = window.innerHeight || 1;
        var progress = (vh - rect.top) / (vh + rect.height);
        if (progress < 0) progress = 0;
        else if (progress > 1) progress = 1;
        /* Match the reference feel: ease-in/out through the section (not linear). */
        var eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
        var centered = (eased - 0.5) * 2;
        var travelPx = Math.max(
          42,
          Math.min(176, (window.innerWidth || 1200) * 0.115),
        );
        var multipliers = [1, -0.86, 0.72];
        kimLines.forEach(function (_, i) {
          var m = multipliers[i] || 1;
          kimTarget[i] = centered * travelPx * m;
        });
      }
      function renderKimMotion() {
        var stillMoving = false;
        kimLines.forEach(function (line, i) {
          kimCurrent[i] += (kimTarget[i] - kimCurrent[i]) * 0.14;
          if (Math.abs(kimTarget[i] - kimCurrent[i]) > 0.12) stillMoving = true;
          line.style.transform =
            "translate3d(" + kimCurrent[i].toFixed(2) + "px,0,0)";
        });
        if (stillMoving) {
          kimRaf = requestAnimationFrame(renderKimMotion);
        } else {
          kimRaf = null;
        }
      }
      function scheduleKimMotion() {
        computeKimTargets();
        if (kimRaf !== null) return;
        kimRaf = requestAnimationFrame(renderKimMotion);
      }
      window.addEventListener("scroll", scheduleKimMotion, { passive: true });
      window.addEventListener("resize", scheduleKimMotion, { passive: true });
      scheduleKimMotion();
    }

    /* Vertical wheel over overflow-x track did not chain to document scroll (nested scrollport); route explicitly. */
    /* Same for touch on mobile: WebKit often keeps vertical pans on the horizontal scrollport even with touch-action pan-y. */
    if (track) {
      track.addEventListener(
        "wheel",
        function (e) {
          var ady = Math.abs(e.deltaY),
            adx = Math.abs(e.deltaX);
          if (ady < adx || ady + adx <= 1.5) return;
          var dy = e.deltaY;
          if (e.deltaMode === 1) dy *= 16;
          else if (e.deltaMode === 2) dy *= window.innerHeight || 1;
          e.preventDefault();
          window.scrollBy(0, dy);
        },
        { passive: false, capture: true },
      );

      var hScrollTouchX = null;
      var hScrollTouchY = null;
      function resetHScrollTouch() {
        hScrollTouchX = null;
        hScrollTouchY = null;
      }
      track.addEventListener(
        "touchstart",
        function (e) {
          if (e.touches.length !== 1) {
            resetHScrollTouch();
            return;
          }
          hScrollTouchX = e.touches[0].clientX;
          hScrollTouchY = e.touches[0].clientY;
        },
        { passive: true },
      );
      track.addEventListener(
        "touchmove",
        function (e) {
          if (hScrollTouchY == null || e.touches.length !== 1) return;
          var x = e.touches[0].clientX;
          var y = e.touches[0].clientY;
          var dx = x - hScrollTouchX;
          var dy = y - hScrollTouchY;
          hScrollTouchX = x;
          hScrollTouchY = y;
          if (Math.abs(dy) <= Math.abs(dx)) return;
          if (Math.abs(dy) < 0.5 && Math.abs(dx) < 0.5) return;
          e.preventDefault();
          window.scrollBy(0, -dy);
        },
        { passive: false, capture: true },
      );
      track.addEventListener("touchend", resetHScrollTouch, { passive: true });
      track.addEventListener("touchcancel", resetHScrollTouch, {
        passive: true,
      });
    }

    /* Discover → expand card + long copy (CSS .hcard--expanded). */
    (function initHcardDiscoverExpand(trackEl) {
      if (!trackEl) return;
      function pinPageScrollX() {
        if (!(window.scrollX || window.pageXOffset)) return;
        window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
      }
      /* Vertical page scroll only - avoids scrollIntoView() pulling the horizontal track. */
      function ensureCardVerticallyInView(card, behavior) {
        if (!card) return;
        var r = card.getBoundingClientRect();
        var vh =
          window.innerHeight || document.documentElement.clientHeight || 0;
        if (!vh) return;
        var topLimit = 12;
        var headerEl = document.querySelector(".scroll-intro-header-strip");
        if (headerEl) {
          var hb = headerEl.getBoundingClientRect().bottom;
          if (hb > 0) topLimit = Math.max(topLimit, hb + 8);
        }
        var bottomLimit = vh - 24;
        var delta = 0;
        if (r.top < topLimit) {
          delta = r.top - topLimit;
        } else if (r.bottom > bottomLimit) {
          if (r.top > bottomLimit) {
            delta = r.top - topLimit;
          } else {
            delta = r.bottom - bottomLimit;
          }
        } else {
          return;
        }
        if (Math.abs(delta) < 2) return;
        var be = behavior || "smooth";
        if (
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          be = "auto";
        }
        try {
          window.scrollBy({ left: 0, top: delta, behavior: be });
        } catch (_) {
          window.scrollTo(0, window.scrollY + delta);
        }
        pinPageScrollX();
      }
      /* scrollIntoView() can nudge the *page* horizontally; only move the horizontal track. */
      function scrollCardCenterInTrack(card) {
        var cardRect = card.getBoundingClientRect();
        var trackRect = trackEl.getBoundingClientRect();
        var delta =
          cardRect.left +
          cardRect.width * 0.5 -
          (trackRect.left + trackRect.width * 0.5);
        var target = trackEl.scrollLeft + delta;
        var maxL = Math.max(0, trackEl.scrollWidth - trackEl.clientWidth);
        target = Math.max(0, Math.min(maxL, target));
        try {
          trackEl.scrollTo({ left: target, behavior: "smooth" });
        } catch (err) {
          trackEl.scrollLeft = target;
        }
        pinPageScrollX();
      }
      function syncDetailA11y(card, expanded) {
        var detail = card.querySelector(".hcard-detail");
        if (detail)
          detail.setAttribute("aria-hidden", expanded ? "false" : "true");
        var btn = card.querySelector(".hcard-discover");
        var lbl = btn && btn.querySelector(".hcard-discover__label");
        if (btn) {
          btn.setAttribute("aria-expanded", expanded ? "true" : "false");
          if (lbl) lbl.textContent = expanded ? "Close" : "Learn more";
        }
      }
      function syncTrackExpandedClass() {
        trackEl.classList.toggle(
          "hscroll-track--card-expanded",
          !!trackEl.querySelector(".hcard--expanded"),
        );
      }
      function notaFigVarsClear(el) {
        if (!el) return;
        el.style.removeProperty("--nota-fig-t");
        el.style.removeProperty("--nota-fig-l");
        el.style.removeProperty("--nota-fig-w");
        el.style.removeProperty("--nota-fig-h");
      }
      function notaFigVarsPinBeforeExpand(card) {
        var notaV = card.querySelector(".hcard-visual--nota");
        if (!notaV) return;
        var cr = card.getBoundingClientRect();
        var vr = notaV.getBoundingClientRect();
        card.style.setProperty("--nota-fig-t", vr.top - cr.top + "px");
        card.style.setProperty("--nota-fig-l", vr.left - cr.left + "px");
        card.style.setProperty("--nota-fig-w", vr.width + "px");
        card.style.setProperty("--nota-fig-h", vr.height + "px");
      }
      function collapse(card) {
        if (!card || !card.classList.contains("hcard--expanded")) return;
        card.classList.remove("hcard--expanded");
        notaFigVarsClear(card);
        syncDetailA11y(card, false);
      }
      function expand(card, allCards) {
        allCards.forEach(function (c) {
          if (c !== card) collapse(c);
        });
        notaFigVarsPinBeforeExpand(card);
        card.classList.add("hcard--expanded");
        syncDetailA11y(card, true);
        /*
         * Horizontal: one smooth centering after flex ~70% (avoid stacking two smooth horizontals).
         * Vertical: do not run in parallel - height:auto on the track reflows through ~1s; multiple
         * window.scrollBy(smooth) calls + a late scrollTo(auto) read as “jumpy”. Nudge Y once after
         * horizontal snap + next paint so rects match final layout.
         */
        var SCROLL_AT = 360;
        setTimeout(function () {
          scrollCardCenterInTrack(card);
        }, SCROLL_AT);
        setTimeout(function () {
          var cardRect = card.getBoundingClientRect();
          var trackRect = trackEl.getBoundingClientRect();
          var delta =
            cardRect.left +
            cardRect.width * 0.5 -
            (trackRect.left + trackRect.width * 0.5);
          if (Math.abs(delta) > 1) {
            var maxL = Math.max(0, trackEl.scrollWidth - trackEl.clientWidth);
            var target = Math.max(
              0,
              Math.min(maxL, trackEl.scrollLeft + delta),
            );
            try {
              trackEl.scrollTo({ left: target, behavior: "auto" });
            } catch (_) {
              trackEl.scrollLeft = target;
            }
          }
          pinPageScrollX();
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              ensureCardVerticallyInView(card, "smooth");
            });
          });
        }, 1180);
        setTimeout(pinPageScrollX, 120);
      }
      var cards = Array.prototype.slice.call(
        trackEl.querySelectorAll(".hcard"),
      );
      cards.forEach(function (card) {
        var btn = card.querySelector(".hcard-discover");
        if (!btn) return;
        btn.addEventListener("click", function (ev) {
          ev.preventDefault();
          if (card.classList.contains("hcard--expanded")) {
            collapse(card);
          } else {
            expand(card, cards);
          }
          syncTrackExpandedClass();
        });
        card.addEventListener("click", function (ev) {
          if (ev.target.closest(".hcard-discover")) return;
          if (ev.target.closest("a[href]")) return;
          if (card.classList.contains("hcard--expanded")) return;
          expand(card, cards);
          syncTrackExpandedClass();
        });
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key !== "Escape") return;
        if (document.documentElement.classList.contains("site-meta-open"))
          return;
        var open = trackEl.querySelector(".hcard--expanded");
        if (!open) return;
        collapse(open);
        syncTrackExpandedClass();
      });
    })(track);

    pgNames.forEach(function (pn) {
      pn.querySelectorAll(".hl-inner").forEach(function (inner) {
        splitToChars(inner);
      });
    });
    /* Titles visible immediately - no scroll-triggered stagger (last card was fading/sliding in late). */
    pgNames.forEach(function (pn) {
      var chars = Array.from(
        pn.querySelectorAll(".hl-char:not(.hl-char--space)"),
      );
      chars.forEach(function (ch) {
        ch.style.transitionDelay = "0ms";
        ch.style.setProperty("--cd", "0.01s");
      });
      pn.classList.add("revealed");
    });
    initKimTeamScrollMotion();

    var subcopyBlockForNav = cont.querySelector("#studio");
    var cardsBlockForNav = cont.querySelector("#projects");
    var scrollIntroLogoNav = document.querySelector(".scroll-intro-logo");
    var scrollIntroNavLinks = document.querySelectorAll(
      ".scroll-intro-nav-link",
    );
    var scrollIntroNavToggle = document.getElementById(
      "scroll-intro-nav-toggle",
    );
    var mqNavSmall = window.matchMedia("(max-width: 600px)");
    function clearScrollIntroNavInlineOpacity() {
      if (scrollIntroLogoNav)
        scrollIntroLogoNav.style.removeProperty("opacity");
      if (scrollIntroNavLinks && scrollIntroNavLinks.length) {
        scrollIntroNavLinks.forEach(function (a) {
          a.style.removeProperty("opacity");
        });
      }
      if (scrollIntroNavToggle)
        scrollIntroNavToggle.style.removeProperty("opacity");
    }
    function collapseMobileTopNavIfNeeded() {
      var topNavEl = document.getElementById("scroll-intro-top-nav");
      if (!topNavEl || !mqNavSmall.matches) return;
      topNavEl.classList.remove("scroll-intro-top-nav--open");
      var tgl = document.getElementById("scroll-intro-nav-toggle");
      if (tgl) {
        tgl.setAttribute("aria-expanded", "false");
        tgl.setAttribute("aria-label", "Open menu");
      }
      var ddEl = document.getElementById("scroll-intro-nav-dropdown");
      if (ddEl) ddEl.setAttribute("aria-hidden", "true");
    }
    function updateScrollIntroCardsOverNav() {
      var root = document.documentElement;
      if (!root.classList.contains("scroll-intro-scrollable")) {
        root.classList.remove(
          "scroll-intro-cards-over-nav",
          "scroll-intro-subcopy-under-nav",
        );
        clearScrollIntroNavInlineOpacity();
        return;
      }
      var liftWhenAbove = 56;
      var lowerWhenBelow = 76;
      function syncScrollIntroLiftedBand(cls, el) {
        if (!el) {
          root.classList.remove(cls);
          return;
        }
        var top = el.getBoundingClientRect().top;
        var lifted = root.classList.contains(cls);
        if (!lifted && top < liftWhenAbove) {
          root.classList.add(cls);
          clearScrollIntroNavInlineOpacity();
          collapseMobileTopNavIfNeeded();
        } else if (lifted && top > lowerWhenBelow) {
          root.classList.remove(cls);
          clearScrollIntroNavInlineOpacity();
        }
      }
      syncScrollIntroLiftedBand(
        "scroll-intro-subcopy-under-nav",
        subcopyBlockForNav,
      );
      syncScrollIntroLiftedBand(
        "scroll-intro-cards-over-nav",
        cardsBlockForNav,
      );
    }
    window.addEventListener("scroll", updateScrollIntroCardsOverNav, {
      passive: true,
    });
    window.addEventListener("resize", updateScrollIntroCardsOverNav);
    requestAnimationFrame(updateScrollIntroCardsOverNav);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var footRm = cont.querySelector("footer");
      if (footRm) footRm.classList.add("in");
      initWordmarkEffectsWhenNeeded();
      return;
    }

    var footer = cont.querySelector("footer");
    if (footer) {
      if ("IntersectionObserver" in window) {
        var fobs = new IntersectionObserver(
          function (entries) {
            if (entries[0] && entries[0].isIntersecting) {
              footer.classList.add("in");
              maybeRunFooterWordmarkAtBottom(footer);
            }
          },
          { threshold: 0.1 },
        );
        fobs.observe(footer);
      } else {
        footer.classList.add("in");
        maybeRunFooterWordmarkAtBottom(footer);
      }
      window.addEventListener(
        "scroll",
        function () {
          maybeRunFooterWordmarkAtBottom(footer);
        },
        { passive: true },
      );
      window.addEventListener(
        "resize",
        function () {
          maybeRunFooterWordmarkAtBottom(footer);
        },
        { passive: true },
      );
      requestAnimationFrame(function () {
        maybeRunFooterWordmarkAtBottom(footer);
      });
    }
  }
  function tryUnlockThirdActIfReady() {
    if (phase !== 5) return;
    var need = thirdActUnlockNeedPx();
    if (tpBlasted) need = Math.min(need, 95);
    if (thirdActUnlockWheelAccum >= need) unlockThirdActPageScroll();
  }
  function unlockThirdActPageScroll(onDone) {
    if (phase !== 5) return;
    phase = 6;
    syncNavHeroSecondHeadline();
    detachHeroScrollLocks();
    thirdActUnlockWheelAccum = 0;
    if (thirdAct) {
      thirdAct.classList.add("third-act--in-flow");
    }
    var continuation = document.getElementById("scroll-intro-continuation");
    if (continuation) continuation.removeAttribute("hidden");
    document.documentElement.classList.add("scroll-intro-scrollable");
    if (
      secondParticleWrap &&
      secondParticleWrap.classList.contains("second-hl-particles-wrap--visible")
    ) {
      secondParticleWrap.classList.remove("second-hl-particles-wrap--visible");
      secondParticlesStop();
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        thirdRingResize();
        var w = document.getElementById("third-act-particles-vp-wrap");
        if (w && w.clientWidth >= 12 && w.clientHeight >= 12)
          thirdParticleSetup();
        initScrollIntroContinuation();
        updateNavThirdRedOverlap();
        updateScrollIntroLogoScrollWithThirdAct();
        if (typeof onDone === "function") onDone();
      });
    });
  }
  /** Statement strip under the third act, then project cards (matches mobile swipe-unlock scroll). */
  function scrollIntroBelowAfterThirdActUnlock() {
    void document.documentElement.offsetHeight;
    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    var nextSection =
      document.getElementById("studio") || document.getElementById("projects");
    var scrollBehavior = reduceMotion ? "auto" : "smooth";
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: scrollBehavior, block: "start" });
    } else {
      var se = document.scrollingElement || document.documentElement;
      var vh = window.innerHeight || 640;
      se.scrollTop = Math.min(
        se.scrollTop + Math.round(vh * 0.2),
        se.scrollHeight,
      );
    }
  }

  function startThirdAct() {
    if (phase !== 3 || !allowSecondaryScrollExit || exitInProgress) return;
    if (!thirdAct || !thirdActRed || !thirdActHl) return;
    allowSecondaryScrollExit = false;
    if (secondaryExitArmTimer) {
      clearTimeout(secondaryExitArmTimer);
      secondaryExitArmTimer = null;
    }
    scrollIntent = 0;
    exitInProgress = true;
    phase = 40;
    syncNavHeroSecondHeadline();
    thirdParticlesStop();
    if (secondParticleWrap) {
      secondParticleWrap.classList.remove("second-hl-particles-wrap--visible");
      secondParticlesStop();
    }
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function beginThirdActRedBeat() {
      if (phase !== 40 || !exitInProgress) return;
      /* .hero-hl.revealed{visibility:visible} overrides parent .hero-content visibility:hidden,
         so the second headline kept painting; stripping --second-block then flashed black ink. */
      if (heroHl) heroHl.classList.remove("revealed");
      if (heroContentEl) heroContentEl.style.visibility = "hidden";
      if (heroHl) heroHl.classList.remove("hero-hl--second-block");
      thirdAct.classList.add("third-act--active");
      thirdAct.setAttribute("aria-hidden", "false");
      updateNavThirdRedOverlap();
      requestAnimationFrame(updateNavThirdRedOverlap);
      if (thirdActVideoShell) {
        thirdActVideoShell.classList.remove("third-act-video-shell--in");
        thirdActVideoShell.setAttribute("aria-hidden", "true");
      }
      syncThirdActTorusInFromShell();
      thirdRingStop();
      thirdActRed.classList.remove("third-act-red--expanded");
      if (reduce) {
        void thirdActRed.offsetWidth;
        thirdActRed.classList.add("third-act-red--expanded");
        playThirdActVideoCircleIn(mountThirdHeadline);
        return;
      }
      void thirdActRed.offsetWidth;
      var redFailSafe = null;
      function onRedEnd(e) {
        if (e.target !== thirdActRed) return;
        var pn = e.propertyName || "";
        if (
          pn !== "clip-path" &&
          pn !== "-webkit-clip-path" &&
          pn !== "clipPath"
        )
          return;
        thirdActRed.removeEventListener("transitionend", onRedEnd);
        clearTimeout(redFailSafe);
      }
      requestAnimationFrame(function () {
        thirdActRed.classList.add("third-act-red--expanded");
        thirdActRed.addEventListener("transitionend", onRedEnd);
        redFailSafe = setTimeout(function () {
          thirdActRed.removeEventListener("transitionend", onRedEnd);
        }, 5200);
        playThirdActVideoCircleIn(mountThirdHeadline);
      });
    }
    var secondExitChars = heroHl
      ? Array.from(heroHl.querySelectorAll(".hl-char:not(.hl-char--space)"))
      : [];
    if (
      !reduce &&
      heroHl &&
      heroHl.classList.contains("revealed") &&
      secondExitChars.length
    ) {
      staggerExitTiming(secondExitChars, false);
      secondExitChars.forEach(function (c) {
        attachHlCharExitHideAfterTransform(c);
        c.classList.add("hl-char-exit");
      });
      var n = secondExitChars.length;
      var secondExitMs = Math.min(820, 120 + (n ? (n - 1) * 11 : 0) + 480);
      setTimeout(beginThirdActRedBeat, secondExitMs + 40);
      return;
    }
    beginThirdActRedBeat();
  }

  function bumpPrimaryExit(amount) {
    scrollIntent += amount;
    if (scrollIntent >= exitThreshold()) fallHeadlineOut();
  }

  function bumpSecondIntro(amount) {
    if (phase !== 2 || exitInProgress || amount <= 0) return;
    if (autoSecondIntroTimer) {
      clearTimeout(autoSecondIntroTimer);
      autoSecondIntroTimer = null;
    }
    runSecondHeadlineIntro();
  }

  function bumpSecondaryExit(amount) {
    if (phase !== 3) return;
    scrollIntent += amount;
    if (!allowSecondaryScrollExit) return;
    if (scrollIntent >= exitThreshold()) startThirdAct();
  }

  function runSecondHeadlineIntro() {
    if (phase !== 2 || exitInProgress) return;
    if (autoSecondIntroTimer) {
      clearTimeout(autoSecondIntroTimer);
      autoSecondIntroTimer = null;
    }
    phase = 25;
    syncNavHeroSecondHeadline();
    allowSecondaryScrollExit = false;
    if (secondaryExitArmTimer) {
      clearTimeout(secondaryExitArmTimer);
      secondaryExitArmTimer = null;
    }
    if (secondParticleWrap) {
      secondParticleWrap.classList.remove("second-hl-particles-wrap--visible");
      secondParticlesStop();
    }
    heroHl.classList.remove("revealed");
    heroHl.innerHTML = "";
    heroHl.classList.add("hero-hl--second-block");
    getSecondHeadlineLines().forEach(function (lineText) {
      var line = document.createElement("span");
      line.className = "hl-line";
      var inner = document.createElement("span");
      inner.className = "hl-inner";
      inner.textContent = lineText;
      line.appendChild(inner);
      heroHl.appendChild(line);
    });
    scheduleHeroAutoFit();
    heroHl.querySelectorAll(".hl-inner").forEach(function (inner) {
      splitToChars(inner);
    });
    var chars = Array.from(
      heroHl.querySelectorAll(".hl-char:not(.hl-char--space)"),
    );
    staggerChars(chars);
    scrollIntent = 0;
    setTimeout(function () {
      requestAnimationFrame(function () {
        heroHl.classList.add("revealed");
        phase = 3;
        syncNavHeroSecondHeadline();
        if (secondParticleWrap) {
          requestAnimationFrame(function () {
            secondParticleWrap.classList.add(
              "second-hl-particles-wrap--visible",
            );
            secondParticlesStart();
          });
        }
        var reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        var graceMs = secondHeadlineEntranceGraceMs(chars.length, reduce);
        if (secondaryExitArmTimer) {
          clearTimeout(secondaryExitArmTimer);
        }
        secondaryExitArmTimer = setTimeout(function () {
          secondaryExitArmTimer = null;
          if (phase !== 3 || exitInProgress) return;
          allowSecondaryScrollExit = true;
          if (scrollIntent >= exitThreshold()) startThirdAct();
        }, graceMs);
      });
    }, 300);
  }

  revealTimer = setTimeout(function () {
    revealTimer = null;
    requestAnimationFrame(function () {
      heroHl.classList.add("revealed");
      phase = 1;
      syncNavHeroSecondHeadline();
    });
  }, 300);

  function onWheel(e) {
    if (document.documentElement.classList.contains("site-meta-open")) return;
    if (phase === 40) return;
    if (phase === 6) return;
    if (phase === 5) {
      if (e.deltaY <= 0) return;
      thirdActUnlockWheelAccum += e.deltaY;
      tryUnlockThirdActIfReady();
      if (phase === 6) return;
      e.preventDefault();
      if (
        thirdActVideoShell &&
        thirdActVideoShell.classList.contains("third-act-video-shell--in")
      ) {
        thirdParticlePunch(e.deltaY);
      }
      return;
    }
    if (isThirdActTerminal()) return;
    if (e.deltaY <= 0) return;
    if (phase === 0) return;
    if (phase === 25) return;
    e.preventDefault();
    if (phase === 1 && !exitInProgress && heroHl.classList.contains("revealed"))
      bumpPrimaryExit(e.deltaY);
    else if (phase === 2 && !exitInProgress) bumpSecondIntro(e.deltaY);
    else if (
      phase === 3 &&
      !exitInProgress &&
      heroHl.classList.contains("revealed")
    ) {
      if (
        secondParticleWrap &&
        secondParticleWrap.classList.contains(
          "second-hl-particles-wrap--visible",
        )
      )
        secondParticlePunch(e.deltaY);
      bumpSecondaryExit(e.deltaY);
    }
  }

  var touchY = null;
  var introTouchActive = false;
  /** After intro touch gestures, ignore the synthetic click so we don’t advance twice. */
  var introStageClickTouchGuardUntil = 0;
  /** Set only when touchmove actually advances intro - otherwise tap’s synthetic click is blocked. */
  var introTouchDidAdvance = false;
  var mobilePhase5FastUnlockDone = false;
  function introStageClickTargetIsInteractive(t) {
    if (!t || !t.closest) return false;
    return !!t.closest(
      'a[href], button, input, textarea, select, [role="button"], label[for], summary',
    );
  }
  function onTouchStart(e) {
    if (document.documentElement.classList.contains("site-meta-open")) return;
    if (phase === 6) return;
    if (phase === 40) return;
    if (e.touches.length !== 1) return;
    if (introStageClickTargetIsInteractive(e.target)) return;
    if (
      phase === 1 &&
      (exitInProgress || !heroHl.classList.contains("revealed"))
    )
      return;
    if (
      phase === 3 &&
      (exitInProgress || !heroHl.classList.contains("revealed"))
    )
      return;
    if (phase === 0) return;
    introTouchDidAdvance = false;
    touchY = e.touches[0].clientY;
    introTouchActive = true;
  }
  function onTouchMove(e) {
    if (document.documentElement.classList.contains("site-meta-open")) return;
    if (phase === 6) return;
    if (phase === 40) return;
    if (touchY == null) return;
    if (phase === 25) return;
    if (
      phase === 1 &&
      (exitInProgress || !heroHl.classList.contains("revealed"))
    )
      return;
    if (
      phase === 3 &&
      (exitInProgress || !heroHl.classList.contains("revealed"))
    )
      return;
    if (phase === 0) return;
    var y = e.touches[0].clientY;
    var dy = touchY - y;
    touchY = y;
    if (dy <= 0) return;
    var amt = dy * touchIntentMultiplier();
    if (phase === 5) {
      if (isMobileIntent() && !mobilePhase5FastUnlockDone) {
        mobilePhase5FastUnlockDone = true;
        introTouchDidAdvance = true;
        /* Scroll after continuation inits (same frame chain as unlock) to avoid layout jump. */
        unlockThirdActPageScroll(scrollIntroBelowAfterThirdActUnlock);
        return;
      }
      thirdActUnlockWheelAccum += amt;
      tryUnlockThirdActIfReady();
      if (phase === 6) {
        introTouchDidAdvance = true;
        return;
      }
    }
    introTouchDidAdvance = true;
    e.preventDefault();
    if (phase === 1) bumpPrimaryExit(amt);
    else if (phase === 2) bumpSecondIntro(amt);
    else if (phase === 3) {
      if (
        secondParticleWrap &&
        secondParticleWrap.classList.contains(
          "second-hl-particles-wrap--visible",
        )
      )
        secondParticlePunch(amt);
      bumpSecondaryExit(amt);
    } else if (phase === 5) {
      if (
        thirdActVideoShell &&
        thirdActVideoShell.classList.contains("third-act-video-shell--in")
      ) {
        thirdParticlePunch(amt);
      }
    }
  }
  function onTouchEnd() {
    if (introTouchActive && introTouchDidAdvance)
      introStageClickTouchGuardUntil = performance.now() + 380;
    introTouchActive = false;
    introTouchDidAdvance = false;
    touchY = null;
  }
  function onTouchCancel() {
    if (introTouchActive && introTouchDidAdvance)
      introStageClickTouchGuardUntil = performance.now() + 380;
    introTouchActive = false;
    introTouchDidAdvance = false;
    touchY = null;
  }

  function onStageClick(e) {
    if (document.documentElement.classList.contains("site-meta-open")) return;
    if (e.button !== 0) return;
    if (performance.now() < introStageClickTouchGuardUntil) return;
    if (introStageClickTargetIsInteractive(e.target)) return;
    if (phase === 40) return;
    if (phase === 6) return;
    if (phase === 25) return;
    if (phase === 0) return;
    if (phase === 5) {
      unlockThirdActPageScroll(scrollIntroBelowAfterThirdActUnlock);
      return;
    }
    if (isThirdActTerminal()) return;
    if (
      phase === 1 &&
      (exitInProgress || !heroHl.classList.contains("revealed"))
    )
      return;
    if (
      phase === 3 &&
      (exitInProgress || !heroHl.classList.contains("revealed"))
    )
      return;
    var nudge = Math.max(exitThreshold(), 160);
    if (phase === 1) bumpPrimaryExit(nudge);
    else if (phase === 2) bumpSecondIntro(nudge);
    else if (phase === 3) {
      if (
        secondParticleWrap &&
        secondParticleWrap.classList.contains(
          "second-hl-particles-wrap--visible",
        )
      )
        secondParticlePunch(140);
      bumpSecondaryExit(nudge);
    }
  }

  function onKeyDown(e) {
    if (document.documentElement.classList.contains("site-meta-open")) return;
    if (phase === 40) return;
    if (phase === 6) return;
    if (phase === 5) {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        thirdActUnlockWheelAccum += 72;
        tryUnlockThirdActIfReady();
        if (phase === 6) return;
        thirdParticlePunch(100);
      } else if (e.key === " " && !e.repeat) {
        e.preventDefault();
        thirdActUnlockWheelAccum += 90;
        tryUnlockThirdActIfReady();
        if (phase === 6) return;
        thirdParticlePunch(140);
      }
      return;
    }
    if (isThirdActTerminal()) return;
    if (
      phase === 1 &&
      (exitInProgress || !heroHl.classList.contains("revealed"))
    )
      return;
    if (
      phase === 3 &&
      (exitInProgress || !heroHl.classList.contains("revealed"))
    )
      return;
    if (phase === 0) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      if (phase === 1) bumpPrimaryExit(100);
      else if (phase === 2) bumpSecondIntro(100);
      else if (phase === 3) {
        secondParticlePunch(100);
        bumpSecondaryExit(100);
      }
    } else if (e.key === " " && !e.repeat) {
      e.preventDefault();
      if (phase === 1) bumpPrimaryExit(140);
      else if (phase === 2) bumpSecondIntro(140);
      else if (phase === 3) {
        secondParticlePunch(140);
        bumpSecondaryExit(140);
      }
    }
  }

  /** Instant scroll - smooth scroll animates through the full-viewport red third act and reads as a flash. */
  function jumpToProjects() {
    var projectsSection = document.getElementById("projects");
    if (!projectsSection) return;
    projectsSection.scrollIntoView({ behavior: "auto", block: "start" });
  }
  /** Wait for continuation layout before scrolling - avoids post-scroll reflow jump. */
  function scheduleJumpToProjects() {
    requestAnimationFrame(function () {
      requestAnimationFrame(jumpToProjects);
    });
  }

  function jumpToStudio() {
    var studioSection = document.getElementById("studio");
    if (!studioSection) return;
    var y = window.pageYOffset + studioSection.getBoundingClientRect().top;
    window.scrollTo({ top: y, behavior: "auto" });
  }
  function scheduleJumpToStudio() {
    requestAnimationFrame(function () {
      requestAnimationFrame(jumpToStudio);
    });
  }

  var studioNavLink = document.getElementById("studio-nav-link");
  if (studioNavLink) {
    studioNavLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (phase === 6) {
        scheduleJumpToStudio();
        return;
      }
      if (phase === 5) {
        unlockThirdActPageScroll(jumpToStudio);
        return;
      }
      phase = 6;
      syncNavHeroSecondHeadline();
      thirdActUnlockWheelAccum = 0;
      if (thirdAct) {
        thirdAct.classList.add("third-act--active", "third-act--in-flow");
        thirdAct.setAttribute("aria-hidden", "false");
      }
      if (thirdActRed) {
        thirdActRed.classList.add("third-act-red--expanded");
      }
      mountThirdHeadlineStatic();
      var continuation = document.getElementById("scroll-intro-continuation");
      if (continuation) continuation.removeAttribute("hidden");
      document.documentElement.classList.add("scroll-intro-scrollable");
      if (
        secondParticleWrap &&
        secondParticleWrap.classList.contains(
          "second-hl-particles-wrap--visible",
        )
      ) {
        secondParticleWrap.classList.remove(
          "second-hl-particles-wrap--visible",
        );
        secondParticlesStop();
      }
      detachHeroScrollLocks();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          thirdRingResize();
          var w = document.getElementById("third-act-particles-vp-wrap");
          if (w && w.clientWidth >= 12 && w.clientHeight >= 12)
            thirdParticleSetup();
          if (thirdActVideoShell) {
            thirdActVideoShell.classList.add("third-act-video-shell--in");
            thirdActVideoShell.setAttribute("aria-hidden", "false");
          }
          syncThirdActTorusInFromShell();
          thirdRingStart();
          thirdParticlesStart();
          initScrollIntroContinuation();
          updateNavThirdRedOverlap();
          updateScrollIntroLogoScrollWithThirdAct();
          jumpToStudio();
        });
      });
    });
  }

  var projectsNavLink = document.getElementById("projects-nav-link");
  if (projectsNavLink) {
    projectsNavLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (phase === 6) {
        scheduleJumpToProjects();
        return;
      }
      if (phase === 5) {
        unlockThirdActPageScroll(jumpToProjects);
        return;
      }
      phase = 6;
      syncNavHeroSecondHeadline();
      thirdActUnlockWheelAccum = 0;
      if (thirdAct) {
        thirdAct.classList.add("third-act--active", "third-act--in-flow");
        thirdAct.setAttribute("aria-hidden", "false");
      }
      if (thirdActRed) {
        thirdActRed.classList.add("third-act-red--expanded");
      }
      mountThirdHeadlineStatic();
      var continuation = document.getElementById("scroll-intro-continuation");
      if (continuation) continuation.removeAttribute("hidden");
      document.documentElement.classList.add("scroll-intro-scrollable");
      if (
        secondParticleWrap &&
        secondParticleWrap.classList.contains(
          "second-hl-particles-wrap--visible",
        )
      ) {
        secondParticleWrap.classList.remove(
          "second-hl-particles-wrap--visible",
        );
        secondParticlesStop();
      }
      detachHeroScrollLocks();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          thirdRingResize();
          var w = document.getElementById("third-act-particles-vp-wrap");
          if (w && w.clientWidth >= 12 && w.clientHeight >= 12)
            thirdParticleSetup();
          if (thirdActVideoShell) {
            thirdActVideoShell.classList.add("third-act-video-shell--in");
            thirdActVideoShell.setAttribute("aria-hidden", "false");
          }
          syncThirdActTorusInFromShell();
          thirdRingStart();
          thirdParticlesStart();
          initScrollIntroContinuation();
          updateNavThirdRedOverlap();
          updateScrollIntroLogoScrollWithThirdAct();
          jumpToProjects();
        });
      });
    });
  }

  document.querySelectorAll('a[href="#projects"]').forEach(function (link) {
    if (link.id === "projects-nav-link") return;
    link.addEventListener("click", function (e) {
      e.preventDefault();
      scheduleJumpToProjects();
      if (history.replaceState) history.replaceState(null, "", "#projects");
    });
  });
  document.querySelectorAll('a[href="#studio"]').forEach(function (link) {
    if (link.id === "studio-nav-link") return;
    link.addEventListener("click", function (e) {
      e.preventDefault();
      scheduleJumpToStudio();
      if (history.replaceState) history.replaceState(null, "", "#studio");
    });
  });

  function updateNavThirdRedOverlap() {
    var root = document.documentElement;
    if (!thirdAct || !thirdAct.classList.contains("third-act--active")) {
      root.classList.remove("nav-over-third-red");
      return;
    }
    var r = thirdAct.getBoundingClientRect();
    var navH = 80;
    var interNav = Math.max(0, Math.min(r.bottom, navH) - Math.max(r.top, 0));
    var onRed = interNav > 4;
    root.classList.toggle("nav-over-third-red", onRed);
  }
  function updateScrollIntroLogoScrollWithThirdAct() {
    var root = document.documentElement;
    var logo = document.querySelector(
      ".scroll-intro-header-strip .scroll-intro-logo",
    );
    if (!logo || !thirdAct) {
      return;
    }
    if (
      !root.classList.contains("scroll-intro-scrollable") ||
      !thirdAct.classList.contains("third-act--in-flow")
    ) {
      root.classList.remove("scroll-intro-logo-past-third-act");
      logo.style.removeProperty("transform");
      return;
    }
    var r = thirdAct.getBoundingClientRect();
    if (r.bottom <= 0) {
      root.classList.add("scroll-intro-logo-past-third-act");
      logo.style.removeProperty("transform");
      return;
    }
    root.classList.remove("scroll-intro-logo-past-third-act");
    var y = Math.min(0, r.top);
    logo.style.transform = "translateY(" + y + "px)";
  }
  function scheduleNavThirdRedOverlap() {
    requestAnimationFrame(function () {
      updateNavThirdRedOverlap();
      updateScrollIntroLogoScrollWithThirdAct();
    });
  }
  window.addEventListener("scroll", scheduleNavThirdRedOverlap, {
    passive: true,
  });
  window.addEventListener("resize", scheduleNavThirdRedOverlap);
  requestAnimationFrame(scheduleNavThirdRedOverlap);

  var heroScrollWheelOpts = { passive: false };
  var heroScrollTouchStartOpts = { passive: true, capture: true };
  var heroScrollTouchMoveOpts = { passive: false, capture: true };
  var heroScrollTouchEndOpts = { passive: true, capture: true };
  function detachHeroScrollLocks() {
    window.removeEventListener("wheel", onWheel, heroScrollWheelOpts);
    document.removeEventListener(
      "touchstart",
      onTouchStart,
      heroScrollTouchStartOpts,
    );
    document.removeEventListener(
      "touchmove",
      onTouchMove,
      heroScrollTouchMoveOpts,
    );
    document.removeEventListener(
      "touchend",
      onTouchEnd,
      heroScrollTouchEndOpts,
    );
    document.removeEventListener(
      "touchcancel",
      onTouchCancel,
      heroScrollTouchEndOpts,
    );
    window.removeEventListener("keydown", onKeyDown);
    stage.removeEventListener("click", onStageClick);
  }

  stage.addEventListener("click", onStageClick);
  window.addEventListener("wheel", onWheel, heroScrollWheelOpts);
  /* document + capture: iOS / Chrome deliver touchmove reliably; window often misses for intro swipe. */
  document.addEventListener(
    "touchstart",
    onTouchStart,
    heroScrollTouchStartOpts,
  );
  document.addEventListener("touchmove", onTouchMove, heroScrollTouchMoveOpts);
  document.addEventListener("touchend", onTouchEnd, heroScrollTouchEndOpts);
  document.addEventListener(
    "touchcancel",
    onTouchCancel,
    heroScrollTouchEndOpts,
  );
  window.addEventListener("keydown", onKeyDown);
})();

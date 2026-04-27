/**
 * Minimal bed for second-headline red particle ring: two soft sines, no sequencer,
 * no extra layers. Loudness follows pointer speed only while the cursor is in the
 * ring zone (caller sets zone). Silent while the pointer is still; motion opens the bed.
 * Same mobile / reduced-motion policy as third-act audio.
 * Mute preference: localStorage key ouroSecondParticleSoundMuted (UI in index.html).
 */
(function () {
  var ATTACK_TC = 0.14;
  var RELEASE_TC = 0.55;
  var MAX_MIX = 0.032;
  var MOTION_FLOOR = 0.018;
  var MOTION_SCALE = 0.26;

  var ctx = null;
  var outGain = null;
  var lp = null;
  var reduceMotion = false;
  var coarsePointer = false;
  var userMuted = false;
  try {
    userMuted = window.localStorage.getItem('ouroSecondParticleSoundMuted') === '1';
  } catch (_) {
    userMuted = false;
  }

  function makeCtx() {
    return new (window.AudioContext || window.webkitAudioContext)();
  }

  function ensureGraph() {
    if (ctx) return;

    ctx = makeCtx();
    outGain = ctx.createGain();
    outGain.gain.value = 0;

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -48;
    comp.knee.value = 18;
    comp.ratio.value = 1.8;
    comp.attack.value = 0.03;
    comp.release.value = 0.4;
    outGain.connect(comp);
    comp.connect(ctx.destination);

    lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 360;
    lp.Q.value = 0.45;

    var o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 174.61;
    var o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 196.0;

    var g1 = ctx.createGain();
    var g2 = ctx.createGain();
    g1.gain.value = 0.11;
    g2.gain.value = 0.09;
    o1.connect(g1);
    o2.connect(g2);
    g1.connect(lp);
    g2.connect(lp);
    lp.connect(outGain);

    o1.start(0);
    o2.start(0);
  }

  function teardown() {
    if (ctx) {
      try {
        ctx.close();
      } catch (_) {}
    }
    ctx = null;
    outGain = null;
    lp = null;
  }

  function fadeOutputGain() {
    if (outGain && ctx) {
      try {
        outGain.gain.setTargetAtTime(0, ctx.currentTime, RELEASE_TC);
      } catch (_) {}
    }
  }

  function silenceFromUserMute() {
    fadeOutputGain();
  }

  window.OuroSecondLullaby = {
    isMuted: function () {
      return userMuted;
    },

    setMuted: function (muted) {
      userMuted = !!muted;
      try {
        window.localStorage.setItem('ouroSecondParticleSoundMuted', userMuted ? '1' : '0');
      } catch (_) {}
      if (userMuted) {
        silenceFromUserMute();
      }
    },

    tick: function (opts) {
      if (reduceMotion || coarsePointer) return;

      var zone = !!(opts && opts.zone);
      var spd = opts && typeof opts.mouseSpd === 'number' ? opts.mouseSpd : 0;

      if (userMuted) {
        fadeOutputGain();
        return;
      }

      if (!zone) {
        fadeOutputGain();
        return;
      }

      var motion = Math.min(1, Math.max(0, (spd - MOTION_FLOOR) / MOTION_SCALE));
      if (motion <= 0) {
        fadeOutputGain();
        return;
      }

      ensureGraph();
      try {
        ctx.resume();
      } catch (_) {}

      var target = motion * MAX_MIX;
      var tc = motion > 0.12 ? ATTACK_TC : RELEASE_TC;
      try {
        outGain.gain.setTargetAtTime(target, ctx.currentTime, tc);
        lp.frequency.setTargetAtTime(320 + motion * 180, ctx.currentTime, 0.18);
      } catch (_) {}
    },

    reset: function () {
      if (outGain && ctx) {
        try {
          outGain.gain.cancelScheduledValues(ctx.currentTime);
          outGain.gain.setValueAtTime(0, ctx.currentTime);
        } catch (_) {}
      }
      teardown();
    },
  };

  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    reduceMotion = false;
  }
  try {
    coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  } catch (_) {
    coarsePointer = false;
  }

  function unlockAudio() {
    try {
      if (!reduceMotion && !coarsePointer && !userMuted) {
        ensureGraph();
      }
      if (ctx) ctx.resume();
    } catch (_) {}
  }
  window.addEventListener('pointerdown', unlockAudio, { passive: true, capture: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true, capture: true });
  window.addEventListener('mousemove', unlockAudio, { passive: true, capture: true });
  window.addEventListener(
    'keydown',
    function (e) {
      if (!e || e.metaKey || e.ctrlKey || e.altKey) return;
      unlockAudio();
    },
    { passive: true, capture: true }
  );
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      fadeOutputGain();
      return;
    }
    unlockAudio();
  });
  window.addEventListener('pageshow', function () {
    unlockAudio();
  });
})();

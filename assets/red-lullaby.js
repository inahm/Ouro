/**
 * Ambient lullaby for third-act (red) particle interaction.
 * Loudness follows pointer motion; tempo (BPM) follows movement so the bar pulse tracks the hand.
 * Timbre leans Kraftwerk / Kling Klang: saw & pulse stacks, drier delays, punchier bus,
 * chord‑machine motion layer. Fades when the pointer stops, leaves the zone, or the tab is hidden.
 * Disabled on touch‑primary devices (pointer: coarse) - no audio on typical mobile.
 */
(function () {
  var LOOKAHEAD = 1.55;
  var BPM_MIN = 44;
  var BPM_MAX = 82;
  var BPM_SMOOTH_IN_LOOP = 0.055;
  var PULSE_BPM_PER_SPD_DELTA = 88;
  var MAX_MIX = 0.34;
  var MOTION_FLOOR = 0.012;
  var MOTION_SCALE = 0.22;
  var ATTACK_TC = 0.1;
  var RELEASE_TC = 0.5;

  var chordLayers = [
    { pad: [110, 164.81, 220, 261.63, 329.63], arp: [220, 261.63, 329.63, 392.0] },
    { pad: [87.31, 130.81, 174.62, 220, 261.63], arp: [174.62, 220, 261.63, 329.63] },
    { pad: [130.81, 196, 261.63, 329.63, 392.0], arp: [196, 261.63, 329.63, 392.0] },
    { pad: [98, 146.83, 196, 246.94, 293.66], arp: [196, 246.94, 293.66, 392.0] },
  ];
  var roots = [55, 43.65, 65.41, 49.0];

  var ctx = null;
  var master = null;
  var ambIn = null;
  var mixOut = null;
  var noiseShort = null;
  var noiseLong = null;
  var schedRaf = null;
  var wantSched = false;
  var nextBarAt = 0;
  var scheduleIdx = 0;
  var smoothedBpm = 58;
  var latestTargetBpm = 58;
  var lastSpd = 0;
  var reduceMotion = false;
  var coarsePointer = false;
  try {
    coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  } catch (_) {
    coarsePointer = false;
  }
  var userMuted = false;
  try {
    userMuted = window.localStorage.getItem('ouroThirdActSoundMuted') === '1';
  } catch (_) {
    userMuted = false;
  }
  var motionLayer = null;
  var lastScheduledHarmonyBar = 0;
  var OMNI_BODY_MAX = 0.06;
  var OMNI_STRUM_HISS_MAX = 0.0055;
  var OMNI_VOICE_WEIGHTS = [0.38, 0.44, 0.4, 0.34];

  function makeCtx() {
    return new (window.AudioContext || window.webkitAudioContext)();
  }

  function buildAmbience(c, dest) {
    var wet1 = c.createGain();
    var wet2 = c.createGain();
    var wet3 = c.createGain();
    wet1.gain.value = 0.3;
    wet2.gain.value = 0.26;
    wet3.gain.value = 0.14;

    function makeLine(time, fbAmt) {
      var d = c.createDelay(4.0);
      d.delayTime.value = time;
      var fb = c.createGain();
      fb.gain.value = fbAmt;
      d.connect(fb);
      fb.connect(d);
      return d;
    }

    var dA = makeLine(0.82, 0.38);
    var dB = makeLine(1.28, 0.32);
    var dC = makeLine(0.36, 0.24);

    dA.connect(wet1);
    dB.connect(wet2);
    dC.connect(wet3);
    wet1.connect(dest);
    wet2.connect(dest);
    wet3.connect(dest);

    var pre = c.createGain();
    pre.gain.value = 0.68;
    pre.connect(dA);
    pre.connect(dB);
    pre.connect(dC);
    return pre;
  }

  function buildMaster(c) {
    mixOut = c.createGain();
    mixOut.gain.value = 0;

    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -28;
    comp.knee.value = 18;
    comp.ratio.value = 2.4;
    comp.attack.value = 0.004;
    comp.release.value = 0.48;
    comp.connect(mixOut);
    mixOut.connect(c.destination);

    var pre = c.createGain();
    pre.gain.value = 0.7;
    pre.connect(comp);
    ambIn = buildAmbience(c, comp);
    return { bus: pre, comp: comp };
  }

  function makeNoiseBuffer(c, sec) {
    var n = Math.max(1, Math.floor(c.sampleRate * sec));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function routeAmbience(node) {
    node.connect(master.bus);
    node.connect(ambIn);
  }

  function ensureMotionLayer() {
    if (motionLayer || !ctx || !master) return;

    var gain = ctx.createGain();
    gain.gain.value = 0;

    var chordMerge = ctx.createGain();
    chordMerge.gain.value = 0.9;

    var oscs = [];
    var voiceGains = [];
    var pi;
    for (pi = 0; pi < 4; pi++) {
      var o = ctx.createOscillator();
      o.type = pi % 2 === 0 ? 'square' : 'sawtooth';
      o.frequency.value = 440;
      o.detune.value = (pi - 1.5) * 2.2;
      var vg = ctx.createGain();
      vg.gain.value = OMNI_VOICE_WEIGHTS[pi];
      o.connect(vg);
      vg.connect(chordMerge);
      oscs.push(o);
      voiceGains.push(vg);
    }

    var nasal = ctx.createBiquadFilter();
    nasal.type = 'peaking';
    nasal.frequency.value = 1180;
    nasal.Q.value = 1.05;
    nasal.gain.value = 1.6;

    var lpOmni = ctx.createBiquadFilter();
    lpOmni.type = 'lowpass';
    lpOmni.frequency.value = 4200;
    lpOmni.Q.value = 0.42;

    var softShape = ctx.createWaveShaper();
    var curve = new Float32Array(257);
    for (pi = 0; pi < 257; pi++) {
      var x = pi / 128 - 1;
      var ax = Math.abs(x);
      curve[pi] = Math.sign(x) * Math.pow(ax, 0.74) * 0.9;
    }
    softShape.curve = curve;

    chordMerge.connect(nasal);
    nasal.connect(lpOmni);
    lpOmni.connect(softShape);
    softShape.connect(gain);

    var hissBuf = makeNoiseBuffer(ctx, 0.45);
    var hissSrc = ctx.createBufferSource();
    hissSrc.buffer = hissBuf;
    hissSrc.loop = true;

    var hissHp = ctx.createBiquadFilter();
    hissHp.type = 'highpass';
    hissHp.frequency.value = 2400;

    var hissLp = ctx.createBiquadFilter();
    hissLp.type = 'lowpass';
    hissLp.frequency.value = 7200;
    hissLp.Q.value = 0.55;

    var strumGain = ctx.createGain();
    strumGain.gain.value = 0;

    hissSrc.connect(hissHp);
    hissHp.connect(hissLp);
    hissLp.connect(strumGain);
    strumGain.connect(gain);

    routeAmbience(gain);

    for (pi = 0; pi < 4; pi++) {
      oscs[pi].start(0);
    }
    hissSrc.start(0);

    motionLayer = {
      gain: gain,
      chordMerge: chordMerge,
      nasal: nasal,
      lpOmni: lpOmni,
      softShape: softShape,
      oscs: oscs,
      voiceGains: voiceGains,
      hissHp: hissHp,
      hissLp: hissLp,
      strumGain: strumGain,
      hissSrc: hissSrc,
    };
  }

  function updateMotionLayer(motion) {
    if (!motionLayer || !ctx) return;
    var t = ctx.currentTime;
    var m = Math.min(1, Math.max(0, motion));
    var layer = chordLayers[lastScheduledHarmonyBar];
    var arp = layer.arp;

    var i;
    var trebleLean = 0.5 + m * 0.5;
    for (i = 0; i < 4; i++) {
      motionLayer.oscs[i].frequency.setTargetAtTime(arp[i] * 2, t, 0.09);
      var w =
        OMNI_VOICE_WEIGHTS[i] *
        (0.62 + 0.38 * trebleLean) *
        (0.82 + 0.18 * (i / 3) * trebleLean);
      motionLayer.voiceGains[i].gain.setTargetAtTime(w, t, 0.11);
    }

    motionLayer.lpOmni.frequency.setTargetAtTime(2800 + m * 3000, t, 0.1);
    try {
      motionLayer.nasal.gain.setTargetAtTime(0.9 + m * 2.4, t, 0.09);
    } catch (_) {
      motionLayer.nasal.gain.value = 0.9 + m * 2.4;
    }

    motionLayer.hissHp.frequency.setTargetAtTime(2000 + m * 1400, t, 0.1);
    motionLayer.hissLp.frequency.setTargetAtTime(5600 + m * 2200, t, 0.1);

    motionLayer.gain.gain.setTargetAtTime(0.01 + m * OMNI_BODY_MAX, t, 0.1);
    motionLayer.strumGain.gain.setTargetAtTime(0.0006 + m * OMNI_STRUM_HISS_MAX, t, 0.09);
  }

  function fadeMotionLayerOut() {
    if (!motionLayer || !ctx) return;
    try {
      motionLayer.gain.gain.setTargetAtTime(0, ctx.currentTime, RELEASE_TC);
    } catch (_) {}
  }

  function playPianoNote(t, freq, vel, decay, hammer) {
    var h = hammer === undefined ? 1 : hammer;
    var velc = Math.min(1, Math.max(0.08, vel));
    var d = decay * 0.88;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.42;
    lp.frequency.setValueAtTime(2600 * (0.5 + 0.5 * velc), t);
    lp.frequency.exponentialRampToValueAtTime(520, t + 0.32);
    lp.frequency.exponentialRampToValueAtTime(180, t + d * 0.92);

    var sq = ctx.createOscillator();
    sq.type = 'square';
    sq.frequency.setValueAtTime(freq, t);
    var harm = ctx.createOscillator();
    harm.type = 'sine';
    harm.frequency.setValueAtTime(freq * 2, t);

    var partial = ctx.createGain();
    partial.gain.value = 0.52;
    sq.connect(partial);
    harm.connect(partial);
    partial.connect(lp);

    var body = ctx.createGain();
    body.gain.setValueAtTime(0, t);
    body.gain.linearRampToValueAtTime(0.1 * velc, t + 0.022);
    body.gain.exponentialRampToValueAtTime(0.001, t + d);

    lp.connect(body);

    if (h > 0.001 && noiseShort) {
      var src = ctx.createBufferSource();
      src.buffer = noiseShort;
      var nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 2800 + freq * 0.12;
      nf.Q.value = 0.85;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.006 * velc * h, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
      src.connect(nf);
      nf.connect(ng);
      ng.connect(body);
      src.start(t);
    }

    routeAmbience(body);

    sq.start(t);
    harm.start(t);
    sq.stop(t + d + 0.05);
    harm.stop(t + d + 0.05);
  }

  function playStringPad(t, freqs, dur) {
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.22;
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.linearRampToValueAtTime(1100, t + dur * 0.42);
    lp.frequency.exponentialRampToValueAtTime(520, t + dur * 0.86);

    var env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.072, t + 1.45);
    env.gain.setValueAtTime(0.066, t + dur - 1.45);
    env.gain.linearRampToValueAtTime(0, t + dur);

    var det = [-3, 0, 3];
    for (var fi = 0; fi < freqs.length; fi++) {
      for (var di = 0; di < det.length; di++) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freqs[fi], t);
        o.detune.setValueAtTime(det[di], t);
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.06);
      }
    }
    lp.connect(env);
    routeAmbience(env);
  }

  function playSub(t, freq, dur) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.088, t + 0.38);
    g.gain.setValueAtTime(0.08, t + dur - 0.6);
    g.gain.linearRampToValueAtTime(0, t + dur);

    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.connect(g);

    var sq = ctx.createOscillator();
    sq.type = 'square';
    sq.frequency.setValueAtTime(freq, t);
    var qAtt = ctx.createGain();
    qAtt.gain.value = 0.038;
    sq.connect(qAtt);
    qAtt.connect(g);

    routeAmbience(g);
    o.start(t);
    sq.start(t);
    o.stop(t + dur + 0.04);
    sq.stop(t + dur + 0.04);
  }

  function playShimmer(t, freq, dur, bright) {
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    var o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.detune.value = bright ? 6 : 3;
    o2.frequency.setValueAtTime(freq * 2, t);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = bright ? 2200 : 1600;
    lp.Q.value = 0.18;
    var g = ctx.createGain();
    var mul = bright ? 0.85 : 1;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.011 * mul, t + 1.05);
    g.gain.setValueAtTime(0.01 * mul, t + dur - 1.2);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    routeAmbience(g);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  function playHighPad(t, freqs, dur) {
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.18;
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(3200, t + dur * 0.38);
    lp.frequency.exponentialRampToValueAtTime(1400, t + dur * 0.88);

    var env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.028, t + 1.05);
    env.gain.setValueAtTime(0.025, t + dur - 0.95);
    env.gain.linearRampToValueAtTime(0, t + dur);

    var det = [-3, 0, 3];
    for (var fi = 0; fi < freqs.length; fi++) {
      var f = freqs[fi];
      if (f < 80) continue;
      for (var di = 0; di < det.length; di++) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        o.detune.setValueAtTime(det[di], t);
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.06);
      }
    }
    lp.connect(env);
    routeAmbience(env);
  }

  function playHalo(t, freqs, dur) {
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.12;
    lp.frequency.value = 880;
    var env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.022, t + 1.8);
    env.gain.setValueAtTime(0.02, t + dur - 1.4);
    env.gain.linearRampToValueAtTime(0, t + dur);

    var idxs = [1, 2, Math.min(4, freqs.length - 1)];
    for (var ii = 0; ii < idxs.length; ii++) {
      var f = freqs[idxs[ii]];
      if (!f) continue;
      for (var di = 0; di < 2; di++) {
        var o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(f, t);
        o.detune.setValueAtTime(di === 0 ? -2 : 2, t);
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.06);
      }
    }
    lp.connect(env);
    routeAmbience(env);
  }

  function playAirBed(t, dur) {
    var src = ctx.createBufferSource();
    src.buffer = noiseLong;
    src.loop = true;
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 420;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.0085, t + 0.85);
    g.gain.setValueAtTime(0.0072, t + dur - 0.65);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    routeAmbience(g);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  function scheduleStep(step, tAudio, barDur) {
    var bar = step % 4;
    lastScheduledHarmonyBar = bar;
    var layer = chordLayers[bar];
    var padLen = barDur * 1.36;

    playStringPad(tAudio, layer.pad, padLen);
    var arp2 = [];
    for (var ai = 0; ai < layer.arp.length; ai++) arp2.push(layer.arp[ai] * 2);
    playHighPad(tAudio + 0.04, arp2, padLen * 0.94);
    playHalo(tAudio + 0.06, layer.pad, padLen * 0.98);
    playSub(tAudio, roots[bar], padLen * 0.96);
    playShimmer(tAudio, layer.arp[0] * 2, padLen * 0.98, false);
    playShimmer(tAudio + 0.12, layer.arp[1] * 2, padLen * 0.92, true);
    playAirBed(tAudio, padLen * 0.99);

    var a = layer.arp;
    playPianoNote(tAudio + barDur * 0.26, a[1 % a.length], 0.055, 5.2, 0);
    playPianoNote(tAudio + barDur * 0.54, a[2 % a.length], 0.085, 6.2, 0);
  }

  function pumpLoop() {
    if (!ctx || !master || !wantSched) {
      schedRaf = null;
      return;
    }
    var t0 = ctx.currentTime;
    while (nextBarAt < t0 + LOOKAHEAD) {
      smoothedBpm += (latestTargetBpm - smoothedBpm) * BPM_SMOOTH_IN_LOOP;
      if (smoothedBpm < BPM_MIN) smoothedBpm = BPM_MIN;
      if (smoothedBpm > BPM_MAX + 6) smoothedBpm = BPM_MAX + 6;
      var sb = (60 / smoothedBpm) * 4;
      scheduleStep(scheduleIdx, nextBarAt, sb);
      scheduleIdx++;
      nextBarAt += sb;
    }
    schedRaf = requestAnimationFrame(pumpLoop);
  }

  function ensureAudio() {
    if (ctx) return;
    ctx = makeCtx();
    master = buildMaster(ctx);
    noiseShort = makeNoiseBuffer(ctx, 0.04);
    noiseLong = makeNoiseBuffer(ctx, 2.8);
    nextBarAt = 0;
    scheduleIdx = 0;
    smoothedBpm = 58;
    latestTargetBpm = 58;
    lastSpd = 0;
    lastScheduledHarmonyBar = 0;
    ensureMotionLayer();
  }

  function armScheduler() {
    if (!ctx || !wantSched) return;
    if (schedRaf) return;
    nextBarAt = ctx.currentTime + 0.08;
    scheduleIdx = 0;
    smoothedBpm = latestTargetBpm;
    schedRaf = requestAnimationFrame(pumpLoop);
  }

  function disarmScheduler() {
    wantSched = false;
    if (schedRaf) {
      cancelAnimationFrame(schedRaf);
      schedRaf = null;
    }
  }

  function fadeOutputAll() {
    fadeMotionLayerOut();
    disarmScheduler();
    if (mixOut && ctx) {
      try {
        mixOut.gain.setTargetAtTime(0, ctx.currentTime, RELEASE_TC);
      } catch (_) {}
    }
  }

  function silenceFromUserMute() {
    fadeOutputAll();
  }

  function teardown() {
    disarmScheduler();
    if (ctx) {
      try {
        ctx.close();
      } catch (_) {}
    }
    ctx = null;
    master = null;
    ambIn = null;
    mixOut = null;
    noiseShort = null;
    noiseLong = null;
    nextBarAt = 0;
    scheduleIdx = 0;
    smoothedBpm = 58;
    latestTargetBpm = 58;
    lastSpd = 0;
    lastScheduledHarmonyBar = 0;
    motionLayer = null;
  }

  window.OuroRedLullaby = {
    /** Whether interaction sound is muted (persisted in localStorage). */
    isMuted: function () {
      return userMuted;
    },

    /**
     * @param {boolean} muted - When true, stops scheduling and fades out; preference saved.
     */
    setMuted: function (muted) {
      userMuted = !!muted;
      try {
        window.localStorage.setItem('ouroThirdActSoundMuted', userMuted ? '1' : '0');
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
        if (!zone) lastSpd = 0;
        silenceFromUserMute();
        return;
      }

      if (!zone) {
        lastSpd = 0;
        fadeOutputAll();
        return;
      }

      var motion = Math.min(1, Math.max(0, (spd - MOTION_FLOOR) / MOTION_SCALE));
      if (motion <= 0) {
        lastSpd = 0;
        fadeOutputAll();
        return;
      }

      ensureAudio();
      ensureMotionLayer();
      try {
        ctx.resume();
      } catch (_) {}

      var target = motion * MAX_MIX;
      var tc = motion > 0.08 ? ATTACK_TC : RELEASE_TC;
      try {
        mixOut.gain.setTargetAtTime(target, ctx.currentTime, tc);
      } catch (_) {}

      var tb = BPM_MIN + motion * (BPM_MAX - BPM_MIN);
      var pulse = spd - lastSpd;
      lastSpd = spd;
      if (pulse > 0.006) {
        tb += Math.min(12, pulse * PULSE_BPM_PER_SPD_DELTA);
      }
      if (tb < BPM_MIN) tb = BPM_MIN;
      if (tb > BPM_MAX + 10) tb = BPM_MAX + 10;
      latestTargetBpm = tb;

      updateMotionLayer(motion);

      wantSched = true;
      armScheduler();
    },

    /** Hard reset when leaving the experience (optional). */
    reset: function () {
      disarmScheduler();
      if (mixOut && ctx) {
        try {
          mixOut.gain.cancelScheduledValues(ctx.currentTime);
          mixOut.gain.setValueAtTime(0, ctx.currentTime);
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

  function unlockAudio() {
    try {
      if (!reduceMotion && !coarsePointer && !userMuted) {
        ensureAudio();
        ensureMotionLayer();
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
      lastSpd = 0;
      fadeOutputAll();
      return;
    }
    unlockAudio();
  });
  window.addEventListener('pageshow', function () {
    unlockAudio();
  });
})();


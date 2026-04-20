if('scrollRestoration' in history){history.scrollRestoration='manual';}document.addEventListener('DOMContentLoaded',function(){window.scrollTo(0,0);});window.addEventListener('pageshow',function(e){if(e.persisted){window.scrollTo(0,0);requestAnimationFrame(function(){if(window.__circleReset)window.__circleReset();});}});

// ── Shared char-split utility ────────────────────────────────────────────────
// Splits all text inside `source` into .hl-char spans, writing into `target`.
// Call with one arg to split in-place.
function splitToChars(source, target){
  if(!target) target = source;
  var nodes = Array.from(source.childNodes);
  if(target === source) target.innerHTML = '';
  nodes.forEach(function(node){
    if(node.nodeType === 3){
      // Split on ASCII whitespace only — NBSP stays inside one .hl-word (no orphan “new” on wrap)
      node.textContent.split(/([\u0020\t\n\r\f\v]+)/).forEach(function(part){
        if(!part) return;
        if(/^[\u0020\t\n\r\f\v]+$/.test(part)){
          // Spaces become non-animating char spans
          var sp = document.createElement('span');
          sp.className = 'hl-char hl-char--space';
          sp.textContent = '\u00a0';
          target.appendChild(sp);
        } else {
          // Each word gets an inline-block wrapper — browser can only break between words
          var word = document.createElement('span');
          word.className = 'hl-word';
          part.split('').forEach(function(ch){
            var s = document.createElement('span');
            s.className = 'hl-char';
            s.textContent = ch;
            word.appendChild(s);
          });
          target.appendChild(word);
        }
      });
    } else if(node.nodeType === 1){
      var w = node.cloneNode(false);
      target.appendChild(w);
      splitToChars(node, w);
    }
  });
}
// Apply per-char random fall speed (--cd), stagger delay, and tilt (--cr)
function staggerChars(chars){
  chars.forEach(function(ch, i){
    ch.style.transitionDelay = (i * 22 + Math.random() * 110).toFixed(0) + 'ms';
    ch.style.setProperty('--cd', (0.48 + Math.random() * 0.68).toFixed(2) + 's');
    ch.style.setProperty('--cr', (Math.random() * 7 - 3.5).toFixed(1) + 'deg');
  });
}
// Same stagger as staggerChars — one random triple per index i, applied to every group at i (headline + overlay stay locked).
function staggerCharsInSync(groups){
  if(!groups || !groups.length) return;
  var n = 0;
  groups.forEach(function(g){
    if(g && g.length > n) n = g.length;
  });
  for(var i = 0; i < n; i++){
    var delay = (i * 22 + Math.random() * 110).toFixed(0) + 'ms';
    var cd = (0.48 + Math.random() * 0.68).toFixed(2) + 's';
    var cr = (Math.random() * 7 - 3.5).toFixed(1) + 'deg';
    groups.forEach(function(g){
      if(!g) return;
      var ch = g[i];
      if(ch){
        ch.style.transitionDelay = delay;
        ch.style.setProperty('--cd', cd);
        ch.style.setProperty('--cr', cr);
      }
    });
  }
}

(function(){
  var intro    = document.getElementById('intro');
  var center   = document.getElementById('intro-center');
  var canvas   = document.getElementById('intro-canvas');
  var hole     = document.getElementById('intro-hole');
  var maskRect = document.getElementById('intro-mask-rect');
  var bgRect   = document.getElementById('intro-bg-rect');
  var ctx      = canvas.getContext('2d');
  var dpr      = Math.min(window.devicePixelRatio || 1, 2);

  var W = window.innerWidth, H = window.innerHeight;
  var cx = W/2, cy = H/2;
  var R  = Math.min(W, H) * 0.24;
  var maxR = Math.sqrt(cx*cx + cy*cy) + 2;

  [maskRect, bgRect].forEach(function(el){
    el.setAttribute('width', W); el.setAttribute('height', H);
  });
  hole.setAttribute('cx', cx); hole.setAttribute('cy', cy); hole.setAttribute('r', 0);

  var DAMP_=0.91, FORCE_=0.004, MFORCE=75; // slow ease back to grid (weaker spring, lighter damping)
  var grains=[];
  var mouse={x:-9999,y:-9999,px:-9999,py:-9999,spd:0};
  var MRAD=170;

  function buildGrid(){
    W=window.innerWidth; H=window.innerHeight;
    cx=W/2; cy=H/2;
    R=Math.min(W,H)*0.24;
    maxR=Math.sqrt(cx*cx+cy*cy)+2;
    // fixed pixel spacing keeps density consistent across all viewport sizes
    var SPACING_PX = 8;
    var COLS = Math.round(W / SPACING_PX) + 1;
    var ROWS = Math.round(H / SPACING_PX) + 1;
    // scale mouse radius proportionally so it doesn't overwhelm small viewports
    MRAD = Math.min(170, R * 1.6);
    canvas.width=W*dpr; canvas.height=H*dpr;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr,dpr);
    [maskRect,bgRect].forEach(function(el){ el.setAttribute('width',W); el.setAttribute('height',H); });
    hole.setAttribute('cx',cx); hole.setAttribute('cy',cy);
    grains=[];
    for(var gr=0;gr<ROWS;gr++) for(var gc=0;gc<COLS;gc++){
      var ox=(gc/(COLS-1))*W, oy=(gr/(ROWS-1))*H;
      grains.push({ox:ox,oy:oy,x:ox,y:oy,vx:0,vy:0});
    }
  }

  buildGrid();

  window.addEventListener('resize',function(){
    cancelAnimationFrame(raf);
    buildGrid();
    raf=requestAnimationFrame(animParticles);
  });

  window.addEventListener('mousemove',function(e){
    mouse.px=mouse.x; mouse.py=mouse.y;
    mouse.x=e.clientX; mouse.y=e.clientY;
  });
  window.addEventListener('mouseleave',function(){ mouse.x=-9999; mouse.y=-9999; mouse.spd=0; });

  var raf, blasted=false;
  function animParticles(){
    // mouse speed — decays each frame so dots return when mouse stops
    var dxm=mouse.x-mouse.px, dym=mouse.y-mouse.py;
    mouse.spd = Math.min(1, Math.sqrt(dxm*dxm+dym*dym)/12);
    mouse.spd *= 0.85; // decay
    mouse.px=mouse.x; mouse.py=mouse.y;

    ctx.clearRect(0,0,W,H);

    grains.forEach(function(g){
      // permanent circle repulsion + clockwise tangential rotation
      var cdx=g.x-cx, cdy=g.y-cy, cd=Math.sqrt(cdx*cdx+cdy*cdy);
      var cr=Math.max(0,1-cd/R);
      // radial push outward
      var cfx=cd>0?(cdx/cd)*cr*cr*180:0;
      var cfy=cd>0?(cdy/cd)*cr*cr*180:0;
      // clockwise tangent: (-cdy, cdx)
      var tstr=Math.max(0,1-(cd/(R*1.6)))*1.2;
      cfx+=cd>0?(-cdy/cd)*tstr:0;
      cfy+=cd>0?(cdx/cd)*tstr:0;

      // mouse repulsion
      var mdx=g.x-mouse.x, mdy=g.y-mouse.y, md=Math.sqrt(mdx*mdx+mdy*mdy);
      var mr=Math.max(0,1-md/MRAD);
      var mfx=md>0?(mdx/md)*mr*mr*MFORCE*mouse.spd:0, mfy=md>0?(mdy/md)*mr*mr*MFORCE*mouse.spd:0;

      var sx=blasted?0:(g.ox-g.x)*FORCE_;
      var sy=blasted?0:(g.oy-g.y)*FORCE_;
      g.vx=(g.vx+sx+(blasted?0:cfx)+(blasted?0:mfx))*DAMP_;
      g.vy=(g.vy+sy+(blasted?0:cfy)+(blasted?0:mfy))*DAMP_;
      g.x+=g.vx; g.y+=g.vy;
      var edx=g.x-cx, edy=g.y-cy;
      var maxD=Math.sqrt(cx*cx+cy*cy);
      var fade=blasted?0:Math.min(1, Math.sqrt(edx*edx+edy*edy) / (maxD*0.72));
      var dr=Math.round(fade*253);
      var dg=Math.round(fade*252);
      var db=Math.round(fade*250);
      ctx.beginPath();
      ctx.arc(g.x,g.y,1.35,0,Math.PI*2);
      ctx.fillStyle='rgba('+dr+','+dg+','+db+',0.85)';
      ctx.fill();
    });

    raf=requestAnimationFrame(animParticles);
  }
  animParticles();

  // ── Iris reveal ──────────────────────────────────────────
  function runIris(){
    center.style.opacity = '0';

    // disable restoring forces; low damping so dots keep flying
    blasted=true;
    DAMP_=0.96;

    // disperse every grain smoothly outward — no random chaos
    var BLAST = 18;
    grains.forEach(function(g){
      var dx = g.x - cx, dy = g.y - cy;
      var d  = Math.sqrt(dx*dx+dy*dy) || 1;
      g.vx += (dx/d)*BLAST;
      g.vy += (dy/d)*BLAST;
    });

    // let the explosion play for 200ms, then fade
    setTimeout(function(){
      intro.style.transition = 'opacity 0.48s var(--ease-out-settle)';
      intro.style.opacity    = '0';
      setTimeout(function(){
        cancelAnimationFrame(raf);
        intro.style.display = 'none';
        document.body.style.overflow = '';
        window.scrollTo({top:0, left:0, behavior:'instant'});
        // reveal hero headline — split into chars, stagger fall-in, then cycle word
        var hl = document.getElementById('hero-hl');
        if(hl){
          new IntersectionObserver(function(entries){
            window.__heroWordCycleInView = !!entries[0].isIntersecting;
          }, {threshold:0, rootMargin:'0px'}).observe(hl);

          hl.querySelectorAll('.hl-inner').forEach(function(inner){ splitToChars(inner); });
          var allChars = Array.from(hl.querySelectorAll('.hl-char:not(.hl-char--space)'));
          staggerChars(allChars);

          hl.style.visibility = 'visible';
          requestAnimationFrame(function(){
            hl.classList.add('revealed');
            document.dispatchEvent(new CustomEvent('heroRevealed'));
            // start word cycling after all chars have settled
            var settleDur = allChars.length * 34 + 800;
            setTimeout(startHeroCycle, settleDur + 1000);
          });

          // ── word cycling ────────────────────────────────────────────
          var CYCLE_WORDS = ['making','building','breaking'];
          var cycleIdx = 0;
          function startHeroCycle(){
            var DWELL = 3000;
            function scheduleNextCycle(){
              setTimeout(function afterDwell(){
                if(window.__heroWordCyclePaused){
                  setTimeout(afterDwell, 80);
                  return;
                }
                if(window.__heroAutoHasPlayed){
                  setTimeout(afterDwell, 80);
                  return;
                }
                if(window.__heroWordCycleInView === false){
                  setTimeout(afterDwell, 250);
                  return;
                }
                cycleIdx = (cycleIdx + 1) % CYCLE_WORDS.length;
                var wrap = document.getElementById('hero-cycle-word');
                if(!wrap) return;
                // exit: chars fall at random speeds, cut off by clip — no fade
                var exits = Array.from(wrap.querySelectorAll('.hl-char'));
                exits.forEach(function(c, i){
                  c.style.transitionDelay = '';
                  setTimeout(function(){
                    c.style.setProperty('--cd', (0.18 + Math.random() * 0.22).toFixed(2) + 's');
                    c.classList.add('hl-char-exit');
                  }, i * 22 + Math.random() * 40);
                });
                var exitMs = exits.length * 28 + 360;
                setTimeout(function doSwap(){
                  if(window.__heroWordCyclePaused){
                    setTimeout(doSwap, 80);
                    return;
                  }
                  if(window.__heroWordCycleInView === false){
                    setTimeout(doSwap, 250);
                    return;
                  }
                  // swap word
                  wrap.innerHTML = '';
                  CYCLE_WORDS[cycleIdx].split('').forEach(function(ch){
                    var s = document.createElement('span');
                    s.className = 'hl-char';
                    s.textContent = ch;
                    s.style.transform = 'translateY(-0.8em)';
                    s.style.opacity = '0';
                    s.style.transition = 'transform 0.78s var(--ease-out-flow),opacity 0.55s var(--ease-out-settle)';
                    wrap.appendChild(s);
                  });
                  // enter: fall from above at varied speeds, clipped at line boundary
                  var enters = Array.from(wrap.querySelectorAll('.hl-char'));
                  enters.forEach(function(c, i){
                    var rot = (Math.random() * 7 - 3.5).toFixed(1);
                    var dur = (0.48 + Math.random() * 0.68).toFixed(2);
                    c.style.transform = 'translateY(-1.5em) rotate(' + rot + 'deg)';
                    c.style.opacity = '1';
                    c.style.transition = 'transform ' + dur + 's var(--ease-out-flow)';
                    var d = i * 32 + Math.random() * 90 + 12;
                    setTimeout(function(){
                      c.style.transform = 'translateY(0) rotate(0deg)';
                    }, d);
                  });
                  scheduleNextCycle();
                }, exitMs);
              }, DWELL);
            }
            scheduleNextCycle();
          }
        }
        // slide nav down
        var nav = document.querySelector('nav');
        if(nav){ setTimeout(function(){ nav.classList.add('nav-in'); }, 300); }
      }, 420);
    }, 200);
  }

  // Lock scroll until user enters
  document.body.style.overflow = 'hidden';
  intro.style.cursor = 'default';

  var hotspot = document.getElementById('intro-hotspot');
  function positionHotspot(){
    var d = Math.min(W, H) * 0.24 * 2;
    hotspot.style.width  = d + 'px';
    hotspot.style.height = d + 'px';
    hotspot.style.left   = cx + 'px';
    hotspot.style.top    = cy + 'px';
  }
  positionHotspot();
  window.addEventListener('resize', positionHotspot);
  hotspot.addEventListener('click', runIris, {once: true});

  var introWord = document.querySelector('.intro-word');
  hotspot.addEventListener('mouseenter', function(){
    introWord.style.color = 'var(--red)';
    introWord.style.webkitTextStrokeColor = 'var(--red)';
  });
  hotspot.addEventListener('mouseleave', function(){
    introWord.style.color = '';
    introWord.style.webkitTextStrokeColor = '';
  });
})();

(function(){
  const canvas = document.getElementById('mesh-canvas');
  const ctx = canvas.getContext('2d');

  const MODES = [
    [1,2],[2,1],[1,3],[3,1],[2,3],[3,2],[1,4],[4,1],[2,4],[4,2],[3,4],[4,3]
  ];

  const COLS    = 180;
  const ROWS    = 120;
  const HOLD    = 4000;
  const XFADE   = 3500;
  const DAMP    = 0.78;
  const FORCE   = 0.011;
  const NOISE   = 0.006;
  const MRAD    = 170;
  const MFORCE  = 75;

  let W, H, dpr, grains = [];
  let modeIdx = 0, nextIdx = 1;
  let blend = 0, switching = false, switchStart = 0;
  let t0 = null, raf;
  let mouse = {x:-9999, y:-9999, px:-9999, py:-9999, spd:0};

  function chladni(nx, ny, m, n) {
    return Math.cos(m*Math.PI*nx)*Math.cos(n*Math.PI*ny)
         - Math.cos(n*Math.PI*nx)*Math.cos(m*Math.PI*ny);
  }

  function grad(nx, ny, m, n) {
    const h = 0.003;
    return {
      gx: (chladni(nx+h,ny,m,n)-chladni(nx-h,ny,m,n))/(2*h),
      gy: (chladni(nx,ny+h,m,n)-chladni(nx,ny-h,m,n))/(2*h)
    };
  }

  function setup() {
    dpr = Math.min(devicePixelRatio||1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    build();
  }

  function build() {
    grains = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ox = (c / (COLS-1)) * W;
        const oy = (r / (ROWS-1)) * H;
        grains.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0 });
      }
    }
  }

  function frame(ts) {
    if (!t0) { t0 = ts; switchStart = ts; }

    const age = ts - switchStart;
    if (!switching && age > HOLD) {
      switching = true;
      nextIdx   = (modeIdx+1) % MODES.length;
      blend     = 0;
    }
    if (switching) {
      blend = Math.min(1, (ts - switchStart - HOLD) / XFADE);
      if (blend >= 1) {
        modeIdx     = nextIdx;
        switching   = false;
        blend       = 0;
        switchStart = ts;
      }
    }

    const [ma,na] = MODES[modeIdx];
    const [mb,nb] = MODES[nextIdx];
    const ease  = blend*blend*(3-2*blend);

    const S       = H * 0.52;
    const cell    = S / (ROWS - 1);
    const maxDisp = cell * 0.35;

    // decay mouse speed each frame so dots return when mouse stops
    const dxm = mouse.x - mouse.px, dym = mouse.y - mouse.py;
    mouse.spd = Math.min(1, Math.sqrt(dxm*dxm+dym*dym)/12);
    mouse.spd *= 0.85;
    mouse.px = mouse.x; mouse.py = mouse.y;

    ctx.clearRect(0, 0, W, H);

    grains.forEach(g => {
      const nx = g.ox / S;
      const ny = g.oy / S;

      const aA = chladni(nx, ny, ma, na);
      const aB = chladni(nx, ny, mb, nb);
      const a  = aA*(1-ease) + aB*ease;

      const gA = grad(nx, ny, ma, na);
      const gB = grad(nx, ny, mb, nb);
      const gx = (gA.gx*(1-ease)+gB.gx*ease) * S * 0.4;
      const gy = (gA.gy*(1-ease)+gB.gy*ease) * S * 0.4;

      const mag  = Math.max(0.001, Math.sqrt(gx*gx+gy*gy));
      const disp = Math.abs(a) * maxDisp;
      const tdx  = -Math.sign(a) * (gx/mag) * disp;
      const tdy  = -Math.sign(a) * (gy/mag) * disp;

      const tx = g.ox + tdx;
      const ty = g.oy + tdy;

      const shake = Math.abs(a) * NOISE * maxDisp;
      const sx = (Math.random()-0.5)*shake*2;
      const sy = (Math.random()-0.5)*shake*2;

      const mdx = g.x - mouse.x;
      const mdy = g.y - mouse.y;
      const md  = Math.sqrt(mdx*mdx+mdy*mdy);
      const mr  = Math.max(0, 1-md/MRAD);
      const mfx = md>0 ? (mdx/md)*mr*mr*MFORCE*mouse.spd : 0;
      const mfy = md>0 ? (mdy/md)*mr*mr*MFORCE*mouse.spd : 0;

      g.vx = (g.vx + (tx-g.x)*FORCE + sx + mfx) * DAMP;
      g.vy = (g.vy + (ty-g.y)*FORCE + sy + mfy) * DAMP;
      g.x  = Math.max(0, Math.min(W, g.x+g.vx));
      g.y  = Math.max(0, Math.min(H, g.y+g.vy));

      // Falloff 2.8 — grains stay visible further from nodal lines
      const nodal = Math.max(0, 1 - Math.abs(a)*2.8);
      if (nodal < 0.008) return;

      ctx.beginPath();
      ctx.arc(g.x, g.y, 0.49 + nodal*0.98, 0, Math.PI*2);
      // 0.06 base opacity so even antinode grains have faint presence
      ctx.fillStyle = `rgba(0,0,0,${0.05 + nodal*0.60})`;
      ctx.fill();
    });

    raf = requestAnimationFrame(frame);
  }

  const hero = canvas.closest('.hero') || canvas.parentElement;
  window.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = (e.clientX-r.left)*(W/r.width);
    mouse.y = (e.clientY-r.top)*(H/r.height);
  });
  window.addEventListener('mouseleave', () => { mouse.x=-9999; mouse.y=-9999; mouse.spd=0; });

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    grains = []; t0 = null;
    setup();
    raf = requestAnimationFrame(frame);
  });

  setup();
  raf = requestAnimationFrame(frame);
})();

// ── Circle ring (SVG clip + image parallax + particle dots) ────────────────
(function(){
  var canvas = document.getElementById('blob-canvas');
  var cell   = document.getElementById('blob-cell');
  var wrap   = canvas.parentElement;
  var stickyOuter = wrap && wrap.closest ? wrap.closest('.circle-sticky-wrap') : null;
  if(!canvas || !cell || !stickyOuter) return;
  // Lock geometry must use the sticky red pane — not .circle-sticky-wrap (negative margin makes wrap.top lie above the viewport while the red is only partly visible, which falsely triggered "overshoot" snaps upward).
  var circlePinEl = document.getElementById('projects') || stickyOuter;
  var ctx = canvas.getContext('2d');
  var PAD = 200; // canvas overflows section by PAD px on each side; used in setup() and frame()
  // pre-split initial HTML so char structure matches from the start
  (function(){
    var inv = document.getElementById('blob-cell-inv');
    if(inv) inv.querySelectorAll('.hl-inner').forEach(function(inner){ splitToChars(inner); });
  })();

  // SVG ring path — 734×734 space, outer r=367, inner r≈125
  var RING_STR = 'M366.999 0C569.687 6.59744e-05 733.998 164.313 733.998 367.002C733.998 569.691 569.687 734.003 366.999 734.003C164.311 734.003 6.76819e-05 569.691 0 367.002C0 164.313 164.311 0 366.999 0ZM366.999 242.449C298.208 242.449 242.442 298.215 242.441 367.007C242.441 435.798 298.208 491.565 366.999 491.565C435.79 491.565 491.557 435.798 491.557 367.007C491.556 298.215 435.79 242.449 366.999 242.449Z';
  var ringBase = new Path2D(RING_STR);

  var RED = getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || '#FF1B00';
  var FORCE = 0.002, DAMP = 0.945; // slow ease back onto the ribbon after mouse
  var MRAD = 170, MFORCE = 75;
  var DOT_R = 1.35, SPACING = 5; // matches drawn ring grain radius below
  var mouse = {x:-9999, y:-9999, px:-9999, py:-9999, spd:0};
  var W, H, cx, cy, baseR, innerR, particles, dpr, raf;
  var orangeReveal = document.getElementById('orange-reveal');

  var imgAncient = new Image(); imgAncient.src = 'circle-ancient.png';
  var imgAmbient = new Image(); imgAmbient.src = 'circle-ambient.png';
  var imgFlower  = new Image(); imgFlower.src  = 'flower.png';

  // wyatt → maat → eye → roses. Start at index 1 (maat) — avoids red PHASE1 flashing on first paint over the clip.
  var cycleVids = ['wyatt.mp4','cycle-2.mp4','cycle-4.mp4','cycle-3.mp4'].map(function(src){
    var v = document.createElement('video');
    v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.play().catch(function(){});
    return v;
  });
  var cycleImgs = cycleVids; // alias so rest of code is unchanged
  var ringOverlay       = null;
  var CYCLE_START_IDX   = 1; // maat — first visible clip is never invert
  var cycleIdx          = CYCLE_START_IDX;
  var cycleFade         = 0;
  var cycleStart        = performance.now();
  var CYCLE_HOLD        = 4200; // ms each image holds
  var CYCLE_TRANS       = 1800; // ms crossfade (auto)
  var cycleTransDur     = CYCLE_TRANS;
  var cyclePrevTs       = null; // tracks frame delta for cycle pause
  var lastAnimPForCycle = 0;    // detect white-ring → orange so we always reopen on Maat

  var vid = document.createElement('video');
  vid.src = 'bg.mp4'; vid.muted = true; vid.loop = true; vid.playsInline = true; vid.autoplay = true;
  vid.play().catch(function(){});

  function scaledRing(r){
    var sc = r / 367;
    var tx = cx - 367 * sc;
    var ty = cy - 367 * sc;
    var m = new DOMMatrix([sc, 0, 0, sc, tx, ty]);
    var p = new Path2D(); p.addPath(ringBase, m); return p;
  }

  function getScrollProgress(){
    var stickyWrap = stickyOuter;
    var r = stickyWrap.getBoundingClientRect();
    var scrollRange = stickyWrap.offsetHeight - window.innerHeight;
    if(scrollRange <= 0) return 1;
    return Math.min(1, Math.max(0, -r.top / scrollRange));
  }

  // Document Y past bottom of circle sticky dwell (+ padding) — matches hero/orange scroll math.
  function circleDwellEndScrollY(){
    var r = stickyOuter.getBoundingClientRect();
    var cdt = r.top + window.scrollY;
    var dw = Math.max(stickyOuter.offsetHeight || 0, window.innerHeight);
    return cdt + dw + 48;
  }

  function setup(){
    dpr = Math.min(devicePixelRatio||1, 2);
    W = wrap.offsetWidth  + PAD*2;
    H = wrap.offsetHeight + PAD*2;
    canvas.width  = W*dpr; canvas.height = H*dpr;
    canvas.style.width  = W+'px'; canvas.style.height = H+'px';
    canvas.style.left   = -PAD+'px'; canvas.style.top = -PAD+'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    var wr = wrap.getBoundingClientRect();
    var cr = cell.getBoundingClientRect();
    cx = cr.left - wr.left + cr.width/2  + PAD;
    cy = cr.top  - wr.top  + cr.height/2 + PAD;
    baseR  = Math.min(345, wrap.offsetWidth * 0.42);
    innerR = baseR * (124.558 / 367);
    particles = [];
    var numRings = Math.round((baseR - innerR) / SPACING);
    for(var ri = 0; ri <= numRings; ri++){
      var r = innerR + ri * (baseR - innerR) / numRings;
      var numPts = Math.max(6, Math.round(2 * Math.PI * r / SPACING));
      for(var pi2 = 0; pi2 < numPts; pi2++){
        var a = (pi2 / numPts) * Math.PI * 2;
        particles.push({ angle:a, radius:r, x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r, vx:0, vy:0 });
      }
    }
  }

  var entryBurst = false, lastPulse = 0;

  // ── Bidirectional animation state ────────────────────────
  // animProgress: 0 = white+dots, 1 = fully orange
  // animDir:      1 = playing forward, -1 = reversing, 0 = idle
  var animProgress = 0;
  var animDir      = 0;
  var animPrevTs   = null;
  var ringProgress = 0;
  var REV_DUR      = 760;   // ms — orange fill / reverse (slightly longer = softer)
  var RING_DUR     = 1280;  // ms — ring expand / collapse
  var twistPhase   = 0;     // advances each frame to animate ribbon twist

  var circleTextPhase = 0;    // 0 = dots text, 1 = transition text
  var circleHlVisualPhase = 0; // flips only when HTML actually swaps (after exit anim delay)
  var PHASE1_HTML = '<span class="hl-line"><span class="hl-inner">The only way</span></span><span class="hl-line"><span class="hl-inner">we know how.</span></span>';
  var PHASE2_HTML = '<span class="hl-line"><span class="hl-inner">Experimenting</span></span><span class="hl-line"><span class="hl-inner">at the edge of</span></span><span class="hl-line"><span class="hl-inner"><em>what\u2019s possible.</em></span></span>';
  // Matches hero / .pg-name: reflow then .revealed so per-char --cd transitions always run.
  function applyCircleHlFallInAnimation(el){
    if(!el) return;
    var invHost = document.getElementById('circle-hl-inv-host');
    var inv = document.getElementById('blob-cell-inv');
    var invChars = inv ? Array.from(inv.querySelectorAll('.hl-char:not(.hl-char--space)')) : [];
    var mainChars = Array.from(el.querySelectorAll('.hl-char:not(.hl-char--space)'));
    if(!mainChars.length && !invChars.length) return;
    el.classList.remove('revealed');
    if(invHost) invHost.classList.remove('revealed');
    function resetChars(chars){
      chars.forEach(function(ch){
        ch.classList.remove('hl-char-exit');
        ch.style.transitionDelay = '';
        ch.style.removeProperty('--cd');
        ch.style.removeProperty('--cr');
      });
    }
    resetChars(mainChars);
    resetChars(invChars);
    void el.offsetHeight;
    staggerCharsInSync(invChars.length ? [mainChars, invChars] : [mainChars]);
    void el.offsetHeight;
    if(invHost) void invHost.offsetHeight;
    requestAnimationFrame(function(){
      el.classList.add('revealed');
      if(invHost) invHost.classList.add('revealed');
    });
  }
  function swapCircleText(phase, opts){
    opts = opts || {};
    if(circleTextPhase === phase) return;
    circleTextPhase = phase;
    var el = document.getElementById('circle-hl');
    if(!el) return;

    function commitPhaseDOM(){
      circleHlVisualPhase = phase;
      var newHTML = phase === 1 ? PHASE2_HTML : PHASE1_HTML;
      var invSpan = document.getElementById('blob-cell-inv');
      var invHost = document.getElementById('circle-hl-inv-host');
      if(invSpan && invSpan.parentNode) invSpan.parentNode.removeChild(invSpan);
      el.innerHTML = newHTML;
      el.classList.remove('revealed');
      if(invHost) invHost.classList.remove('revealed');
      el.querySelectorAll('.hl-inner').forEach(function(inner){ splitToChars(inner); });
      if(invSpan){
        invSpan.innerHTML = newHTML;
        invSpan.querySelectorAll('.hl-inner').forEach(function(inner){ splitToChars(inner); });
        if(invHost){
          var metrics = invHost.querySelector('.circle-hl-inv-metrics');
          if(metrics) metrics.innerHTML = newHTML;
          invHost.appendChild(invSpan);
        } else {
          el.appendChild(invSpan);
        }
        ringOverlay = invSpan;
      }
      el.style.visibility = 'visible';
      if(invHost) invHost.style.visibility = 'visible';
      // Instant PHASE1 only (e.g. __circleReset): often commits while the section is off-screen,
      // so running fall-in here finishes before the user returns — use IO + lock trigger instead.
      // Non-instant PHASE1 (reverse swap after exit) stays in-view; must animate here.
      if(!(phase === 0 && opts.instant))
        applyCircleHlFallInAnimation(el);
    }

    if(opts.instant){
      commitPhaseDOM();
      return;
    }

    // exit: current chars fall out below clip at randomised speeds, no opacity fade
    var invHost2 = document.getElementById('circle-hl-inv-host');
    var exits = Array.from(el.querySelectorAll('.hl-char'));
    if(invHost2){
      var invOnly = invHost2.querySelector('#blob-cell-inv');
      if(invOnly) exits = exits.concat(Array.from(invOnly.querySelectorAll('.hl-char')));
    }
    exits.forEach(function(c){
      c.style.transitionDelay = '';
      c.style.setProperty('--cd', (0.14 + Math.random() * 0.12).toFixed(2) + 's');
      c.classList.add('hl-char-exit');
    });
    setTimeout(commitPhaseDOM, exits.length > 0 ? 300 : 0);
  }

  // Debounce windows so rapid wheel/touch back-and-forth doesn’t re-arm competing handlers.
  var GRACE_UNLOCK_MS   = 220;
  var GRACE_RPOST_MS    = 480;
  var GRACE_FWD_DONE_MS = 450;
  var GRACE_REV_DONE_MS = 320;

  // Exposed for hero reverse and for scroll re-arm: full white-ring + PHASE1 baseline.
  window.__circleReset = function(){
    scrollPhase          = 'before';
    animProgress         = 0;
    animDir              = 0;
    animPrevTs           = null;
    ringProgress         = 0;
    lastAnimPForCycle    = 0;
    hasScrolledBelowSection = false;
    lockGraceUntil       = performance.now() + GRACE_FWD_DONE_MS;
    circleTextPhase      = 1; // force swapCircleText(0) — phase must differ from target
    swapCircleText(0, {instant: true});
    if(typeof window.__armCircleHlObserver === 'function') window.__armCircleHlObserver();
    cycleIdx             = CYCLE_START_IDX;
    cycleFade            = 0;
    cycleStart           = performance.now();
    cycleTransDur        = CYCLE_TRANS;
    cyclePrevTs          = null;
    document.documentElement.style.overflow = '';
  };

  // ── Scroll phase ─────────────────────────────────────────
  // 'before'  : section not yet pinned
  // 'locked'  : pinned at 0, wheel blocked, showing white+dots
  // 'live'    : animation in motion (either direction), wheel blocked
  // 'done'    : fully forward, scroll unlocked
  var scrollPhase = 'before';

  // ── Single scroll handler — states ──────────────────────
  //
  //  before     natural scroll ↓ → lock when section pins   (wrapTop crosses 0 going ↓)
  //  locked     paused at center ↓ → ↓ fires fwd anim       ↑ lets page scroll freely
  //  live       animation playing  → block scroll, animDir follows wheel dir
  //  done       fwd complete, scroll free; ↑ re-locks when section unpins from below
  //  revlocked  paused at center ↑ → ↑ fires rev anim       ↓ returns to done
  //  rpost      rev complete, paused at white+dots; ↑ exits  ↓ re-fires fwd

  var touchStartY = 0;
  var lockGraceUntil = 0;
  var lockEnteredAt = 0;
  var LOCK_MIN_MS = 350;
  var LOCK_MIN_DELTA = 8;
  var REVLOCK_INTENT_MIN_WHEEL = 22;
  var REVLOCK_INTENT_MIN_TOUCH = 20;
  var REVLOCK_INTENT_MIN_SCROLL = 26;
  var REVLOCK_INTENT_DECAY_MS = 240;
  var revlockUpIntentPx = 0;
  var revlockUpIntentTs = 0;
  var lockedScrollY = 0;
  // revlocked only fires when user has actually scrolled into the section from below (post-cards)
  // prevents immediate re-lock right after animation completes
  var hasScrolledBelowSection = false;

  // Catches trackpad/scrollbar/touch momentum that skips the wheel handler so we still latch the red section.
  var scrollSnapLastY = window.scrollY;
  var scrollSnapLastYRev = window.scrollY;
  var scrollSnapCircleRaf = null;

  // Re-triggers the fall-in animation for circle text that was set up off-screen.
  // Called whenever the section locks, so the animation plays each time it enters view.
  function triggerCircleTextReveal(){
    var el = document.getElementById('circle-hl');
    if(!el) return;
    if(typeof window.__disconnectCircleHlObserver === 'function')
      window.__disconnectCircleHlObserver();
    el.style.visibility = 'visible';
    var invHost = document.getElementById('circle-hl-inv-host');
    if(invHost) invHost.style.visibility = 'visible';
    applyCircleHlFallInAnimation(el);
  }

  // If the blob is still forward/orange, re-baseline before lock so PHASE1 + white ring replay.
  function ensureCircleWhiteBaselineBeforeLock(){
    if(animProgress <= 0.001 && circleTextPhase === 0) return false;
    if(typeof window.__circleReset === 'function') window.__circleReset();
    return true;
  }

  // Scrolling up from cards: pin overlaps the bottom ~25% of the viewport but is not yet stuck (r.top>0).
  function circlePullUpRevLockEligible(r){
    var h = window.innerHeight;
    return r.bottom > h * 0.86 && r.top < h * 0.82 && r.top > h * 0.05;
  }

  function noteRevlockUpIntent(px, isUp){
    var now = performance.now();
    if(!isUp){
      revlockUpIntentPx = 0;
      revlockUpIntentTs = now;
      return;
    }
    if(now - revlockUpIntentTs > REVLOCK_INTENT_DECAY_MS){
      revlockUpIntentPx = 0;
    }
    revlockUpIntentPx += Math.max(0, px || 0);
    revlockUpIntentTs = now;
  }

  function hasRevlockUpIntent(minPx){
    return performance.now() - revlockUpIntentTs <= REVLOCK_INTENT_DECAY_MS && revlockUpIntentPx >= minPx;
  }

  function wheelDeltaPx(ev){
    if(ev.deltaMode === 0) return Math.abs(ev.deltaY);
    if(ev.deltaMode === 1) return Math.abs(ev.deltaY) * 16; // line-based wheel
    return Math.abs(ev.deltaY) * window.innerHeight; // page-based wheel
  }

  function updateHasScrolledBelowSectionByScroll(){
    if(scrollPhase !== 'done' || hasScrolledBelowSection) return;
    var rOuter = stickyOuter.getBoundingClientRect();
    var exitThreshold = stickyOuter.offsetHeight - window.innerHeight;
    if(-rOuter.top >= exitThreshold - 50){ hasScrolledBelowSection = true; }
  }

  function circleForwardLockCommitMax(){
    return window.innerHeight * 0.5;
  }

  // After a full run, scrollPhase can stay 'done' with animProgress=1; scrolling above the lock Y
  // resets canvas + PHASE1 so the next approach isn’t stuck orange.
  var REARM_ABOVE_LOCK_PX = 72; // margin so tiny scroll jitter (e.g. trackpad over project strip) doesn’t flash-reset the circle
  window.addEventListener('scroll', function circleRearmWhenAboveLock(){
    if(window.__heroReverseScrollActive) return;
    if(lockedScrollY <= 0) return;
    if(window.scrollY >= lockedScrollY - REARM_ABOVE_LOCK_PX) return;
    if(scrollPhase === 'done' || scrollPhase === 'rpost'){
      if(typeof window.__circleReset === 'function') window.__circleReset();
    }
  }, {passive:true});

  function trySnapCircleLockFromScroll(){
    if(scrollPhase !== 'before') return;
    if(document.documentElement.style.overflow === 'hidden') return;
    if(window.__heroReverseScrollActive) return;
    var sy = window.scrollY;
    var scrollingDown = sy > scrollSnapLastY;
    scrollSnapLastY = sy;
    var now = performance.now();
    if(now < lockGraceUntil) return;
    var commitMax = circleForwardLockCommitMax();
    var r = circlePinEl.getBoundingClientRect();
    if(r.top > commitMax) return;
    // In the approach band: only latch on ↓ so ↑ still returns to hero. Past pin (r.top≤0): only when still scrolling ↓ — avoids yanking up while the wrap rect was wrong or on ↑.
    if(r.top > 0 && !scrollingDown) return;
    if(r.top <= 0 && !scrollingDown) return;
    ensureCircleWhiteBaselineBeforeLock();
    r = circlePinEl.getBoundingClientRect();
    if(r.top > commitMax) return;
    var snapY = Math.round(window.scrollY + r.top);
    if(snapY < 0) snapY = 0;
    window.scrollTo({top: snapY, behavior: 'instant'});
    lockedScrollY = snapY;
    lockEnteredAt = performance.now();
    scrollPhase = 'locked';
    document.documentElement.style.overflow = 'hidden';
    triggerCircleTextReveal();
    scrollSnapLastY = snapY;
  }

  function trySnapCircleRevLockFromScroll(){
    if(scrollPhase !== 'done') return;
    if(document.documentElement.style.overflow === 'hidden') return;
    if(window.__heroReverseScrollActive) return;
    var sy = window.scrollY;
    var upPx = Math.max(0, scrollSnapLastYRev - sy);
    var scrollingUp = upPx > 0;
    noteRevlockUpIntent(upPx, scrollingUp);
    scrollSnapLastYRev = sy;
    var now = performance.now();
    if(now < lockGraceUntil) return;
    updateHasScrolledBelowSectionByScroll();
    if(!hasScrolledBelowSection) return;
    var r = circlePinEl.getBoundingClientRect();
    if(!circlePullUpRevLockEligible(r)) return;
    if(!hasRevlockUpIntent(REVLOCK_INTENT_MIN_SCROLL)) return;
    if(!scrollingUp) return;
    var snapTarget = Math.round(window.scrollY + r.top);
    if(snapTarget < 0) snapTarget = 0;
    window.scrollTo({top: snapTarget, behavior: 'instant'});
    lockedScrollY = snapTarget;
    lockEnteredAt = performance.now();
    hasScrolledBelowSection = false;
    scrollPhase = 'revlocked';
    document.documentElement.style.overflow = 'hidden';
  }

  window.addEventListener('scroll', function circleSnapLockOnScroll(){
    if(scrollSnapCircleRaf !== null) return;
    scrollSnapCircleRaf = requestAnimationFrame(function(){
      scrollSnapCircleRaf = null;
      trySnapCircleLockFromScroll();
      trySnapCircleRevLockFromScroll();
      if(scrollPhase !== 'done') scrollSnapLastYRev = window.scrollY;
    });
  }, {passive: true});

  window.addEventListener('wheel', function sectionWheel(e){
    var dir = e.deltaY > 0 ? 1 : (e.deltaY < 0 ? -1 : 0);
    if(dir === 0) return;
    var r = circlePinEl.getBoundingClientRect();
    var rOuter = stickyOuter.getBoundingClientRect();
    var now = performance.now();
    var commitMax = circleForwardLockCommitMax();

    // deltaY normalized to pixels (deltaMode 0 = pixel, 1 = line, 2 = page)
    var absDelta = wheelDeltaPx(e);
    noteRevlockUpIntent(absDelta, dir < 0);

    if(scrollPhase === 'before'){
      if(dir > 0 && r.top <= 0 && now >= lockGraceUntil){
        ensureCircleWhiteBaselineBeforeLock();
        r = circlePinEl.getBoundingClientRect();
        // Section already at/past top — standard lock
        e.preventDefault();
        lockedScrollY = window.scrollY;
        lockEnteredAt = now;
        scrollPhase = 'locked';
        document.documentElement.style.overflow = 'hidden';
        triggerCircleTextReveal();
      } else if(dir > 0 && r.top > 0 && r.top <= commitMax && now >= lockGraceUntil){
        ensureCircleWhiteBaselineBeforeLock();
        r = circlePinEl.getBoundingClientRect();
        // User has pulled the red pane far enough into view — snap flush to fill the viewport
        e.preventDefault();
        lockedScrollY = Math.round(window.scrollY + r.top);
        window.scrollTo({top: lockedScrollY, behavior:'instant'});
        lockEnteredAt = now;
        scrollPhase = 'locked';
        document.documentElement.style.overflow = 'hidden';
        triggerCircleTextReveal();
      }
      return;
    }

    if(scrollPhase === 'locked'){
      if(dir > 0){
        e.preventDefault();
        window.scrollTo({top: lockedScrollY, behavior:'instant'});
        if(now - lockEnteredAt >= LOCK_MIN_MS && absDelta >= LOCK_MIN_DELTA){
          scrollPhase = 'live';
          animDir = 1;
        }
      } else {
        // ↑ while locked — require meaningful delta to retreat (absDelta≥5 filters tiny trackpad bounces)
        if(absDelta >= 5){
          e.preventDefault();
          scrollPhase = 'before';
          lockGraceUntil = now + GRACE_UNLOCK_MS;
          document.documentElement.style.overflow = '';
        } else {
          e.preventDefault();
        }
      }
      return;
    }

    if(scrollPhase === 'live'){
      e.preventDefault();
      animDir = dir;
      return;
    }

    if(scrollPhase === 'done'){
      // Track whether user has exited the dwell going down (into cards territory)
      var exitThreshold = stickyOuter.offsetHeight - window.innerHeight;
      if(-rOuter.top >= exitThreshold - 50){ hasScrolledBelowSection = true; }

      var pullUp = circlePullUpRevLockEligible(r);
      // Reverse lock: near pin, or earlier when section has entered the bottom quarter while still unpinned (↑ from cards)
      if(dir < 0 && now >= lockGraceUntil && hasScrolledBelowSection && ((r.top >= -8 && r.top <= 80) || pullUp)){
        if(!hasRevlockUpIntent(REVLOCK_INTENT_MIN_WHEEL)) return;
        e.preventDefault();
        var snapTarget = r.top > 0 ? Math.round(window.scrollY + r.top) : window.scrollY;
        if(r.top > 0) window.scrollTo({top: snapTarget, behavior:'instant'});
        lockedScrollY = snapTarget;
        lockEnteredAt = now;
        hasScrolledBelowSection = false;
        scrollPhase = 'revlocked';
        document.documentElement.style.overflow = 'hidden';
      }
      return;
    }

    if(scrollPhase === 'rpost'){
      // Symmetric to 'locked': locked at white+dots view after reverse animation completes
      if(dir < 0 && absDelta >= LOCK_MIN_DELTA && now >= lockGraceUntil){
        e.preventDefault();
        scrollPhase = 'before';
        lockGraceUntil = now + GRACE_RPOST_MS;
        document.documentElement.style.overflow = '';
      } else if(dir > 0 && absDelta >= LOCK_MIN_DELTA && now >= lockGraceUntil){
        e.preventDefault();
        scrollPhase = 'live';
        animDir = 1;
      } else {
        e.preventDefault(); // absorb tiny bounces / residual momentum
      }
      return;
    }

    if(scrollPhase === 'revlocked'){
      if(dir < 0){
        e.preventDefault();
        window.scrollTo({top: lockedScrollY, behavior:'instant'});
        if(now - lockEnteredAt >= LOCK_MIN_MS && absDelta >= LOCK_MIN_DELTA){
          if(window.__heroAutoHasPlayed){
            scrollPhase = 'before'; animDir = 0;
            lockGraceUntil = now + GRACE_UNLOCK_MS;
            document.documentElement.style.overflow = '';
          } else {
            scrollPhase = 'live'; animDir = -1;
          }
        } else {
        }
      } else {
        if(absDelta >= 5){
          e.preventDefault();
          scrollPhase = 'done';
          lockGraceUntil = now + GRACE_UNLOCK_MS;
          document.documentElement.style.overflow = '';
        } else {
          e.preventDefault();
        }
      }
      return;
    }
  }, {passive:false});

  window.addEventListener('touchstart', function(e){
    touchStartY = e.touches[0].clientY;
    lastTouchMoveY = touchStartY;
  }, {passive:true});

  var lastTouchMoveY = null;
  window.addEventListener('touchend', function(){ lastTouchMoveY = null; }, {passive:true});
  window.addEventListener('touchcancel', function(){ lastTouchMoveY = null; }, {passive:true});

  window.addEventListener('touchmove', function sectionTouch(e){
    var touchY = e.touches[0].clientY;
    var dy = touchStartY - touchY;
    var stepDy = lastTouchMoveY == null ? dy : (lastTouchMoveY - touchY);
    lastTouchMoveY = touchY;
    var dir = dy > 2 ? 1 : (dy < -2 ? -1 : 0);
    if(dir === 0) return;
    var r = circlePinEl.getBoundingClientRect();
    var rOuter = stickyOuter.getBoundingClientRect();
    var now = performance.now();
    var commitMaxT = circleForwardLockCommitMax();
    if(scrollPhase === 'before' && dir > 0 && now >= lockGraceUntil){
      if(r.top <= 0){
        ensureCircleWhiteBaselineBeforeLock();
        r = circlePinEl.getBoundingClientRect();
        e.preventDefault();
        lockedScrollY = window.scrollY;
        lockEnteredAt = now;
        scrollPhase = 'locked';
        document.documentElement.style.overflow = 'hidden';
        triggerCircleTextReveal();
        return;
      }
      if(r.top > 0 && r.top <= commitMaxT){
        ensureCircleWhiteBaselineBeforeLock();
        r = circlePinEl.getBoundingClientRect();
        e.preventDefault();
        lockedScrollY = Math.round(window.scrollY + r.top);
        window.scrollTo({top: lockedScrollY, behavior:'instant'});
        lockEnteredAt = now;
        scrollPhase = 'locked';
        document.documentElement.style.overflow = 'hidden';
        triggerCircleTextReveal();
        return;
      }
    }
    var absDy = Math.abs(dy);
    noteRevlockUpIntent(Math.abs(stepDy), dir < 0);
    if(scrollPhase === 'locked' && dir > 0){
      e.preventDefault();
      window.scrollTo({top: lockedScrollY, behavior:'instant'});
      if(now - lockEnteredAt >= LOCK_MIN_MS && absDy >= LOCK_MIN_DELTA){
        scrollPhase = 'live';
        animDir = 1;
      }
      return;
    }
    if(scrollPhase === 'locked' && dir < 0){
      if(absDy < 5){ e.preventDefault(); return; }
      e.preventDefault();
      scrollPhase = 'before';
      lockGraceUntil = now + GRACE_UNLOCK_MS;
      document.documentElement.style.overflow = '';
      return;
    }
    if(scrollPhase === 'live'){ e.preventDefault(); animDir = dir; return; }
    if(scrollPhase === 'rpost'){
      if(dir < 0 && absDy >= LOCK_MIN_DELTA && now >= lockGraceUntil){
        e.preventDefault();
        scrollPhase = 'before';
        lockGraceUntil = now + GRACE_RPOST_MS;
        document.documentElement.style.overflow = '';
        return;
      }
      if(dir > 0 && absDy >= LOCK_MIN_DELTA && now >= lockGraceUntil){
        e.preventDefault();
        scrollPhase = 'live';
        animDir = 1;
        return;
      }
      e.preventDefault();
      return;
    }
    if(scrollPhase === 'done'){
      var et = stickyOuter.offsetHeight - window.innerHeight;
      if(-rOuter.top >= et - 50){ hasScrolledBelowSection = true; }
      var pullUpT = circlePullUpRevLockEligible(r);
      if(dir < 0 && now >= lockGraceUntil && hasScrolledBelowSection && ((r.top >= -8 && r.top <= 80) || pullUpT)){
        if(!hasRevlockUpIntent(REVLOCK_INTENT_MIN_TOUCH)) return;
        e.preventDefault();
        var st = r.top > 0 ? Math.round(window.scrollY + r.top) : window.scrollY;
        if(r.top > 0) window.scrollTo({top: st, behavior:'instant'});
        lockedScrollY = st;
        lockEnteredAt = now;
        hasScrolledBelowSection = false;
        scrollPhase = 'revlocked';
        document.documentElement.style.overflow = 'hidden';
        return;
      }
    }
    if(scrollPhase === 'revlocked' && dir < 0){
      e.preventDefault();
      window.scrollTo({top: lockedScrollY, behavior:'instant'});
      if(now - lockEnteredAt >= LOCK_MIN_MS && absDy >= LOCK_MIN_DELTA){
        if(window.__heroAutoHasPlayed){
          scrollPhase = 'before';
          animDir = 0;
          lockGraceUntil = now + GRACE_UNLOCK_MS;
          document.documentElement.style.overflow = '';
        } else {
          scrollPhase = 'live';
          animDir = -1;
        }
      } else {
      }
      return;
    }
    if(scrollPhase === 'revlocked' && dir > 0){
      if(absDy >= 5){
        e.preventDefault();
        scrollPhase = 'done';
        lockGraceUntil = now + GRACE_UNLOCK_MS;
        document.documentElement.style.overflow = '';
      } else {
        e.preventDefault();
      }
      return;
    }
  }, {passive:false});
  var circleObs = new IntersectionObserver(function(entries){
    if(entryBurst) return;
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entryBurst = true; lastPulse = Infinity;
        setTimeout(function(){
          particles.forEach(function(p){
            var dx = p.x-cx, dy = p.y-cy, d = Math.sqrt(dx*dx+dy*dy)||1;
            p.vx += (dx/d) * 24 * (0.6 + Math.random()*0.8);
            p.vy += (dy/d) * 24 * (0.6 + Math.random()*0.8);
          });
          setTimeout(function(){ lastPulse = 0; }, 5000);
        }, 120);
        circleObs.disconnect();
      }
    });
  }, {threshold:0.35});
  circleObs.observe(wrap);

  var PULSE_INTERVAL = 3500;
  function maybePulse(now){
    if(mouse.spd > 0.15){ lastPulse = now; return; }
    if(now - lastPulse < PULSE_INTERVAL) return;
    lastPulse = now;
    particles.forEach(function(p){
      var dx = p.x-cx, dy = p.y-cy, d = Math.sqrt(dx*dx+dy*dy)||1;
      p.vx += (dx/d)*2.2; p.vy += (dy/d)*2.2;
    });
  }

  function frame(now){
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0,0,W,H);
    maybePulse(now||0);

    var dxm = mouse.x-mouse.px, dym = mouse.y-mouse.py;
    mouse.spd = Math.min(1, Math.sqrt(dxm*dxm+dym*dym)/12) * 0.85;
    mouse.px = mouse.x; mouse.py = mouse.y;

    // Normalised mouse offset from center (0 when no mouse)
    var mox = mouse.x === -9999 ? 0 : (mouse.x - cx) / (baseR||1);
    var moy = mouse.y === -9999 ? 0 : (mouse.y - cy) / (baseR||1);

    // ── Bidirectional animation tick ──────────────────────────
    if(animDir !== 0){
      if(animPrevTs !== null){
        var dt = now - animPrevTs;
        animProgress += animDir * (dt / REV_DUR);
        ringProgress += animDir * (dt / RING_DUR);
        animProgress = Math.max(0, Math.min(1, animProgress));
        ringProgress = Math.max(0, Math.min(1, ringProgress));
        // Forward complete → done: release scroll immediately so user can continue freely
        if(animDir > 0 && animProgress >= 1){
          animDir = 0; scrollPhase = 'done'; lockGraceUntil = performance.now() + GRACE_FWD_DONE_MS;
          document.documentElement.style.overflow = '';
          scrollSnapLastYRev = window.scrollY;
        }
        if(animDir < 0 && animProgress <= 0){
          animDir = 0; scrollPhase = 'rpost'; lockGraceUntil = performance.now() + GRACE_REV_DONE_MS;
          lockEnteredAt = performance.now(); hasScrolledBelowSection = false;
        }
      }
    }
    animPrevTs = now;

    // Every time the orange/video ring engages (was white-only, now animating in), start on Maat
    // and swap headline before any video draws — avoids red PHASE1 flashing over the clip.
    if(animProgress > 0 && lastAnimPForCycle <= 0){
      cycleIdx      = CYCLE_START_IDX;
      cycleFade     = 0;
      cycleStart    = now;
      cycleTransDur = CYCLE_TRANS;
      cyclePrevTs   = null;
      if(circleTextPhase === 0) swapCircleText(1, {instant: true});
    }
    lastAnimPForCycle = animProgress;

    // ── Text phase swap: reverse to PHASE1 on rewind only (animDir≤0). Forward early
    // animProgress<0.04 must NOT swap — it fought instant PHASE2 and mangled the headline.
    if(animProgress > 0.08 && circleTextPhase === 0) swapCircleText(1, {instant: true});
    else if(animProgress < 0.04 && animDir <= 0) swapCircleText(0);

    // rAF scroll-lock — correct drift; skip sub-pixel nudges during live/rpost to reduce jank
    var sy = window.scrollY, drift = Math.abs(sy - lockedScrollY);
    if(scrollPhase === 'locked' && sy > lockedScrollY){
      window.scrollTo({top: lockedScrollY, behavior:'instant'});
    } else if(scrollPhase === 'revlocked' && sy < lockedScrollY){
      window.scrollTo({top: lockedScrollY, behavior:'instant'});
    } else if((scrollPhase === 'live' || scrollPhase === 'rpost') && drift > 2){
      window.scrollTo({top: lockedScrollY, behavior:'instant'});
    }

    // Ring expansion — easeOutExpo applied to ringProgress
    // When the fill animation completes (animProgress=1), snap clipR to baseR so the
    // outer circle edge lands exactly on the outermost ring of dots.
    var ease  = ringProgress < 1 ? 1 - Math.pow(2, -10 * ringProgress) : 1;
    var clipR = animProgress >= 1 ? baseR : Math.max(2, baseR * ease);

    // Orange fill on canvas still follows animProgress. Full-viewport #orange-reveal must not shrink
    // in sync with reverse once the user has scrolled past circle dwell (belief/cards) — only the ring rewinds.
    var revProg = animProgress;
    var dwellPastOrange = window.scrollY > circleDwellEndScrollY();
    var revProgOrange = revProg;
    if(dwellPastOrange){
      if(revProg >= 0.999) revProgOrange = 1;
      else if(animDir < 0) revProgOrange = 1;
    }
    var revEaseOrange = revProgOrange < 1 ? 1 - Math.pow(1 - revProgOrange, 4) : 1;
    if(orangeReveal){
      // Radius must cover the full #orange-reveal box (viewport-sized), not canvas W/H — otherwise corners stay body-colored.
      var ow = orangeReveal.offsetWidth || window.innerWidth;
      var oh = orangeReveal.offsetHeight || window.innerHeight;
      var maxRevR = Math.sqrt(ow * ow + oh * oh) * 0.5 + 12;
      orangeReveal.style.opacity = revProgOrange > 0 ? '1' : '0';
      if(revProgOrange >= 1){
        orangeReveal.style.clipPath = 'none';
      } else {
        orangeReveal.style.clipPath = 'circle(' + (revEaseOrange * maxRevR).toFixed(1) + 'px at 50% 50%)';
      }
    }

    var ring = scaledRing(clipR);
    var imgSize = clipR * 2.2;

    // ── Images inside ring clip — skip entirely when animation hasn't started
    // (clipR≤2 sub-pixel scale causes evenodd hole to bleed a tiny center dot)
    if(animProgress <= 0) { ctx.save(); ctx.restore(); } else {
    ctx.save();
    ctx.clip(ring, 'evenodd');
    // Orange base so image blend modes composite against it, not transparent
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, W, H);

    // ── Cycling images — pause only during the hold; crossfade always runs to completion ──
    var cycleDt = cyclePrevTs !== null ? now - cyclePrevTs : 0;
    cyclePrevTs = now;
    var cycleElapsedBeforePause = now - cycleStart;
    if(mouse.spd > 0.06 && animProgress > 0 && cycleElapsedBeforePause <= CYCLE_HOLD){
      cycleStart += cycleDt; // freeze elapsed while still on a single clip
    }

    var cycleElapsed = now - cycleStart;
    if(cycleElapsed >= CYCLE_HOLD + cycleTransDur){
      cycleIdx      = (cycleIdx + 1) % cycleImgs.length;
      cycleStart    = now;
      cycleElapsed  = 0;
      cycleFade     = 0;
      cycleTransDur = CYCLE_TRANS; // reset to slow for next auto cycle
    }
    cycleFade = cycleElapsed > CYCLE_HOLD
      ? Math.min(1, (cycleElapsed - CYCLE_HOLD) / cycleTransDur)
      : 0;

    // Subtle Ken Burns: slow zoom in over each hold period
    var kbT    = Math.min(1, cycleElapsed / (CYCLE_HOLD + CYCLE_TRANS));
    var kbZoom = 1 + kbT * 0.04;
    var nextKb = 1 + (1 - cycleFade) * 0.03;
    var imgA   = cycleImgs[cycleIdx];
    var imgB   = cycleImgs[(cycleIdx + 1) % cycleImgs.length];

    function drawCImg(img, alpha, zoom){
      if(!img || img.readyState < 2 || alpha <= 0) return;
      var diam = imgSize * zoom;
      var vw = img.videoWidth  || diam;
      var vh = img.videoHeight || diam;
      var s  = Math.max(diam / vw, diam / vh);
      var dw = vw * s, dh = vh * s;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, cx - dw/2 - mox*20, cy - dh/2 - moy*20, dw, dh);
      ctx.restore();
    }

    // White PHASE2 duplicate inside ring — all cycle videos (was only index 2 / “eye”).
    cell.style.mixBlendMode = '';

    if(!ringOverlay) ringOverlay = document.getElementById('blob-cell-inv');
    if(ringOverlay){
      if(animProgress > 0 && clipR > 2){
        var _hlEl2 = document.getElementById('circle-hl');
        var bcx = _hlEl2 ? _hlEl2.offsetWidth  / 2 : cell.offsetWidth  / 2;
        var bcy = _hlEl2 ? _hlEl2.offsetHeight / 2 : cell.offsetHeight / 2;
        ringOverlay.style.clipPath = 'circle(' + clipR.toFixed(1) + 'px at ' + bcx.toFixed(1) + 'px ' + bcy.toFixed(1) + 'px)';
        ringOverlay.style.opacity  = '1';
      } else {
        ringOverlay.style.clipPath = 'circle(0px)';
        ringOverlay.style.opacity  = '0';
      }
    }

    drawCImg(imgA, 1 - cycleFade, kbZoom);
    drawCImg(imgB, cycleFade,     nextKb);
    if(vid.readyState >= 2){
      var vvw = vid.videoWidth  || imgSize;
      var vvh = vid.videoHeight || imgSize;
      var diam = clipR * 2;
      var vs   = Math.max(diam / vvw, diam / vvh);
      var vdw  = vvw * vs, vdh = vvh * vs;
      ctx.globalAlpha = 0.6;
      ctx.globalCompositeOperation = 'difference';
      ctx.drawImage(vid, cx - vdw/2, cy - vdh/2, vdw, vdh);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    } // end animProgress > 0 guard

    // Headline color + invert overlay — must run every frame; when animProgress is 0 the
    // anim>0 branch is skipped, so without this the last #000 from phase 2 would stick.
    if(animProgress <= 0){
      if(!ringOverlay) ringOverlay = document.getElementById('blob-cell-inv');
      if(ringOverlay){
        ringOverlay.style.clipPath = 'circle(0px)';
        ringOverlay.style.opacity  = '0';
      }
    }
    var circleHlElSync = document.getElementById('circle-hl');
    if(circleHlElSync){
      var _hlTxt = circleHlElSync.textContent || '';
      var _phase1Dom = _hlTxt.toLowerCase().indexOf('only way') !== -1;
      circleHlElSync.style.color =
        circleHlVisualPhase === 0 || _phase1Dom ? 'var(--red)' : '#000';
    }

    // ── Dot matrix ring — ribbon twist as it rotates, responds to mouse
    twistPhase += 0.010;
    var TWIST_AMP  = (baseR - innerR) * 0.22;
    var TWIST_FREQ = 2;
    var rotSpeed   = 0.0008;
    particles.forEach(function(p){ p.angle -= rotSpeed; });

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    particles.forEach(function(p){
      var radNorm  = (p.radius - innerR) / ((baseR - innerR) || 1); // 0=inner, 1=outer
      // Bell curve: 0 at both ring edges, 1 at midpoint.
      // Scaling amplitude by this means boundary particles have zero displacement —
      // they spring back to their exact ring radius, so the circular silhouette
      // emerges from the physics itself rather than a hard clip.
      var edgeFade = Math.sin(radNorm * Math.PI);
      var phase    = TWIST_FREQ * p.angle + twistPhase - radNorm * Math.PI;
      var r_eff    = p.radius + TWIST_AMP * edgeFade * Math.sin(phase);
      var ox = cx + Math.cos(p.angle) * r_eff;
      var oy = cy + Math.sin(p.angle) * r_eff;
      p.vx += (ox - p.x)*FORCE;
      p.vy += (oy - p.y)*FORCE;
      var mdx = p.x-mouse.x, mdy = p.y-mouse.y;
      var md  = Math.sqrt(mdx*mdx+mdy*mdy);
      var mr  = Math.max(0, 1-md/MRAD);
      p.vx += md>0 ? (mdx/md)*mr*mr*MFORCE*mouse.spd : 0;
      p.vy += md>0 ? (mdy/md)*mr*mr*MFORCE*mouse.spd : 0;
      p.vx *= DAMP; p.vy *= DAMP;
      p.x  += p.vx; p.y  += p.vy;
      // Depth cue: sin(phase)=+1 → front (large, opaque), −1 → back (tiny, faint)
      var z      = Math.sin(phase);
      var t01    = z * 0.5 + 0.5;
      // Cosine ease: S-curve from back to front — the gentle acceleration at both ends
      // gives the fold a rounded, organic feel rather than a linear or sharp cutoff.
      var depth  = 0.15 + 0.85 * (0.5 - 0.5 * Math.cos(t01 * Math.PI));
      var dt = Math.max(0, Math.min(1, (revProg - 0.45) / 0.35));
      var dr2 = Math.round(255 + (0   - 255) * dt);
      var dg2 = Math.round(27  + (0   - 27)  * dt);
      var db2 = Math.round(0   + (0   - 0)   * dt);
      ctx.globalAlpha = depth;
      ctx.fillStyle = 'rgb(' + dr2 + ',' + dg2 + ',' + db2 + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.35, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  var clientX = -9999, clientY = -9999;
  function updateMouse(){
    var r = canvas.getBoundingClientRect();
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = clientX - r.left;
    mouse.y = clientY - r.top;
  }
  window.addEventListener('mousemove', function(e){ clientX=e.clientX; clientY=e.clientY; updateMouse(); });
  window.addEventListener('mouseleave', function(){ clientX=-9999; clientY=-9999; mouse.x=-9999; mouse.y=-9999; mouse.spd=0; });
  window.addEventListener('scroll', function(){ if(clientX===-9999) return; updateMouse(); mouse.spd=Math.max(mouse.spd,0.9); },{passive:true});
  window.addEventListener('resize', function(){ cancelAnimationFrame(raf); setup(); raf=requestAnimationFrame(frame); });

  setup(); raf = requestAnimationFrame(frame);
})();

// ── Belief reveal ─────────────────────────────────────────
(function(){
  var bqs  = document.querySelectorAll('.belief-q');
  var hero = document.querySelector('.hero');
  if(!bqs.length || !hero) return;
  var done = false;
  function check(){
    if(done) return;
    if(window.scrollY > hero.offsetHeight * 0.3){
      bqs.forEach(function(bq){ bq.classList.add('in-view'); });
      done = true;
      window.removeEventListener('scroll', check);
    }
  }
  window.addEventListener('scroll', check, {passive:true});
  check();
})();

// ── Scroll-triggered entrances ────────────────────────────
(function(){
  // Horizontal cards: use the scroll track as the intersection root so cards
  // become visible as the user scrolls horizontally, not just on page scroll.
  var cards = document.querySelectorAll('.hcard');
  var track = document.querySelector('.hscroll-track');

  // ── pg-name char animation — split at load, reveal when card enters viewport ─
  var pgNames = document.querySelectorAll('.hscroll-track .pg-name');
  pgNames.forEach(function(pn){
    pn.querySelectorAll('.hl-inner').forEach(function(inner){ splitToChars(inner); });
  });

  function revealPgName(cardOrPn){
    var pn = cardOrPn.classList.contains('pg-name') ? cardOrPn : cardOrPn.querySelector('.pg-name');
    if(!pn || pn.classList.contains('revealed')) return;
    var chars = Array.from(pn.querySelectorAll('.hl-char:not(.hl-char--space)'));
    staggerChars(chars);
    // rAF ensures browser commits initial inline styles before class change triggers transition
    requestAnimationFrame(function(){
      pn.classList.add('revealed');
    });
  }

  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }
    });
  }, {root: track, threshold:0.08});

  cards.forEach(function(el){ obs.observe(el); });

  // ── pg-name char animation: reveal on actual viewport visibility ──────────
  // Uses window scroll + track scroll events instead of IntersectionObserver
  // (root:track IO fires immediately before the section is in viewport)
  function isPgNameInViewport(pn){
    var r = pn.getBoundingClientRect();
    return r.top < window.innerHeight * 0.92 && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  }
  function checkPgNames(){
    pgNames.forEach(function(pn){
      if(!pn.classList.contains('revealed') && isPgNameInViewport(pn)){
        revealPgName(pn.closest('.hcard'));
      }
    });
  }
  window.addEventListener('scroll', checkPgNames, {passive:true});
  if(track) track.addEventListener('scroll', checkPgNames, {passive:true});

  // footer
  var footer = document.querySelector('footer');
  if(footer){
    var fobs = new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting){ footer.classList.add('in'); fobs.disconnect(); }
    }, {threshold:0.1});
    fobs.observe(footer);
  }

  // circle headline reveal — same char-fall animation as hero
  var circleHl = document.getElementById('circle-hl');
  if(circleHl){
    circleHl.querySelectorAll('.hl-inner').forEach(function(inner){ splitToChars(inner); });
    var cobs = new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting){
        cobs.disconnect();
        setTimeout(function(){ triggerCircleTextReveal(); }, 120);
      }
    }, {threshold:0.22});
    window.__disconnectCircleHlObserver = function(){
      try{ cobs.disconnect(); }catch(err){}
    };
    window.__armCircleHlObserver = function(){
      try{ cobs.disconnect(); }catch(err){}
      cobs.observe(circleHl);
    };
    cobs.observe(circleHl);
  }
})();



// ── Scroll compose: image parallax with preferred-framing lock ───────────────
// Each .hcard-img-inner pans ±maxPan px as it traverses the viewport,
// but converges to 0 (preferred crop) when the card is near viewport center.
(function(){
  var BREAK = 900;
  var MAX_PAN = 28;  // px of total image travel
  var SIGMA   = 200; // px — smaller = tighter lock at center

  var layers = [];

  function collect(){
    layers = [];
    document.querySelectorAll('.hcard-img-inner').forEach(function(el){
      el.style.transform = '';
      var r = l_rect(el);
      layers.push({ el: el, naturalTop: r.top + window.scrollY,
                    naturalH: r.height, cur: undefined });
    });
  }

  function l_rect(el){ return el.getBoundingClientRect(); }

  function settleOffset(mid){
    if(mid === 0) return 0;
    var s = mid > 0 ? 1 : -1;
    return s * MAX_PAN * (1 - Math.exp(-Math.abs(mid) / SIGMA));
  }

  var rafId = null;
  function doUpdate(){
    rafId = null;
    if(window.innerWidth <= BREAK){
      layers.forEach(function(l){ l.el.style.transform=''; l.cur=undefined; });
      return;
    }
    var scrollY = window.scrollY;
    var vH = window.innerHeight;
    var moving = false;
    layers.forEach(function(l){
      var mid    = (l.naturalTop + l.naturalH * 0.5) - scrollY - vH * 0.5;
      var target = settleOffset(mid);
      if(l.cur === undefined) l.cur = target;
      l.cur += (target - l.cur) * 0.1;
      l.el.style.transform = 'translateY(' + l.cur.toFixed(2) + 'px)';
      if(Math.abs(l.cur - target) > 0.05) moving = true;
    });
    if(moving) rafId = requestAnimationFrame(doUpdate);
  }

  function schedule(){ if(!rafId) rafId = requestAnimationFrame(doUpdate); }

  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', function(){
    if(window.innerWidth <= BREAK){
      layers.forEach(function(l){ l.el.style.transform=''; l.cur=undefined; }); return;
    }
    collect(); schedule();
  }, {passive:true});

  collect();
  schedule();
})();

// Belief “pin to top” (IO + smooth scrollTo + wheel hold) removed — it fought normal scroll toward the project strip/footer.

// ── Hero lines — scroll-triggered cinematic auto-exit + auto-reverse ─────────
// Down scroll = trigger forward: words exit, circle rises.
// Up scroll (after forward plays) = trigger reverse: words return, hero restores.
// Each direction is fully automatic after the first scroll gesture.
(function(){
  var scene = document.querySelector('.hero-scene');
  if(!scene) return;
  window.__heroReverseScrollActive = false;
  // Pauses intro word-cycling while the headline translateX slide-out is running.
  window.__heroWordCyclePaused = false;
  // Set false by IntersectionObserver on #hero-hl when headline is off-screen — word cycle idles.
  window.__heroWordCycleInView = true;

  var txL = [], txR = [], txLExit = [], txRExit = [];
  var measured  = false;
  var AUTO_DUR  = 2800; // ms

  // ── forward state ──
  var autoPlaying   = false;
  var autoHasPlayed = false;
  var autoStartTs   = null;
  var circleFired   = false;
  var dwellStart    = -1;   // timestamp when forward finishes (circle lands)

  // ── reverse state ──
  var revPlaying    = false;
  var lastScrollY   = -1;
  // Persist spread amount across measure() — resize clears transforms to sample layout but must
  // re-apply this or the headline snaps to center (z-index above circle) and overlaps PHASE2.
  var lastHeroE     = 0;
  var wordCycleResumeRaf = null;
  var reverseScrollGen = 0;
  var heroCharExitBegun = false;
  // Coalesce many scroll events in one frame into a single startReverse attempt (avoids repeated layout reads).
  var reverseScrollCheckRaf = null;
  var reverseScrollRefY     = -1;
  var REVERSE_SCROLL_INTENT_MIN = 6;
  var reverseBlockLogAt = 0;
  var revlockedSoftBlockLogAt = 0;
  var reverseRafBlockLogAt = 0;
  var heroTopStateLogAt = 0;
  var HERO_RESTORE_BAND_PX = 220;
  var heroRestoreIo = null;
  var heroRestoreIoTicking = false;
  // Scroll narrative (below → circle → hero): the page advances “beats” from scroll position + visibility,
  // not from counting wheel pixels. IO on #projects decides when the orange module is “on stage” enough to commit.
  var heroOrangeHoldActive      = false;
  var heroOrangeHoldScrollY     = 0;
  var heroOrangeUpConsumedFirstUp = false;
  var heroOrangeHoldAtMs        = 0;
  // Scrolling down toward cards: cannot blow through orange — snap to center, absorb one ↓ tick, then next ↓ continues.
  var heroOrangeDownHoldActive  = false;
  var heroOrangeDownHoldY       = 0;
  var heroOrangeDownConsumedFirstDown = false;
  var orangeBeatObserver        = null;
  var orangeIoPrevRatio         = 0;
  var orangeCenterCommitDone    = false;
  var ORANGE_ONSTAGE_RATIO      = 0.16; // #projects visible enough → system centers + hold (beat 2)

  function clearHeroCharExitState(){
    document.querySelectorAll('#hero-hl .hl-char').forEach(function(c){
      c.classList.remove('hl-char-exit');
      c.style.transitionDelay = '';
      c.style.removeProperty('--cd');
    });
  }

  // Re-run intro-style staggered fall-in from *above* (down into place). Snap off hl-char-exit first
  // so we never tween from translateY(1.15em) — that reads as rising; we want gravity ( −Y → 0 ).
  function replayHeroHeadlineFallIn(){
    var hl = document.getElementById('hero-hl');
    if(!hl || !measured) return;
    hl.style.visibility = 'visible';
    hl.classList.remove('revealed');
    clearHeroCharExitState();
    var chars = Array.from(hl.querySelectorAll('.hl-char:not(.hl-char--space)'));
    chars.forEach(function(ch){
      ch.style.setProperty('transition', 'none', 'important');
      ch.style.transform = 'translateY(-1.5em)';
      ch.style.opacity = '0';
      ch.style.transitionDelay = '';
      ch.style.removeProperty('--cd');
      ch.style.removeProperty('--cr');
    });
    void hl.offsetHeight;
    chars.forEach(function(ch){ ch.style.removeProperty('transition'); });
    staggerChars(chars);
    chars.forEach(function(ch){
      ch.style.removeProperty('transform');
      ch.style.removeProperty('opacity');
    });
    void hl.offsetHeight;
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        hl.classList.add('revealed');
      });
    });
  }

  // For reverse-complete we want a stable, non-animated end-state (no second "drop-in").
  function settleHeroHeadlineAtRest(){
    var hl = document.getElementById('hero-hl');
    if(!hl) return;
    var firstCharBefore = hl.querySelector('.hl-char:not(.hl-char--space)');
    var charCountBefore = hl.querySelectorAll('.hl-char:not(.hl-char--space)').length;
    var firstOpacityBefore = firstCharBefore ? Number(getComputedStyle(firstCharBefore).opacity || 0).toFixed(3) : null;
    hl.style.visibility = 'visible';
    clearHeroCharExitState();
    var chars = Array.from(hl.querySelectorAll('.hl-char:not(.hl-char--space)'));
    chars.forEach(function(ch){
      ch.style.transitionDelay = '';
      // Force visible end-state so top return never stays visually blank.
      ch.style.transform = 'translateY(0) rotate(0deg)';
      ch.style.opacity = '1';
      ch.style.removeProperty('transition');
      ch.style.removeProperty('--cd');
      ch.classList.remove('hl-char-exit');
    });
    // Ensure horizontal spread wrappers are reset even if state trackers desync.
    hl.querySelectorAll('.hl-spread-l, .hl-spread-r').forEach(function(sp){
      sp.style.transform = 'translateX(0px)';
    });
    hl.classList.add('revealed');
  }

  function maybeForceHeroRestoreFromTopBand(reason){
    var hl = document.getElementById('hero-hl');
    if(!hl) return;
    if(window.scrollY > HERO_RESTORE_BAND_PX) return;
    var firstChar = hl.querySelector('.hl-char:not(.hl-char--space)');
    var charCount = hl.querySelectorAll('.hl-char:not(.hl-char--space)').length;
    var firstOpacity = firstChar ? Number(getComputedStyle(firstChar).opacity || 0) : 1;
    var spreadHidden = lastHeroE > 0.08;
    var hiddenLike = getComputedStyle(hl).visibility !== 'visible' || !hl.classList.contains('revealed') || !firstChar || charCount === 0 || firstOpacity < 0.2 || spreadHidden;
    if(!hiddenLike) return;
    revPlaying = false;
    window.__heroReverseScrollActive = false;
    document.documentElement.style.overflow = '';
    lastHeroE = 0;
    applyE(0);
    autoHasPlayed = false;
    window.__heroAutoHasPlayed = false;
    window.__heroWordCyclePaused = false;
    settleHeroHeadlineAtRest();
  }

  // Same drop-through-clip motion as circle / cycle word — runs with horizontal spread.
  function staggerHeroHeadlineExit(){
    var hl = document.getElementById('hero-hl');
    if(!hl) return;
    var exits = Array.from(hl.querySelectorAll('.hl-char:not(.hl-char--space)'));
    exits.forEach(function(c, i){
      c.style.transitionDelay = '';
      setTimeout(function(){
        c.style.setProperty('--cd', (0.18 + Math.random() * 0.22).toFixed(2) + 's');
        c.classList.add('hl-char-exit');
      }, i * 20 + Math.random() * 55);
    });
  }

  function cancelHeroWordCycleResume(){
    if(wordCycleResumeRaf != null){
      cancelAnimationFrame(wordCycleResumeRaf);
      wordCycleResumeRaf = null;
    }
  }

  function isHeroHlSettledInViewport(){
    var hl = document.getElementById('hero-hl');
    if(!hl) return false;
    var r = hl.getBoundingClientRect();
    var ih = window.innerHeight;
    var pad = 12;
    if(r.height <= ih + pad * 2)
      return r.top >= -pad && r.bottom <= ih + pad;
    return r.top >= -pad && r.top <= ih * 0.38 && r.bottom > ih * 0.52;
  }

  // After reverse, keep cycling frozen until the headline is fully in view for 1s continuously.
  function scheduleHeroWordCycleResumeAfterReverse(){
    window.__heroWordCyclePaused = true;
    cancelHeroWordCycleResume();
    var dwellMs = 1000;
    var visibleSince = null;
    var deadline = performance.now() + 14000;
    function frame(now){
      if(now > deadline){
        window.__heroWordCyclePaused = false;
        wordCycleResumeRaf = null;
        return;
      }
      if(isHeroHlSettledInViewport()){
        if(visibleSince === null) visibleSince = now;
        else if(now - visibleSince >= dwellMs){
          window.__heroWordCyclePaused = false;
          wordCycleResumeRaf = null;
          return;
        }
      } else {
        visibleSince = null;
      }
      wordCycleResumeRaf = requestAnimationFrame(frame);
    }
    wordCycleResumeRaf = requestAnimationFrame(frame);
  }

  // If scroll is back at the top but the headline is still spread or char-exited, restore it.
  function reconcileHeroHeadlineAtRest(){
    maybeForceHeroRestoreFromTopBand('scroll-reconcile');
    if(revPlaying || autoPlaying || window.__heroReverseScrollActive) return;
    if(document.documentElement.style.overflow === 'hidden') return;
    // Wider near-top band: users often stop around 90–200px when returning from orange-only,
    // and hero should still recover there.
    if(window.scrollY > HERO_RESTORE_BAND_PX) return;
    hl = document.getElementById('hero-hl');
    if(!hl || !measured) return;
    // Right after forward completes, smooth-scroll to the circle may not have moved scrollY yet —
    // don't snap the headline home during that short window.
    if(autoHasPlayed && dwellStart > 0 && Date.now() - dwellStart < 1600 && window.scrollY < 80) return;
    var needsReset = lastHeroE > 0.03 || hl.querySelector('.hl-char-exit');
    if(!needsReset) return;
    lastHeroE = 0;
    heroCharExitBegun = false;
    applyE(0);
    autoHasPlayed = false;
    window.__heroAutoHasPlayed = false;
    window.__heroWordCyclePaused = false;
    lastScrollY = window.scrollY;
    settleHeroHeadlineAtRest();
  }

  function measure(){
    var elemsL = document.querySelectorAll('#hero-hl .hl-spread-l');
    var elemsR = document.querySelectorAll('#hero-hl .hl-spread-r');
    if(!elemsL.length && !elemsR.length) return;
    elemsL.forEach(function(el){ el.style.transform = ''; });
    elemsR.forEach(function(el){ el.style.transform = ''; });

    var heroEl   = document.querySelector('.hero');
    var heroRect = heroEl ? heroEl.getBoundingClientRect() : {left:0,right:window.innerWidth};
    var g        = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--g')) || 88;
    var vw       = window.innerWidth;

    txL = []; txLExit = [];
    elemsL.forEach(function(el){
      var r = el.getBoundingClientRect();
      txL.push((heroRect.left + g) - r.left);
      txLExit.push(-(r.right + 20));
    });
    txR = []; txRExit = [];
    elemsR.forEach(function(el){
      var r = el.getBoundingClientRect();
      txR.push((heroRect.right - g) - r.right);
      txRExit.push(vw - r.left + 20);
    });
    measured = true;
    applyE(lastHeroE);
    armOrangeBeatObserver();
    if(heroRestoreIo == null){
      var heroEl = document.querySelector('.hero');
      if(heroEl){
        heroRestoreIo = new IntersectionObserver(function(entries){
          var e = entries && entries[0];
          if(!e || !e.isIntersecting) return;
          if(heroRestoreIoTicking) return;
          heroRestoreIoTicking = true;
          requestAnimationFrame(function(){
            heroRestoreIoTicking = false;
            maybeForceHeroRestoreFromTopBand('hero-io');
          });
        }, {threshold:[0,0.08,0.16], rootMargin:'0px'});
        heroRestoreIo.observe(heroEl);
      }
    }
  }

  // Apply visual state at eased value e (0 = centered, 1 = fully off-screen)
  function applyE(e){
    lastHeroE = e;
    var elemsL = document.querySelectorAll('#hero-hl .hl-spread-l');
    var elemsR = document.querySelectorAll('#hero-hl .hl-spread-r');
    elemsL.forEach(function(el,i){ el.style.transform='translateX('+((txLExit[i]||0)*e).toFixed(1)+'px)'; });
    elemsR.forEach(function(el,i){ el.style.transform='translateX('+((txRExit[i]||0)*e).toFixed(1)+'px)'; });
  }

  // ── FORWARD ──────────────────────────────────────────────────
  function autoTick(now){
    if(!autoPlaying) return;
    if(autoStartTs === null) autoStartTs = now;
    var p = Math.min(1, (now - autoStartTs) / AUTO_DUR);

    if(!heroCharExitBegun){
      heroCharExitBegun = true;
      staggerHeroHeadlineExit();
    }

    // Start scroll-to-circle partway through the fall timeline.
    var CIRCLE_SCROLL_AT = 0.34;
    if(p >= CIRCLE_SCROLL_AT && !circleFired){
      circleFired = true;
      var cw = document.querySelector('.circle-sticky-wrap');
      if(cw){ window.scrollTo({top: Math.round(cw.getBoundingClientRect().top + window.scrollY), behavior:'smooth'}); }
    }

    if(p < 1){ requestAnimationFrame(autoTick); }
    else {
      autoPlaying = false; autoHasPlayed = true; window.__heroAutoHasPlayed = true; dwellStart = Date.now(); lastScrollY = window.scrollY;
      // Keep __heroWordCyclePaused true (set on wheel) so the orange word never swaps while scrolled past hero / until reverse resume.
    }
  }

  // ── REVERSE ──────────────────────────────────────────────────
  function startReverse(forced, skipOrangePinGate){
    if(revPlaying || autoPlaying || !autoHasPlayed || !measured){
      return;
    }
    var pinEl = document.getElementById('projects');
    var pt = pinEl ? pinEl.getBoundingClientRect().top : null;
    var vh = window.innerHeight;
    // Block reverse until the orange block sits low in the viewport (most of the frame is hero / content above).
    var pinGateMax = Math.min(vh - 16, vh * 0.88);
    var pinGateMin = Math.round(vh * 0.24);
    if(pinEl && !(forced && skipOrangePinGate)){
      if(pt >= pinGateMin && pt <= pinGateMax){
        return;
      }
    }
    var cwDocTop = 0;
    if(!forced){
      var cw = document.querySelector('.circle-sticky-wrap');
      cwDocTop = cw ? cw.getBoundingClientRect().top + window.scrollY : 0;
      if(window.scrollY > cwDocTop + 180){
        return;
      }
    }
    revPlaying = true;
    heroOrangeHoldActive = false;
    heroOrangeUpConsumedFirstUp = false;
    heroOrangeDownHoldActive = false;
    heroOrangeDownConsumedFirstDown = false;
    orangeCenterCommitDone = false;
    orangeIoPrevRatio = 0;
    heroCharExitBegun = false;
    clearHeroCharExitState();
    cancelHeroWordCycleResume();
    window.__heroWordCyclePaused = true;
    var scrollStart = window.scrollY;
    var spreadStart = lastHeroE;
    var scrollTs    = null;
    var SCROLL_DUR  = 780; // ms
    var myGen = ++reverseScrollGen;
    window.__heroReverseScrollActive = true;
    function scrollStep(now){
      if(myGen !== reverseScrollGen) return;
      if(scrollTs === null) scrollTs = now;
      var t    = Math.min(1, (now - scrollTs) / SCROLL_DUR);
      var ease = 1 - Math.pow(1 - t, 4.2); // ease-out — gentler tail than cubic
      window.scrollTo({top: Math.round(scrollStart * (1 - ease)), behavior:'instant'});
      applyE(spreadStart * (1 - ease));
      if(t < 1){ requestAnimationFrame(scrollStep); }
      else {
        if(myGen !== reverseScrollGen) return;
        window.scrollTo({top: 0, behavior:'instant'});
        applyE(0);
        revPlaying    = false;
        autoHasPlayed = false;
        window.__heroAutoHasPlayed = false;
        window.__heroReverseScrollActive = false;
        if(window.__circleReset) window.__circleReset();
        settleHeroHeadlineAtRest();
        scheduleHeroWordCycleResumeAfterReverse();
      }
    }
    requestAnimationFrame(scrollStep);
  }

  function dwellEndFromScroll(scrollY){
    var cw = document.querySelector('.circle-sticky-wrap');
    if(!cw) return Infinity;
    var cdt = cw.getBoundingClientRect().top + scrollY;
    var dw = Math.max(cw.offsetHeight || 0, window.innerHeight);
    return cdt + dw + 48;
  }

  function onOrangeBeatIo(entries){
    var e = entries[0];
    if(!e || !measured || !autoHasPlayed || revPlaying || autoPlaying) return;
    if(document.documentElement.style.overflow === 'hidden') return;
    var y = window.scrollY;
    var dwellEnd = dwellEndFromScroll(y);
    if(y > dwellEnd + 220) orangeCenterCommitDone = false;
    var r = e.isIntersecting ? e.intersectionRatio : 0;
    if(heroOrangeHoldActive || heroOrangeDownHoldActive || y <= dwellEnd){
      orangeIoPrevRatio = r;
      return;
    }
    if(!orangeCenterCommitDone && orangeIoPrevRatio < ORANGE_ONSTAGE_RATIO && r >= ORANGE_ONSTAGE_RATIO){
      var snapY = centerOrangeSnapY(y);
      if(snapY != null){
        orangeCenterCommitDone = true;
        applyOrangeCenterHold(snapY);
      }
    }
    orangeIoPrevRatio = r;
  }

  function armOrangeBeatObserver(){
    var el = document.getElementById('projects');
    if(!el) return;
    if(orangeBeatObserver) orangeBeatObserver.disconnect();
    orangeBeatObserver = new IntersectionObserver(onOrangeBeatIo, {
      root: null,
      rootMargin: '0px',
      threshold: [0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.26, 0.34, 0.42, 0.52, 0.65, 0.78, 1]
    });
    orangeBeatObserver.observe(el);
  }

  // Vertically center #projects for current layout (works inside or outside circle dwell — for catch + snap).
  function centerOrangeViewportSnapY(scrollY){
    var pinEl = document.getElementById('projects');
    if(!pinEl) return null;
    var vh = window.innerHeight;
    var pr = pinEl.getBoundingClientRect();
    if(pr.bottom < 72 || pr.top > vh + 50) return null;
    var delta = (pr.top + pr.height * 0.5) - vh * 0.5;
    var snapY = Math.round(scrollY + delta);
    var maxY = Math.max(0, document.documentElement.scrollHeight - vh);
    if(snapY > maxY) snapY = maxY;
    if(snapY < 0) snapY = 0;
    return snapY;
  }

  function applyOrangeDownHold(snapY){
    if(reverseScrollCheckRaf != null){
      cancelAnimationFrame(reverseScrollCheckRaf);
      reverseScrollCheckRaf = null;
      reverseScrollRefY = -1;
    }
    heroOrangeHoldActive = false;
    heroOrangeDownHoldActive = true;
    heroOrangeDownConsumedFirstDown = false;
    heroOrangeDownHoldY = snapY;
    window.scrollTo({top: snapY, behavior: 'instant'});
    lastScrollY = window.scrollY;
    reconcileHeroHeadlineAtRest();
  }

  // Document scrollY that vertically centers #projects in the viewport (only when still “below” circle dwell).
  function centerOrangeSnapY(curScrollY){
    var pinEl = document.getElementById('projects');
    var cw = document.querySelector('.circle-sticky-wrap');
    if(!pinEl || !cw) return null;
    var vh = window.innerHeight;
    var pr = pinEl.getBoundingClientRect();
    var cdt = cw.getBoundingClientRect().top + curScrollY;
    var dw = Math.max(cw.offsetHeight || 0, vh);
    var dwellEnd = cdt + dw + 48;
    if(curScrollY <= dwellEnd) return null;
    if(pr.bottom < vh * 0.26 || pr.top > vh * 0.88) return null;
    var delta = (pr.top + pr.height * 0.5) - vh * 0.5;
    var snapY = Math.round(curScrollY + delta);
    var maxY = Math.max(0, document.documentElement.scrollHeight - vh);
    if(snapY > maxY) snapY = maxY;
    if(snapY < 0) snapY = 0;
    return snapY;
  }

  function applyOrangeCenterHold(snapY){
    if(reverseScrollCheckRaf != null){
      cancelAnimationFrame(reverseScrollCheckRaf);
      reverseScrollCheckRaf = null;
      reverseScrollRefY = -1;
    }
    if(Math.abs(window.scrollY - snapY) > 2){ window.scrollTo({top: snapY, behavior: 'instant'}); }
    heroOrangeDownHoldActive = false;
    heroOrangeDownConsumedFirstDown = false;
    heroOrangeUpConsumedFirstUp = false;
    heroOrangeHoldAtMs = performance.now();
    heroOrangeHoldScrollY = window.scrollY;
    heroOrangeHoldActive = true;
    lastScrollY = window.scrollY;
    reconcileHeroHeadlineAtRest();
  }

  // ── WHEEL: forward trigger (down) ────────────────────────────
  window.addEventListener('wheel', function(ev){
    if(!measured) return;
    if(ev.deltaY > 0 && !autoPlaying && !autoHasPlayed && !revPlaying){
      cancelHeroWordCycleResume();
      window.__heroWordCyclePaused = true;
      clearHeroCharExitState();
      heroCharExitBegun = false;
      applyE(0);
      autoPlaying = true; circleFired = false; autoStartTs = null;
      requestAnimationFrame(autoTick);
    }
  }, {passive:true});

  // ── SCROLL: reverse trigger (first upward movement after forward played) ───
  window.addEventListener('scroll', function(){
    var cur = window.scrollY;
    // Reverse-from-forward only when those gates pass; lastScrollY must still track always.
    var canReverse = measured && !autoPlaying && !revPlaying && autoHasPlayed;
    if(canReverse && document.documentElement.style.overflow !== 'hidden'){
      var cwGate = document.querySelector('.circle-sticky-wrap');
      if(cwGate && lastScrollY >= 0){
        var vhG = window.innerHeight;
        var cdtG = cwGate.getBoundingClientRect().top + cur;
        var dwG = Math.max(cwGate.offsetHeight || 0, vhG);
        var dwellEndG = cdtG + dwG + 48;

        if(heroOrangeDownHoldActive){
          if(cur > heroOrangeDownHoldY + Math.round(vhG * 0.75)){
            heroOrangeDownHoldActive = false;
            heroOrangeDownConsumedFirstDown = false;
            lastScrollY = cur;
            reconcileHeroHeadlineAtRest();
            return;
          } else if(cur < lastScrollY){
            heroOrangeDownHoldActive = false;
            heroOrangeDownConsumedFirstDown = false;
          } else if(cur > lastScrollY){
            if(!heroOrangeDownConsumedFirstDown){
              heroOrangeDownConsumedFirstDown = true;
              window.scrollTo({top: heroOrangeDownHoldY, behavior: 'instant'});
              lastScrollY = window.scrollY;
              reconcileHeroHeadlineAtRest();
              return;
            }
            heroOrangeDownHoldActive = false;
            heroOrangeDownConsumedFirstDown = false;
          }
        } else if(!heroOrangeHoldActive && cur > lastScrollY && cur <= dwellEndG + Math.round(vhG * 0.35) + 120){
          var dDown = cur - lastScrollY;
          var blewPast = lastScrollY <= dwellEndG + 100 && cur > dwellEndG + 55 && dDown >= 18;
          var bigJump = lastScrollY < dwellEndG + 140 && cur > dwellEndG + 70 && (dDown > vhG * 0.2 || dDown > 260);
          var leftDwellInOne = lastScrollY >= cdtG - 120 && lastScrollY <= dwellEndG + 35 && cur > dwellEndG + 85;
          if(blewPast || bigJump || leftDwellInOne){
            var maxUpPx = Math.min(300, Math.round(vhG * 0.34));
            var snapCatch = centerOrangeViewportSnapY(cur);
            if(snapCatch == null){ snapCatch = centerOrangeViewportSnapY(lastScrollY); }
            if(snapCatch == null && cur <= dwellEndG + 260){
              var fb = Math.round(dwellEndG - vhG * 0.42);
              if(fb >= Math.max(0, cdtG - 80) && fb < cur){ snapCatch = fb; }
            }
            if(snapCatch != null && cur - snapCatch <= maxUpPx){
              applyOrangeDownHold(snapCatch);
              return;
            }
          }
        }
      }

      if(lastScrollY >= 0 && heroOrangeHoldActive){
        if(cur > lastScrollY + 6){
          heroOrangeHoldActive = false;
          heroOrangeUpConsumedFirstUp = false;
        } else if(cur < lastScrollY){
          if(reverseScrollCheckRaf != null){
            cancelAnimationFrame(reverseScrollCheckRaf);
            reverseScrollCheckRaf = null;
            reverseScrollRefY = -1;
          }
          if(!heroOrangeUpConsumedFirstUp){
            heroOrangeUpConsumedFirstUp = true;
            window.scrollTo({top: heroOrangeHoldScrollY, behavior: 'instant'});
            lastScrollY = window.scrollY;
            reconcileHeroHeadlineAtRest();
            return;
          }
          if(performance.now() - heroOrangeHoldAtMs < 180){
            window.scrollTo({top: heroOrangeHoldScrollY, behavior: 'instant'});
            lastScrollY = window.scrollY;
            reconcileHeroHeadlineAtRest();
            return;
          }
          heroOrangeHoldActive = false;
          heroOrangeUpConsumedFirstUp = false;
          startReverse(true, true);
          lastScrollY = window.scrollY;
          reconcileHeroHeadlineAtRest();
          return;
        }
      }

      if(!heroOrangeHoldActive && lastScrollY >= 0 && cur < lastScrollY){
        if(reverseScrollCheckRaf == null){
          reverseScrollRefY = lastScrollY;
          reverseScrollCheckRaf = requestAnimationFrame(function(){
            reverseScrollCheckRaf = null;
            var y = window.scrollY;
            var refPeak = reverseScrollRefY;
            reverseScrollRefY = -1;
            if(!measured || autoPlaying || revPlaying || !autoHasPlayed || document.documentElement.style.overflow === 'hidden' || refPeak < 0 || y >= refPeak) return;
            if(refPeak - y < REVERSE_SCROLL_INTENT_MIN){
              return;
            }
            var cwSkip = document.querySelector('.circle-sticky-wrap');
            if(cwSkip){
              var cdt2 = cwSkip.getBoundingClientRect().top + y;
              var dw2 = Math.max(cwSkip.offsetHeight || 0, window.innerHeight);
              if(refPeak > cdt2 + dw2 + 48){
                return;
              }
              if(performance.now() - heroOrangeHoldAtMs < 600 && refPeak > cdt2 + dw2 - 120){
                return;
              }
            }
            startReverse(false);
          });
        } else {
          reverseScrollRefY = Math.max(reverseScrollRefY, lastScrollY);
        }
      }
    }
    lastScrollY = cur;
    // Must run even when autoHasPlayed is false (e.g. after reverse completes) — otherwise
    // reconcileHeroHeadlineAtRest never runs and a stuck headline at the top cannot self-heal.
    reconcileHeroHeadlineAtRest();
  }, {passive:true});

  window.addEventListener('resize', function(){
    measured = false;
    requestAnimationFrame(function(){ requestAnimationFrame(measure); });
  });

  document.addEventListener('heroRevealed', function(){
    requestAnimationFrame(function(){ requestAnimationFrame(measure); });
  }, {once: true});
})();

// ── Circle section — rise-up entrance (time-based rAF on inner lift, not sticky) ───
(function(){
  var circleWrap = document.querySelector('.circle-sticky-wrap');
  var lift       = document.getElementById('circle-section-lift');
  if(!circleWrap || !lift) return;
  var done = false;
  var riseStartTs = null;
  var RISE_MS     = 1250;
  var riseRaf     = null;
  // Hysteresis around tTop vs vh stops sub-pixel scroll / compositing from flipping lift transform.
  var VH_HYST     = 32;
  var liftHeldBelow = false;

  function slidePx(){
    return Math.min(280, Math.round(window.innerHeight * 0.32));
  }

  function stopRiseRaf(){
    if(riseRaf != null){ cancelAnimationFrame(riseRaf); riseRaf = null; }
  }

  function riseLoop(){
    riseRaf = null;
    if(window.__heroReverseScrollActive){
      riseStartTs = null;
      lift.style.transform = '';
      return;
    }

    var rect = circleWrap.getBoundingClientRect();
    var vh   = window.innerHeight;
    var spx  = slidePx();
    var tTop = rect.top;

    // Circle fully above viewport (no vertical intersection); avoids lift toggling on slivers/overscroll.
    if(rect.bottom < 1){
      riseStartTs = null;
      lift.style.transform = '';
      done = true;
      liftHeldBelow = false;
      return;
    }

    if(tTop >= vh + VH_HYST){
      done = false;
      riseStartTs = null;
      liftHeldBelow = true;
      lift.style.transform = 'translateY(' + spx + 'px)';
      return;
    }

    if(riseStartTs === null)
      riseStartTs = performance.now();

    var u = Math.min(1, (performance.now() - riseStartTs) / RISE_MS);
    var ease = 1 - Math.pow(1 - u, 2.05);
    lift.style.transform = 'translateY(' + ((1 - ease) * spx).toFixed(1) + 'px)';

    if(u < 1){
      riseRaf = requestAnimationFrame(riseLoop);
    } else {
      lift.style.transform = '';
      done = true;
      riseStartTs = null;
    }
  }

  function tick(){
    if(window.__heroReverseScrollActive){
      stopRiseRaf();
      riseStartTs = null;
      lift.style.transform = '';
      liftHeldBelow = false;
      return;
    }

    var rect = circleWrap.getBoundingClientRect();
    var vh   = window.innerHeight;
    var tTop = rect.top;
    var spx  = slidePx();

    if(rect.bottom < 1){
      stopRiseRaf();
      riseStartTs = null;
      lift.style.transform = '';
      done = true;
      liftHeldBelow = false;
      return;
    }

    if(tTop >= vh + VH_HYST){
      stopRiseRaf();
      done = false;
      riseStartTs = null;
      liftHeldBelow = true;
      lift.style.transform = 'translateY(' + spx + 'px)';
      return;
    }

    if(liftHeldBelow && tTop >= vh - VH_HYST){
      stopRiseRaf();
      lift.style.transform = 'translateY(' + spx + 'px)';
      return;
    }
    liftHeldBelow = false;

    if(!done && riseRaf === null)
      riseRaf = requestAnimationFrame(riseLoop);
  }

  window.addEventListener('scroll', tick, {passive:true});
  window.addEventListener('resize', tick, {passive:true});
  tick();
})();

// ── Nav anchor scroll (always re-scrolls even if hash unchanged) ──────────
(function(){
  document.querySelectorAll('.n-link[href^="#"]').forEach(function(link){
    link.addEventListener('click', function(e){
      var hash   = this.getAttribute('href');
      var target = document.querySelector(hash);
      if(!target) return;
      e.preventDefault();

      // Temporarily clear any parallax transform to read the true layout position.
      // scrollIntoView uses the VISUAL position (including transforms) which causes
      // the parallax to misalign after scroll. Using window.scrollTo with the natural
      // layout Y avoids this entirely.
      var savedTransform = target.style.transform;
      target.style.transform = '';
      var naturalScrollY = Math.round(target.getBoundingClientRect().top + window.scrollY);
      target.style.transform = savedTransform;

      // For sections shorter than the viewport, offset scroll so the section is centered.
      var sectionH = target.offsetHeight;
      var vH       = window.innerHeight;
      var centerOffset = sectionH < vH ? Math.round((vH - sectionH) / 2) : 0;
      var targetScrollY = Math.max(0, naturalScrollY - centerOffset);

      window.scrollTo({top: targetScrollY, behavior:'smooth'});
    });
  });
})();

// ── Wordmark 8-body physics (SVG user-unit space) ────────────
(function(){
  var svgEl   = document.querySelector('.wordmark-svg-physics');
  var letters = svgEl ? svgEl.querySelectorAll('.wm-l') : [];
  if(!letters.length) return;

  var VW = 2297, VH = 413;

  // Rest centers = visual center of each letter in SVG user units.
  // OURO at y+90 offset: O1(0-330,y90-420)→cx=165,cy=255; U(329-548,y90-405)→cx=439,cy=248;
  //   R(658-843,y90-406)→cx=737,cy=248; O2(829-1159,y90-420)→cx=994,cy=255
  // LABS: L(1259-1370,y0-426)→cx=1315,cy=213;
  //   A(1370-1700,y94-424)→cx=1535,cy=259; (shifted +94 from individual svg top)
  //   B(1696-2026,y0-433)→cx=1861,cy=217;
  //   S(1991-2297,y93-424)→cx=2144,cy=259; (shifted +93 from individual svg top)
  var rests = [
    [165,  255],  // O1
    [329+165, 98+158],  // U
    [658+92,  98+158],  // R
    [994,  255],  // O2
    [1315, 213],  // L  (1259 + 56)
    [1535, 259],  // A  (1370+165, 94+165)
    [1861, 217],  // B  (1696+165, 0+217)
    [2144, 259],  // S  (1991+153, 93+166)
  ];

  var SPRING    = 0.035;
  var DAMP      = 0.88;
  var REPEL     = 70000;
  var MAX_F     = 18;
  var RADIUS_PX = 200;

  var mx = -99999, my = -99999;
  document.addEventListener('mousemove', function(e){ mx = e.clientX; my = e.clientY; });

  var states = Array.from(letters).map(function(el, i){
    return { el:el, x:0, y:0, vx:0, vy:0, rest:rests[i] };
  });


  (function tick(){
    requestAnimationFrame(tick);
    var r  = svgEl.getBoundingClientRect();
    var vb  = svgEl.viewBox.baseVal;
    var sx  = r.width  / (vb.width  || VW);
    var sy  = r.height / (vb.height || VH);
    var mxS = (mx - r.left) / sx + (vb.x || 0);
    var myS = (my - r.top)  / sy + (vb.y || 0);

    states.forEach(function(s){
      var cx = s.rest[0] + s.x;
      var cy = s.rest[1] + s.y;
      var dx   = mxS - cx;
      var dy   = myS - cy;
      var dist = Math.sqrt(dx*dx + dy*dy);
      var radS = RADIUS_PX / sx;
      var fx = 0, fy = 0;
      if(dist < radS && dist > 0.5){
        var mag = Math.min(REPEL / (dist * dist), MAX_F);
        fx = -(dx / dist) * mag;
        fy = -(dy / dist) * mag;
      }
      fx -= SPRING * s.x;
      fy -= SPRING * s.y;
      s.vx = (s.vx + fx) * DAMP;
      s.vy = (s.vy + fy) * DAMP;
      s.x += s.vx;
      s.y += s.vy;
      s.el.setAttribute('transform', 'translate(' + s.x.toFixed(1) + ',' + s.y.toFixed(1) + ')');
    });
  })();
})();

// ── Wordmark video clip (physics-aware) ──────────────────────
(function(){
  var svgEl  = document.querySelector('.wordmark-svg-physics');
  var canvas = document.getElementById('wm-vid-canvas');
  if(!svgEl || !canvas) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var VW = 2297, VH = 413;
  var TOP_PAD_CSS = 160;
  var BOTTOM_PAD_CSS = 0;

  // Static inner offsets for each letter (matches the inner <g transform>)
  var statics = [
    {sx:0,    sy:90},   // O1
    {sx:329,  sy:98},   // U
    {sx:658,  sy:98},   // R
    {sx:829,  sy:90},   // O2
    {sx:1259, sy:0,  isRect:true, rw:111, rh:426},  // L
    {sx:1370, sy:94},   // A
    {sx:1696, sy:0},    // B
    {sx:1991, sy:93},   // S
  ];

  // Pre-build Path2D from each letter's SVG path data
  var wml = svgEl.querySelectorAll('.wm-l');
  var paths = Array.from(wml).map(function(el, i){
    if(statics[i].isRect) return null;
    var p = el.querySelector('path');
    return p ? new Path2D(p.getAttribute('d')) : null;
  });

  // Hidden video
  var vid = document.createElement('video');
  vid.src = 'bg.mp4';
  vid.autoplay = true; vid.muted = true; vid.loop = true;
  vid.playsInline = true; vid.setAttribute('playsinline','');
  vid.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
  svgEl.parentElement.appendChild(vid);
  vid.play().catch(function(){});

  /* Drop empty slack below the letterforms (scaled viewBox height). */
  var VB_BOTTOM_TRIM = 52;

  function resize(){
    var r = svgEl.getBoundingClientRect();
    if(r.width <= 0 || r.height <= 0) return;
    var gPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--g')) || 88;
    var eff  = Math.max(r.width - 2 * gPx, r.width * 0.4);
    var sc   = r.width / eff;
    var minX = -(gPx * VW / eff);
    var vbH  = Math.max(220, VH * sc - VB_BOTTOM_TRIM);
    svgEl.setAttribute('viewBox', minX.toFixed(1) + ' 0 ' + (VW * sc).toFixed(1) + ' ' + vbH.toFixed(1));
    r = svgEl.getBoundingClientRect();
    if(r.width <= 0 || r.height <= 0) return;
    var totalH = r.height + TOP_PAD_CSS + BOTTOM_PAD_CSS;
    canvas.width  = Math.round(r.width  * dpr);
    canvas.height = Math.round(totalH * dpr);
    canvas.style.width  = r.width  + 'px';
    canvas.style.height = totalH + 'px';
    canvas.style.top    = -TOP_PAD_CSS + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('load', resize);
  setTimeout(resize, 100);
  setTimeout(resize, 600);

  // Offscreen mask canvas — all letter shapes drawn here with source-over,
  // then applied once as a single destination-in to the main canvas.
  var maskCanvas = document.createElement('canvas');
  var mctx = maskCanvas.getContext('2d');

  (function frame(){
    requestAnimationFrame(frame);
    if(vid.readyState < 2 || !canvas.width) return;

    var cw = canvas.width, ch = canvas.height;
    var pw = cw / dpr;
    var ph_svg = ch / dpr - TOP_PAD_CSS - BOTTOM_PAD_CSS; // maps to SVG layout height
    var vb = svgEl.viewBox.baseVal;
    var vbW = vb.width  || VW, vbH = vb.height || VH, vbX = vb.x || 0;
    var scaleX = pw / vbW, scaleY = ph_svg / vbH;

    // Sync offscreen mask size
    if(maskCanvas.width !== cw || maskCanvas.height !== ch){
      maskCanvas.width = cw; maskCanvas.height = ch;
    }

    // 1. Build letter mask on offscreen canvas (all shapes source-over)
    mctx.clearRect(0, 0, cw, ch);
    mctx.save();
    mctx.scale(dpr, dpr);
    mctx.fillStyle = '#DDDBD6';
    Array.from(wml).forEach(function(el, i){
      var t  = el.getAttribute('transform') || 'translate(0,0)';
      var m  = t.match(/translate\(([^,]+),([^)]+)\)/);
      var dx = m ? parseFloat(m[1]) : 0;
      var dy = m ? parseFloat(m[2]) : 0;
      var tx = (statics[i].sx + dx - vbX) * scaleX;
      var ty = (statics[i].sy + dy) * scaleY + TOP_PAD_CSS;
      mctx.save();
      mctx.translate(tx, ty);
      if(statics[i].isRect){
        mctx.fillRect(0, 0, statics[i].rw * scaleX, statics[i].rh * scaleY);
      } else if(paths[i]){
        mctx.scale(scaleX, scaleY);
        mctx.fill(paths[i]);
      }
      mctx.restore();
    });
    mctx.restore();

    // 2. Draw orange base + video across full canvas (top pad + SVG band + bottom pad)
    var ph_total = ch / dpr;
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FF1B00';
    ctx.fillRect(0, 0, pw, ph_total);

    // 3. Video with difference blend at 50% opacity — cover full canvas
    var vw = vid.videoWidth || pw, vh2 = vid.videoHeight || ph_svg;
    var s  = Math.max(pw / vw, ph_total / vh2);
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'difference';
    ctx.drawImage(vid, (pw - vw*s)/2, (ph_total - vh2*s)/2, vw*s, vh2*s);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // 4. Apply mask in a single destination-in pass
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  })();
})();

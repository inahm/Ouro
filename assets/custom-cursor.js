(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var root = document.getElementById("custom-cursor-root");
  var ring = root && root.querySelector(".custom-cursor__ring");
  var dot = root && root.querySelector(".custom-cursor__dot");
  var arrow = root && root.querySelector(".custom-cursor__arrow");
  if (!root || !ring || !dot) return;
  var ctx = ring.getContext("2d");
  if (!ctx) return;

  document.documentElement.classList.add("custom-cursor--active");

  var mx = window.innerWidth * 0.5;
  var my = window.innerHeight * 0.5;
  var dx = mx,
    dy = my;
  var posEase = 0.4;
  var ticking = false;
  var visible = false;
  var lastHover = false;
  var ringRaf = null;
  var ringAngle = 0;
  var hcardArrowRotDeg = 0;
  var ringDpr = 1;
  var ringLogical = 64;
  var particleCount = 32;
  var particleRadius = 25;
  var spinSpeed = 0.01;

  function applyRingDpr() {
    ringDpr = Math.min(window.devicePixelRatio || 1, 2);
    ring.width = ringLogical * ringDpr;
    ring.height = ringLogical * ringDpr;
    ctx.setTransform(ringDpr, 0, 0, ringDpr, 0, 0);
  }
  applyRingDpr();
  window.addEventListener("resize", applyRingDpr, { passive: true });

  /** One ring, three shape kinds - same rhythm as the torus dots (round) + wordmark (square rect on R) + triadic accent (△). */
  function drawRotatingRing() {
    var cx = ringLogical * 0.5;
    var cy = ringLogical * 0.5;
    var i, a, r, pr, x, y, kind, s, Rtri, v, ta, px, py;
    ctx.clearRect(0, 0, ringLogical, ringLogical);
    for (i = 0; i < particleCount; i++) {
      a = (i / particleCount) * (Math.PI * 2) + ringAngle;
      r = particleRadius;
      pr = 0.9 + (i % 4) * 0.32;
      x = cx + Math.cos(a) * r;
      y = cy + Math.sin(a) * r;
      kind = i % 3;
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.7 + (i % 3) * 0.1;
      if (kind === 0) {
        /* Match torus / second-hl / third-act: filled circular nodes (~SP_DOT_R / TP_DOT_R) */
        ctx.beginPath();
        ctx.arc(x, y, pr, 0, Math.PI * 2);
        ctx.fill();
      } else {
        /* Square + triangle roll on the same arc (tangent = forward along rotation) */
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI * 0.5);
        if (kind === 1) {
          s = 1.75 * pr;
          ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
        } else {
          Rtri = pr * 1.22;
          ctx.beginPath();
          for (v = 0; v < 3; v++) {
            ta = (v / 3) * Math.PI * 2 - Math.PI * 0.5;
            px = Rtri * Math.cos(ta);
            py = Rtri * Math.sin(ta);
            if (v === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function startRingAnim() {
    if (ringRaf != null) return;
    function loop() {
      if (!root.classList.contains("custom-cursor--hover") || !visible) {
        ringRaf = null;
        ctx.setTransform(ringDpr, 0, 0, ringDpr, 0, 0);
        ctx.clearRect(0, 0, ringLogical, ringLogical);
        return;
      }
      ringAngle -= spinSpeed;
      drawRotatingRing();
      ringRaf = requestAnimationFrame(loop);
    }
    ringRaf = requestAnimationFrame(loop);
  }

  function stopRingAnim() {
    if (ringRaf != null) {
      cancelAnimationFrame(ringRaf);
      ringRaf = null;
    }
    ctx.setTransform(ringDpr, 0, 0, ringDpr, 0, 0);
    ctx.clearRect(0, 0, ringLogical, ringLogical);
  }

  function setTransforms(hover) {
    var t = "translate3d(" + dx + "px," + dy + "px,0) translate(-50%,-50%)";
    ring.style.transform = t;
    dot.style.transform = t;
    if (arrow) {
      var at = t;
      if (hcardArrowRotDeg) at += " rotate(" + hcardArrowRotDeg + "deg)";
      arrow.style.transform = at;
    }
    if (hover !== undefined) {
      var now = !!hover;
      root.classList.toggle("custom-cursor--hover", now);
      if (now && !lastHover) startRingAnim();
      if (!now && lastHover) stopRingAnim();
      lastHover = now;
    }
  }

  function hitIsInteractive(x, y) {
    var n = document.elementFromPoint(x, y);
    if (!n) return false;
    if (n.closest) {
      return !!n.closest(
        'a[href], button, input, textarea, select, [role="button"], [data-cursor-hover], label[for], summary',
      );
    }
    return false;
  }

  function hcardOpenElsewhereInStrip() {
    return !!document.querySelector("#projects .hcard--expanded");
  }

  function syncHcardCursorClass(isInteractive) {
    var el = document.elementFromPoint(mx, my);
    var card =
      el && el.closest && el.closest(".scroll-intro-continuation .hcard");
    var onH = !!card;
    var expanded = !!(card && card.classList.contains("hcard--expanded"));
    /* Circle on every card until one is expanded; then arrow on collapsed cards only. */
    var showArrow =
      onH && !expanded && !isInteractive && hcardOpenElsewhereInStrip();
    hcardArrowRotDeg = 0;
    if (showArrow && card) {
      var open = document.querySelector("#projects .hcard--expanded");
      if (open && open !== card) {
        var list = document.querySelectorAll("#projects .hcard");
        var iH = -1,
          iE = -1,
          i;
        for (i = 0; i < list.length; i++) {
          if (list[i] === card) iH = i;
          if (list[i] === open) iE = i;
        }
        if (iH >= 0 && iE >= 0) {
          /* Hovered card left of open → point left (strip scrolls left); right → point right. */
          hcardArrowRotDeg = iH < iE ? 180 : 0;
        }
      }
    }
    document.documentElement.classList.toggle("custom-cursor--hcard", onH);
    document.documentElement.classList.toggle(
      "custom-cursor--hcard-interactive",
      onH && !!isInteractive,
    );
    document.documentElement.classList.toggle(
      "custom-cursor--hcard-arrow",
      showArrow,
    );
  }

  function tick() {
    dx += (mx - dx) * posEase;
    dy += (my - dy) * posEase;
    var hover = hitIsInteractive(mx, my);
    syncHcardCursorClass(hover);
    setTransforms(hover);
    var moving = Math.abs(mx - dx) > 0.04 || Math.abs(my - dy) > 0.04;
    if (moving) {
      requestAnimationFrame(tick);
    } else {
      ticking = false;
    }
  }

  function onMove(e) {
    mx = e.clientX;
    my = e.clientY;
    if (!visible) {
      visible = true;
      root.classList.add("custom-cursor--visible");
    }
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  function onScroll() {
    var h = hitIsInteractive(mx, my);
    syncHcardCursorClass(h);
    if (!ticking) {
      setTransforms(h);
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  function syncHcardFromPointerAfterUi() {
    var h = hitIsInteractive(mx, my);
    syncHcardCursorClass(h);
    setTransforms(h);
  }
  /* Expand/collapse without moving the mouse: refresh cursor (arrow vs circle). */
  document.addEventListener("click", syncHcardFromPointerAfterUi, {
    capture: true,
    passive: true,
  });
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key === "Escape")
        requestAnimationFrame(syncHcardFromPointerAfterUi);
    },
    { capture: true, passive: true },
  );

  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.documentElement.addEventListener("mouseleave", function () {
    root.classList.remove("custom-cursor--visible", "custom-cursor--hover");
    document.documentElement.classList.remove(
      "custom-cursor--hcard",
      "custom-cursor--hcard-interactive",
      "custom-cursor--hcard-arrow",
    );
    hcardArrowRotDeg = 0;
    visible = false;
    lastHover = false;
    stopRingAnim();
  });
  document.documentElement.addEventListener("mouseenter", function () {
    root.classList.add("custom-cursor--visible");
    visible = true;
  });

  setTransforms(false);
})();

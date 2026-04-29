/**
 * Nota card icon tween — parametric capsule blend between two authored SVG silhouettes.
 *
 * Every shape in the start group and the target group is a capsule (stadium) — a rounded
 * rectangle whose corner radius is min(w, h) / 2 (so a square capsule is a circle). We extract
 * (cx, cy, w, h) from each path's bbox and tween those four numbers, then re-emit a clean
 * capsule `d` per frame. This avoids point-sample shearing/pinching: a tall pillar smoothly
 * shortens and resolves into a circle (or shorter capsule) without warping at the midpoint.
 *
 * Pairing: paths are paired across start ↔ target by centroid sort (x, then y). The hand-
 * authored SVG ordering aligns visually after that sort (left edge → right edge, top → bottom),
 * so each start capsule maps to its intended target capsule.
 *
 * Lab / tuning: optional `window.NOTA_MORPH_LAB` before this script loads, e.g.
 * { durationMs, holdBeforeMorphMs, staggerMs, midpointHoldMs, skipViewportGate, loopReplayMs }.
 * `midpointHoldMs > 0` holds the halfway blend (50% interpolated capsule params) before finishing.
 */
(function () {
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotionQuery.matches) return;

  var LAB =
    typeof window !== "undefined" &&
    window.NOTA_MORPH_LAB &&
    typeof window.NOTA_MORPH_LAB === "object"
      ? window.NOTA_MORPH_LAB
      : {};
  var holdBeforeMorphMs =
    typeof LAB.holdBeforeMorphMs === "number" ? LAB.holdBeforeMorphMs : 180;
  var durationMs =
    typeof LAB.durationMs === "number" ? LAB.durationMs : 1180;
  var staggerMs = typeof LAB.staggerMs === "number" ? LAB.staggerMs : 38;
  /* Hold this many ms once each path reaches the 50% blend (spatial midpoint). 0 (default) = single-phase tween. */
  var midpointHoldMs =
    typeof LAB.midpointHoldMs === "number" ? LAB.midpointHoldMs : 0;

  var svg = document.querySelector(".hcard-visual-inner--nota .nota-morph-svg");
  if (!svg) return;

  var startLayer = svg.querySelector(".nota-morph-start");
  var targetLayer = svg.querySelector(".nota-morph-target");
  if (!startLayer || !targetLayer) return;

  var startPaths = Array.prototype.slice.call(
    startLayer.querySelectorAll("path"),
  );
  var targetPaths = Array.prototype.slice.call(
    targetLayer.querySelectorAll("path"),
  );
  if (!startPaths.length || startPaths.length !== targetPaths.length) return;

  var model = null;
  var rafId = 0;
  var holdTimer = 0;
  var cardEl = svg.closest(".hcard");
  var isInView = false;
  var morphFinishedOnce = false;
  var ioWasIntersecting = false;
  var wasExpanded = !!(cardEl && cardEl.classList.contains("hcard--expanded"));
  var visEl = svg.closest(".hcard-visual-inner--nota") || svg;
  var ioTarget = visEl;

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  /** Blend parameter u in [0,1]: first half of wall-time eases start→halfway shape, pause, second half halfway→end. */
  function morphBlendU(elapsed) {
    if (midpointHoldMs <= 0) {
      return easeInOutCubic(clamp01(elapsed / durationMs));
    }
    var h = durationMs * 0.5;
    if (elapsed <= h) {
      return 0.5 * easeInOutCubic(Math.min(1, Math.max(0, elapsed / h)));
    }
    if (elapsed <= h + midpointHoldMs) {
      return 0.5;
    }
    var seg = elapsed - h - midpointHoldMs;
    return (
      0.5 +
      0.5 *
        easeInOutCubic(Math.min(1, Math.max(0, h > 0 ? seg / h : 1)))
    );
  }
  /** Pull capsule params from a path's bbox (every authored shape is a stadium / circle). */
  function getCapsuleParams(path) {
    var bbox = path.getBBox();
    return {
      cx: bbox.x + bbox.width / 2,
      cy: bbox.y + bbox.height / 2,
      w: bbox.width,
      h: bbox.height,
    };
  }
  /** Linear interpolation of capsule parameters; visually clean because shapes share topology. */
  function lerpCapsule(a, b, t) {
    return {
      cx: a.cx + (b.cx - a.cx) * t,
      cy: a.cy + (b.cy - a.cy) * t,
      w: a.w + (b.w - a.w) * t,
      h: a.h + (b.h - a.h) * t,
    };
  }
  /** Capsule (stadium) path: rounded rectangle where r = min(w,h)/2. Square w=h => circle. */
  function capsuleD(p) {
    var w = Math.max(0, p.w);
    var h = Math.max(0, p.h);
    var r = Math.min(w, h) / 2;
    if (r <= 0) return "";
    var x = p.cx - w / 2;
    var y = p.cy - h / 2;
    var f = function (n) {
      return n.toFixed(3);
    };
    return (
      "M" + f(x + r) + " " + f(y) +
      "H" + f(x + w - r) +
      "A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + w) + " " + f(y + r) +
      "V" + f(y + h - r) +
      "A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + w - r) + " " + f(y + h) +
      "H" + f(x + r) +
      "A" + f(r) + " " + f(r) + " 0 0 1 " + f(x) + " " + f(y + h - r) +
      "V" + f(y + r) +
      "A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + r) + " " + f(y) +
      "Z"
    );
  }
  function buildModel() {
    var startEntries = startPaths
      .map(function (path, idx) {
        var params = getCapsuleParams(path);
        return { idx: idx, params: params };
      })
      .sort(function (a, b) {
        if (a.params.cx !== b.params.cx) return a.params.cx - b.params.cx;
        return a.params.cy - b.params.cy;
      });
    var targetEntries = targetPaths
      .map(function (path, idx) {
        var params = getCapsuleParams(path);
        return { idx: idx, params: params };
      })
      .sort(function (a, b) {
        if (a.params.cx !== b.params.cx) return a.params.cx - b.params.cx;
        return a.params.cy - b.params.cy;
      });
    /* Symmetric delay from outermost entries inward (matches storyboard cadence: edges first, center last). */
    var pairCount = startEntries.length;
    var out = new Array(startPaths.length);
    startEntries.forEach(function (entry, orderIdx) {
      var target = targetEntries[orderIdx];
      var edgeFirst = Math.min(orderIdx, pairCount - 1 - orderIdx);
      out[entry.idx] = {
        sourceParams: entry.params,
        targetParams: target.params,
        sourceD: capsuleD(entry.params),
        morphDelay: edgeFirst * staggerMs,
      };
    });
    return out;
  }
  function resetState() {
    if (!model) model = buildModel();
    startPaths.forEach(function (path, idx) {
      var m = model[idx];
      path.setAttribute("d", m.sourceD);
    });
  }
  function clearTimersAndFrame() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = 0;
    }
  }
  function runMorph() {
    var startAt = performance.now();
    function tick(now) {
      var active = false;
      startPaths.forEach(function (path, idx) {
        var m = model[idx];
        var elapsed = now - startAt - m.morphDelay;
        if (elapsed < 0) {
          active = true;
          return;
        }
        var pathSpanTotal =
          midpointHoldMs > 0 ? durationMs + midpointHoldMs : durationMs;
        var u = morphBlendU(elapsed);
        var blended = lerpCapsule(m.sourceParams, m.targetParams, u);
        path.setAttribute("d", capsuleD(blended));
        if (elapsed < pathSpanTotal - 1e-4) {
          active = true;
        }
      });
      if (active) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
        morphFinishedOnce = true;
      }
    }
    rafId = requestAnimationFrame(tick);
  }
  function play() {
    morphFinishedOnce = false;
    clearTimersAndFrame();
    resetState();
    holdTimer = setTimeout(function () {
      runMorph();
    }, holdBeforeMorphMs);
  }

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      resetState();
      if (!LAB.skipViewportGate) return;
      play();
      if (
        typeof LAB.loopReplayMs === "number" &&
        LAB.loopReplayMs >= 2600
      ) {
        setInterval(function () {
          if (document.visibilityState === "hidden") return;
          play();
        }, LAB.loopReplayMs);
      }
    });
  });

  if (LAB.skipViewportGate) {
    /* Playback and optional loop wired in double-rAF above. */
  } else if (typeof IntersectionObserver === "undefined") {
    isInView = true;
    if (!morphFinishedOnce) play();
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        var entry = entries[0];
        if (!entry) return;
        var eligible =
          entry.isIntersecting && window.OuroSite.regionMostlyVisible(visEl);
        if (eligible) {
          isInView = true;
          if (!ioWasIntersecting && !morphFinishedOnce) play();
          ioWasIntersecting = true;
        } else {
          isInView = false;
          ioWasIntersecting = false;
          clearTimersAndFrame();
        }
      },
      { root: null, threshold: [0, 0.08, 0.2] },
    );
    observer.observe(ioTarget);
  }

  if (cardEl && typeof MutationObserver !== "undefined") {
    var classObs = new MutationObserver(function () {
      var expanded = cardEl.classList.contains("hcard--expanded");
      if (
        wasExpanded &&
        !expanded &&
        window.OuroSite.regionMostlyVisible(visEl)
      ) {
        isInView = true;
        play();
      }
      wasExpanded = expanded;
    });
    classObs.observe(cardEl, { attributes: true, attributeFilter: ["class"] });
  }
})();

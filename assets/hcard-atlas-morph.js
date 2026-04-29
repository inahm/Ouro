/**
 * Health Atlas card — flubber morph between two authored SVG states (expanded apart → compact lockup).
 * Pairing matches Ouro Motion playground: paths paired by centroid sort (left→right, top→bottom),
 * symmetric stagger from outer ranks inward. The visible group is re-centered to the viewBox each
 * frame so expanded vs compact ink doesn’t jump at the end of the tween.
 *
 * Optional before load: window.ATLAS_MORPH_LAB e.g.
 * { durationMs, holdBeforeMorphMs, staggerMs, skipViewportGate, loopReplayMs }
 */
(function () {
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotionQuery.matches) return;

  var LAB =
    typeof window !== "undefined" &&
    window.ATLAS_MORPH_LAB &&
    typeof window.ATLAS_MORPH_LAB === "object"
      ? window.ATLAS_MORPH_LAB
      : {};
  var holdBeforeMorphMs =
    typeof LAB.holdBeforeMorphMs === "number" ? LAB.holdBeforeMorphMs : 180;
  var durationMs =
    typeof LAB.durationMs === "number" ? LAB.durationMs : 1180;
  var staggerMs = typeof LAB.staggerMs === "number" ? LAB.staggerMs : 38;

  var flInterp =
    window.flubber && typeof window.flubber.interpolate === "function"
      ? window.flubber.interpolate.bind(window.flubber)
      : null;

  var svg = document.querySelector(
    ".hcard-visual-inner--atlas .atlas-morph-svg",
  );
  if (!svg) return;

  var startLayer = svg.querySelector(".atlas-morph-start");
  var targetLayer = svg.querySelector(".atlas-morph-target");
  if (!startLayer || !targetLayer) return;

  var startPaths = Array.prototype.slice.call(
    startLayer.querySelectorAll("path"),
  );
  var targetPaths = Array.prototype.slice.call(
    targetLayer.querySelectorAll("path"),
  );
  if (
    !startPaths.length ||
    startPaths.length !== targetPaths.length ||
    !flInterp
  ) {
    return;
  }

  var initialStartD = startPaths.map(function (path) {
    return path.getAttribute("d") || "";
  });

  var model = null;
  var rafId = 0;
  var holdTimer = 0;
  var cardEl = svg.closest(".hcard");
  var morphFinishedOnce = false;
  var ioWasIntersecting = false;
  var wasExpanded = !!(cardEl && cardEl.classList.contains("hcard--expanded"));
  var visEl = svg.closest(".hcard-visual-inner--atlas") || svg;
  var ioTarget = visEl;

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function capsuleFromBBox(path) {
    if (!path || !path.getBBox) return { cx: 0, cy: 0, w: 0, h: 0 };
    var b = path.getBBox();
    return {
      cx: b.x + b.width / 2,
      cy: b.y + b.height / 2,
      w: b.width,
      h: b.height,
    };
  }

  /**
   * Same centroid-sort pairing as Ouro Motion playground capsule-blend rows.
   */
  function buildModel() {
    function entries(paths) {
      return paths.map(function (path, idx) {
        var c = capsuleFromBBox(path);
        return { idx: idx, path: path, c: c };
      });
    }
    var sortFn = function (a, b) {
      if (a.c.cx !== b.c.cx) return a.c.cx - b.c.cx;
      return a.c.cy - b.c.cy;
    };
    var se = entries(startPaths).sort(sortFn);
    var te = entries(targetPaths).sort(sortFn);
    var n = se.length;
    var out = new Array(n);
    for (var order = 0; order < n; order++) {
      var edgeFirst = Math.min(order, n - 1 - order);
      var sEntry = se[order];
      var tEntry = te[order];
      var sPath = startPaths[sEntry.idx];
      var tPath = targetPaths[tEntry.idx];
      var fromD = sPath.getAttribute("d") || "";
      var toD = tPath.getAttribute("d") || "";
      var interp = null;
      try {
        interp = flInterp(fromD, toD, { maxSegmentLength: 8 });
      } catch (e) {
        interp = null;
      }
      out[sEntry.idx] = {
        pathEl: sPath,
        fromD: fromD,
        toD: toD,
        interp: typeof interp === "function" ? interp : null,
        morphDelay: edgeFirst * staggerMs,
      };
    }
    return out;
  }

  function clearGroupTransform() {
    if (startLayer) startLayer.removeAttribute("transform");
  }

  /**
   * Keep artwork centered in the viewBox every frame. Expanded vs compact ink sits in different
   * regions of the canvas — updating translate alongside path morph removes the end-of-tween jump.
   */
  function syncGroupCenterToViewBox() {
    if (!startLayer || !svg) return;
    try {
      var vb = svg.viewBox && svg.viewBox.baseVal;
      if (!vb || vb.width <= 0 || vb.height <= 0) return;
      var tcx = vb.x + vb.width / 2;
      var tcy = vb.y + vb.height / 2;
      var bb = startLayer.getBBox();
      if (bb.width < 0.5 || bb.height < 0.5) return;
      var cx = tcx - (bb.x + bb.width / 2);
      var cy = tcy - (bb.y + bb.height / 2);
      startLayer.setAttribute("transform", "translate(" + cx + "," + cy + ")");
    } catch (e) {
      /* ignore */
    }
  }

  function isModelValid(m) {
    if (!m || m.length !== startPaths.length) return false;
    for (var i = 0; i < m.length; i++) {
      if (!m[i] || !m[i].pathEl) return false;
      /* Tiny bbox ⇒ SVG likely not laid out yet */
      var bb = m[i].pathEl.getBBox();
      if (bb.width < 0.5 || bb.height < 0.5) return false;
    }
    return true;
  }

  function resetState() {
    clearGroupTransform();
    startPaths.forEach(function (path, idx) {
      path.setAttribute("d", initialStartD[idx]);
    });
    var built = buildModel();
    if (!isModelValid(built)) {
      model = null;
      syncGroupCenterToViewBox();
      return;
    }
    model = built;
    startPaths.forEach(function (path, idx) {
      path.setAttribute("d", model[idx].fromD);
    });
    syncGroupCenterToViewBox();
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
    if (!model) return;
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
        var u = easeInOutCubic(clamp01(elapsed / durationMs));
        var d;
        if (m.interp) {
          d = m.interp(u);
        } else {
          d = u < 1 ? m.fromD : m.toD;
        }
        path.setAttribute("d", d);
        if (elapsed < durationMs - 1e-4) active = true;
      });
      syncGroupCenterToViewBox();
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
    if (!model) return;
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
    /* Playback wired in double-rAF above */
  } else if (typeof IntersectionObserver === "undefined") {
    if (!morphFinishedOnce) play();
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        var entry = entries[0];
        if (!entry) return;
        var eligible =
          entry.isIntersecting && window.OuroSite.regionMostlyVisible(visEl);
        if (eligible) {
          if (!ioWasIntersecting && !morphFinishedOnce) play();
          ioWasIntersecting = true;
        } else {
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
        play();
      }
      wasExpanded = expanded;
    });
    classObs.observe(cardEl, { attributes: true, attributeFilter: ["class"] });
  }
})();

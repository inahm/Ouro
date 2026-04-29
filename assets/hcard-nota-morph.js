(function () {
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotionQuery.matches) return;

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

  var samplePoints = 92;
  var holdBeforeMorphMs = 180;
  var durationMs = 1180;
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
  function centerFromPoints(points) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    points.forEach(function (point) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }
  function samplePathPointsInSvg(path, count) {
    var points = [];
    var length = path.getTotalLength();
    var matrix = path.getCTM();
    var svgPoint = svg.createSVGPoint();
    for (var i = 0; i < count; i += 1) {
      var t = i / (count - 1);
      var sample = path.getPointAtLength(length * t);
      svgPoint.x = sample.x;
      svgPoint.y = sample.y;
      var out = matrix
        ? svgPoint.matrixTransform(matrix)
        : { x: sample.x, y: sample.y };
      points.push({ x: out.x, y: out.y });
    }
    return points;
  }
  function pointsToPathD(points) {
    if (!points.length) return "";
    var first = points[0];
    var d = "M" + first.x.toFixed(3) + " " + first.y.toFixed(3);
    for (var i = 1; i < points.length; i += 1) {
      var point = points[i];
      d += "L" + point.x.toFixed(3) + " " + point.y.toFixed(3);
    }
    return d + "Z";
  }
  function interpolatePoints(from, to, t) {
    return from.map(function (point, idx) {
      return {
        x: point.x + (to[idx].x - point.x) * t,
        y: point.y + (to[idx].y - point.y) * t,
      };
    });
  }
  /*
   * No perimeter “phase alignment” here: naive index pairing lets vertices shear/slide relative to each other,
   * which reads as the chunky twist-through-space effect the Nota motif had originally.
   */
  function buildModel() {
    var startEntries = startPaths
      .map(function (path, idx) {
        var points = samplePathPointsInSvg(path, samplePoints);
        var center = centerFromPoints(points);
        return { idx: idx, points: points, center: center };
      })
      .sort(function (a, b) {
        if (a.center.x !== b.center.x) return a.center.x - b.center.x;
        return a.center.y - b.center.y;
      });
    var targetEntries = targetPaths
      .map(function (path, idx) {
        var points = samplePathPointsInSvg(path, samplePoints);
        var center = centerFromPoints(points);
        return { idx: idx, points: points, center: center };
      })
      .sort(function (a, b) {
        if (a.center.x !== b.center.x) return a.center.x - b.center.x;
        return a.center.y - b.center.y;
      });
    var remappedTargets = targetEntries.slice();
    if (remappedTargets.length >= 2) {
      var last = remappedTargets.length - 1;
      var temp = remappedTargets[last];
      remappedTargets[last] = remappedTargets[last - 1];
      remappedTargets[last - 1] = temp;
    }
    var out = new Array(startPaths.length);
    startEntries.forEach(function (entry, orderIdx) {
      var target = remappedTargets[orderIdx];
      out[entry.idx] = {
        sourcePoints: entry.points,
        targetPoints: target.points,
        sourceD: pointsToPathD(entry.points),
        morphDelay: orderIdx * 38,
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
        var raw = (now - startAt - m.morphDelay) / durationMs;
        if (raw < 0) {
          active = true;
          return;
        }
        var clamped = clamp01(raw);
        var eased = easeInOutCubic(clamped);
        var points = interpolatePoints(m.sourcePoints, m.targetPoints, eased);
        path.setAttribute("d", pointsToPathD(points));
        if (raw < 1) active = true;
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
    });
  });

  if (typeof IntersectionObserver === "undefined") {
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

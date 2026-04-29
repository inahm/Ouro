(function () {
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotionQuery.matches) return;

  var svg = document.querySelector(
    ".hcard-visual-inner--atlas .atlas-morph-svg",
  );
  if (!svg) return;

  var apartLayer = svg.querySelector(".atlas-morph-apart");
  var targetLayer = svg.querySelector(".atlas-morph-target");
  if (!apartLayer || !targetLayer) return;

  var apartPaths = Array.prototype.slice.call(
    apartLayer.querySelectorAll("path"),
  );
  var targetPaths = Array.prototype.slice.call(
    targetLayer.querySelectorAll("path"),
  );
  if (!apartPaths.length || !targetPaths.length) return;

  var stageCenter = { x: 126, y: 149.5 };
  var samplePoints = 96;
  var startLayoutScale = 0.68;
  var holdBeforeMorphMs = 320;
  var durationMs = 1560;
  var spreadPhaseRatio = 0.62;
  var model = null;
  var rafId = 0;
  var holdTimer = 0;
  var cardEl = svg.closest(".hcard");
  var isInView = false;
  /* Only set when the morph rAF finishes - survives scroll-away so we don’t replay when coming back. */
  var morphFinishedOnce = false;
  var ioWasIntersecting = false;
  var wasExpanded = !!(cardEl && cardEl.classList.contains("hcard--expanded"));
  /* IO on the card visual strip - not the full article - so morph runs only when that surface is on-screen. */
  var visEl = svg.closest(".hcard-visual-inner--atlas") || svg;
  var ioTarget = visEl;

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function pathCenterFromBox(path) {
    var box = path.getBBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  function translatePoints(points, dx, dy) {
    return points.map(function (point) {
      return { x: point.x + dx, y: point.y + dy };
    });
  }
  function scalePointsAround(points, scale, center) {
    return points.map(function (point) {
      return {
        x: center.x + (point.x - center.x) * scale,
        y: center.y + (point.y - center.y) * scale,
      };
    });
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
  function pointsBounds(points) {
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
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }
  function pointsCenter(points) {
    var b = pointsBounds(points);
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  }
  function pointSetsCenter(pointSets) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    pointSets.forEach(function (points) {
      var b = pointsBounds(points);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }
  function buildBalancedAssignments(pathCenters, targetCenters) {
    var byAngle = pathCenters
      .map(function (center, idx) {
        return {
          idx: idx,
          angle: Math.atan2(center.y - stageCenter.y, center.x - stageCenter.x),
        };
      })
      .sort(function (a, b) {
        return a.angle - b.angle;
      });
    var targetOrder = targetCenters
      .map(function (center, idx) {
        return {
          idx: idx,
          angle: Math.atan2(center.y - stageCenter.y, center.x - stageCenter.x),
        };
      })
      .sort(function (a, b) {
        return a.angle - b.angle;
      })
      .map(function (entry) {
        return entry.idx;
      });
    var assignments = new Array(pathCenters.length);
    byAngle.forEach(function (entry, orderIndex) {
      assignments[entry.idx] = targetOrder[orderIndex % targetOrder.length];
    });
    return assignments;
  }
  function buildModel() {
    var targetPointSetsRaw = targetPaths.map(function (path) {
      return samplePathPointsInSvg(path, samplePoints);
    });
    var targetCenter = pointSetsCenter(targetPointSetsRaw);
    var centerOffset = {
      x: stageCenter.x - targetCenter.x,
      y: stageCenter.y - targetCenter.y,
    };
    var targetPointSets = targetPointSetsRaw.map(function (points) {
      return translatePoints(points, centerOffset.x, centerOffset.y);
    });
    var targetCenters = targetPointSets.map(function (points) {
      return pointsCenter(points);
    });
    var pathCenters = apartPaths.map(function (path) {
      return pathCenterFromBox(path);
    });
    var assignments = buildBalancedAssignments(pathCenters, targetCenters);

    return apartPaths.map(function (path, idx) {
      var targetIndex = assignments[idx];
      var sourcePointsRaw = samplePathPointsInSvg(path, samplePoints);
      var sourcePoints = scalePointsAround(
        sourcePointsRaw,
        startLayoutScale,
        stageCenter,
      );
      var targetPoints = targetPointSets[targetIndex];
      return {
        sourcePoints: sourcePoints,
        targetPoints: targetPoints,
        sourceD: pointsToPathD(sourcePoints),
        morphDelay: idx * 36,
      };
    });
  }
  function resetState() {
    if (!model) model = buildModel();
    apartPaths.forEach(function (path, idx) {
      var m = model[idx];
      path.style.transition = "none";
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
      apartPaths.forEach(function (path, idx) {
        var m = model[idx];
        var raw = (now - startAt - m.morphDelay) / durationMs;
        if (raw < 0) {
          active = true;
          return;
        }
        var eased = easeInOutCubic(clamp01(raw));
        var points =
          eased < spreadPhaseRatio
            ? interpolatePoints(
                m.sourcePoints,
                m.targetPoints,
                easeInOutCubic(eased / spreadPhaseRatio),
              )
            : m.targetPoints;
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

  resetState();
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

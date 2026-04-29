/**
 * Ouro Motion — small Lottie-inspired timeline for capsule (stadium) SVG morphs.
 * Not a Bodymovin parser; JSON is our schema (see index.html sample).
 *
 * @global OuroMotion
 */
(function (global) {
  "use strict";

  function clamp01(t) {
    return Math.min(1, Math.max(0, t));
  }

  var Easing = {
    linear: function (t) {
      return clamp01(t);
    },
    easeInOutCubic: function (t) {
      t = clamp01(t);
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    easeInOutQuad: function (t) {
      t = clamp01(t);
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    easeOutCubic: function (t) {
      t = clamp01(t);
      return 1 - Math.pow(1 - t, 3);
    },
    easeInCubic: function (t) {
      t = clamp01(t);
      return t * t * t;
    },
  };

  function getEase(name) {
    var fn = Easing[name];
    return typeof fn === "function" ? fn : Easing.easeInOutCubic;
  }

  /** Rounded-rect stadium path; r = min(w,h)/2. */
  function capsuleToPathD(p) {
    var w = Math.max(0, +p.w || 0);
    var h = Math.max(0, +p.h || 0);
    var r = Math.min(w, h) / 2;
    if (r <= 0) return "";
    var cx = +p.cx || 0;
    var cy = +p.cy || 0;
    var x = cx - w / 2;
    var y = cy - h / 2;
    function f(n) {
      return n.toFixed(3);
    }
    return (
      "M" +
      f(x + r) +
      " " +
      f(y) +
      "H" +
      f(x + w - r) +
      "A" +
      f(r) +
      " " +
      f(r) +
      " 0 0 1 " +
      f(x + w) +
      " " +
      f(y + r) +
      "V" +
      f(y + h - r) +
      "A" +
      f(r) +
      " " +
      f(r) +
      " 0 0 1 " +
      f(x + w - r) +
      " " +
      f(y + h) +
      "H" +
      f(x + r) +
      "A" +
      f(r) +
      " " +
      f(r) +
      " 0 0 1 " +
      f(x) +
      " " +
      f(y + h - r) +
      "V" +
      f(y + r) +
      "A" +
      f(r) +
      " " +
      f(r) +
      " 0 0 1 " +
      f(x + r) +
      " " +
      f(y) +
      "Z"
    );
  }

  /** Axis-aligned rectangle from capsule params (sharp corners). */
  function boxToPathD(p) {
    var w = Math.max(0, +p.w || 0);
    var h = Math.max(0, +p.h || 0);
    if (w <= 0 || h <= 0) return "";
    var cx = +p.cx || 0;
    var cy = +p.cy || 0;
    var x = cx - w / 2;
    var y = cy - h / 2;
    function f(n) {
      return n.toFixed(3);
    }
    return (
      "M" +
      f(x) +
      " " +
      f(y) +
      "H" +
      f(x + w) +
      "V" +
      f(y + h) +
      "H" +
      f(x) +
      "V" +
      f(y) +
      "Z"
    );
  }

  /** Capsule (pill) or sharp box, controlled by doc.blendShape. */
  function blendCapsuleToPathD(doc, p) {
    if (doc && doc.blendShape === "box") return boxToPathD(p);
    return capsuleToPathD(p);
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

  /** Reattach original `d` snapshots when rebuilding rows (DOM `d` may be mid-morph). */
  function copyPathSnapshotsFromPrev(out, prevRows) {
    if (!prevRows || !prevRows.length) return;
    for (var i = 0; i < out.length; i++) {
      var el = out[i].pathEl;
      for (var j = 0; j < prevRows.length; j++) {
        var p = prevRows[j];
        if (p.pathEl !== el) continue;
        if (typeof p.fromD === "string") out[i].fromD = p.fromD;
        if (typeof p.toD === "string") out[i].toD = p.toD;
        delete out[i]._pathInterp;
        break;
      }
    }
  }

  /**
   * Pair start paths ↔ target paths by centroid sort (same as production Nota morph).
   * Returns rows in **start DOM index** order: { pathEl, from, to, morphDelay, fromD, toD }.
   */
  function buildCapsuleBlendRows(startPaths, targetPaths, staggerSec, prevRows) {
    staggerSec = typeof staggerSec === "number" ? staggerSec : 0;
    var sp = Array.prototype.slice.call(startPaths);
    var tp = Array.prototype.slice.call(targetPaths);
    if (!sp.length || sp.length !== tp.length) return [];

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
    var se = entries(sp).sort(sortFn);
    var te = entries(tp).sort(sortFn);
    var n = se.length;
    var out = new Array(n);
    for (var order = 0; order < n; order++) {
      var edgeFirst = Math.min(order, n - 1 - order);
      var sEntry = se[order];
      var tCaps = te[order].c;
      var sPath = sp[sEntry.idx];
      var tPath = te[order].path;
      out[sEntry.idx] = {
        pathEl: sPath,
        from: { cx: sEntry.c.cx, cy: sEntry.c.cy, w: sEntry.c.w, h: sEntry.c.h },
        to: { cx: tCaps.cx, cy: tCaps.cy, w: tCaps.w, h: tCaps.h },
        morphDelay: edgeFirst * staggerSec,
        fromD: sPath.getAttribute("d") || "",
        toD: tPath.getAttribute("d") || "",
      };
    }
    copyPathSnapshotsFromPrev(out, prevRows);
    return out;
  }

  /**
   * Shift every row's target capsule by the same (dx,dy) so the mean target
   * centroid matches the mean start centroid — keeps the two SVG states
   * centered on each other during capsule/box blends (no whole-artwork drift).
   */
  function centerBlendRowsTargetToFrom(rows) {
    if (!rows || !rows.length) return rows;
    var sfx = 0;
    var sfy = 0;
    var tfx = 0;
    var tfy = 0;
    var cnt = 0;
    var i;
    var n = rows.length;
    for (i = 0; i < n; i++) {
      var row = rows[i];
      if (!row || !row.from || !row.to) continue;
      sfx += row.from.cx;
      sfy += row.from.cy;
      tfx += row.to.cx;
      tfy += row.to.cy;
      cnt++;
    }
    if (cnt === 0) return rows;
    var dx = sfx / cnt - tfx / cnt;
    var dy = sfy / cnt - tfy / cnt;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return rows;
    for (i = 0; i < n; i++) {
      row = rows[i];
      if (!row || !row.to) continue;
      row.to = {
        cx: row.to.cx + dx,
        cy: row.to.cy + dy,
        w: row.to.w,
        h: row.to.h,
      };
    }
    return rows;
  }

  function pathInterpForRow(global, row) {
    if (row._pathInterp === false) return null;
    if (typeof row._pathInterp === "function") return row._pathInterp;
    var fl = global.flubber && global.flubber.interpolate;
    if (typeof fl !== "function") return null;
    try {
      row._pathInterp = fl(row.fromD, row.toD, { maxSegmentLength: 8 });
    } catch (e) {
      row._pathInterp = false;
    }
    return typeof row._pathInterp === "function" ? row._pathInterp : null;
  }

  function lerpCapsule(a, b, t) {
    return {
      cx: a.cx + (b.cx - a.cx) * t,
      cy: a.cy + (b.cy - a.cy) * t,
      w: a.w + (b.w - a.w) * t,
      h: a.h + (b.h - a.h) * t,
    };
  }

  /** u in [0,1] with optional midpoint dwell in ms (wall clock inside duration window). */
  function morphBlendU(elapsedMs, durationMs, midpointHoldMs, easeFn) {
    midpointHoldMs = midpointHoldMs || 0;
    if (midpointHoldMs <= 0) {
      return easeFn(clamp01(durationMs > 0 ? elapsedMs / durationMs : 1));
    }
    var h = durationMs * 0.5;
    if (elapsedMs <= h) {
      return 0.5 * easeFn(Math.min(1, Math.max(0, h > 0 ? elapsedMs / h : 1)));
    }
    if (elapsedMs <= h + midpointHoldMs) return 0.5;
    var seg = elapsedMs - h - midpointHoldMs;
    return (
      0.5 + 0.5 * easeFn(Math.min(1, Math.max(0, h > 0 ? seg / h : 1)))
    );
  }

  /**
   * @typedef {object} CapsuleBlendDoc
   * @property {string} v
   * @property {string} ty - "ouro/capsule-blend"
   * @property {number} holdBeforeSec
   * @property {number} durationSec
   * @property {number} [midpointHoldSec]
   * @property {number} [holdAfterSec] - extra seconds at final frame (timeline tail; loop wraps after this).
   * @property {string} ease
   * @property {number} staggerSec
   * @property {object[]} from - capsules (paired index with `to`)
   * @property {object[]} to
   */

  /**
   * End of morph window (all paths fully at `to`). Does not include hold-after tail.
   */
  function morphTimelineEndSec(doc, rows) {
    var hb = doc.holdBeforeSec || 0;
    var d = doc.durationSec || 1;
    var mid = doc.midpointHoldSec || 0;
    var pathSpan = mid > 0 ? d + mid : d;
    var maxDelay = 0;
    if (rows && rows.length) {
      for (var i = 0; i < rows.length; i++) {
        maxDelay = Math.max(maxDelay, rows[i].morphDelay || 0);
      }
    }
    return hb + maxDelay + pathSpan;
  }

  function totalSpanSec(doc, rows) {
    var tail = Math.max(0, parseFloat(doc.holdAfterSec) || 0);
    return morphTimelineEndSec(doc, rows) + tail;
  }

  /** Snapshot document for export (numeric only). */
  function documentFromRows(rows, opts) {
    opts = opts || {};
    return {
      v: "1",
      ty: "ouro/capsule-blend",
      meta: opts.meta || {},
      holdBeforeSec: opts.holdBeforeSec != null ? opts.holdBeforeSec : 0.18,
      durationSec: opts.durationSec != null ? opts.durationSec : 1.18,
      midpointHoldSec: opts.midpointHoldSec != null ? opts.midpointHoldSec : 0,
      holdAfterSec: opts.holdAfterSec != null ? opts.holdAfterSec : 0,
      ease: opts.ease || "easeInOutCubic",
      staggerSec: opts.staggerSec != null ? opts.staggerSec : 0.038,
      blendShape:
        opts.blendShape === "box" ||
        opts.blendShape === "capsule" ||
        opts.blendShape === "paths"
          ? opts.blendShape
          : "capsule",
      from: rows.map(function (r) {
        return { cx: r.from.cx, cy: r.from.cy, w: r.from.w, h: r.from.h };
      }),
      to: rows.map(function (r) {
        return { cx: r.to.cx, cy: r.to.cy, w: r.to.w, h: r.to.h };
      }),
    };
  }

  function applyDocumentAtTime(doc, rows, timeSec) {
    var easeFn = getEase(doc.ease);
    var morphEndSec = morphTimelineEndSec(doc, rows);
    var tMorph = Math.min(Math.max(0, timeSec), morphEndSec);
    var holdBefore = (doc.holdBeforeSec || 0) * 1000;
    var durationMs = (doc.durationSec || 1) * 1000;
    var midpointHoldMs = (doc.midpointHoldSec || 0) * 1000;
    var pathSpanTotal =
      midpointHoldMs > 0 ? durationMs + midpointHoldMs : durationMs;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || !row.pathEl) continue;
      var elapsedMs = tMorph * 1000 - holdBefore - row.morphDelay * 1000;
      var u =
        elapsedMs < 0
          ? 0
          : morphBlendU(elapsedMs, durationMs, midpointHoldMs, easeFn);
      if (elapsedMs >= pathSpanTotal - 1e-4) u = 1;
      if (
        doc.blendShape === "paths" &&
        typeof row.fromD === "string" &&
        typeof row.toD === "string"
      ) {
        var interp = pathInterpForRow(global, row);
        if (interp) {
          row.pathEl.setAttribute("d", interp(u));
          continue;
        }
      }
      var blended = lerpCapsule(row.from, row.to, u);
      row.pathEl.setAttribute("d", blendCapsuleToPathD(doc, blended));
    }
  }

  function Player(options) {
    this.doc = options.doc;
    this.rows = options.rows || [];
    this.speed = options.speed != null ? options.speed : 1;
    this.loop = !!options.loop;
    this.timeSec = 0;
    this._playing = false;
    this._raf = 0;
    this._lastPerf = 0;
    this._onFrame = options.onFrame || null;
  }

  Player.prototype.span = function () {
    return totalSpanSec(this.doc, this.rows);
  };

  Player.prototype.seek = function (tSec) {
    var span = this.span();
    this.timeSec = Math.max(0, Math.min(tSec, Math.max(0.001, span)));
    applyDocumentAtTime(this.doc, this.rows, this.timeSec);
    if (this._onFrame) this._onFrame(this.timeSec, span);
  };

  Player.prototype._tick = function (now) {
    if (!this._playing) return;
    var dt = this._lastPerf ? (now - this._lastPerf) / 1000 : 0;
    this._lastPerf = now;
    this.timeSec += dt * this.speed;
    var span = this.span();
      if (this.timeSec >= span) {
        if (this.loop) {
          this.timeSec = this.timeSec % span || 0;
        } else {
          this.timeSec = span;
          this._playing = false;
        }
      }
    applyDocumentAtTime(this.doc, this.rows, this.timeSec);
    if (this._onFrame) this._onFrame(this.timeSec, span);
    if (this._playing) {
      var self = this;
      this._raf = requestAnimationFrame(function (n) {
        self._tick(n);
      });
    }
  };

  Player.prototype.play = function () {
    if (this._playing) return;
    this._playing = true;
    this._lastPerf = performance.now();
    var self = this;
    this._raf = requestAnimationFrame(function (n) {
      self._tick(n);
    });
  };

  Player.prototype.pause = function () {
    this._playing = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  };

  Player.prototype.isPlaying = function () {
    return !!this._playing;
  };

  Player.prototype.restart = function () {
    this.pause();
    this.timeSec = 0;
    this.seek(0);
  };

  /** Reload doc + rows from JSON (same ty). */
  Player.prototype.setDocument = function (doc, rows) {
    this.pause();
    this.doc = doc;
    this.rows = rows;
  };

  /** Apply numeric from/to from a saved doc onto freshly paired rows (same DOM path order). */
  function hydrateRowsFromDoc(doc, rows) {
    if (
      !doc.from ||
      !doc.to ||
      doc.from.length !== rows.length ||
      doc.to.length !== rows.length
    ) {
      return rows;
    }
    for (var i = 0; i < rows.length; i++) {
      var f = doc.from[i];
      var t = doc.to[i];
      if (f && typeof f.cx === "number") {
        rows[i].from = { cx: f.cx, cy: f.cy, w: f.w, h: f.h };
      }
      if (t && typeof t.cx === "number") {
        rows[i].to = { cx: t.cx, cy: t.cy, w: t.w, h: t.h };
      }
    }
    return rows;
  }

  global.OuroMotion = {
    Easing: Easing,
    getEase: getEase,
    capsuleToPathD: capsuleToPathD,
    boxToPathD: boxToPathD,
    blendCapsuleToPathD: blendCapsuleToPathD,
    capsuleFromBBox: capsuleFromBBox,
    buildCapsuleBlendRows: buildCapsuleBlendRows,
    lerpCapsule: lerpCapsule,
    morphBlendU: morphBlendU,
    morphTimelineEndSec: morphTimelineEndSec,
    totalSpanSec: totalSpanSec,
    documentFromRows: documentFromRows,
    applyDocumentAtTime: applyDocumentAtTime,
    hydrateRowsFromDoc: hydrateRowsFromDoc,
    centerBlendRowsTargetToFrom: centerBlendRowsTargetToFrom,
    Player: Player,
  };
})(typeof window !== "undefined" ? window : globalThis);

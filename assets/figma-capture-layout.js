/**
 * When ?figmacapture= is present on the URL, html gets .figma-capture-mode early in index.html.
 * Stack hero (beige) + second act (particle ring + red type) + third act (full red) vertically
 * so html-to-design / Figma capture includes all sections (not only the first viewport).
 * Depends on hero-intro.js (splitToChars, staggerChars on window).
 */
(function () {
  if (!document.documentElement.classList.contains("figma-capture-mode")) return;

  var SECOND_LINES = ["We are an AI-native", "product studio."];
  var SECOND_LINES_MOBILE = ["We are an", "AI-native", "product", "studio"];
  var THIRD_LINES = ["Where play", "meets curiosity", "and craft."];
  var THIRD_LINES_MOBILE = ["Where play", "meets", "curiosity", "and craft."];

  function getSecondLines() {
    return window.matchMedia("(max-width: 600px)").matches
      ? SECOND_LINES_MOBILE
      : SECOND_LINES;
  }
  function getThirdLines() {
    return window.matchMedia("(max-width: 600px)").matches
      ? THIRD_LINES_MOBILE
      : THIRD_LINES;
  }

  function freezeHeadlineChars(el) {
    el.querySelectorAll(".hl-char:not(.hl-char--space)").forEach(function (c) {
      c.classList.remove("hl-char-exit");
      c.style.transitionDelay = "0ms";
      c.style.setProperty("--cd", "0.01s");
      c.style.transform = "translate3d(0,0,0) rotate(0deg)";
      c.style.opacity = "1";
      c.style.visibility = "visible";
    });
  }

  function buildHeadline(el, lines, extraClass) {
    if (!el || typeof splitToChars !== "function") return;
    el.innerHTML = "";
    if (extraClass) el.classList.add(extraClass);
    el.classList.add("revealed");
    lines.forEach(function (text) {
      var line = document.createElement("span");
      line.className = "hl-line";
      var inner = document.createElement("span");
      inner.className = "hl-inner";
      inner.textContent = text;
      line.appendChild(inner);
      el.appendChild(line);
    });
    el.querySelectorAll(".hl-inner").forEach(function (inner) {
      splitToChars(inner);
    });
    if (typeof staggerChars === "function") {
      staggerChars(
        Array.from(el.querySelectorAll(".hl-char:not(.hl-char--space)")),
      );
    }
    freezeHeadlineChars(el);
  }

  function apply() {
    var slice = document.getElementById("figma-capture-second-slice");
    var stack = document.getElementById("figma-capture-second-slice-stack");
    var wrap = document.getElementById("second-hl-particles-wrap");
    var hlLayer = stack && stack.querySelector(".figma-capture-second-slice__hl");
    var secondHl = document.getElementById("figma-capture-second-hl");

    if (slice) {
      slice.removeAttribute("hidden");
      slice.setAttribute("aria-hidden", "false");
    }

    if (stack && wrap && hlLayer && wrap.parentNode !== stack) {
      stack.insertBefore(wrap, hlLayer);
    }

    if (wrap) {
      wrap.classList.add("second-hl-particles-wrap--visible");
      wrap.setAttribute("aria-hidden", "false");
    }

    if (secondHl) {
      secondHl.classList.add("hero-hl", "hero-hl--second-block");
      buildHeadline(secondHl, getSecondLines(), null);
    }

    var thirdAct = document.getElementById("third-act");
    var red = document.getElementById("third-act-red");
    if (thirdAct) {
      thirdAct.classList.add(
        "third-act--active",
        "third-act--in-flow",
        "third-act--torus-in",
      );
      thirdAct.setAttribute("aria-hidden", "false");
    }
    if (red) red.classList.add("third-act-red--expanded");

    var shell = document.getElementById("third-act-video-shell");
    if (shell) {
      shell.classList.add("third-act-video-shell--in");
      shell.setAttribute("aria-hidden", "false");
    }

    var pw = document.getElementById("third-act-particles-vp-wrap");
    if (pw) {
      pw.classList.add("third-act-particles-vp-wrap--visible");
      pw.setAttribute("aria-hidden", "false");
    }

    var thirdHl = document.getElementById("third-act-hl");
    if (thirdHl) {
      thirdHl.classList.add("hero-hl", "third-act-hl");
      buildHeadline(thirdHl, getThirdLines(), null);
    }

    window.dispatchEvent(new Event("resize"));
  }

  function schedule() {
    apply();
    requestAnimationFrame(function () {
      apply();
      setTimeout(apply, 120);
      setTimeout(apply, 480);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }
  window.addEventListener("load", schedule);
})();

(function () {
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotionQuery.matches) return;

  var svg = document.querySelector(
    ".hcard-visual-inner--overture .overture-ripple-svg",
  );
  if (!svg) return;

  var cardEl = svg.closest(".hcard");
  var isInView = false;
  var ioWasIntersecting = false;
  /* After ripple CSS finishes - don’t retrigger on every scroll-into-view. */
  var rippleFinishedOnce = false;
  var wasExpanded = !!(cardEl && cardEl.classList.contains("hcard--expanded"));
  var playTimer = 0;
  var visEl = svg.closest(".hcard-visual-inner--overture") || svg;

  function clearPlayTimer() {
    if (playTimer) {
      clearTimeout(playTimer);
      playTimer = 0;
    }
  }

  function playOnce() {
    clearPlayTimer();
    svg.classList.remove("is-playing");
    void svg.getBoundingClientRect();
    svg.classList.add("is-playing");
    playTimer = setTimeout(function () {
      svg.classList.remove("is-playing");
      playTimer = 0;
      rippleFinishedOnce = true;
    }, 1650);
  }

  function resetIdleState() {
    clearPlayTimer();
    svg.classList.remove("is-playing");
  }

  if (typeof IntersectionObserver === "undefined") {
    isInView = true;
    if (!rippleFinishedOnce) playOnce();
  } else {
    var ioTarget = visEl;
    var observer = new IntersectionObserver(
      function (entries) {
        var entry = entries[0];
        if (!entry) return;
        var eligible =
          entry.isIntersecting && window.OuroSite.regionMostlyVisible(visEl);
        if (eligible) {
          isInView = true;
          if (!ioWasIntersecting && !rippleFinishedOnce) playOnce();
          ioWasIntersecting = true;
        } else {
          isInView = false;
          ioWasIntersecting = false;
          resetIdleState();
        }
      },
      { root: null, threshold: [0, 0.15, 0.35] },
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
        rippleFinishedOnce = false;
        playOnce();
      }
      wasExpanded = expanded;
    });
    classObs.observe(cardEl, { attributes: true, attributeFilter: ["class"] });
  }
})();

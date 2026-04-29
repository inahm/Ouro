(function () {
  if (!history.replaceState) return;
  var h = location.hash;
  if (h === "#scroll-intro-below") {
    history.replaceState(
      null,
      "",
      location.pathname + location.search + "#studio",
    );
  } else if (h === "#proj-grid-wrap") {
    history.replaceState(
      null,
      "",
      location.pathname + location.search + "#projects",
    );
  }
})();

(function () {
  var mqMobileNav = window.matchMedia("(max-width: 600px)");
  var topNav = document.getElementById("scroll-intro-top-nav");
  var navToggle = document.getElementById("scroll-intro-nav-toggle");
  var navDropdown = document.getElementById("scroll-intro-nav-dropdown");
  if (!topNav || !navToggle || !navDropdown) return;
  function setMobileNavOpen(open) {
    topNav.classList.toggle("scroll-intro-top-nav--open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (mqMobileNav.matches) {
      navDropdown.setAttribute("aria-hidden", open ? "false" : "true");
    } else {
      navDropdown.removeAttribute("aria-hidden");
    }
  }
  setMobileNavOpen(false);
  navToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    setMobileNavOpen(!topNav.classList.contains("scroll-intro-top-nav--open"));
  });
  document.addEventListener("click", function () {
    if (
      mqMobileNav.matches &&
      topNav.classList.contains("scroll-intro-top-nav--open")
    ) {
      setMobileNavOpen(false);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      mqMobileNav.matches &&
      topNav.classList.contains("scroll-intro-top-nav--open")
    ) {
      setMobileNavOpen(false);
      navToggle.focus();
    }
  });
  navDropdown.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      if (mqMobileNav.matches) setMobileNavOpen(false);
    });
  });
  window.addEventListener("resize", function () {
    if (!mqMobileNav.matches) setMobileNavOpen(false);
  });
})();

(function () {
  var openFab = document.getElementById("site-meta-open");
  var openFooter = document.getElementById("site-meta-open-footer");
  var panel = document.getElementById("site-meta-panel");
  var bodyEl = document.getElementById("site-meta-body");
  var backdrop = document.getElementById("site-meta-backdrop");
  if (!panel) return;
  function nextFrame(cb) {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(cb);
    else cb();
  }
  function getScrollBox() {
    return bodyEl || panel;
  }
  function getOpenTriggers() {
    return [openFab, openFooter].filter(function (el) {
      return el;
    });
  }
  var lastFocus = null;
  var savedPageScrollY = 0;
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var themeColorPrev = themeMeta ? themeMeta.getAttribute("content") : null;
  var buildLines =
    window.OuroSite && Array.isArray(window.OuroSite.BUILD_STATS_LINES)
      ? window.OuroSite.BUILD_STATS_LINES
      : null;
  if (buildLines && buildLines.length && panel) {
    var statSpans = panel.querySelectorAll(
      ".site-meta-panel__stats [data-typewriter]",
    );
    for (var si = 0; si < statSpans.length && si < buildLines.length; si++) {
      statSpans[si].setAttribute("data-typewriter", buildLines[si]);
    }
  }
  var typeEls = Array.prototype.slice.call(
    panel.querySelectorAll("[data-typewriter]"),
  );
  var fullTexts = typeEls.map(function (el) {
    return el.getAttribute("data-typewriter") || "";
  });
  var logStatLines =
    buildLines && buildLines.length >= 8
      ? buildLines.slice(0, 8)
      : [
          fullTexts[5],
          fullTexts[6],
          fullTexts[7],
          fullTexts[8],
          fullTexts[9],
          fullTexts[10],
          fullTexts[11],
          fullTexts[12],
        ];
  var terminalForm = document.getElementById("site-meta-terminal-form");
  var terminalInput = document.getElementById("site-meta-terminal-input");
  var terminalInputWrap = document.getElementById(
    "site-meta-terminal-input-wrap",
  );
  var termMirror = document.getElementById("site-meta-terminal-mirror");
  var termCursor = document.getElementById("site-meta-terminal-cursor");
  var terminalLog = document.getElementById("site-meta-terminal-log");
  var STORY_HIDDEN_CLASS = "site-meta-panel__line-hidden";
  var storyRows = typeEls
    .map(function (el) {
      return el.closest
        ? el.closest(".site-meta-panel__type-row, .site-meta-panel__stats-line")
        : null;
    })
    .filter(function (row, idx, arr) {
      return row && arr.indexOf(row) === idx;
    });
  var STORY_MAKERS_LINK_JENNIE = "https://www.linkedin.com/in/jennieperri/";
  var STORY_MAKERS_LINK_INAH = "https://www.linkedin.com/in/inahmercedes/";
  var STORY_OUROBOROS_ASCII = [
    "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠿⠿⠿⠿⠿⠿⠻⠿⣿⣿⣿⣿⣿⣿⣿",
    "⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠋⢉⡀⠠⢤⠀⡶⠀⣤⡀⠐⢷⣦⠀⠙⢿⣿⣿⣿⣿",
    "⣿⣿⣿⣿⣿⣿⠟⢁⣄⠘⠓⠀⠀⠀⠀⠀⢠⣶⠟⠁⠀⣀⣀⣀⡀⠀⠙⣿⣿⣿",
    "⣿⣿⣿⣿⠟⠁⢴⠄⠁⠀⠀⠀⣀⣠⣤⣤⣤⣿⡄⠀⢸⡿⠋⢉⢻⣷⣤⣿⣿⣿",
    "⣿⣿⣿⠇⠀⠶⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣷⡀⠸⣷⡀⠛⢀⠙⣿⣿⣿⣿",
    "⣿⣿⡏⠀⠶⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣙⣿⡄⠙⣁⠹⣿⣿⣿",
    "⣿⣿⠁⠰⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀⢉⡁⢿⣿⣿",
    "⣿⣿⠀⣶⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠘⠃⢸⣿⣿",
    "⣿⣿⠀⢤⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠀⠘⠃⢸⣿⣿",
    "⣿⣿⣇⢀⡄⠀⠀⠀⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀⠚⠂⣾⣿⣿",
    "⣿⣿⣿⡄⢠⡦⠀⠀⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠁⠀⠘⠇⢰⣿⣿⣿",
    "⣿⣿⣿⣿⣄⠀⢴⠄⠀⠀⠀⠙⠛⠿⠿⠿⠿⠿⠟⠋⠀⠀⡀⠚⠃⣠⣿⣿⣿⣿",
    "⣿⣿⣿⣿⣿⣷⣄⠐⠛⠀⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⣤⠈⠋⢀⣴⣿⣿⣿⣿⣿",
    "⣿⣿⣿⣿⣿⣿⣿⣷⣦⣤⣁⠘⠃⠠⠶⠀⠶⠄⠘⢀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿",
    "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣶⣶⣶⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿",
  ];
  var storySteps = [
    {
      expect: "learn",
      lines: [fullTexts[1], fullTexts[2], fullTexts[3], fullTexts[4]],
      after: {
        hash: "# Want to open the AI build log?",
        instruction: 'Type "log" and press Enter.',
      },
    },
    {
      expect: "log",
      lines: logStatLines,
      after: {
        hash: "# Curious who made this site?",
        instruction: 'Type "makers" and press Enter.',
      },
    },
    {
      expect: "makers",
      typeMakersWithLinks: true,
      lines: [],
      after: {
        hash: "# Ready to summon the ouroboros?",
        instruction: 'Type "summon" and press Enter.',
      },
    },
    {
      expect: "summon",
      /* One <pre> block: line-height set in JS to cols/rows in ch so the grid is square in the viewport (cells are not square) */
      lines: [STORY_OUROBOROS_ASCII.join("\n")],
      after: {
        hash: "# Transmission complete.",
        instruction: 'Type "restart" to replay.',
      },
    },
  ];
  var storyStepIndex = 0;
  var storyBusy = false;
  function syncTypeMeasures() {
    typeEls.forEach(function (el) {
      var ms = el.previousElementSibling;
      if (ms && ms.classList.contains("site-meta-panel__type-measure")) {
        ms.textContent = el.getAttribute("data-typewriter") || "";
      }
    });
  }
  syncTypeMeasures();
  var typeGen = 0;
  /* Non-null while a story stream can be paused (close) and resumed (reopen). JSON-serializable. */
  var storyTypeResume = null;
  /* While appendStoryAfter runs: merged into tui streamResume so reopen can run spacer+instruction after a paused hash. */
  var pendingAfterAppend = null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var siteMetaWindow = panel.querySelector(".site-meta-panel__window");
  var siteMetaDotClose = document.getElementById("site-meta-dot-close");
  var siteMetaDotMin = document.getElementById("site-meta-dot-minimize");
  var siteMetaDotZoom = document.getElementById("site-meta-dot-zoom");
  var siteMetaDock = document.getElementById("site-meta-dock");
  function syncSiteMetaZoomButton() {
    if (!siteMetaDotZoom || !siteMetaWindow) return;
    var maxed = siteMetaWindow.classList.contains(
      "site-meta-panel__window--max",
    );
    siteMetaDotZoom.setAttribute("aria-pressed", maxed ? "true" : "false");
    siteMetaDotZoom.setAttribute(
      "aria-label",
      maxed ? "Restore window size" : "Zoom window",
    );
  }
  function wait(ms) {
    return new Promise(function (res) {
      setTimeout(res, ms);
    });
  }
  function charDelay() {
    return 8 + Math.random() * 20;
  }
  function scrollPanelToTop() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var sb = getScrollBox();
        sb.scrollTop = 0;
      });
    });
  }
  function resetTypewriter() {
    syncTypeMeasures();
    typeEls.forEach(function (el) {
      el.textContent = "";
      el.classList.remove("site-meta-panel__type-line--active");
    });
  }
  var innerEl = panel.querySelector(".site-meta-panel__inner");
  function setStoryRowsVisible(show) {
    storyRows.forEach(function (row) {
      row.classList.toggle(STORY_HIDDEN_CLASS, !show);
    });
    if (innerEl)
      innerEl.classList.toggle("site-meta-panel__inner--terminal-only", !show);
  }
  setStoryRowsVisible(false);
  var TERM_PROMPT = "ourolabs@origin:~$ ";
  var termPromptEl = panel.querySelector(".site-meta-panel__terminal-prompt");
  function setTermPromptFromDisplay(host) {
    var d = String(host || "ourolabs@origin:~$").replace(/\s+$/, "");
    TERM_PROMPT = d + " ";
    if (termPromptEl) termPromptEl.textContent = d;
  }
  setTermPromptFromDisplay("ourolabs@origin:~$");
  function hideTerminalBlockCursor() {
    if (!termCursor) return;
    termCursor.style.visibility = "hidden";
    termCursor.style.opacity = "0";
    termCursor.style.animation = "none";
  }
  function revealTerminalBlockCursor() {
    if (!termCursor) return;
    termCursor.style.removeProperty("opacity");
    termCursor.style.removeProperty("animation");
  }
  function updateTermBlockCursor() {
    if (!terminalInput || !termCursor || !termMirror) return;
    if (!panel || !panel.classList.contains("site-meta-panel--open")) {
      hideTerminalBlockCursor();
      return;
    }
    if (terminalInput.disabled) {
      hideTerminalBlockCursor();
      return;
    }
    var v = String(terminalInput.value || "");
    var n = v.length;
    var isFocused = document.activeElement === terminalInput;
    if (!isFocused) {
      /* Invitation: show block before first interaction (or after the typed text if any). */
      if (!n) {
        termMirror.textContent = "";
        termCursor.style.left = "0px";
      } else {
        termMirror.textContent = v;
        var wInv = termMirror.offsetWidth;
        var slInv = terminalInput.scrollLeft | 0;
        termCursor.style.left = Math.max(0, wInv - slInv) + "px";
      }
      revealTerminalBlockCursor();
      termCursor.style.visibility = "visible";
      return;
    }
    var start =
      typeof terminalInput.selectionStart === "number"
        ? terminalInput.selectionStart
        : n;
    var end =
      typeof terminalInput.selectionEnd === "number"
        ? terminalInput.selectionEnd
        : n;
    var pos = Math.min(n, Math.max(0, start <= end ? start : end));
    termMirror.textContent = v.slice(0, pos);
    var w = termMirror.offsetWidth;
    var sl = terminalInput.scrollLeft | 0;
    var left = Math.max(0, w - sl);
    termCursor.style.left = left + "px";
    revealTerminalBlockCursor();
    termCursor.style.visibility = "visible";
  }
  if (terminalInput) {
    function scheduleTermCursorUpdate() {
      requestAnimationFrame(function () {
        requestAnimationFrame(updateTermBlockCursor);
      });
    }
    [
      "input",
      "keydown",
      "keyup",
      "click",
      "focus",
      "blur",
      "select",
      "scroll",
    ].forEach(function (ev) {
      terminalInput.addEventListener(ev, function () {
        if (ev === "scroll") {
          updateTermBlockCursor();
          syncTerminalInputViewport();
          return;
        }
        if (ev === "blur") {
          updateTermBlockCursor();
          syncTerminalInputViewport();
          return;
        }
        scheduleTermCursorUpdate();
        if (
          ev === "focus" ||
          ev === "click" ||
          ev === "input" ||
          ev === "keydown" ||
          ev === "keyup"
        ) {
          scheduleTerminalInputViewportSync();
        }
      });
    });
    window.addEventListener(
      "resize",
      function () {
        updateTermBlockCursor();
        scheduleTerminalInputViewportSync();
      },
      { passive: true },
    );
    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        scheduleTerminalInputViewportSync,
        { passive: true },
      );
      window.visualViewport.addEventListener(
        "scroll",
        scheduleTerminalInputViewportSync,
        { passive: true },
      );
    }
  }
  function tryFocusTerminalInput() {
    if (!terminalInput || terminalInput.disabled) return;
    getOpenTriggers().forEach(function (b) {
      if (b && b.blur && document.activeElement === b) b.blur();
    });
    terminalInput.focus({ preventScroll: true });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        syncTerminalInputViewport();
        updateTermBlockCursor();
      });
    });
  }
  function clearTerminalKeyboardLift() {
    if (panel) {
      panel.style.top = "";
      panel.style.bottom = "";
      panel.style.height = "";
      panel.style.minHeight = "";
      panel.style.maxHeight = "";
    }
    if (siteMetaWindow) {
      siteMetaWindow.style.marginTop = "";
      siteMetaWindow.style.height = "";
      siteMetaWindow.style.minHeight = "";
      siteMetaWindow.style.maxHeight = "";
      siteMetaWindow.style.paddingBottom = "";
    }
  }
  function syncTerminalKeyboardLift() {
    if (
      !siteMetaWindow ||
      !panel ||
      !panel.classList.contains("site-meta-panel--open")
    ) {
      clearTerminalKeyboardLift();
      return;
    }
    if (document.activeElement !== terminalInput) {
      clearTerminalKeyboardLift();
      return;
    }
    var vv = window.visualViewport;
    if (!vv) {
      clearTerminalKeyboardLift();
      return;
    }
    var layoutH =
      window.innerHeight || document.documentElement.clientHeight || 0;
    var keyboardH = Math.max(
      0,
      Math.round(layoutH - (vv.height + (vv.offsetTop || 0))),
    );
    if (keyboardH < 60) {
      clearTerminalKeyboardLift();
      return;
    }
    /* Window is `display:flex; flex-direction:column; height:100dvh; box-sizing:border-box`, with the
       scrollable body as `flex:1`. Adding padding-bottom = keyboardH shrinks the body's usable area
       so the terminal form (last child inside body) anchors right above the keyboard. Padding is not
       in the window's transition list, so the lift is instant - no animated lag, no layout fight. */
    siteMetaWindow.style.paddingBottom = keyboardH + "px";
  }
  function syncTerminalInputViewport() {
    if (!panel || !panel.classList.contains("site-meta-panel--open")) {
      clearTerminalKeyboardLift();
      return;
    }
    syncTerminalKeyboardLift();
    var sb = getScrollBox();
    if (!sb) return;
    sb.scrollTop = sb.scrollHeight;
    if (!terminalInputWrap) return;
    var vv = window.visualViewport;
    var viewportBottom = vv
      ? vv.height + vv.offsetTop
      : window.innerHeight || document.documentElement.clientHeight || 0;
    var pad = 12;
    var wrapRect = terminalInputWrap.getBoundingClientRect();
    if (wrapRect.bottom > viewportBottom - pad) {
      sb.scrollTop += wrapRect.bottom - (viewportBottom - pad);
    }
  }
  function scheduleTerminalInputViewportSync() {
    requestAnimationFrame(function () {
      requestAnimationFrame(syncTerminalInputViewport);
    });
  }
  function siteMetaTypeThroughKeydown(e) {
    if (e.key === "Escape") return;
    if (!document.documentElement.classList.contains("site-meta-open")) return;
    if (!panel || !panel.classList.contains("site-meta-panel--open")) return;
    if (!terminalInput || terminalInput.disabled || storyBusy) return;
    if (e.defaultPrevented) return;
    if (document.activeElement === terminalInput) return;
    if (e.key.length !== 1) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var a = document.activeElement;
    if (a) {
      if (a === terminalInput) return;
      if (a.tagName === "BUTTON" && (e.key === " " || e.key === "Enter"))
        return;
      if (
        (a.getAttribute("role") === "button" || a.getAttribute("href")) &&
        (e.key === " " || e.key === "Enter")
      )
        return;
    }
    e.preventDefault();
    if (
      getOpenTriggers().some(function (b) {
        return b && document.activeElement === b;
      })
    ) {
      getOpenTriggers().forEach(function (b) {
        if (b && b.blur) b.blur();
      });
    }
    terminalInput.focus({ preventScroll: true });
    terminalInput.value = String(terminalInput.value || "") + e.key;
    if (terminalInput.setSelectionRange) {
      var l = terminalInput.value.length;
      try {
        terminalInput.setSelectionRange(l, l);
      } catch (err) {}
    }
    try {
      terminalInput.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (err) {}
    updateTermBlockCursor();
  }
  document.addEventListener("keydown", siteMetaTypeThroughKeydown, true);
  function scrollTerminalToBottom() {
    var sb = getScrollBox();
    if (sb) sb.scrollTop = sb.scrollHeight;
  }
  var DIM_CLS = "site-meta-panel__terminal-log-line--dim";
  function inStoryFeedbackMode() {
    return panel && panel.classList.contains("site-meta-panel--story-feedback");
  }
  function applyStoryFeedbackDimToEntireLog() {
    if (!inStoryFeedbackMode() || !terminalLog) return;
    var ch = terminalLog.children;
    for (var di = 0; di < ch.length; di++) {
      var dln = ch[di];
      if (
        dln &&
        dln.nodeType === 1 &&
        dln.classList &&
        !dln.classList.contains("site-meta-panel__terminal-log-line--spacer") &&
        !dln.classList.contains("site-meta-panel__terminal-log-line--feedback")
      ) {
        dln.classList.add(DIM_CLS);
      }
    }
  }
  async function appendStoryAfter(afterBlock, g) {
    if (!terminalLog || !afterBlock) return;
    var ab = {
      hash: afterBlock.hash == null ? "" : String(afterBlock.hash),
      instruction:
        afterBlock.instruction == null ? "" : String(afterBlock.instruction),
    };
    try {
      panel.setAttribute("aria-busy", "true");
      appendTerminalLogSpacer();
      pendingAfterAppend = { after: ab, phase: "beforeHash" };
      if (panel && panel.classList.contains("site-meta-panel--open"))
        storyTypeResume = {
          op: "appendAfter",
          g: g,
          after: ab,
          stage: "beforeHash",
        };
      if (afterBlock.hash) {
        if (g !== typeGen) return;
        await wait(90 + Math.random() * 60);
        if (g !== typeGen) return;
        pendingAfterAppend = { after: ab, phase: "hash" };
        await typeInTerminalLogLineUI(afterBlock.hash, false, true, g);
        if (g !== typeGen) return;
        pendingAfterAppend = { after: ab, phase: "beforeInstruction" };
        if (panel && panel.classList.contains("site-meta-panel--open"))
          storyTypeResume = {
            op: "appendAfter",
            g: g,
            after: ab,
            stage: "beforeInstruction",
          };
        appendTerminalLogSpacer();
      }
      if (afterBlock.instruction) {
        if (g !== typeGen) return;
        await wait(90 + Math.random() * 60);
        if (g !== typeGen) return;
        pendingAfterAppend = { after: ab, phase: "instruction" };
        if (panel && panel.classList.contains("site-meta-panel--open"))
          storyTypeResume = {
            op: "appendAfter",
            g: g,
            after: ab,
            stage: "instruction",
          };
        await typeInTerminalLogLineUI(afterBlock.instruction, false, false, g);
      }
    } finally {
      if (panel) panel.removeAttribute("aria-busy");
      pendingAfterAppend = null;
      if (g === typeGen) storyTypeResume = null;
    }
  }
  function clearTerminalLog() {
    if (terminalLog) terminalLog.textContent = "";
  }
  function appendTerminalStatusReady() {
    if (!terminalLog) return;
    var line = document.createElement("span");
    line.className =
      "site-meta-panel__terminal-log-line site-meta-panel__terminal-log-line--status";
    var lab = document.createElement("span");
    lab.className = "site-meta-panel__terminal-log-status-label";
    lab.textContent = "Terminal Status: ";
    var el = document.createElement("span");
    el.className = "site-meta-panel__terminal-log-status-ellipsis";
    el.setAttribute("aria-hidden", "true");
    var ready = document.createElement("span");
    ready.className = "site-meta-panel__terminal-log-status-ready";
    ready.textContent = "Ready";
    line.appendChild(lab);
    line.appendChild(el);
    line.appendChild(ready);
    terminalLog.appendChild(line);
    while (terminalLog.childElementCount > 200) {
      terminalLog.removeChild(terminalLog.firstElementChild);
    }
    scrollTerminalToBottom();
  }
  var STORY_CMD_ECHO_ACCENT = {
    learn: 1,
    log: 1,
    makers: 1,
    summon: 1,
    restart: 1,
  };
  function appendTerminalCommandEcho(raw) {
    if (!terminalLog) return;
    var line = document.createElement("span");
    line.className =
      "site-meta-panel__terminal-log-line site-meta-panel__terminal-log-line--command";
    var pre = document.createElement("span");
    pre.className = "site-meta-panel__terminal-log-prompt-prefix";
    pre.textContent = TERM_PROMPT;
    var echo = document.createElement("span");
    echo.className = "site-meta-panel__terminal-log-echo";
    var lc = String(raw || "")
      .trim()
      .toLowerCase();
    if (STORY_CMD_ECHO_ACCENT[lc]) {
      var ec = document.createElement("span");
      ec.className = "site-meta-panel__terminal-log-echo-cmd";
      ec.textContent = raw;
      echo.appendChild(ec);
    } else {
      echo.textContent = raw;
    }
    line.appendChild(pre);
    line.appendChild(echo);
    terminalLog.appendChild(line);
    while (terminalLog.childElementCount > 200) {
      terminalLog.removeChild(terminalLog.firstElementChild);
    }
    scrollTerminalToBottom();
  }
  function logLineClassForText(text, isError, isAction) {
    var t = String(text || "");
    var head =
      !isError && !isAction && t.indexOf("#") === 0
        ? " site-meta-panel__terminal-log-line--head"
        : "";
    return (
      "site-meta-panel__terminal-log-line" +
      (isError
        ? " site-meta-panel__terminal-log-line--error"
        : isAction
          ? " site-meta-panel__terminal-log-line--action"
          : " site-meta-panel__terminal-log-line--stream") +
      head
    );
  }
  function appendTerminalLogSpacer() {
    if (!terminalLog) return;
    var s = document.createElement("span");
    s.className =
      "site-meta-panel__terminal-log-line site-meta-panel__terminal-log-line--spacer";
    s.setAttribute("aria-hidden", "true");
    s.appendChild(document.createTextNode("\u00A0"));
    terminalLog.appendChild(s);
    while (terminalLog.childElementCount > 200) {
      terminalLog.removeChild(terminalLog.firstElementChild);
    }
    scrollTerminalToBottom();
  }
  function parseTypeAndPressLine(t) {
    var m = String(t || "").match(/^(Type ")([^"]+)(" and press Enter\.)$/);
    if (m) return { pre: m[1], cmd: m[2], post: m[3] };
    return null;
  }
  function buildTerminalLogLineContent(text, isError, isAction, fillAll) {
    var t = String(text || "");
    var line = document.createElement("span");
    line.className = logLineClassForText(t, isError, isAction);
    if (isAction && t.indexOf("#") === 0) {
      var h = document.createElement("span");
      h.className = "site-meta-panel__terminal-log-hash";
      var q = document.createElement("span");
      q.className = "site-meta-panel__terminal-log-action-question";
      h.textContent = "#";
      if (fillAll) q.textContent = t.slice(1);
      line.appendChild(h);
      line.appendChild(q);
      return { line: line, mode: "hash", restEl: q, restText: t.slice(1) };
    }
    if (!isError && !isAction && parseTypeAndPressLine(t)) {
      var p = parseTypeAndPressLine(t);
      var pre = document.createElement("span");
      pre.className = "site-meta-panel__terminal-log-instr-pre";
      var cmd = document.createElement("span");
      cmd.className = "site-meta-panel__terminal-log-instr-cmd";
      var post = document.createElement("span");
      post.className = "site-meta-panel__terminal-log-instr-post";
      if (fillAll) {
        pre.textContent = p.pre;
        cmd.textContent = p.cmd;
        post.textContent = p.post;
      }
      line.appendChild(pre);
      line.appendChild(cmd);
      line.appendChild(post);
      return {
        line: line,
        mode: "typeCmd",
        preEl: pre,
        cmdEl: cmd,
        postEl: post,
        pre: p.pre,
        cmd: p.cmd,
        post: p.post,
      };
    }
    line.textContent = fillAll ? t : "";
    return { line: line, mode: "plain", text: t };
  }
  function appendTerminalLogLine(text, isError, isAction) {
    if (!terminalLog) return;
    var b = buildTerminalLogLineContent(text, isError, isAction, true);
    terminalLog.appendChild(b.line);
    while (terminalLog.childElementCount > 200) {
      terminalLog.removeChild(terminalLog.firstElementChild);
    }
    scrollTerminalToBottom();
  }
  async function typeInTerminalStatusReady(g) {
    if (!terminalLog) return;
    var line = document.createElement("span");
    line.className =
      "site-meta-panel__terminal-log-line site-meta-panel__terminal-log-line--status";
    var lab = document.createElement("span");
    lab.className = "site-meta-panel__terminal-log-status-label";
    lab.textContent = "Terminal Status: ";
    var dots = document.createElement("span");
    dots.className = "site-meta-panel__terminal-log-status-ellipsis";
    var ready = document.createElement("span");
    ready.className = "site-meta-panel__terminal-log-status-ready";
    line.appendChild(lab);
    line.appendChild(dots);
    line.appendChild(ready);
    terminalLog.appendChild(line);
    var part2 = "Ready";
    var ELL = ["", ".", "..", "..."];
    if (reduceMotion.matches) {
      ready.textContent = part2;
    } else {
      var r, step, cyc;
      for (cyc = 0; cyc < 2; cyc++) {
        for (step = 0; step < ELL.length; step++) {
          if (g !== typeGen) return;
          dots.textContent = ELL[step];
          await wait(120 + Math.random() * 55);
        }
        if (g !== typeGen) return;
        /* Brief hold on "..." at end of each sweep */
        await wait(85 + Math.random() * 40);
        if (cyc < 1) {
          if (g !== typeGen) return;
          dots.textContent = "";
          await wait(135 + Math.random() * 50);
        }
      }
      if (g !== typeGen) return;
      dots.textContent = "";
      for (r = 0; r < part2.length; r++) {
        if (g !== typeGen) return;
        ready.textContent = part2.slice(0, r + 1);
        await wait(charDelay());
      }
    }
    while (terminalLog.childElementCount > 200) {
      terminalLog.removeChild(terminalLog.firstElementChild);
    }
    scrollTerminalToBottom();
  }
  function markTuiResume(obj) {
    if (panel && panel.classList.contains("site-meta-panel--open")) {
      if (pendingAfterAppend && pendingAfterAppend.after) {
        obj.appendChase = {
          after: pendingAfterAppend.after,
          phase: pendingAfterAppend.phase,
        };
      }
      storyTypeResume = obj;
    }
  }
  function wireTuiLineFromDom(b, existing) {
    b.line = existing;
    if (b.mode === "hash") {
      b.restEl = existing.querySelector(
        ".site-meta-panel__terminal-log-action-question",
      );
    } else if (b.mode === "typeCmd") {
      b.preEl = existing.querySelector(
        ".site-meta-panel__terminal-log-instr-pre",
      );
      b.cmdEl = existing.querySelector(
        ".site-meta-panel__terminal-log-instr-cmd",
      );
      b.postEl = existing.querySelector(
        ".site-meta-panel__terminal-log-instr-post",
      );
    }
  }
  async function typeInTerminalLogLineUI(text, isError, isAction, g, resume) {
    if (!terminalLog) return;
    var b = buildTerminalLogLineContent(text, isError, isAction, false);
    var fromResume = !!(resume && resume._reuse);
    if (fromResume) {
      var ex = getLastNonSpacerLogLine();
      if (!ex) return;
      wireTuiLineFromDom(b, ex);
    } else {
      terminalLog.appendChild(b.line);
    }
    var line = b.line;
    var fromHash =
      fromResume && resume && resume.mode === "hash" ? resume.restR | 0 | 0 : 0;
    var fromPlain =
      fromResume && resume && resume.mode === "plain"
        ? resume.plainI | 0 | 0
        : 0;
    var tc =
      fromResume && resume && resume.mode === "typeCmd" && resume.tc
        ? resume.tc
        : null;
    if (reduceMotion.matches) {
      if (b.mode === "hash") {
        b.restEl.textContent = b.restText;
      } else if (b.mode === "typeCmd") {
        b.preEl.textContent = b.pre;
        b.cmdEl.textContent = b.cmd;
        b.postEl.textContent = b.post;
      } else {
        line.textContent = b.text;
      }
    } else if (b.mode === "hash") {
      for (var r = fromHash; r < b.restText.length; r++) {
        if (g !== typeGen) return;
        b.restEl.textContent = b.restText.slice(0, r + 1);
        markTuiResume({
          op: "tui",
          g: g,
          mode: "hash",
          text: text,
          isError: !!isError,
          isAction: !!isAction,
          restR: r + 1,
        });
        await wait(charDelay());
      }
    } else if (b.mode === "typeCmd") {
      var pi, ci, qi;
      if (!fromResume) {
        for (pi = 0; pi < b.pre.length; pi++) {
          if (g !== typeGen) return;
          b.preEl.textContent = b.pre.slice(0, pi + 1);
          markTuiResume({
            op: "tui",
            g: g,
            mode: "typeCmd",
            text: text,
            isError: !!isError,
            isAction: !!isAction,
            tc: { phase: "pre", pi: pi + 1, ci: 0, qi: 0 },
          });
          await wait(charDelay());
        }
        for (ci = 0; ci < b.cmd.length; ci++) {
          if (g !== typeGen) return;
          b.cmdEl.textContent = b.cmd.slice(0, ci + 1);
          markTuiResume({
            op: "tui",
            g: g,
            mode: "typeCmd",
            text: text,
            isError: !!isError,
            isAction: !!isAction,
            tc: { phase: "cmd", pi: b.pre.length, ci: ci + 1, qi: 0 },
          });
          await wait(charDelay());
        }
        for (qi = 0; qi < b.post.length; qi++) {
          if (g !== typeGen) return;
          b.postEl.textContent = b.post.slice(0, qi + 1);
          markTuiResume({
            op: "tui",
            g: g,
            mode: "typeCmd",
            text: text,
            isError: !!isError,
            isAction: !!isAction,
            tc: {
              phase: "post",
              pi: b.pre.length,
              ci: b.cmd.length,
              qi: qi + 1,
            },
          });
          await wait(charDelay());
        }
      } else if (resume && resume.mode === "typeCmd" && resume.tc) {
        var tcr0 = resume.tc;
        var ph0 = tcr0.phase || "pre";
        if (ph0 === "pre") {
          for (pi = tcr0.pi | 0 | 0; pi < b.pre.length; pi++) {
            if (g !== typeGen) return;
            b.preEl.textContent = b.pre.slice(0, pi + 1);
            markTuiResume({
              op: "tui",
              g: g,
              mode: "typeCmd",
              text: text,
              isError: !!isError,
              isAction: !!isAction,
              tc: { phase: "pre", pi: pi + 1, ci: 0, qi: 0 },
            });
            await wait(charDelay());
          }
          for (ci = 0; ci < b.cmd.length; ci++) {
            if (g !== typeGen) return;
            b.cmdEl.textContent = b.cmd.slice(0, ci + 1);
            markTuiResume({
              op: "tui",
              g: g,
              mode: "typeCmd",
              text: text,
              isError: !!isError,
              isAction: !!isAction,
              tc: { phase: "cmd", pi: b.pre.length, ci: ci + 1, qi: 0 },
            });
            await wait(charDelay());
          }
          for (qi = 0; qi < b.post.length; qi++) {
            if (g !== typeGen) return;
            b.postEl.textContent = b.post.slice(0, qi + 1);
            markTuiResume({
              op: "tui",
              g: g,
              mode: "typeCmd",
              text: text,
              isError: !!isError,
              isAction: !!isAction,
              tc: {
                phase: "post",
                pi: b.pre.length,
                ci: b.cmd.length,
                qi: qi + 1,
              },
            });
            await wait(charDelay());
          }
        } else if (ph0 === "cmd") {
          b.preEl.textContent = b.pre;
          for (ci = tcr0.ci | 0 | 0; ci < b.cmd.length; ci++) {
            if (g !== typeGen) return;
            b.cmdEl.textContent = b.cmd.slice(0, ci + 1);
            markTuiResume({
              op: "tui",
              g: g,
              mode: "typeCmd",
              text: text,
              isError: !!isError,
              isAction: !!isAction,
              tc: { phase: "cmd", pi: b.pre.length, ci: ci + 1, qi: 0 },
            });
            await wait(charDelay());
          }
          for (qi = 0; qi < b.post.length; qi++) {
            if (g !== typeGen) return;
            b.postEl.textContent = b.post.slice(0, qi + 1);
            markTuiResume({
              op: "tui",
              g: g,
              mode: "typeCmd",
              text: text,
              isError: !!isError,
              isAction: !!isAction,
              tc: {
                phase: "post",
                pi: b.pre.length,
                ci: b.cmd.length,
                qi: qi + 1,
              },
            });
            await wait(charDelay());
          }
        } else if (ph0 === "post") {
          b.preEl.textContent = b.pre;
          b.cmdEl.textContent = b.cmd;
          for (qi = tcr0.qi | 0 | 0; qi < b.post.length; qi++) {
            if (g !== typeGen) return;
            b.postEl.textContent = b.post.slice(0, qi + 1);
            markTuiResume({
              op: "tui",
              g: g,
              mode: "typeCmd",
              text: text,
              isError: !!isError,
              isAction: !!isAction,
              tc: {
                phase: "post",
                pi: b.pre.length,
                ci: b.cmd.length,
                qi: qi + 1,
              },
            });
            await wait(charDelay());
          }
        }
      }
    } else {
      var full = b.text;
      for (var i2 = fromPlain; i2 < full.length; i2++) {
        if (g !== typeGen) return;
        line.textContent += full.charAt(i2);
        markTuiResume({
          op: "tui",
          g: g,
          mode: "plain",
          text: text,
          isError: !!isError,
          isAction: !!isAction,
          plainI: i2 + 1,
        });
        await wait(charDelay());
      }
    }
    while (terminalLog.childElementCount > 200) {
      terminalLog.removeChild(terminalLog.firstElementChild);
    }
    scrollTerminalToBottom();
  }
  var FEEDBACK_BDY = " site-meta-panel__terminal-log-line--feedback";
  function applyBrailleBlockMetrics(line, raw) {
    var full = String(raw || "");
    if (!/[\u2800-\u28FF]/.test(full) || full.indexOf("\n") < 0) return;
    line.classList.add("site-meta-panel__terminal-log-line--braille-block");
    var L = full.split("\n");
    var rows = L.length;
    var cols = 0;
    for (var li = 0; li < L.length; li++) {
      if (L[li].length > cols) cols = L[li].length;
    }
    if (rows > 0 && cols > 0) {
      line.style.lineHeight = "calc(" + cols + " / " + rows + " * 1ch)";
    }
  }
  function getLastNonSpacerLogLine() {
    if (!terminalLog) return null;
    var ch = terminalLog.children;
    for (var n = ch.length - 1; n >= 0; n--) {
      var le = ch[n];
      if (
        le &&
        le.nodeType === 1 &&
        le.classList &&
        !le.classList.contains("site-meta-panel__terminal-log-line--spacer")
      ) {
        return le;
      }
    }
    return null;
  }
  async function typeTerminalLogLine(text, isError, g, startFrom, tail) {
    if (!terminalLog) return;
    var full = String(text || "");
    var from = startFrom | 0 | 0;
    var line;
    if (from > 0) {
      line = getLastNonSpacerLogLine();
      if (!line) return;
    } else {
      line = document.createElement("span");
      line.className = logLineClassForText(text, isError, false) + FEEDBACK_BDY;
      applyBrailleBlockMetrics(line, full);
      terminalLog.appendChild(line);
    }
    if (reduceMotion.matches) {
      line.textContent = full;
    } else {
      for (var i = from; i < full.length; i++) {
        if (g !== typeGen) return;
        line.textContent += full.charAt(i);
        if (panel && panel.classList.contains("site-meta-panel--open")) {
          storyTypeResume = {
            op: "line",
            g: g,
            text: full,
            isError: !!isError,
            i: i + 1,
            tail: tail || null,
          };
        }
        scrollTerminalToBottom();
        await wait(charDelay());
      }
    }
    while (terminalLog.childElementCount > 200) {
      terminalLog.removeChild(terminalLog.firstElementChild);
    }
    scrollTerminalToBottom();
  }
  function appendMakersTextChunk(line, ch) {
    if (!line.lastChild || line.lastChild.nodeType !== 3) {
      line.appendChild(document.createTextNode(""));
    }
    line.lastChild.textContent += ch;
  }
  async function typeMakersLogLineWithLinks(g) {
    if (!terminalLog) return;
    var line = document.createElement("span");
    line.className =
      "site-meta-panel__terminal-log-line site-meta-panel__terminal-log-line--stream" +
      FEEDBACK_BDY;
    line.style.whiteSpace = "pre-wrap";
    terminalLog.appendChild(line);
    var parts = [
      { type: "link", text: "Jennie Perri", href: STORY_MAKERS_LINK_JENNIE },
      { type: "text", text: " and " },
      { type: "link", text: "Inah Mercedes", href: STORY_MAKERS_LINK_INAH },
      {
        type: "text",
        text: ".\n\nWe’re two sisters from Miami, Florida, who have been making things together in one form or another for most of our lives.",
      },
    ];
    if (reduceMotion.matches) {
      if (g !== typeGen) return;
      for (var p = 0; p < parts.length; p++) {
        var pr = parts[p];
        if (pr.type === "text") {
          line.appendChild(document.createTextNode(pr.text));
        } else {
          var ax = document.createElement("a");
          ax.className = "site-meta-panel__terminal-log-link";
          ax.href = pr.href;
          ax.target = "_blank";
          ax.rel = "noopener noreferrer";
          ax.textContent = pr.text;
          line.appendChild(ax);
        }
      }
    } else {
      for (var pi = 0; pi < parts.length; pi++) {
        var part = parts[pi];
        if (g !== typeGen) return;
        if (part.type === "text") {
          for (var c = 0; c < part.text.length; c++) {
            if (g !== typeGen) return;
            appendMakersTextChunk(line, part.text.charAt(c));
            if (panel && panel.classList.contains("site-meta-panel--open"))
              storyTypeResume = {
                op: "makers",
                g: g,
                pi: pi,
                k: "tx",
                c: c + 1,
              };
            scrollTerminalToBottom();
            await wait(charDelay());
          }
        } else {
          var a = document.createElement("a");
          a.className = "site-meta-panel__terminal-log-link";
          a.href = part.href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          line.appendChild(a);
          for (var d = 0; d < part.text.length; d++) {
            if (g !== typeGen) return;
            a.textContent = part.text.slice(0, d + 1);
            if (panel && panel.classList.contains("site-meta-panel--open"))
              storyTypeResume = {
                op: "makers",
                g: g,
                pi: pi,
                k: "ln",
                d: d + 1,
              };
            scrollTerminalToBottom();
            await wait(charDelay());
          }
        }
      }
    }
    if (g === typeGen) storyTypeResume = null;
    while (terminalLog.childElementCount > 200) {
      terminalLog.removeChild(terminalLog.firstElementChild);
    }
    scrollTerminalToBottom();
  }
  function setTerminalInputEnabled(on) {
    if (!terminalInput) return;
    terminalInput.disabled = !on;
    if (!on) hideTerminalBlockCursor();
    if (on) {
      terminalInput.focus({ preventScroll: true });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          syncTerminalInputViewport();
          updateTermBlockCursor();
        });
      });
    }
  }
  function setTerminalFormAwaitingReady(awaiting) {
    if (!terminalForm) return;
    terminalForm.classList.toggle(
      "site-meta-panel__terminal-form--awaiting-ready",
      !!awaiting,
    );
    terminalForm.setAttribute("aria-hidden", awaiting ? "true" : "false");
  }
  var TERMINAL_STORY_STORAGE_KEY = "ouro-site-meta-terminal-v2";
  /* New value on every full navigation / reload - used so localStorage snapshot only applies in this page session. */
  var terminalPageLoadOrigin =
    typeof performance !== "undefined" &&
    typeof performance.timeOrigin === "number"
      ? performance.timeOrigin
      : Date.now();
  function clearTerminalStoryStorage() {
    try {
      localStorage.removeItem(TERMINAL_STORY_STORAGE_KEY);
    } catch (x) {}
  }
  function saveTerminalStoryState() {
    if (!panel || !terminalLog) return;
    var sr = storyTypeResume;
    /* Mid-stream: still persist (streamResume) so feedback can resume after close; if busy with no trackable stream, clear. */
    if ((storyBusy || panel.getAttribute("aria-busy") === "true") && !sr) {
      clearTerminalStoryStorage();
      return;
    }
    try {
      var sb = getScrollBox();
      var data = {
        v: 1,
        complete: true,
        pageLoadOrigin: terminalPageLoadOrigin,
        stepIndex: storyStepIndex | 0,
        storyFeedback: panel.classList.contains(
          "site-meta-panel--story-feedback",
        ),
        logHTML: terminalLog.innerHTML,
        termPrompt: termPromptEl
          ? String(termPromptEl.textContent || "")
          : "ourolabs@origin:~$",
        innerTerminalOnly: !!(
          innerEl &&
          innerEl.classList.contains("site-meta-panel__inner--terminal-only")
        ),
        formAwaiting: !!(
          terminalForm &&
          terminalForm.classList.contains(
            "site-meta-panel__terminal-form--awaiting-ready",
          )
        ),
        input: terminalInput ? String(terminalInput.value || "") : "",
        bodyScroll: sb ? sb.scrollTop | 0 : 0,
        streamResume: sr ? JSON.parse(JSON.stringify(sr)) : null,
      };
      localStorage.setItem(TERMINAL_STORY_STORAGE_KEY, JSON.stringify(data));
    } catch (x) {}
  }
  function tryRestoreTerminalFromStorage() {
    if (!panel || !terminalLog) return null;
    try {
      var raw = localStorage.getItem(TERMINAL_STORY_STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data.v !== 1) return null;
      if (data.pageLoadOrigin !== terminalPageLoadOrigin) {
        clearTerminalStoryStorage();
        return null;
      }
      if (data.complete !== true) {
        clearTerminalStoryStorage();
        return null;
      }
      if (
        typeof data.stepIndex !== "number" ||
        data.stepIndex < 0 ||
        data.stepIndex > storySteps.length
      )
        return null;
      storyStepIndex = data.stepIndex | 0;
      if (data.storyFeedback)
        panel.classList.add("site-meta-panel--story-feedback");
      else panel.classList.remove("site-meta-panel--story-feedback");
      terminalLog.innerHTML = data.logHTML == null ? "" : String(data.logHTML);
      setTermPromptFromDisplay(data.termPrompt || "ourolabs@origin:~$");
      if (data.innerTerminalOnly === false) setStoryRowsVisible(true);
      else setStoryRowsVisible(false);
      setTerminalFormAwaitingReady(!!data.formAwaiting);
      storyBusy = false;
      typeGen = (typeGen | 0) + 1000;
      if (terminalInput)
        terminalInput.value = data.input != null ? data.input : "";
      setTerminalInputEnabled(!data.formAwaiting);
      if (getScrollBox() && data.bodyScroll > 0)
        getScrollBox().scrollTop = data.bodyScroll | 0;
      return data;
    } catch (x) {
      return null;
    }
  }
  /* Minimize and zoom increment typeGen (cancel) before persisting; resume from the snapshot we just saved. openPanel does this via tryRestore; restoreFromMinimize and zoom did not, so the # / Type CTA after learn could be missing */
  function playStreamResumeIfSavedInStorage() {
    if (!panel || !terminalLog) return;
    if (!panel.classList.contains("site-meta-panel--open")) return;
    try {
      var raw = localStorage.getItem(TERMINAL_STORY_STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data.v !== 1 || !data.streamResume) return;
      if (data.pageLoadOrigin !== terminalPageLoadOrigin) return;
      var sr0 = data.streamResume;
      if (
        sr0.op === "tui" ||
        sr0.op === "line" ||
        sr0.op === "appendAfter" ||
        sr0.op === "makers"
      )
        void resumePausedStoryFromStorage(sr0);
    } catch (x) {}
  }
  async function resumePausedStoryFromStorage(sr) {
    if (!sr || !terminalLog) return;
    if (sr.op === "tui" && (sr.text == null || !sr.mode)) return;
    if (sr.op === "line" && sr.text == null) return;
    if (sr.op === "appendAfter" && (!sr.after || !sr.stage)) return;
    var g = ++typeGen;
    storyBusy = true;
    setTerminalInputEnabled(false);
    if (panel) panel.setAttribute("aria-busy", "true");
    try {
      if (sr.op === "tui") {
        var st = Object.assign({ _reuse: true }, sr);
        if (st.g != null) delete st.g;
        var wasMode = st.mode;
        var chase = st.appendChase;
        await typeInTerminalLogLineUI(st.text, st.isError, st.isAction, g, st);
        if (g !== typeGen) return;
        var finishedInstruction = wasMode === "plain" || wasMode === "typeCmd";
        if (
          chase &&
          chase.after &&
          wasMode === "hash" &&
          chase.after.instruction
        ) {
          var af0 = chase.after;
          if (g !== typeGen) return;
          if (panel && panel.classList.contains("site-meta-panel--open"))
            storyTypeResume = {
              op: "appendAfter",
              g: g,
              after: af0,
              stage: "beforeInstruction",
            };
          appendTerminalLogSpacer();
          await wait(40 + Math.random() * 35);
          if (g !== typeGen) return;
          if (panel && panel.classList.contains("site-meta-panel--open"))
            storyTypeResume = {
              op: "appendAfter",
              g: g,
              after: af0,
              stage: "instruction",
            };
          await typeInTerminalLogLineUI(af0.instruction, false, false, g);
          if (g !== typeGen) return;
          finishedInstruction = true;
        }
        if (g === typeGen && finishedInstruction && storyStepIndex > 0) {
          var ep = storySteps[storyStepIndex - 1];
          if (ep && ep.expect === "summon")
            setTermPromptFromDisplay("ourolabs@origin:~$");
        }
      } else if (sr.op === "line") {
        var tail0 = sr.tail || null;
        await typeTerminalLogLine(
          String(sr.text),
          !!sr.isError,
          g,
          sr.i | 0 | 0,
          tail0,
        );
        if (g !== typeGen) return;
        if (
          tail0 &&
          typeof tail0.stepIndex === "number" &&
          storySteps[tail0.stepIndex] &&
          Array.isArray(storySteps[tail0.stepIndex].lines)
        ) {
          var stp0 = storySteps[tail0.stepIndex];
          for (var j0 = (tail0.lineIdx | 0) + 1; j0 < stp0.lines.length; j0++) {
            if (g !== typeGen) return;
            var ex0 = panel.classList.contains(
              "site-meta-panel--story-feedback",
            )
              ? 95
              : 0;
            await wait(85 + ex0 + Math.random() * 90);
            if (g !== typeGen) return;
            var nt0 = {
              stepIndex: tail0.stepIndex,
              lineIdx: j0,
              after: tail0.after || null,
              expect: tail0.expect || "",
            };
            if (panel && panel.classList.contains("site-meta-panel--open")) {
              storyTypeResume = {
                op: "line",
                g: g,
                text: stp0.lines[j0],
                isError: false,
                i: 0,
                tail: nt0,
              };
            }
            await typeTerminalLogLine(stp0.lines[j0], false, g, 0, nt0);
          }
          if (g !== typeGen) return;
          if (storyStepIndex === tail0.stepIndex) storyStepIndex += 1;
          if (tail0.after) {
            await appendStoryAfter(tail0.after, g);
            if (g !== typeGen) return;
          }
          if (tail0.expect === "summon")
            setTermPromptFromDisplay("ourolabs@origin:~$");
        }
      } else if (sr.op === "appendAfter") {
        var af = sr.after;
        if (sr.stage === "beforeHash" && af && af.hash) {
          if (g !== typeGen) return;
          await wait(50 + Math.random() * 40);
          if (g !== typeGen) return;
          await typeInTerminalLogLineUI(af.hash, false, true, g);
          if (g !== typeGen) return;
          if (af.instruction) {
            if (panel && panel.classList.contains("site-meta-panel--open"))
              storyTypeResume = {
                op: "appendAfter",
                g: g,
                after: af,
                stage: "beforeInstruction",
              };
            appendTerminalLogSpacer();
            await wait(50 + Math.random() * 40);
            if (g !== typeGen) return;
            if (panel && panel.classList.contains("site-meta-panel--open"))
              storyTypeResume = {
                op: "appendAfter",
                g: g,
                after: af,
                stage: "instruction",
              };
            await typeInTerminalLogLineUI(af.instruction, false, false, g);
            if (g === typeGen && storyStepIndex > 0) {
              var e1 = storySteps[storyStepIndex - 1];
              if (e1 && e1.expect === "summon")
                setTermPromptFromDisplay("ourolabs@origin:~$");
            }
          }
        } else if (sr.stage === "beforeInstruction" && af && af.instruction) {
          if (g !== typeGen) return;
          await wait(50 + Math.random() * 40);
          if (g !== typeGen) return;
          if (panel && panel.classList.contains("site-meta-panel--open"))
            storyTypeResume = {
              op: "appendAfter",
              g: g,
              after: af,
              stage: "instruction",
            };
          await typeInTerminalLogLineUI(af.instruction, false, false, g);
          if (g === typeGen && storyStepIndex > 0) {
            var e2 = storySteps[storyStepIndex - 1];
            if (e2 && e2.expect === "summon")
              setTermPromptFromDisplay("ourolabs@origin:~$");
          }
        }
      } else if (sr.op === "makers") {
        var mm = getLastNonSpacerLogLine();
        if (mm && mm.parentNode === terminalLog) terminalLog.removeChild(mm);
        await typeMakersLogLineWithLinks(g);
      }
    } finally {
      if (panel) panel.removeAttribute("aria-busy");
      if (g === typeGen) {
        storyTypeResume = null;
        storyBusy = false;
        if (
          panel &&
          panel.classList.contains("site-meta-panel--open") &&
          terminalForm &&
          !terminalForm.classList.contains(
            "site-meta-panel__terminal-form--awaiting-ready",
          )
        ) {
          setTerminalInputEnabled(true);
        }
        saveTerminalStoryState();
      }
    }
  }
  async function runStoryStep(step, g) {
    await wait(130);
    if (g !== typeGen) return;
    panel.setAttribute("aria-busy", "true");
    try {
      if (step.typeMakersWithLinks) {
        if (g !== typeGen) return;
        await typeMakersLogLineWithLinks(g);
      } else {
        for (var i = 0; i < step.lines.length; i++) {
          if (g !== typeGen) return;
          var tail = {
            stepIndex: storyStepIndex,
            lineIdx: i,
            after: step.after || null,
            expect: step.expect || "",
          };
          /* Prime resume between lines so a close during the inter-line wait can still finish the section. */
          if (panel && panel.classList.contains("site-meta-panel--open")) {
            storyTypeResume = {
              op: "line",
              g: g,
              text: step.lines[i],
              isError: false,
              i: 0,
              tail: tail,
            };
          }
          await typeTerminalLogLine(step.lines[i], false, g, 0, tail);
          if (i < step.lines.length - 1) {
            var extra = panel.classList.contains(
              "site-meta-panel--story-feedback",
            )
              ? 95
              : 0;
            await wait(85 + extra + Math.random() * 90);
          }
        }
      }
    } finally {
      if (panel) panel.removeAttribute("aria-busy");
    }
  }
  async function resetInteractiveStory() {
    clearTerminalStoryStorage();
    typeGen++;
    var g = typeGen;
    storyStepIndex = 0;
    storyBusy = true;
    panel.classList.remove("site-meta-panel--story-feedback");
    resetTypewriter();
    setStoryRowsVisible(false);
    setTermPromptFromDisplay("ourolabs@origin:~$");
    setTerminalInputEnabled(false);
    setTerminalFormAwaitingReady(true);
    clearTerminalLog();
    try {
      await wait(130);
      if (g !== typeGen) return;
      panel.setAttribute("aria-busy", "true");
      await typeInTerminalStatusReady(g);
      if (g !== typeGen) return;
      setTerminalFormAwaitingReady(false);
      await wait(90 + Math.random() * 60);
      if (g !== typeGen) return;
      appendTerminalLogSpacer();
      await typeInTerminalLogLineUI(
        "# Want to learn how we made this site?",
        false,
        true,
        g,
      );
      if (g !== typeGen) return;
      await wait(90 + Math.random() * 60);
      if (g !== typeGen) return;
      appendTerminalLogSpacer();
      await typeInTerminalLogLineUI(
        'Type "learn" and press Enter.',
        false,
        false,
        g,
      );
    } finally {
      if (panel) panel.removeAttribute("aria-busy");
      if (g === typeGen) {
        storyBusy = false;
        if (panel.classList.contains("site-meta-panel--open")) {
          setTerminalInputEnabled(true);
          if (terminalInput) terminalInput.value = "";
        }
      }
    }
  }
  function scrambleFatalText() {
    var base = "FATAL ERROR";
    var noise = "█▓▒░*·";
    var out = "";
    for (var i = 0; i < base.length; i++) {
      var c = base.charAt(i);
      if (c === " ") {
        out += " ";
        continue;
      }
      if (Math.random() < 0.38) {
        out += noise.charAt(Math.floor(Math.random() * noise.length));
      } else {
        out += c;
      }
    }
    return out;
  }
  function clearTermFatalVisuals() {
    if (!panel) return;
    var termUi = panel.querySelector(".site-meta-panel__terminal-ui");
    if (termUi) {
      termUi.classList.remove(
        "site-meta-panel__terminal-ui--fatal-glitch",
        "site-meta-panel__terminal-ui--fatal-fade",
      );
    }
  }
  async function runRestartFatalSequence(g) {
    if (!panel || !terminalLog) return false;
    var termUi = panel.querySelector(".site-meta-panel__terminal-ui");
    if (!termUi) return false;
    var iv = 0;
    var fatalLine = document.createElement("span");
    fatalLine.className =
      "site-meta-panel__terminal-log-line site-meta-panel__terminal-log-line--error site-meta-panel__terminal-log-line--fatal-burst";
    fatalLine.textContent = "FATAL ERROR";
    terminalLog.appendChild(fatalLine);
    scrollTerminalToBottom();
    if (!reduceMotion.matches) {
      fatalLine.classList.add(
        "site-meta-panel__terminal-log-line--fatal-preflash",
      );
      await new Promise(function (resolve) {
        var settled = false;
        var to = setTimeout(finish, 900);
        function finish() {
          if (settled) return;
          settled = true;
          clearTimeout(to);
          if (fatalLine.isConnected)
            fatalLine.classList.remove(
              "site-meta-panel__terminal-log-line--fatal-preflash",
            );
          resolve();
        }
        fatalLine.addEventListener("animationend", function onAE(e) {
          if (e.target !== fatalLine) return;
          if (
            String(e.animationName).indexOf("site-meta-fatal-preflash") === -1
          )
            return;
          fatalLine.removeEventListener("animationend", onAE);
          finish();
        });
      });
    } else {
      await wait(200);
    }
    if (g !== typeGen) {
      if (fatalLine.parentNode) fatalLine.parentNode.removeChild(fatalLine);
      clearTermFatalVisuals();
      return false;
    }
    termUi.classList.add("site-meta-panel__terminal-ui--fatal-glitch");
    if (!reduceMotion.matches) {
      iv = setInterval(function () {
        if (g !== typeGen) return;
        fatalLine.textContent = scrambleFatalText();
        scrollTerminalToBottom();
      }, 72);
    } else {
      fatalLine.textContent = "FATAL ERROR";
    }
    var preFade = reduceMotion.matches ? 280 : 1050;
    await wait(preFade);
    if (iv) clearInterval(iv);
    if (g !== typeGen) {
      if (fatalLine.parentNode) fatalLine.parentNode.removeChild(fatalLine);
      clearTermFatalVisuals();
      return false;
    }
    if (!reduceMotion.matches) fatalLine.textContent = "FATAL ERROR";
    return new Promise(function (resolve) {
      var settled = false;
      var to = 0;
      function finish(ok) {
        if (settled) return;
        settled = true;
        termUi.removeEventListener("transitionend", onT);
        if (to) clearTimeout(to);
        if (ok) {
          clearTerminalLog();
        } else if (fatalLine.parentNode) {
          fatalLine.parentNode.removeChild(fatalLine);
        }
        clearTermFatalVisuals();
        resolve(!!ok);
      }
      var onT = function (e) {
        if (e.target !== termUi) return;
        if (e.propertyName !== "opacity") return;
        finish(g === typeGen);
      };
      termUi.addEventListener("transitionend", onT);
      to = setTimeout(function () {
        finish(g === typeGen);
      }, 950);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (g !== typeGen) finish(false);
          else termUi.classList.add("site-meta-panel__terminal-ui--fatal-fade");
        });
      });
    });
  }
  async function onTerminalSubmit(e) {
    e.preventDefault();
    if (storyBusy || !terminalInput) return;
    var raw = terminalInput.value.trim();
    if (!raw) return;
    var cmd = raw.toLowerCase();
    terminalInput.value = "";
    appendTerminalCommandEcho(raw);
    if (cmd === "restart") {
      typeGen++;
      var g = typeGen;
      storyBusy = true;
      setTerminalInputEnabled(false);
      if (panel) panel.setAttribute("aria-busy", "true");
      try {
        var ran = await runRestartFatalSequence(g);
        if (ran) {
          await resetInteractiveStory();
        } else {
          storyBusy = false;
          if (panel && panel.classList.contains("site-meta-panel--open"))
            setTerminalInputEnabled(true);
        }
      } finally {
        if (panel) panel.removeAttribute("aria-busy");
      }
      return;
    }
    var step = storySteps[storyStepIndex];
    if (!step) {
      appendTerminalLogLine('Type "restart" to replay.', true);
      return;
    }
    if (cmd !== step.expect) {
      appendTerminalLogLine(
        'Unknown command. Try "' + step.expect + '".',
        true,
      );
      return;
    }
    if (step.expect === "learn" && storyStepIndex === 0) {
      panel.classList.add("site-meta-panel--story-feedback");
    }
    if (inStoryFeedbackMode()) {
      /* Dims all prior log lines (incl. just-appended command echo) so the next runStoryStep stream is the focus. */
      applyStoryFeedbackDimToEntireLog();
    }
    storyBusy = true;
    setTerminalInputEnabled(false);
    typeGen++;
    var g = typeGen;
    await runStoryStep(step, g);
    if (g !== typeGen) {
      storyBusy = false;
      if (panel && panel.classList.contains("site-meta-panel--open"))
        setTerminalInputEnabled(true);
      return;
    }
    storyStepIndex += 1;
    if (step.after) {
      await appendStoryAfter(step.after, g);
      if (g !== typeGen) {
        storyBusy = false;
        if (panel && panel.classList.contains("site-meta-panel--open"))
          setTerminalInputEnabled(true);
        return;
      }
    }
    if (step.expect === "summon") {
      setTermPromptFromDisplay("ourolabs@origin:~$");
    }
    storyTypeResume = null;
    storyBusy = false;
    setTerminalInputEnabled(true);
  }
  function setTriggersExpanded(val) {
    getOpenTriggers().forEach(function (btn) {
      btn.setAttribute("aria-expanded", val);
    });
  }
  function setSiteMetaFooterRowVisible(onScreen) {
    if (!openFab) return;
    document.documentElement.classList.toggle(
      "site-meta-footer-row-visible",
      !!onScreen,
    );
    if (onScreen) {
      openFab.setAttribute("aria-hidden", "true");
      openFab.tabIndex = -1;
    } else {
      openFab.removeAttribute("aria-hidden");
      openFab.tabIndex = 0;
    }
  }
  function isFooterOpenTriggerInViewport() {
    if (!openFooter) return false;
    var r = openFooter.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var vw = window.innerWidth || document.documentElement.clientWidth;
    return (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.top < vh &&
      r.right > 0 &&
      r.left < vw
    );
  }
  function updateFooterRowFabVisibility() {
    if (!openFooter || !openFab) return;
    setSiteMetaFooterRowVisible(isFooterOpenTriggerInViewport());
  }
  function focusPreferredOpenTrigger() {
    var footerRow = document.documentElement.classList.contains(
      "site-meta-footer-row-visible",
    );
    if (footerRow && openFooter) openFooter.focus();
    else if (openFab) openFab.focus();
  }
  function blockTouchmoveBehindModal(e) {
    if (!e.target) return;
    /* Only the terminal body may scroll; backdrop/titlebar/padding are still “inside” #site-meta-panel. */
    if (bodyEl && bodyEl.contains(e.target)) return;
    e.preventDefault();
  }
  function blockWheelBehindModal(e) {
    if (e.target == null) return;
    if (bodyEl && bodyEl.contains(e.target)) return;
    e.preventDefault();
  }
  function lockPageScrollForModal() {
    savedPageScrollY =
      window.scrollY || document.documentElement.scrollTop || 0;
    if (document.body) {
      document.body.style.position = "fixed";
      document.body.style.top = -savedPageScrollY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }
  }
  function unlockPageScrollForModal() {
    if (document.body) {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
    }
    if (typeof window.scrollTo === "function")
      window.scrollTo(0, savedPageScrollY);
  }
  function addModalScrollBlockers() {
    document.addEventListener("touchmove", blockTouchmoveBehindModal, {
      passive: false,
      capture: true,
    });
    /* document + window: some stacks deliver wheel to one and not the other; catch both in capture. */
    document.addEventListener("wheel", blockWheelBehindModal, {
      passive: false,
      capture: true,
    });
    window.addEventListener("wheel", blockWheelBehindModal, {
      passive: false,
      capture: true,
    });
  }
  function removeModalScrollBlockers() {
    document.removeEventListener("touchmove", blockTouchmoveBehindModal, {
      capture: true,
    });
    document.removeEventListener("wheel", blockWheelBehindModal, {
      capture: true,
    });
    window.removeEventListener("wheel", blockWheelBehindModal, {
      capture: true,
    });
  }
  function restoreSiteMetaFromMinimize() {
    if (!panel.classList.contains("site-meta-panel--minimized")) return;
    clearSiteMetaPanelMinimizeNoFadeStyles();
    document.documentElement.classList.remove("site-meta-minimized");
    panel.classList.remove("site-meta-panel--minimized");
    panel.classList.add("site-meta-panel--open");
    panel.removeAttribute("inert");
    panel.setAttribute("aria-hidden", "false");
    setTriggersExpanded("true");
    document.documentElement.classList.add("site-meta-open");
    lockPageScrollForModal();
    addModalScrollBlockers();
    siteMetaScrollFreezeGuard();
    nextFrame(siteMetaScrollFreezeGuard);
    if (themeMeta) themeMeta.setAttribute("content", "#0a0a0a");
    if (siteMetaDock) siteMetaDock.setAttribute("hidden", "");
    requestAnimationFrame(function () {
      updateTermBlockCursor();
    });
    nextFrame(function () {
      tryFocusTerminalInput();
    });
    [0, 32, 100].forEach(function (ms) {
      setTimeout(function () {
        if (!document.documentElement.classList.contains("site-meta-open"))
          return;
        tryFocusTerminalInput();
        updateTermBlockCursor();
      }, ms);
    });
    playStreamResumeIfSavedInStorage();
  }
  var minimizeSettled = true;
  function clearSiteMetaPanelMinimizeNoFadeStyles() {
    if (!panel) return;
    panel.style.transition = "";
    panel.style.removeProperty("opacity");
  }
  function applyMinimizeState() {
    if (panel.classList.contains("site-meta-panel--minimized")) return;
    typeGen++;
    storyBusy = false;
    if (panel) panel.removeAttribute("aria-busy");
    saveTerminalStoryState();
    storyTypeResume = null;
    clearTerminalKeyboardLift();
    /* Skip the panel’s default opacity close transition so the dim scrim cannot reappear during class churn. */
    panel.style.transition = "none";
    panel.style.opacity = "0";
    if (siteMetaWindow)
      siteMetaWindow.classList.remove("site-meta-panel__window--max");
    syncSiteMetaZoomButton();
    panel.classList.add("site-meta-panel--minimized");
    panel.classList.remove("site-meta-panel--open");
    panel.setAttribute("inert", "");
    panel.setAttribute("aria-hidden", "true");
    setTriggersExpanded("false");
    removeModalScrollBlockers();
    unlockPageScrollForModal();
    document.documentElement.classList.remove("site-meta-open");
    document.documentElement.classList.add("site-meta-minimized");
    if (themeColorPrev != null && themeMeta)
      themeMeta.setAttribute("content", themeColorPrev);
    if (siteMetaDock) siteMetaDock.setAttribute("hidden", "");
  }
  function minimizeSiteMetaPanel() {
    if (!panel.classList.contains("site-meta-panel--open")) return;
    if (panel.classList.contains("site-meta-panel--minimized")) return;
    if (reduceMotion.matches || !siteMetaWindow) {
      applyMinimizeState();
      return;
    }
    if (!minimizeSettled) return;
    minimizeSettled = false;
    if (siteMetaWindow)
      siteMetaWindow.classList.remove("site-meta-panel__window--max");
    syncSiteMetaZoomButton();
    var w = siteMetaWindow;
    var teTimeout = 0;
    function finishMinimize() {
      if (minimizeSettled) return;
      minimizeSettled = true;
      if (teTimeout) clearTimeout(teTimeout);
      w.classList.remove("site-meta-panel__window--minimize-out");
      w.style.willChange = "";
      applyMinimizeState();
      panel.classList.remove("site-meta-panel--minimize-anim");
    }
    function onTE(e) {
      if (e.target !== w) return;
      if (e.propertyName !== "opacity") return;
      w.removeEventListener("transitionend", onTE);
      finishMinimize();
    }
    w.addEventListener("transitionend", onTE);
    teTimeout = setTimeout(function () {
      w.removeEventListener("transitionend", onTE);
      finishMinimize();
    }, 500);
    w.style.willChange = "transform, opacity";
    panel.classList.add("site-meta-panel--minimize-anim");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        w.classList.add("site-meta-panel__window--minimize-out");
      });
    });
  }
  function openPanel() {
    lastFocus = document.activeElement;
    if (panel.classList.contains("site-meta-panel--minimized")) {
      restoreSiteMetaFromMinimize();
      return;
    }
    /* A second "open" while already open re-ran tryRestore/reset, wiped the log, and resynced
       typeGen - aborting the in-flight learn stream after the first paragraph. */
    if (panel.classList.contains("site-meta-panel--open")) {
      nextFrame(function () {
        tryFocusTerminalInput();
        updateTermBlockCursor();
      });
      return;
    }
    clearSiteMetaPanelMinimizeNoFadeStyles();
    panel.removeAttribute("inert");
    panel.classList.add("site-meta-panel--open");
    panel.setAttribute("aria-hidden", "false");
    setTriggersExpanded("true");
    document.documentElement.classList.add("site-meta-open");
    lockPageScrollForModal();
    addModalScrollBlockers();
    siteMetaScrollFreezeGuard();
    nextFrame(siteMetaScrollFreezeGuard);
    if (themeMeta) themeMeta.setAttribute("content", "#0a0a0a");
    var restored = tryRestoreTerminalFromStorage();
    if (!restored) {
      scrollPanelToTop();
      void resetInteractiveStory().catch(function () {});
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          syncTerminalInputViewport();
        });
      });
      if (restored.streamResume) {
        var sr0 = restored.streamResume;
        if (
          sr0.op === "tui" ||
          sr0.op === "line" ||
          sr0.op === "appendAfter" ||
          sr0.op === "makers"
        )
          void resumePausedStoryFromStorage(sr0);
      }
    }
    requestAnimationFrame(function () {
      updateTermBlockCursor();
    });
    nextFrame(function () {
      tryFocusTerminalInput();
    });
    [0, 32, 100].forEach(function (ms) {
      setTimeout(function () {
        if (!document.documentElement.classList.contains("site-meta-open"))
          return;
        tryFocusTerminalInput();
        updateTermBlockCursor();
      }, ms);
    });
  }
  function closePanel() {
    /* Bump typeGen first so in-flight typewriters coalesce, then quiesce and persist streamResume + log. */
    typeGen++;
    storyBusy = false;
    if (panel) panel.removeAttribute("aria-busy");
    saveTerminalStoryState();
    storyTypeResume = null;
    clearTerminalKeyboardLift();
    clearSiteMetaPanelMinimizeNoFadeStyles();
    document.documentElement.classList.remove("site-meta-minimized");
    panel.classList.remove("site-meta-panel--minimized");
    if (siteMetaDock) siteMetaDock.setAttribute("hidden", "");
    if (siteMetaWindow)
      siteMetaWindow.classList.remove("site-meta-panel__window--max");
    syncSiteMetaZoomButton();
    if (panel) {
      var termUi = panel.querySelector(".site-meta-panel__terminal-ui");
      if (termUi)
        termUi.classList.remove(
          "site-meta-panel__terminal-ui--fatal-glitch",
          "site-meta-panel__terminal-ui--fatal-fade",
        );
    }
    panel.classList.remove("site-meta-panel--story-feedback");
    resetTypewriter();
    setStoryRowsVisible(false);
    setTerminalInputEnabled(false);
    setTerminalFormAwaitingReady(true);
    getScrollBox().scrollTop = 0;
    removeModalScrollBlockers();
    unlockPageScrollForModal();
    document.documentElement.classList.remove("site-meta-open");
    panel.setAttribute("inert", "");
    panel.classList.remove("site-meta-panel--open");
    panel.setAttribute("aria-hidden", "true");
    setTriggersExpanded("false");
    if (themeMeta && themeColorPrev != null)
      themeMeta.setAttribute("content", themeColorPrev);
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    else focusPreferredOpenTrigger();
    /* Re-focusing the FAB / footer open trigger is correct for a11y, but with Escape/keyboard
       :focus-visible stays on the icon and reads as a “stuck” black ring. Blur the trigger. */
    requestAnimationFrame(function () {
      var a = document.activeElement;
      if (a && a.classList && a.classList.contains("site-meta-btn")) a.blur();
    });
  }
  getOpenTriggers().forEach(function (btn) {
    btn.addEventListener("click", openPanel);
  });
  if (siteMetaDotClose)
    siteMetaDotClose.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    });
  if (siteMetaDotMin)
    siteMetaDotMin.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      minimizeSiteMetaPanel();
    });
  if (siteMetaDock)
    siteMetaDock.addEventListener("click", function (e) {
      e.preventDefault();
      restoreSiteMetaFromMinimize();
    });
  if (siteMetaDotZoom)
    siteMetaDotZoom.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!siteMetaWindow) return;
      typeGen++;
      storyBusy = false;
      if (panel) panel.removeAttribute("aria-busy");
      saveTerminalStoryState();
      storyTypeResume = null;
      siteMetaWindow.classList.toggle("site-meta-panel__window--max");
      syncSiteMetaZoomButton();
    });
  if (terminalForm) terminalForm.addEventListener("submit", onTerminalSubmit);
  /* iOS WebKit: implicit submit is flaky without a real submit in the form; the hidden button
     + action help. If Return / “Go” / accessory still doesn’t fire submit, handle Enter in JS. */
  if (terminalInput) {
    var termReturnAt = 0;
    function trySubmitTerminalOnReturn(e) {
      if (!panel || !panel.classList.contains("site-meta-panel--open")) return;
      if (terminalInput.disabled || storyBusy) return;
      if (e.isComposing) return;
      if (e.key !== "Enter" && e.keyCode !== 13) return;
      e.preventDefault();
      e.stopPropagation();
      var t = performance.now();
      if (t - termReturnAt < 320) return;
      termReturnAt = t;
      if (terminalForm && typeof terminalForm.requestSubmit === "function") {
        try {
          terminalForm.requestSubmit();
        } catch (x) {
          onTerminalSubmit(e);
        }
      } else if (terminalForm) {
        onTerminalSubmit(e);
      }
    }
    ["keydown", "keyup"].forEach(function (evName) {
      terminalInput.addEventListener(evName, trySubmitTerminalOnReturn, false);
    });
  }
  if (backdrop)
    backdrop.addEventListener("click", function () {
      closePanel();
    });
  document.addEventListener(
    "keydown",
    function siteMetaKey(e) {
      if (e.key !== "Escape") return;
      if (!panel.classList.contains("site-meta-panel--open")) return;
      e.preventDefault();
      closePanel();
    },
    true,
  );
  if (openFooter && openFab) {
    if (typeof IntersectionObserver !== "undefined") {
      var siteMetaFooterIo = new IntersectionObserver(
        function (entries) {
          var e0 = entries[0];
          if (!e0) return;
          setSiteMetaFooterRowVisible(!!e0.isIntersecting);
        },
        { root: null, rootMargin: "0px", threshold: 0 },
      );
      siteMetaFooterIo.observe(openFooter);
    } else {
      window.addEventListener("scroll", updateFooterRowFabVisibility, {
        passive: true,
      });
    }
    window.addEventListener("resize", updateFooterRowFabVisibility, {
      passive: true,
    });
    var contEl = document.getElementById("scroll-intro-continuation");
    if (contEl && typeof MutationObserver !== "undefined") {
      new MutationObserver(updateFooterRowFabVisibility).observe(contEl, {
        attributes: true,
        attributeFilter: ["hidden"],
      });
    }
    updateFooterRowFabVisibility();
  }
  /* While modal is open, force the page scroll position to 0 in capture (before other scroll listeners run).
     Wheel/touch/overflow are not enough: scroll subsystems still fire `scroll` and drive scrubbing animations. */
  function siteMetaScrollFreezeGuard() {
    if (!document.documentElement.classList.contains("site-meta-open")) return;
    var w = window.pageYOffset || 0;
    if (w) window.scrollTo(0, 0);
    var se = document.scrollingElement;
    if (se && (se.scrollTop | 0) !== 0) se.scrollTop = 0;
    if (document.body && (document.body.scrollTop | 0) !== 0)
      document.body.scrollTop = 0;
  }
  window.addEventListener("scroll", siteMetaScrollFreezeGuard, {
    capture: true,
    passive: true,
  });
  document.addEventListener("scroll", siteMetaScrollFreezeGuard, {
    capture: true,
    passive: true,
  });
})();

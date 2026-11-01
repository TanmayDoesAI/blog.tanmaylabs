// Mobile navigation disclosure (2026-11-01). Loaded with `defer` from _includes/header.html.
// Without this script the menu links are always visible (see .site-nav in assets/main.scss).
(function () {
  "use strict";

  var nav = document.querySelector("[data-site-nav]");
  if (!nav) return;
  var button = nav.querySelector(".nav-toggle");
  var menu = button && document.getElementById(button.getAttribute("aria-controls"));
  if (!menu) return;

  function isOpen() {
    return button.getAttribute("aria-expanded") === "true";
  }

  function setOpen(open, returnFocus) {
    button.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open && returnFocus) button.focus();
  }

  // Lets browsers without the `scripting` media feature collapse the menu too.
  nav.classList.add("is-enhanced");

  button.addEventListener("click", function () {
    setOpen(!isOpen(), false);
  });

  // Escape closes the menu and returns focus to the button. Listen on the document: Safari does not
  // focus a button on click, so focus may not be inside the nav.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      event.preventDefault();
      setOpen(false, true);
    }
  });

  // Close when focus moves out of the nav (e.g. Tab past the last link).
  nav.addEventListener("focusout", function (event) {
    if (isOpen() && event.relatedTarget && !nav.contains(event.relatedTarget)) setOpen(false, false);
  });

  // Close on a click or tap outside the nav.
  document.addEventListener("click", function (event) {
    if (isOpen() && !nav.contains(event.target)) setOpen(false, false);
  });

  // Reset when the layout switches to desktop, and when a page is restored from the back/forward cache.
  // Same breakpoint as minima's $on-palm.
  var mobile = window.matchMedia("screen and (max-width: 600px)");
  var onChange = function (event) {
    if (!event.matches) setOpen(false, false);
  };
  if (mobile.addEventListener) mobile.addEventListener("change", onChange);
  else if (mobile.addListener) mobile.addListener(onChange);

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) setOpen(false, false);
  });
})();

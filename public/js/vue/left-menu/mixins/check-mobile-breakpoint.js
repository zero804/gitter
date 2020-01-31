function checkMobileBreakpoint() {
  // Keep this in sync with the `@left-menu-mobile-breakpoint` in `trp3Vars.less`
  return window.matchMedia('(max-width: 900px)').matches;
}

module.exports = checkMobileBreakpoint;

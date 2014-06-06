require([], function() {
  /*
   * DELETE THIS FILE WHEN MIKE AND RUSSEL HAVE CLEANED OUT THEIR APPCACHES
   */
  window.applicationCache.update();
  window.applicationCache.addEventListener('updateready', function() {
    applicationCache.swapCache();
    setTimeout(function() {
      window.location.reload();
    }, 10000);
  }, false);
});

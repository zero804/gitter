'use strict';


module.exports = (function() {

  /**
   * we no longer use sisyphus, so we need to remove any old drafts that it stored
   */

  // give breathing room for slow browsers
  setTimeout(function() {
    var sisyphusPrefix = window.location.hostname;

    var sisyphusKeys = Object.keys(window.localStorage).filter(function(key) {
      return key.indexOf(sisyphusPrefix) === 0;
    });

    sisyphusKeys.forEach(function(key) {
      // localstorage is synchronous. dont do this all on the same event loop
      setTimeout(function() {
        window.localStorage.removeItem(key);
      }, 0);
    });
  }, 10000);


})();


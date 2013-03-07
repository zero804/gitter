/*jshint unused:true, browser:true */
define([
], function() {

  var _super = window.onerror;
  window.onerror = function(message, file, line) {
    require(['utils/tracking'], function(tracking) {
      tracking.trackError(message, file, line);
    });
    if (_super)
      return _super();
  };

});
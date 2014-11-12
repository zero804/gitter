"use strict";
var Handlebars = require('handlebars/runtime').default;

module.exports = (function() {
  function isMobile(options) {
    //if (navigator.userAgent.indexOf('Mobile') >= 0) {
    //  return options.fn(this);
    //}
    return options.fn(this);
  }

  Handlebars.registerHelper('isMobile', isMobile);
  return isMobile;
})();


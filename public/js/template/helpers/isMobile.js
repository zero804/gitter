define([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  function isMobile(options) {
    //if (navigator.userAgent.indexOf('Mobile') >= 0) {
    //  return options.fn(this);
    //}
    return options.fn(this);
  }

  Handlebars.registerHelper('isMobile', isMobile);
  return isMobile;

});

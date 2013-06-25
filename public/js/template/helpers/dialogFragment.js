/*jshint unused:strict, browser:true */
require([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  function dialogFragment(fragment) {
    if(window._troupeCompactView) {
      return fragment;
    } else {
      return "#|" + fragment;
    }

  }

  Handlebars.registerHelper('dialogFragment', dialogFragment);


});

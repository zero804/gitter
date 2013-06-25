/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
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

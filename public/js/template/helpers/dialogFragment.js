/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
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

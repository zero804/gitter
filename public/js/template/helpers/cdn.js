/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  function cdn (url) {
    return "/" + url;
  }

  Handlebars.registerHelper( 'cdn', cdn );
  return cdn;

});

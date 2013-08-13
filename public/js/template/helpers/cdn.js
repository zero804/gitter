/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  // TODO: write a complete CDN implementation
  function cdn (url) {
    return "/" + url;
  }

  Handlebars.registerHelper( 'cdn', cdn );
  return cdn;

});

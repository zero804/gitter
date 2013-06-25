/*jshint unused:strict, browser:true */
require([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  function cdn ( url, model ) {
    return "/" + url;
  }

  Handlebars.registerHelper( 'cdn', cdn );
  return cdn;

});

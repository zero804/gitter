/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require(['routers/mobile/router-mobile-chat'], function(router) {
  "use strict";

  router.start();

  // Prevent Header & Footer From Showing Browser Chrome

  document.addEventListener('touchmove', function(event) {
     if(event.target.parentNode.className.indexOf('noBounce') != -1 || event.target.className.indexOf('noBounce') != -1 ) {
    event.preventDefault(); }
  }, false);

});

/*jshint unused:true, browser:true */
require([
  'handlebars'
], function ( Handlebars ) {

  function dialogFragment(fragment) {
    if(window._troupeCompactView) {
      return fragment;
    } else {
      return "#|" + fragment;
    }

  }

  Handlebars.registerHelper('dialogFragment', dialogFragment);


});

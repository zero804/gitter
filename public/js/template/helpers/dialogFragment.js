/*jshint unused:true browser:true*/
require([
  'handlebars'
], function ( Handlebars ) {

  function dialogFragment(fragment) {
    if(!this._dialogFragmentPrimaryLocation) {
      var hash = window.location.hash;
      if(!hash) {
        this._dialogFragmentPrimaryLocation = '#';
      } else {
        var currentFragment = hash.split('|', 1);
        this._dialogFragmentPrimaryLocation = currentFragment[0];
      }

    }

    return this._dialogFragmentPrimaryLocation + "|" + fragment;
  }

  Handlebars.registerHelper('dialogFragment', dialogFragment);


});

require([
  'handlebars'
], function ( Handlebars ) {

  function dialogFragment(fragment) {
    if(!this._dialogFragmentPrimaryLocation) {
      var currentFragment = window.location.hash.split('|', 1);
      this._dialogFragmentPrimaryLocation = currentFragment[0];
    }

    return this._dialogFragmentPrimaryLocation + "|" + fragment;
  }

  Handlebars.registerHelper('dialogFragment', dialogFragment);


});
"use strict";
var context = require('utils/context');
var UserHomeView = require('views/userhome/userHomeView');
var $ = require('jquery');
var appEvents = require('utils/appevents');
var Backbone = require('backbone');
var cordovaNavigate = require('components/cordova-navigate');
var confirmRepoRoomView = require('views/createRoom/confirmRepoRoomView');
var modalRegion = require('components/modal-region');

module.exports = (function() {


  cordovaNavigate.setNativeToUserhome();

  function onContextLoad() {
    new UserHomeView({
      el: $('#content-frame')
    }).render();

    appEvents.on('navigation', function(url) {
      if(url.indexOf('#') === 0) {
        window.location.hash = url;
      } else {
        cordovaNavigate.navigate(url);
      }
    });

    $('html').removeClass('loading');
  }

  var user = context.user();

  /*
   * A user's "scopes" property is required by the UserHomeView's render function.
   * User properties are not on the context for native mobile as they would be cached
   * until a new release.
   * Because of this, we have to wait until the realtime connection updates the user
   * model before we can create the view.
   */
  if(user.get('scopes')) {
    onContextLoad();
  } else {
    user.once('change', onContextLoad);
  }

  var Router = Backbone.Router.extend({
    routes: {
      'confirm/*uri': function(uri) {
        modalRegion.show(new confirmRepoRoomView.Modal({ uri: uri }));
      },
      '': function() {
        modalRegion.close();
      }
    }
  });

  new Router();
  Backbone.history.start();


})();


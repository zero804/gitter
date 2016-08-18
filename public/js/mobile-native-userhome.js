"use strict";
var context = require('./utils/context');
var UserHomeView = require('views/userhome/userHomeView');
var $ = require('jquery');
var appEvents = require('./utils/appevents');
var Backbone = require('backbone');
var confirmRepoRoomView = require('views/modals/confirm-repo-room-view');
var modalRegion = require('./components/modal-region');
var onready = require('././utils/onready');

// Preload widgets
require('views/widgets/avatar');
require('./components/ping');

onready(function() {

  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  function onContextLoad() {
    new UserHomeView({
      el: $('#content-frame')
    }).render();

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
      'confirmSuggested/*uri': function(uri) {
        modalRegion.show(new confirmRepoRoomView.Modal({ uri: uri }));
      },
      '': function() {
        modalRegion.destroy();
      }
    }
  });

  new Router();
  Backbone.history.start();
});

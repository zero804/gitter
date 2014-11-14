"use strict";
var UserHomeView = require('views/userhome/userHomeView');
var appEvents = require('utils/appevents');
var Backbone = require('backbone');
var confirmRepoRoomView = require('views/createRoom/confirmRepoRoomView');
var modalRegion = require('components/modal-region');
require('utils/tracking');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');

module.exports = (function() {
  new UserHomeView({ el: '#content-wrapper' }).render();

  appEvents.on('navigation', function(url) {
    if(url.indexOf('#') === 0) {
      window.location.hash = url;
    } else {
      (window.parent || window).location.href = url;
    }
  });

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


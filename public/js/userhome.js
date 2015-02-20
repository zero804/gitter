"use strict";
var UserHomeView = require('views/userhome/userHomeView');
var appEvents = require('utils/appevents');
var Backbone = require('backbone');
var confirmRepoRoomView = require('views/createRoom/confirmRepoRoomView');
var modalRegion = require('components/modal-region');
var onready = require('./utils/onready');
var frameUtils = require('./utils/frame-utils');
require('utils/tracking');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');
require('components/ping');

onready(function() {
  new UserHomeView({ el: '#userhome' }).render();

  require('components/link-handler').installLinkHandler();

  appEvents.on('navigation', function(url, type, title) {
    if(frameUtils.hasParentFrameSameOrigin()) {
      frameUtils.postMessage({ type: "navigation", url: url, urlType: type, title: title});
    } else {
      // No pushState here. Open the link directly
      // Remember that (window.parent === window) when there is no parent frame
      window.parent.location.href = url;
    }
  });


  var Router = Backbone.Router.extend({
    routes: {
      'confirmSuggested/*uri': function (uri) {
        modalRegion.show(new confirmRepoRoomView.Modal({ uri: uri }));
      },
      '': function() {
        modalRegion.close();
      }
    }
  });

  new Router();
  Backbone.history.start();
});


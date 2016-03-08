"use strict";

var $ = require('jquery');
var Backbone = require('backbone');
var appEvents = require('utils/appevents');
var onready = require('./utils/onready');
var LoginView = require('views/modals/login-view');
var modalRegion = require('components/modal-region');
var debug = require('debug-proxy')('app:login');

require('utils/tracking');
require('template/helpers/all');
require('views/widgets/preload');
require('components/timezone-cookie');
require('components/bug-reporting');
require('components/ping');

onready(function() {
  require('components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location = url;
  });

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal",
      "login": "login"
    },

    hideModal: function() {
      modalRegion.destroy();
    },

    login: function() {
      modalRegion.show(new LoginView());
    }
  });

  new Router();

  Backbone.history.start();
});

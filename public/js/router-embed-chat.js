"use strict";

var onready = require('./utils/onready');
var context = require('./utils/context');
var chatCollection = require('collections/instances/chats');
var EmbedLayout = require('views/layouts/chat-embed');
var Backbone = require('backbone');
var apiClient = require('components/apiClient');



/* Set the timezone cookie */
require('components/timezone-cookie');

require('components/statsc');
require('views/widgets/preload');
require('components/dozy');
require('template/helpers/all');
require('components/bug-reporting');
require('components/ping');

// Preload widgets
require('views/widgets/avatar');

onready(function() {
  var Router = Backbone.Router.extend({
    routes: {
      '': 'hideModal',
      'autojoin': 'autojoin',
      'welcome-message': 'showWelcomeMessage'
    },

    hideModal: function() {
      appView.dialogRegion.destroy();
    },

    autojoin: function() {
      if (context.roomHasWelcomeMessage()) {
        this.showWelcomeMessage();
        return;
      }

      apiClient.user
        .post('/rooms', { id: context.troupe().id })
        .bind(this)
        .then(function(body) {
          context.setTroupe(body);
        });
    },

    showWelcomeMessage: function (){
      require.ensure(['./views/modals/welcome-message'], function(require){
        var WelcomeMessageView = require('./views/modals/welcome-message');
        appView.dialogRegion.show(new WelcomeMessageView.Modal());
      });
    },
  });

  new Router();

  var appView = new EmbedLayout({
    el: 'body',
    model: context.troupe(),
    template: false,
    chatCollection: chatCollection
  });
  appView.render();

  Backbone.history.start();

});

"use strict";

var onready         = require('./utils/onready');
var context         = require('utils/context');
var chatCollection  = require('collections/instances/chats');
var EmbedLayout     = require('views/layouts/chat-embed');
var Backbone        = require('backbone');
var apiClient       = require('components/apiClient');



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
require('views/widgets/timeago');

onready(function() {
  var Router = Backbone.Router.extend({
    routes: {
      'autojoin': 'autojoin'
    },

    autojoin: function() {
      apiClient.post('/v1/rooms/' + context.getTroupeId() + '/users', { username: context().user.username })
      .then(function() {
        context.troupe().set('roomMember', true);
      });
    }
  });

  var router = new Router();

  var appView = new EmbedLayout({
    el: 'body',
    model: context.troupe(),
    template: false,
    chatCollection: chatCollection
  });
  appView.render();

  Backbone.history.start();

});

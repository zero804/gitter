"use strict";

var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatModels = require('collections/chat');
var onready = require('./utils/onready');
var MobileNliLayout = require('views/layouts/mobile-nli-layout');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');
require('components/ping');
require('template/helpers/all');

onready(function() {
  require('components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  // new MobileAppView({
  //   el: '#mainPage',
  //   hideMenu: true
  // });

  // var chatCollection = new chatModels.ChatCollection(null, { listen: true });

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });
  var appView = new MobileNliLayout({ template: false, el: 'body', chatCollection: chatCollection });
  appView.render();

  //
  //
  // var chatCollection = new chatModels.ChatCollection(null, { listen: true });
  //
  // var chatCollectionView = new ChatCollectionView({
  //   el: '#chat-container',
  //   collection: chatCollection,
  //   decorators: [emojiDecorator]
  // }).render();
  //
  // new MobileLoginButton({
  //   el: '#login-footer',
  // }).render();

  // var Router = Backbone.Router.extend({
  //   routes: {
  //     "": "hideModal"
  //   },
  //
  //   hideModal: function() {
  //     modalRegion.destroy();
  //   },
  // });
  //
  // new Router();

  $('html').removeClass('loading');

  // Backbone.history.start();
  //
  // if (context().permalinkChatId) {
  //   highlightPermalinkChats(chatCollectionView, context().permalinkChatId);
  // }

});

"use strict";

var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatModels = require('collections/chat');
var ChatCollectionView = require('views/chat/chatCollectionView');
var Backbone = require('backbone');
var modalRegion = require('components/modal-region');
var MobileAppView = require('views/app/mobileAppView');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var MobileLoginButton = require('views/mobile/mobileLoginButton');

module.exports = (function() {


  new MobileAppView({
    el: '#mainPage',
    hideMenu: true
  });

  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();

  new ChatCollectionView({
    el: '#content-frame',
    collection: chatCollection,
    decorators: [emojiDecorator]
  }).render();

  new MobileLoginButton({
    el: '#chat-input',
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal"
    },

    hideModal: function() {
      modalRegion.close();
    },
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();


})();


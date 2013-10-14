/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'retina',
  'collections/chat',
  'views/chat/chatInputView',
  'utils/mobile-resizer',
  'routers/mobile/mobile-router',
  'views/toolbar/troupeMenu'
  ], function($, retina, chatModels, chatInputView, mobileResizer, MobileRouter, TroupeMenu) {
  "use strict";

  var MobileAppRouter = MobileRouter.extend({
    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      var chatCollection = new chatModels.ChatCollection();
      chatCollection.listen();

      new chatInputView.ChatInputView({
        el: $('#chat-input'),
        collection: chatCollection
      }).render();

      new TroupeMenu({
        el: $('#troupeList')
      }).render();

      mobileResizer.reset();

      var fakeWindow = {};
      retina.init(fakeWindow);
      fakeWindow.onload();

      window.addEventListener("orientationchange", function() {
        mobileResizer.reset();
      });

    }
  });

  return MobileAppRouter;

});

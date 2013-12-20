/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define(['utils/context'], function(context) {
  "use strict";

  function highlightMention(chatItemView) {
    var mentions = chatItemView.model.get('mentions');
    var user  = context.user();

    if(!mentions || !user) return;
    var username = context.user().get('username');

    if(!username) return;

    if(mentions.some(function(mention) {
      return mention.screenName == user.username;
    })) {
      chatItemView.$el.find('.trpChatBox').addClass('mention');
    }
  }

  var decorator = {

    decorate: function(chatItemView) {
      highlightMention(chatItemView);
    }

  };

  return decorator;

});

/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'utils/context',
  'views/people/userPopoverView'
  ], function(context, UserPopoverView) {
  "use strict";

  function highlightMention(chatItemView) {
    var mentions = chatItemView.model.get('mentions');
    var user  = context.user();

    if(!mentions || !user) return;
    var username = context.user().get('username');

    if(!username) return;

    if(mentions.some(function(mention) {
      return mention.userId ===  context.getUserId();
    })) {
      chatItemView.$el.find('.trpChatBox').addClass('mention');
    }
  }

  var decorator = {

    decorate: function(chatItemView) {
      var mentions = chatItemView.model.get('mentions');
      if(!mentions || !mentions.length) return;

      function clickMention(e) {
        var username = e.target.dataset.screenName;
        if(!username) return;

        var popover = new UserPopoverView({
          username: username,
          placement: 'horizontal',
          minHeight: '88px',
          width: '300px',
          title: username,
          targetElement: event.target
        });

        popover.show();
      }

      chatItemView.$el.find('.mention').on('click', clickMention);
      chatItemView.addCleanup(function() {
        chatItemView.$el.find('.mention').off('click', clickMention);
      });

      highlightMention(chatItemView);
    }

  };

  return decorator;

});

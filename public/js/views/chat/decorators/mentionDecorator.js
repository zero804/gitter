/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'utils/context',
  'views/people/userPopoverView',
  'utils/dataset-shim'
  ], function(context, UserPopoverView, dataset) {
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

      function clickMention(e) {
        var username = dataset.get(e.target, 'screenName');
        if(!username) return;

        var popover = new UserPopoverView({
          username: username,
          targetElement: e.target
        });

        popover.show();

        UserPopoverView.singleton(chatItemView, popover);
      }

      function hoverIntent(e) {
        UserPopoverView.hoverTimeout(e, function() {
          clickMention(e);
        });
      }

      var $mentions = chatItemView.$el.find('.mention');

      $mentions.on('click', clickMention);
      $mentions.on('mouseover', hoverIntent);

      chatItemView.once('close', function() {
        $mentions.off('click', clickMention);
        $mentions.off('mouseover', hoverIntent);
      });

      highlightMention(chatItemView);
    }

  };

  return decorator;

});

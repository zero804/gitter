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
      return mention.screenName === username ||
              mention.screenName === '@' + username;
    })) {
      chatItemView.$el.find('.trpChatBox').addClass('mention');
    }
  }

  function removeFalseMentions(chatItemView) {
    var url = '/api/v1/troupes/' + context.getTroupeId() + '/users';
    $.get(url, function(users) {
      var usernames = users.map(function(user) {
        return user.username;
      });

      chatItemView.$el.find('.trpChatText .mention').each(function() {
        var username = this.dataset.screenName;

        if(usernames.indexOf(username) === -1) {
          $(this).replaceWith('@'+username);
        }
      });
    });
  }

  var decorator = {

    decorate: function(chatItemView) {
      highlightMention(chatItemView);
      removeFalseMentions(chatItemView);
    }

  };

  return decorator;

});

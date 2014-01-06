/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'utils/context',
  'collections/instances/integrated-items'
  ], function(context, collections) {
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

  function removeFalseMentions(chatItemView, users) {
    var usernames = users.map(function(user) {
      return user.get('username');
    });

      chatItemView.$el.find('.trpChatText .mention').each(function() {
        var username = this.dataset.screenName;

        if(usernames.indexOf(username) === -1) {
          $(this).replaceWith('@'+username);
        }
      });
  }

  var decorator = {

    decorate: function(chatItemView) {
      highlightMention(chatItemView);
      var users = collections.users;

      if(users.length) {
        removeFalseMentions(chatItemView, users);
      } else {
        users.once('add', function() {
          removeFalseMentions(chatItemView, users);
        });
      }
    }

  };

  return decorator;

});

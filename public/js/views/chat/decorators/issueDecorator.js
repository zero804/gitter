/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'utils/context'
], function(context) {
  "use strict";

  var decorator = {

    decorate: function(chatItemView) {
      var issuesUrl = 'https://github.com/'+context().troupe.uri+'/issues/';
      var $chatText = chatItemView.$el.find('.trpChatText');
      var text = $chatText.text();

      var newText = text.replace(/#\d+/g, function(match) {
        return '<a href="'+issuesUrl+match.substring(1)+'" target="_blank">'+match+'</a>';
      });

      $chatText.html(newText);
    }

  };

  return decorator;

});

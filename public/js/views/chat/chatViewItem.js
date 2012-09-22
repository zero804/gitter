// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./chatViewItem',
  'components/chat/chat-component',
  /* No result */
  'jquery_timeago'
], function($, _, Backbone, TroupeViews, template, chat) {
  return TroupeViews.Base.extend({
    unreadItemType: 'chat',
    template: template,

    // TODO: Replace this with something else like https://github.com/ljosa/urlize.js or http://benalman.com/projects/javascript-linkify/
    linkify: function(inputText) {
      //URLs starting with http://, https://, or ftp://
      var replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@()*#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
      var replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

      //URLs starting with www. (without // before it, or it'd re-link the ones done above)
      var replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
      replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

      //Change email addresses to mailto:: links
      var replacePattern3 = /(\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6})/gim;
      replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

      return replacedText;
    },

    events: {
    },

    getRenderData: function() {
      var data = this.model.toJSON();

      data.text = this.linkify(data.text);

      var current = data.fromUser.id == window.troupeContext.user.id;

      /* TODO: css selectors should be able to handle this from a single class on a parent div */
      if(current) {
        data.chatRowClass = 'trpChatRow';
        data.chatRowPictureClass = 'trpChatPictureLocal';
        data.chatBubbleAdditional = 'local';
      } else {
        data.chatRowClass = 'trpChatRowRemote';
        data.chatRowPictureClass = 'trpChatPictureRemote';
        data.chatBubbleAdditional = 'remote';
      }

      return data;
    },

    afterRender: function(data) {
      this.$el.find('.trpChatBubble').tooltip({title: function() { return $.timeago(new Date(data.sent)); }});
    }
  });

});
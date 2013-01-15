// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./chatViewItem'
 ], function($, _, Backbone, TroupeViews, template) {
  /* jshint browser:true unused:true */
  "use strict";

  return TroupeViews.Base.extend({
    unreadItemType: 'chat',
    template: template,

    events: {
    },

    safe: function(text) {
      return (''+text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    },

    getRenderData: function() {
      var data = this.model.toJSON();

      // We need to parse the text a little to hyperlink known links and escape html to prevent injection
      data.text = this.safe(data.text);

      var current = data.fromUser.id == window.troupeContext.user.id;

      data.displayName = data.fromUser.displayName;

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
      this.$el.find('.trpChatBubble').tooltip({title: function() { return data.sent ? data.sent.from(new Date()) : null; }});
    }
  });

});
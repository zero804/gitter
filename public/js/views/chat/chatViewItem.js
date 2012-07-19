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
    template: template,

    initialize: function(options) {
      this.message = options.message;
      this.current = options.current;
    },

    events: {
    },

    getRenderData: function() {
      var data = _.extend(this.message, {});

      /* TODO: css selectors should be able to handle this from a single class on a parent div */
      if(this.current) {
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
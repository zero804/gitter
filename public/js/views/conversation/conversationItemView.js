// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'dateFormat',
  'hgn!views/conversation/conversationItemView',
  'models/conversationDetail',
  'views/widgets/avatar'
], function($, _, Backbone, dateFormat, template, ConversationDetail, AvatarView) {
  var ConversationItemView = Backbone.View.extend({

    initialize: function(options) {
    },

    events: {
      //"click .clickPoint-showEmail": "showEmail"
    },

    render: function() {
      var self = this;

      var data = this.model.toJSON();
      data.detailUrl = "#mail/" + data.id;

      var compiledTemplate = template(data);

      $(this.el).html(compiledTemplate);
      this.avatar = new AvatarView({ user: data.lastSender, el: this.$(".widget-avatar") }).render();

      return this;
    }

  });


  return ConversationItemView;
});

// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'dateFormat',
  'hbs!views/conversation/conversationItemView',
  'models/conversationDetail',
  'views/widgets/avatar'
], function($, _, Backbone, TroupeViews, dateFormat, template, ConversationDetail, AvatarView) {
  var ConversationItemView = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
    },

    events: {
      "click .clickPoint-showEmail": "showEmail"
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.detailUrl = "#mail/" + data.id;

      return data;
    },

    afterRender: function(dom, data) {
      this.avatar = new AvatarView({ user: data.lastSender, el: this.$(".widget-avatar") }).render();
    },

    showEmail: function(event) {
      window.troupeApp.navigate("mail/" + this.model.get('id'), {trigger: true});
    }

  });


  return ConversationItemView;
});

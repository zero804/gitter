// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!views/conversation/conversationDetailItemView',
  'hbs!views/conversation/conversationDetailItemViewBody',
  'views/widgets/avatar'

], function($, _, Backbone, TroupeViews, template, bodyTemplate, AvatarView) {
  return TroupeViews.Base.extend({
    template: template,

    events: {
      "click .clickPoint-showEmail": "onHeaderClick"
    },

    attributes: {
      'class': 'trpMailRowContainer'
    },

    initialize: function(options) {
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.personName = data.from.displayName;
      data.avatarUrl = data.from.avatarUrl;
      return data;
    },

    afterRender: function(dom, data) {
      this.avatar = new AvatarView({ user: data.from, el: this.$(".widget-avatar") }).render();
    },

    onHeaderClick: function(event) {
      if(this.mailbody) {
        $(this.mailbody).toggle();
        return false;
      }

      var data = this.getRenderData();

      this.mailbody = $(bodyTemplate(data));
      this.$el.append(this.mailbody);

      return false;

    }

  });
});

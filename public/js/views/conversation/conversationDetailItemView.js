// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'hgn!views/conversation/conversationDetailItemView',
  'hgn!views/conversation/conversationDetailItemViewBody'
], function($, _, Backbone, template, bodyTemplate) {
  return Backbone.View.extend({
    events: {
//      "click .link-version": "switchLinkToVersions"
    },

    attributes: {
      'class': 'trpMailRowContainer'
    },

    initialize: function(options) {
      _.bindAll(this, 'onHeaderClick');
    },

    render: function() {
      var data = this.getTemplateModel();

      var compiledTemplate = template(data);
      var $compiled = this.$el.html(compiledTemplate);
      $compiled.on('click', this.onHeaderClick);
      return this;
    },

    getTemplateModel: function() {
      var data = this.model.toJSON();
      data.personName = data.from.displayName;
      data.avatarUrl = data.from.avatarUrl;

      return data;
    },

    onHeaderClick: function(event) {
      if(this.mailbody) {
        $(this.mailbody).toggle();
        return false;
      }

      var data = this.getTemplateModel();

      this.mailbody = $(bodyTemplate(data));
      this.$el.append(this.mailbody);

      return false;

    }

  });
});

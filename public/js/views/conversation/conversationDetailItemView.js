// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!views/conversation/conversationDetailItemView.mustache',
  'text!views/conversation/conversationDetailItemViewBody.mustache'
], function($, _, Backbone, Mustache, template, bodyTemplate) {
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

      var compiledTemplate = Mustache.render(template, data);
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

      this.mailbody = $(Mustache.render(bodyTemplate, data));
      this.$el.append(this.mailbody);

      return false;

    }

  });
});

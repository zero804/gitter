// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'dateFormat',
  'text!views/conversation/conversationItemView.mustache',
  'models/conversationDetail'
], function($, _, Backbone, Mustache, dateFormat, template, ConversationDetail) {
  var ConversationItemView = Backbone.View.extend({

    initialize: function(options) {
    },

    events: {
      //"click .clickPoint-showEmail": "showEmail"
    },

    render: function() {
      var self = this;

      var data = this.model.toJSON();
      data.personName = data.lastSender.displayName;
      data.avatarUrl = data.lastSender.avatarUrl;
      var compiledTemplate = Mustache.render(template, data);

      $(this.el).html(compiledTemplate);

      return this;
    }

  });


  return ConversationItemView;
});

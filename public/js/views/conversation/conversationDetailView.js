// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!views/conversation/conversationDetailView.mustache',
  'models/conversationDetail',
  'views/conversation/conversationDetailItemView'
], function($, _, Backbone, Mustache, template, ConversationDetailModel, ConversationDetailItemView) {
  return Backbone.View.extend({
    events: {
//      "click .link-version": "switchLinkToVersions"
    },

    initialize: function(options) {
      _.bindAll(this, 'onEmailCollectionAdd', 'onEmailCollectionReset');

      this.model = new ConversationDetailModel();
      this.model.emailCollection.bind('add', this.onEmailCollectionAdd);
      this.model.emailCollection.bind('reset', this.onEmailCollectionReset);

      this.router = options.router;
      this.id = options.params;
      this.load();
    },

    load: function() {
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/conversations/" + this.id,
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(conversation) {
          self.model.set(conversation);
        }
      });

    },

    render: function() {
      var compiledTemplate = Mustache.render(template);
      $(this.el).html(compiledTemplate);
      return this;
    },

    onEmailCollectionReset: function() {
      console.dir(this.model.emailCollection);
      $(".frame-emails", this.el).empty();
      this.model.emailCollection.each(this.onEmailCollectionAdd);
    },

    onEmailCollectionAdd: function(item) {
      $(".frame-emails", this.el).append(new ConversationDetailItemView({ model: item }).render().el);
    }

  });
});

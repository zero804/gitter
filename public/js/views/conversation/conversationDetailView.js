// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hgn!views/conversation/conversationDetailView',
  'models/conversationDetail',
  'views/conversation/conversationDetailItemView'
], function($, _, Backbone, TroupeViews, template, ConversationDetailModel, ConversationDetailItemView) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onEmailCollectionAdd', 'onEmailCollectionReset');

      this.model = new ConversationDetailModel();
      this.model.emailCollection.bind('add', this.onEmailCollectionAdd);
      this.model.emailCollection.bind('reset', this.onEmailCollectionReset);

      this.router = options.router;
      this.id = options.params;
      this.load();
    },

    events: {
//      "click .link-version": "switchLinkToVersions"
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

    getRenderData: function() { return {}; },

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

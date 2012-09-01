// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'dateFormat',
  'hbs!views/conversation/conversationView',
  'collections/conversations',
  'views/conversation/conversationItemView'
], function($, _, Backbone, TroupeViews, dateFormat, template, conversationModels, ConversationItemView){
  "use strict";

  function makeSort(sortField) {
    return function(e) {
      e.preventDefault();
      this.collectionView.sortBy(sortField);
    };
  }

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      // we probably want to pull in the domain from config, e.g. for beta.trou.pe
      this.collection = new conversationModels.ConversationCollection();

      this.collection.listen();
      this.collection.fetch();

      var self = this;
      this.addCleanup(function() {
        self.collection.unlisten();
      });
    },

    events: {
      "click .link-sort-from": makeSort('from'),
      "click .link-sort-date": makeSort('date'),
      "click .link-sort-subject": makeSort('subject')
    },

    getRenderData: function() {
      var emailAddress = window.troupeContext.troupe.uri + '@beta.trou.pe';
      return { "emailAddress" : emailAddress };
    },

    afterRender: function() {
      this.collectionView = new TroupeViews.Collection({
        itemView: ConversationItemView,
        collection: this.collection,
        el: this.$el.find(".frame-conversations"),
        noItemsElement: this.$el.find("#frame-help"),
        sortMethods: {
          "from": function(conversation) {
            var lastSender = conversation.get('lastSender');
            if(!lastSender) return null;
            return lastSender.displayName;
          },
          "subject": function(conversation) {
            var fileName = conversation.get('subject');
            return fileName ? fileName.toLowerCase() : '';
          },
          "date": function(conversation) {
            return conversation.get("updated");
          }
        }
      });
    }

  });

});

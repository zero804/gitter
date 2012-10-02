// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!views/conversation/conversationDetailView',
  'collections/conversations',
  'views/conversation/conversationDetailItemView'
], function($, _, Backbone, TroupeViews, template, conversationModels, ConversationDetailItemView) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,



    initialize: function(options) {
      _.bindAll(this, /*'onEmailCollectionAdd', 'onEmailCollectionReset',*/ 'onSubjectChange');

      this.router = options.router;
      this.id = options.params;

      this.model = new conversationModels.ConversationDetail({ id: this.id });
      //this.model.emailCollection.bind('add', this.onEmailCollectionAdd);
      //this.model.emailCollection.bind('reset', this.onEmailCollectionReset);
      this.model.bind('change:subject', this.onSubjectChange);
      this.model.fetch();
    },

    events: {
      "click .back-button" : "goBack"
    },

    onSubjectChange: function() {
      this.$el.find('.label-subject').text(this.model.get('subject'));
    },

    afterRender: function() {
      this.collectionView = new TroupeViews.Collection({
        itemView: ConversationDetailItemView,
        collection: this.model.emailCollection,
        el: this.$el.find(".frame-emails")//,
        //noItemsElement: this.$el.find("#frame-help"),
        /*sortMethods: {
          "mtime": function(file) {
            var versions = file.get('versions');
            if(!versions || !versions.length) return null;
            var version = versions.at(versions.length - 1);
            return version.get('createdDate');
          },
          "fileName": function(file) {
            var fileName = file.get('fileName');
            return fileName ? fileName.toLowerCase() : '';
          },
          "mimeType": function(file) {
            return file.get("mimeType");
          }
        }*/
      });
    },

    goBack: function () {
      window.history.back();
    }/*,

    onEmailCollectionReset: function() {
      $(".frame-emails", this.el).empty();
      this.model.emailCollection.each(this.onEmailCollectionAdd);
    },

    onEmailCollectionAdd: function(item) {
      $(".frame-emails", this.el).append(new ConversationDetailItemView({ model: item }).render().el);
    }*/

  });
});

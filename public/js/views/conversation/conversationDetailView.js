/*jshint unused:true browser:true*/
// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/conversationDetailView',
  'collections/conversations',
  'views/conversation/conversationDetailItemView'
], function($, _, Backbone, TroupeViews, template, conversationModels, ConversationDetailItemView) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onSubjectChange');

      this.router = options.router;
      this.id = options.id ? options.id : options.params;

      this.model = new conversationModels.ConversationDetail({ id: this.id });
      this.model.bind('change:subject', this.onSubjectChange);
      this.model.fetch();

      // TODO: live-view the conversations collection
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
        el: this.$el.find(".frame-emails"),
        sortMethods: {
          "date": function(email) {
            return email.get('date');
          }
        },
        defaultSort: "-date"
      });

    },

    goBack: function () {
      window.history.back();
    }
  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options.title = this.model.get('subject');
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ id: this.model.id, masterModel: this.model });
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});

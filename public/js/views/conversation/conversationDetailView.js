/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'marionette',
  'views/base',
  'hbs!./tmpl/conversationDetailView',
  'collections/conversations',
  'views/conversation/conversationDetailItemView',
  'cocktail'
], function(_, Marionette, TroupeViews, template, conversationModels, ConversationDetailItemView) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onSubjectChange');

      this.router = options.router;
      this.id = options.id ? options.id : options.params;

      this.model = new conversationModels.ConversationDetail({ id: this.id });
      this.model.bind('change:subject', this.onSubjectChange);
      this.model.emailCollection.listen();
      this.model.fetch();

      var self = this;
      this.addCleanup(function() {
        self.model.emailCollection.unlisten();
      });
    },

    events: {
      "click .back-button" : "goBack"
    },

    onSubjectChange: function() {
      this.$el.find('.label-subject').text(this.model.get('subject'));
    },

    afterRender: function() {
      var CV = Marionette.CollectionView.extend(TroupeViews.SortableMarionetteView, {
        initialize: function() {
          this.itemsInstantiated = 0;
        }/*,
        // to show the full mail body only for the first mail,
        // you could do it like this, but if we're ok with rendering
        // all mail bodyies, css can figure out the child number on it's own
        // which is a simpler solution.

        buildItemView: function(item, ItemViewType, itemViewOptions){
          // build the final list of options for the item view type
          var options = _.extend({model: item}, itemViewOptions, {
            index: this.itemsInstantiated++
          });
          // create the item view instance
          var view = new ItemViewType(options);
          // return it
          return view;
        }*/
      });

      this.collectionView = new CV({
        itemView: ConversationDetailItemView,
        collection: this.model.emailCollection,
        el: this.$el.find(".frame-emails")
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

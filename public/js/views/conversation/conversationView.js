/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'hbs!./tmpl/conversationView',
  'collections/conversations',
  'views/conversation/conversationItemView',
  'hbs!./tmpl/conversationHelpView'
], function($, _, Backbone, Marionette, TroupeViews, template, conversationModels, ConversationItemView, conversationHelpView){
  "use strict";

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(/*options*/) {
      this.data = {
        emailAddress: window.troupeContext.troupe.uri + '@' + window.troupeContext.baseServer,
        troupeName: window.troupeContext.troupe.name.replace(/\s/g,"%20")
      };
    },

    afterRender: function() {
      this.collectionView = new Marionette.CollectionView({
        itemView: ConversationItemView,
        collection: this.collection,
        el: this.$el.find(".frame-conversations"),
        emptyView: TroupeViews.Base.extend({
          template: conversationHelpView,
          data: this.data
        })
      }).render();
    }

  });

});

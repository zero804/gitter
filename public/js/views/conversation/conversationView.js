/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/conversationView',
  'collections/conversations',
  'views/conversation/conversationItemView'
], function($, _, Backbone, TroupeViews, template, conversationModels, ConversationItemView){
  "use strict";

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(/*options*/) {
    },

    getRenderData: function() {
      // we probably want to pull in the domain from config, e.g. for beta.trou.pe
      var emailAddress = window.troupeContext.troupe.uri + '@' + window.troupeContext.baseServer;
      var troupeName = window.troupeContext.troupe.name;
      troupeName = troupeName.replace(/\s/g,"%20");
      return { "emailAddress" : emailAddress, "troupeName" : troupeName };
    },

    afterRender: function() {
      this.collectionView = new TroupeViews.Collection({
        itemView: ConversationItemView,
        collection: this.collection,
        el: this.$el.find(".frame-conversations"),
        noItemsElement: this.$el.find("#frame-help")
      }).render();
    }

  });

});

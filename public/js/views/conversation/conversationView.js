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

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      // we probably want to pull in the domain from config, e.g. for beta.trou.pe
      this.collection = new conversationModels.ConversationCollection();

      _.bindAll(this, 'onCollectionAdd', 'onCollectionReset');

      this.collection.bind('add', this.onCollectionAdd);
      this.collection.bind('reset', this.onCollectionReset);

      this.collection.fetch();
    },

    events: {
      //"click .clickPoint-showEmail": "showEmail"
    },

    getRenderData: function() {
      var emailAddress = window.troupeContext.troupe.uri + '@beta.trou.pe';
      return { "emailAddress" : emailAddress };
    },

    onCollectionReset: function() {
      // Probably not the best way to do this, want to show/hide frame-help if there are no mails/conversations
      $("#frame-help").show();
      $(".frame-conversations", this.el).empty();
      this.collection.each(this.onCollectionAdd);
    },

    onCollectionAdd: function(item) {
      $("#frame-help").hide();
      $(".frame-conversations", this.el).append(new ConversationItemView({ model: item }).render().el);
    }

  });

});

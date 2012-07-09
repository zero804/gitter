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
], function($, _, Backbone, TroupeViews, dateFormat, template, ConversationCollection, ConversationItemView){
  var ConversationView = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      // we probably want to pull in the domain from config, e.g. for beta.trou.pe
      this.collection = new ConversationCollection();

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
      $(".frame-conversations", this.el).empty();
      this.collection.each(this.onCollectionAdd);
    },

    onCollectionAdd: function(item) {
      $(".frame-conversations", this.el).append(new ConversationItemView({ model: item }).render().el);
    }

  });


  return ConversationView;
});

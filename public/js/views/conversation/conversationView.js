// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'dateFormat',
  'text!views/conversation/conversationView.mustache',
  'collections/conversations',
  'views/conversation/conversationItemView'
], function($, _, Backbone, Mustache, dateFormat, template, ConversationCollection, ConversationItemView){
  var ConversationView = Backbone.View.extend({
    collection: new ConversationCollection(),

    initialize: function(options) {
      _.bindAll(this, 'onCollectionAdd', 'onCollectionReset');

      this.collection.bind('add', this.onCollectionAdd);
      this.collection.bind('reset', this.onCollectionReset);

      this.collection.fetch();
    },

    events: {
      //"click .clickPoint-showEmail": "showEmail"
    },

    render: function() {
      var self = this;

      var compiledTemplate = Mustache.render(template, {});

      $(this.el).html(compiledTemplate);
      return this;
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

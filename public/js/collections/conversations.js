define([
  'jquery',
  'underscore',
  'backbone',
  'models/conversation'
], function($, _, Backbone, ConversationModel) {
  var ConversationCollection = Backbone.Collection.extend({
    model: ConversationModel,
    url: "/troupes/" + window.troupeContext.troupe.id + "/conversations",
    initialize: function() {
    }

  });

  return ConversationCollection;
});

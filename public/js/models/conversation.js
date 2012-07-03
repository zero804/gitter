define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  var ConversationModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  return ConversationModel;
});

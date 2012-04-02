define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  var InviteModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      console.log("InviteModel initialize");
    }

  });

  return InviteModel;
});

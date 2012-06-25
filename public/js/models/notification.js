define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  var NotificationModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  return NotificationModel;
});

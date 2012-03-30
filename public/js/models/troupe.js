define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  var TroupeModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      console.log("TroupeModel initialize");
    }

  });

  return TroupeModel;
});

define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  var FileModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  return FileModel;
});

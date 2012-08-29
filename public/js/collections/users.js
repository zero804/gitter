define([
  'jquery',
  'underscore',
  'backbone',
  './base'
], function($, _, Backbone, TroupeCollections) {
  "use strict";

  var exports = {};

  exports.UserModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  exports.UserCollection = TroupeCollections.LiveCollection.extend({
    model: exports.UserModel,
    modelName: 'user',
    nestedUrl: "users"
  });

  return exports;

});

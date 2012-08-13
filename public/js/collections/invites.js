define([
  'jquery',
  'underscore',
  'backbone',
  './base'
], function($, _, Backbone, TroupeCollections) {
  "use strict";

  var exports = {};

  exports.RequestModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  exports.RequestCollection = TroupeCollections.LiveCollection.extend({
    model: exports.RequestModel,
    modelName: 'invite',
    nestedUrl: "invites"
  });

  return exports;

});

define([
  'jquery',
  'underscore',
  'backbone'
], function($, _, Backbone) {
  "use strict";

  var exports = {};
  exports.TroupeModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      console.log("TroupeModel initialize");
    }
  });

  exports.TroupeCollection = Backbone.Collection.extend({
    model: exports.TroupeModel,
    url: "/troupes/",
    initialize: function() {
    }

  });

  return exports;
});

define([
  'jquery',
  'underscore',
  'backbone'
], function($, _, Backbone) {
  "use strict";

  var exports = {};

  exports.NotificationModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  exports.NotificationCollection = Backbone.Collection.extend({
    model: exports.NotificationModel,
    initialize: function() {
      this.url = "/troupes/" + window.troupeContext.troupe.id + "/notifications";

    }

  });

  return exports;
});

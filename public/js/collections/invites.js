define([
  'jquery',
  'underscore',
  'backbone'
], function($, _, Backbone) {
  "use strict";

  var exports = {};

  exports.InviteModel = Backbone.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      console.log("InviteModel initialize");
    }

  });

  var InviteCollection = Backbone.Collection.extend({
    model: exports.InviteModel,
    url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
    initialize: function() {
    }

  });

  return exports;
});

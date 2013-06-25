/*jshint unused:strict, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  './base'
], function($, _, Backbone, TroupeCollections) {
  "use strict";

  var exports = {};

  exports.InviteModel = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    }

  });

  exports.InviteCollection = TroupeCollections.LiveCollection.extend({
    model: exports.InviteModel,
    modelName: 'invite',
    nestedUrl: "invites",

    initialize: function() {
      this.url = "/user/" + window.troupeContext.user.id + "/invites";
    }

  });

  return exports;

});

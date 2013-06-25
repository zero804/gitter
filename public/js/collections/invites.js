/*jshint unused:strict, browser:true */
define([
  './base',
  'utils/context'
], function(TroupeCollections, context) {
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
      this.url = "/user/" + context.getUserId() + "/invites";
    }

  });

  return exports;

});

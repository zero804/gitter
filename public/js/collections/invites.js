/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
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

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
    },

    isForTroupe: function() {
      return !this.get('oneToOneInvite') || this.get('troupeId');
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

  exports.ConnectionInviteCollection = TroupeCollections.LiveCollection.extend({
    model: exports.InviteModel,
    modelName: 'connectioninvites',
    nestedUrl: "connectioninvites",

    initialize: function() {
      this.url = "/user/" + context.getUserId() + "/connectioninvites";
    }

  });

  exports.TroupeInviteCollection = TroupeCollections.LiveCollection.extend({
    model: exports.InviteModel,
    modelName: 'invite',
    nestedUrl: "invites",

    initialize: function() {
      this.url = "/troupes/" + context.getTroupeId() + "/invites";
    }

  });


  return exports;

});

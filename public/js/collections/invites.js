/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  './base',
  'utils/context'
], function(TroupeCollections, context) {
  "use strict";

  var InviteModel = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
    },

    isForTroupe: function() {
      return !this.get('oneToOneInvite') || this.get('troupeId');
    }

  }, { modelType: 'invite' });

  var InviteCollection = TroupeCollections.LiveCollection.extend({
    model: InviteModel,
    modelName: 'invite',
    nestedUrl: "invites",

    initialize: function() {
      this.url = "/api/v1/user/" + context.getUserId() + "/invites";
    }

  });

  var ConnectionInviteCollection = TroupeCollections.LiveCollection.extend({
    model: InviteModel,
    modelName: 'connectioninvites',
    nestedUrl: "connectioninvites",

    initialize: function() {
      this.url = "/api/v1/user/" + context.getUserId() + "/connectioninvites";
    }

  });

  var TroupeInviteCollection = TroupeCollections.LiveCollection.extend({
    model: InviteModel,
    modelName: 'invite',
    nestedUrl: "invites",

    initialize: function() {
      this.url = "/api/v1/troupes/" + context.getTroupeId() + "/invites";
    }

  });


  return {
    InviteModel: InviteModel,
    InviteCollection: InviteCollection,
    ConnectionInviteCollection: ConnectionInviteCollection,
    TroupeInviteCollection: TroupeInviteCollection
  };

});

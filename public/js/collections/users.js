"use strict";
var TroupeCollections = require('./base');
var apiClient = require('components/apiClient');
var SmartUserCollection = require('./smart-users');

module.exports = (function() {


  var UserModel = TroupeCollections.Model.extend({
    idAttribute: "id"
  });

  var UserCollection = TroupeCollections.LiveCollection.extend({
    model: UserModel,
    modelName: 'user',
    url: apiClient.room.channelGenerator('/users'),
    getSnapshotState: function () {
      return { lean: true };
    }
  });

  return {
    RosterCollection: SmartUserCollection.SortedAndLimited,
    SortedUserCollection: SmartUserCollection.Sorted,
    UserCollection: UserCollection,
    UserModel: UserModel
  };


})();


"use strict";

var apiClient = require('components/apiClient');
var SmartUserCollection = require('./smart-users');
var Backbone = require('backbone');
var realtime = require('components/realtime');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var SyncMixin = require('./sync-mixin');

var UserModel = Backbone.Model.extend({
  idAttribute: "id",
  sync: SyncMixin.sync
});

var UserCollection = LiveCollection.extend({
  model: UserModel,
  modelName: 'user',
  url: apiClient.room.channelGenerator('/users'),
  getSnapshotState: function () {
    return { lean: true };
  },
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

var RosterCollection = LiveCollection.extend({
  model: UserModel,
  modelName: 'user',
  url: apiClient.room.channelGenerator('/roster'),
  getSnapshotState: function () {
    return { lean: true };
  },
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});


module.exports = {
  RosterCollection: RosterCollection, //SmartUserCollection.SortedAndLimited,
  SortedUserCollection: SmartUserCollection.Sorted,
  UserCollection: UserCollection,
  UserModel: UserModel
};

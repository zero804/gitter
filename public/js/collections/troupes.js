"use strict";

var apiClient = require('components/apiClient');
var realtime = require('components/realtime');
var gitterRealtimeClient = require('gitter-realtime-client');
var SyncMixin = require('./sync-mixin');

var RoomModel = gitterRealtimeClient.RoomModel.extend({
  sync: SyncMixin.sync
});

var TroupeCollection = gitterRealtimeClient.RoomCollection.extend({
  model: RoomModel,
  url: apiClient.user.channelGenerator("/rooms"),
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

module.exports = {
  TroupeCollection: TroupeCollection,
  TroupeModel:      RoomModel
};

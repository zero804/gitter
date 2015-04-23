"use strict";
var apiClient = require('components/apiClient');
var Backbone = require('backbone');
var realtime = require('components/realtime');
var gitterRealtimeClient = require('gitter-realtime-client');
var SyncMixin = require('./sync-mixin');

var SuggestedTroupeCollection = Backbone.Collection.extend({
  model: gitterRealtimeClient.RoomModel,
  url: apiClient.user.channelGenerator("/rooms?suggested=1"), // Querystring in the URL, Hmm...
  sync: SyncMixin.sync
});

var TroupeCollection = gitterRealtimeClient.RoomCollection.extend({
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

module.exports = {
  SuggestedTroupeCollection: SuggestedTroupeCollection,
  TroupeCollection: TroupeCollection,
  TroupeModel:      gitterRealtimeClient.RoomModel
};

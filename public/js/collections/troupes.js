"use strict";

var _                    = require('underscore');
var moment               = require('moment');
var context              = require('utils/context');
var realtime             = require('components/realtime');
var gitterRealtimeClient = require('gitter-realtime-client');
var SyncMixin            = require('./sync-mixin');

var RoomModel = gitterRealtimeClient.RoomModel.extend({
  sync: SyncMixin.sync
});

var TroupeCollection = gitterRealtimeClient.RoomCollection.extend({
  model: RoomModel,
  urlTemplate: '/v1/user/:userId/rooms',
  contextModel: context.contextModel(),

  constructor: function (models, attrs, options){
    //Pull the initial room list out of the window.troupeContext
    //we have to parse the times into moment objects JP 17/2/16
    models = window.troupeContext.roomList
      .map(function(data){
        return _.extend(data, { lastAccessTime: moment(data.lastAccessTime) });
      });
    gitterRealtimeClient.RoomCollection.prototype.constructor.call(this, models, attrs, options);
    delete window.troupeContext.roomList;
  },

  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

module.exports = {
  TroupeCollection: TroupeCollection,
  TroupeModel:      RoomModel
};

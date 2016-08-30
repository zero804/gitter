"use strict";

var Backbone = require('backbone');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('../components/realtime');
var apiClient = require('../components/apiClient');
var SyncMixin = require('./sync-mixin');
var context = require('../utils/context');

var GroupModel = Backbone.Model.extend({
  defaults: {
    name: '',
    uri: '',
    type: 'org',
    linkPath: null,
    defaultRoomName: 'Lobby',
    unreadItems: false,
    mentions: false,
    activity: false
  },
  url: apiClient.channelGenerator('/v1/groups'),
  sync: SyncMixin.sync
});

var GroupCollection = LiveCollection.extend({
  model: GroupModel,
  urlTemplate: '/v1/user/:userId/groups',
  contextModel: context.contextModel(),
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync,
});

module.exports = {
  Model: GroupModel,
  Collection: GroupCollection
};

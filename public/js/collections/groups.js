"use strict";

var Backbone = require('backbone');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('components/realtime');
var SyncMixin = require('./sync-mixin');
var context = require('utils/context');

var GroupModel = Backbone.Model.extend({
});

var GroupCollection = LiveCollection.extend({
  model: GroupModel,
  urlTemplate: '/v1/user/:userId/groups',
  contextModel: context.contextModel(),
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

module.exports = {
  GroupCollection: GroupCollection,
  GroupModel: GroupModel
};

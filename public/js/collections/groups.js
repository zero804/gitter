"use strict";

var Backbone = require('backbone');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('components/realtime');
var SyncMixin = require('./sync-mixin');
var context = require('utils/context');

var GroupModel = Backbone.Model.extend({
  defaults: {
    type: 'org',
    unreadItems: false,
    mentions: false,
    activity: false
  }
});

var GroupCollection = LiveCollection.extend({
  model: GroupModel,
  urlTemplate: '/v1/user/:userId/groups',
  contextModel: context.contextModel(),
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync,
  comparator: function(a, b){
    if(a.get('temp')) { return -1; }
    if(b.get('temp')) { return 1; }
    return 0;
  }
});

module.exports = {
  GroupCollection: GroupCollection,
  GroupModel: GroupModel
};

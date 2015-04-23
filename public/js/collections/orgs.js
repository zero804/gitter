"use strict";

var apiClient = require('components/apiClient');
var Backbone = require('backbone');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('components/realtime');
var SyncMixin = require('./sync-mixin');

var OrgModel = Backbone.Model.extend({
  idAttribute: 'name' // Unusual...
});

var OrgCollection = LiveCollection.extend({
  model: OrgModel,
  url: apiClient.user.channelGenerator('/orgs'),
  client: function() {
    return realtime.getClient();
  },
  sync: SyncMixin.sync
});

module.exports = {
  OrgCollection:    OrgCollection,
  OrgModel:         OrgModel
};

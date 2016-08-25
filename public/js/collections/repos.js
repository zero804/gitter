"use strict";

var apiClient = require('../components/apiClient');
var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');
var backboneStateTracker = require('gitter-realtime-client/lib/backbone-state-tracking');

var RepoModel = Backbone.Model.extend({
  idAttribute: 'id'
});

var ReposCollection = Backbone.Collection.extend({
  initialize: function() {
    backboneStateTracker.track(this);
  },
  model: RepoModel,
  url: apiClient.user.channelGenerator('/repos'),
  comparator: function(a, b) {
    function compare(a, b) {
      if(a === b) return 0;
      return a < b ? -1 : +1;
    }

    return compare(a.get('name').toLowerCase(), b.get('name').toLowerCase());
  },
  sync: SyncMixin.sync
});

module.exports = {
  ReposCollection: ReposCollection,
  RepoModel:       RepoModel
};

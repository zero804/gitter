"use strict";
var apiClient = require('components/apiClient');
var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');

module.exports = Backbone.Collection.extend({
  sync: SyncMixin.sync,
  fetchForUser: function() {
    this.url = apiClient.user.channel("/suggested-rooms");
    this.fetch();
  },
  fetchForRoom: function() {
    this.url = apiClient.room.channel("/suggested-rooms");
    this.fetch();
  }
});

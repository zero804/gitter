"use strict";

var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');

var UserSearchModel = Backbone.Model.extend({
  idAttribute: "id",
});

var UserSearchCollection = Backbone.Collection.extend({
  url: '/v1/user',
  model: UserSearchModel,
  parse: function (response) {
    return response.results;
  },
  sync: SyncMixin.sync
});

module.exports = {
  Model: UserSearchModel,
  Collection: UserSearchCollection
};

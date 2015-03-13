"use strict";
var loadingMixins = require('./loading-mixins');
var apiClient = require('components/apiClient');
var Backbone = require('backbone');
var cocktail = require('cocktail');
var SyncMixin = require('./sync-mixin');

var RepoModel = Backbone.Model.extend({
  idAttribute: 'id'
});

var ReposCollection = Backbone.Collection.extend({
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
cocktail.mixin(ReposCollection, loadingMixins.LoadingMixin);

module.exports = {
  ReposCollection: ReposCollection,
  RepoModel:       RepoModel
};

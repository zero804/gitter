'use strict';

var Backbone = require('backbone');
var apiClient = require('components/apiClient');
var BaseResolverCollection = require('./base-resolver-collection.js');
var SyncMixin = require('./sync-mixin.js');

var UserSuggestionModel = Backbone.Model.extend({
  idAttribute: 'id'
});


var UserSuggestionCollection = Backbone.Collection.extend({
  url: apiClient.priv.channelGenerator('/inviteUserSuggestions'),
  sync: SyncMixin.sync,

  onFetchSuccess: function(res) {
    this.set(res.results, { merge: true });
  },

  fetch: function(/*query*/) {
    BaseResolverCollection.prototype.fetch.apply(this, arguments);
  },

});



module.exports = {
  UserSuggestionCollection: UserSuggestionCollection,
  UserSuggestionModel: UserSuggestionModel
};

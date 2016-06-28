'use strict';

var Backbone = require('backbone');
var apiClient = require('components/apiClient');
var BaseResolverCollection = require('./base-resolver-collection.js');
var SyncMixin = require('./sync-mixin.js');


var UserSuggestionCollection = Backbone.Collection.extend({
  url: apiClient.priv.channelGenerator('/inviteUserSuggestions'),
  sync: SyncMixin.sync
});



module.exports = UserSuggestionCollection;

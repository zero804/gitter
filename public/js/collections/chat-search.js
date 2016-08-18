"use strict";
var Backbone = require('backbone');
var chatModels = require('./chat');
var apiClient = require('components/apiClient');
var cocktail = require('backbone.cocktail');
var context = require('../utils/context');
var InfiniteCollectionMixin = require('./infinite-mixin');
var SyncMixin = require('./sync-mixin');

var ChatSearchCollection = Backbone.Collection.extend({
  model: chatModels.ChatModel,

  modelName: 'chat',
  url: apiClient.room.channelGenerator('/chatMessages'),
  queryText: '',

  getQuery: function() {
    return { q: this.queryText, lang: context.lang() };
  },

  parse: function(collection) {
    // Why?
    collection.forEach(function(chat) {
      chat.burstFinal = true;
      chat.burstStart = true;
    });

    return collection;
  },

  fetchSearch: function(queryText, callback, context) {
    this.queryText = queryText;
    this.atBottom = false; // TODO: make this nicer
    this.fetchLatest({ }, callback, context);
  },
  sync: SyncMixin.sync
});

cocktail.mixin(ChatSearchCollection, InfiniteCollectionMixin);

module.exports = {
  ChatSearchCollection: ChatSearchCollection
};

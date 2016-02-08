'use strict';

var BaseResolverCollection = require('./base-resolver-collection.js');
var SyncMixin              = require('./sync-mixin.js');

module.exports = BaseResolverCollection.extend({
  template: '/v1/user',
  sync: function(method, collection, options) {
    options.success = this.onFetchSuccess.bind(this);
    SyncMixin.sync.call(this, method, collection, options);
  },

  onFetchSuccess: function(res) {
    this.set(res.results, { merge: true });
  },

  fetch: function (query){
    //check for search query
    if(!query || !query.data || !query.data.q) {
      throw new Error('Search People fetch() called with no { query: { q: "huh?" }}');
    }
    BaseResolverCollection.prototype.fetch.apply(this, arguments);
  },

});

'use strict';

var BaseResolverCollection = require('./base-resolver-collection.js');
var SyncMixin              = require('./sync-mixin.js');

module.exports = BaseResolverCollection.extend({
  template: '/v1/user?q=:searchTerm&limit=3&type=gitter',
  sync: function(method, collection, options) {
    options.success = this.onFetchSuccess.bind(this);
    SyncMixin.sync.call(this, method, collection, options);
  },

  onFetchSuccess: function(res) {
    this.set(res.results, { merge: true });
  },

});

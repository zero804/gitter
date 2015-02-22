"use strict";

var wrap = require('./github-cache-wrapper');
var gittercat = require('./gittercat-client');
var userTokenSelector = require('./user-token-selector').user;

var Search = function(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
};

Search.prototype.findUsers = function(searchString, callback) {
  return gittercat.search.users(searchString + ' type:user', {
      accessToken: this.accessToken,
      firstPageOnly: true,
      noRetry: true
    })
    .nodeify(callback);
};

module.exports = wrap(Search, function() {
  return [this.accessToken || ''];
});

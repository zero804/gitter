'use strict';

var LRU             = require("lru-cache");
var Q               = require('q');
var GithubRepo      = require('gitter-web-github').GitHubRepoService;
var MAX_TOKEN_AGE   = 10 * 60000; // 2 minutes
var publicRoomCache = LRU({
  max: 20,
  maxAge: MAX_TOKEN_AGE
});


module.exports = function getCachedRepo(user, uri) {
  var room = publicRoomCache.get(uri);
  if (room) {
    return Q.resolve(room);
  }

  var ghRepo = new GithubRepo(user);
  return ghRepo.getRepo(uri)
    .then(function(room) {
      publicRoomCache.set(uri, room);
      return room;
    });

};

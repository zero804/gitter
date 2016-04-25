'use strict';

var persistence = require('gitter-web-persistence');

module.exports = function similarTags(user, roomUri) {
  if (!roomUri) return [];
  var parts = roomUri.split('/');

  return persistence.Troupe.find({
    lcOwner: parts[0].toLowerCase(),
    security: 'PUBLIC'
  }, { uri: 1 })
    .exec()
    .then(function(rooms) {
      return rooms.map(function(f) {
        return {
          uri: f.uri,
          githubType: f.githubType,
          roomSibling: true,
        };
      });
    });
};

'use strict';

var userService = require('../user-service');
var inputsForUser = require('./elastic-inputs-for-user');

module.exports = {
  query: function(text, room) {
    var lcText = text.toLowerCase();

    var userIds = room.oneToOneUsers.map(function(obj) {
      return obj.userId.toString();
    });

    return userService.findByIdsLean(userIds)
      .then(function(users) {
        return users.filter(function(user) {
          return getNames(user).some(function(name) {
            return name.indexOf(lcText) === 0;
          });
        });
      });
  }
};

function getNames(user) {
  return inputsForUser(user).map(function(input) {
    // elastic normally does this analysis, but we're faking it
    return input.split(/\s/).filter(Boolean).join('').toLowerCase();
  })
}

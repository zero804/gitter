"use strict";

var Promise = require('bluebird');
var assertMemberLimit = require('./assert-member-limit');
var assertUserValidInRoom = require('./assert-user-valid-in-room');
var assert = require('assert');

module.exports = function(room, existingUser) {

  assert(room, 'Room expected');

  return Promise.join(
    assertMemberLimit(room, existingUser),
    assertUserValidInRoom(room, existingUser),
    function() {
      // Nobody is throwing any errors. Let's continue....
      return;
    })
    .catch(Promise.AggregateError, function(err) {
      // Just throw the first error
      throw err[0];
    });
};

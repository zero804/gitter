'use strict';

var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var duplicateChatDetector = require('./duplicate-chat-detector');
var User = require('gitter-web-persistence').User;

var PROBATION_PERIOD = 86400 * 1000; // First day

function hellbanUser(userId) {
  return User.update({ _id: userId }, {
      $set: {
        hellbanned: true
      }
    })
    .exec();
}
/**
 * Super basic spam detection
 */
function detect(user, parsedMessage) {
  // Once a spammer, always a spammer....
  if (user.hellbanned) return true;

  var userId = user._id;
  var userCreated = mongoUtils.getTimestampFromObjectId(userId);

  // Outside of the probation period? For now, let them do anything
  if ((Date.now() - userCreated) > PROBATION_PERIOD) {
    return false;
  }

  return duplicateChatDetector(userId, parsedMessage.text)
    .tap(function(isSpamming) {
      if (!isSpamming) return;

      return hellbanUser(userId);
    })
}

module.exports = {
  detect: Promise.method(detect)
};

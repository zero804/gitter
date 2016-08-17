"use strict";

var Promise = require('bluebird');
var ChatMessage = require('gitter-web-persistence').ChatMessage;
var debug = require('debug')('gitter:tests:test-fixtures');


function createMessage(fixtureName, f) {
  debug('Creating %s', fixtureName);

  return ChatMessage.create({
    fromUserId: f.fromUserId,
    toTroupeId: f.toTroupeId,
    text: f.text,
    status: f.status,
    html: f.html,
    urls: f.urls,
    mentions: f.mentions,
    issues: f.issues,
    meta: f.meta,
    sent: f.sent,
    editedAt: f.editedAt,
    readBy: f.readBy,
  });
}

function createMessages(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^message/)) {
      var expectedMessage = expected[key];

      expectedMessage.fromUserId = fixture[expectedMessage.user]._id;
      expectedMessage.toTroupeId = fixture[expectedMessage.troupe]._id;

      return createMessage(key, expectedMessage)
        .then(function(message) {
          fixture[key] = message;
        });
    }

    return null;
  });
}

module.exports = createMessages;

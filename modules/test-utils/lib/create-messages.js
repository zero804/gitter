'use strict';

var Promise = require('bluebird');
var ChatMessage = require('gitter-web-persistence').ChatMessage;
var debug = require('debug')('gitter:tests:test-fixtures');

function createMessage(fixtureName, f) {
  debug('Creating %s', fixtureName);

  return ChatMessage.create({
    fromUserId: f.fromUserId,
    toTroupeId: f.toTroupeId,
    parentId: f.parentId,
    text: f.text,
    status: f.status,
    html: f.html,
    urls: f.urls,
    mentions: f.mentions,
    issues: f.issues,
    meta: f.meta,
    sent: f.sent,
    editedAt: f.editedAt,
    pub: f.pub || false,
    readBy: f.readBy
  });
}

const createMessages = (createChildMessages = false) => (expected, fixtures) => {
  const enrichExpectedMessage = expectedMessage => {
    expectedMessage.fromUserId = fixtures[expectedMessage.user]._id;
    expectedMessage.toTroupeId = fixtures[expectedMessage.troupe]._id;
    if (createChildMessages) {
      expectedMessage.parentId = fixtures[expectedMessage.parent]._id;
    }
  };
  const fixtureNameRegex = createChildMessages ? /^childMessage/ : /^message(?!Report)/;
  return Promise.all(
    Object.keys(expected)
      .filter(fixtureName => fixtureName.match(fixtureNameRegex))
      .map(async fixtureName => {
        const expectedMessage = expected[fixtureName];
        enrichExpectedMessage(expectedMessage);
        const message = await createMessage(fixtureName, expectedMessage);
        fixtures[fixtureName] = message;
      })
  );
};

module.exports = {
  createMessages: createMessages(false),
  createChildMessages: createMessages(true)
};

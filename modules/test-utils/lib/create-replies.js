"use strict";

var Promise = require('bluebird');
var Reply = require('gitter-web-persistence').Reply;
var debug = require('debug')('gitter:tests:test-fixtures');


function createReply(fixtureName, f) {
  debug('Creating %s', fixtureName);

  var doc = {
    forumId: f.forum && f.forum._id,
    userId: f.user && f.user._id,
    topicId: f.topic && f.topic._id,
    text: f.text,
    html: f.html
  };

  debug('Creating reply %s with %j', fixtureName, doc);

  return Reply.create(doc);
}

function createExtraReplies(expected, fixture, key) {
  var obj = expected[key];
  var reply = obj.reply;
  if (!reply) return;

  if (typeof reply !== 'string') throw new Error('Please specify the reply as a string id');

  if (fixture[reply]) {
    // Already specified at the top level
    obj.reply = fixture[reply];
    return;
  }

  debug('creating extra reply %s', reply);

  return createReply(reply, {})
    .then(function(createdReply) {
      obj.reply = createdReply;
      fixture[reply] = createdReply;
    });
}

function createReplies(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^reply/)) {
      var expectedReply = expected[key];

      return createReply(key, expectedReply, fixture)
        .then(function(reply) {
          fixture[key] = reply;
        });
    }

    return null;
  })
  .then(function() {
    return Promise.map(Object.keys(expected), function(key) {
      if (key.match(/^(comment)/)) {
        return createExtraReplies(expected, fixture, key);
      }

      return null;
    });
  });
}

module.exports = createReplies;

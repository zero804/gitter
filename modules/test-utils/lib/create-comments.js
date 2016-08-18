"use strict";

var Promise = require('bluebird');
var Comment = require('gitter-web-persistence').Comment;
var debug = require('debug')('gitter:tests:test-fixtures');


function createComment(fixtureName, f) {
  debug('Creating %s', fixtureName);

  var doc = {
    forumId: f.forum && f.forum._id,
    userId: f.user && f.user._id,
    topicId: f.topic && f.topic._id,
    replyId: f.reply && f.reply._id,
    text: f.text,
    html: f.html,
    sent: f.sent,
    editedAt: f.editedAt,
    lastModified: f.lastModified,
    lang: f.lang,
    _md: f._md
  };

  debug('Creating comment %s with %j', fixtureName, doc);

  return Comment.create(doc);
}

function createComments(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^comment/)) {
      var expectedComment = expected[key];

      return createComment(key, expectedComment, fixture)
        .then(function(comment) {
          fixture[key] = comment;
        });
    }

    return null;
  });
}

module.exports = createComments;

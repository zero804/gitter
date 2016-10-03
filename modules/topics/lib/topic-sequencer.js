'use strict';

var TopicSequence = require('gitter-web-persistence').TopicSequence;
var assert = require('assert');

function getNextTopicNumber(forumId) {
  assert(forumId);

  return TopicSequence.findOneAndUpdate({
      forumId: forumId
    }, {
      $inc: {
        current: 1
      }
    }, {
      upsert: true,
      new: true,
      fields: { _id: 0, current: 1 }
    })
    .exec()
    .then(function(doc) {
      return doc.current;
    });
}

module.exports = {
  getNextTopicNumber: getNextTopicNumber
}

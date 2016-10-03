"use strict";

var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var topicSequencer = require('../lib/topic-sequencer');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('topic-sequencer', function() {

  describe('integration tests #slow', function() {
    fixtureLoader.disableMongoTableScans();

    it('should deal with new sequencers', function() {
      var forumId = new ObjectID();
      return topicSequencer.getNextTopicNumber(forumId)
        .then(function(number) {
          assert.strictEqual(number, 1);
        })
    });

    it('should deal with existing sequencers', function() {
      var forumId = new ObjectID();
      return topicSequencer.getNextTopicNumber(forumId)
        .then(function(number) {
          assert.strictEqual(number, 1);

          return topicSequencer.getNextTopicNumber(forumId);
        })
        .then(function(number) {
          assert.strictEqual(number, 2);

          return topicSequencer.getNextTopicNumber(forumId);
        })
        .then(function(number) {
          assert.strictEqual(number, 3);
        })
    });

  });
});

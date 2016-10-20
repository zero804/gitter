'use strict';

var validateTopicSort = require('../lib/validate-topic-sort');
var assert = require('assert');

describe('validate-topic-filter', function() {
  var FIXTURES = [
    [{}, false],

    [{_id: 1}, true],
    [{_id: -1}, true],
    [{_id: 0}, false],
    [{_id: true}, false],
    [{_id: false}, false],
    [{_id: false}, false],
    [{_id: 'moo'}, false],

    [{lastChanged: 1}, true],

    [{repliesTotal: 1}, true],

    [{'reactionCounts.like': 1}, true],

    [{lastChanged: 1, _id: 1}, true],
  ];

  FIXTURES.forEach(function(fixture) {
    var sort = fixture[0];
    var result = fixture[1];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + JSON.stringify(sort), function() {
      assert.strictEqual(validateTopicSort(sort), result);
    });
  });
});


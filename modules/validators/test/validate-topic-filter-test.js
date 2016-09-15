'use strict';

var validateTopicFilter = require('../lib/validate-topic-filter');
var assert = require('assert');

describe('validate-topic-filter', function() {
  var FIXTURES = [
    [{}, true],

    [{tags: ['foo']}, true],
    [{tags: ['foo', 'bar']}, true],
    [{tags: ['']}, false],
    [{tags: [1]}, false],
    [{tags: [{}]}, false],

    [{category: 'general'}, true],
    [{category: 'General'}, false],
    [{category: 1}, false],
    [{category: {}}, false],

    [{username: 'foo'}, true],
    [{username: 'Foo'}, true],
    [{username: 1}, false],
    [{username: {}}, false],

    [{modifiedSince: new Date()}, true],
    [{modifiedSince: new Date().toISOString()}, false],
    [{modifiedSince: 1}, false],
    [{modifiedSince: 'yesterday'}, false],
    [{modifiedSince: {}}, false],

    [{username: 'foo', category: 'general', tags: ['foo', 'bar', 'baz']}, true],
  ];

  FIXTURES.forEach(function(fixture) {
    var filter = fixture[0];
    var result = fixture[1];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + JSON.stringify(filter), function() {
      assert.strictEqual(validateTopicFilter(filter), result);
    });
  });
});


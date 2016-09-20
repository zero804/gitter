'use strict';

var getTopicsFilterSortOptions = require('../lib/get-topics-filter-sort-options');
var assert = require('assert');
var Promise = require('bluebird');
var StatusError = require('statuserror');

describe('get-topics-filter-sort-options', function() {
  var FIXTURES = [
    {
      input: {},
      output: {}
    }, {
      input: {
        tags: 'foo,bar'
      },
      output: {
        filter: {
          tags: ['foo', 'bar']
        }
      }
    }, {
      input: {
        category: 'general'
      },
      output: {
        filter: {
          category: 'general'
        }
      }
    }, {
      input: {
        username: 'lerouxb'
      },
      output: {
        filter: {
          username: 'lerouxb'
        }
      }
    }, {
      input: {
        since: '2016-09-19T12:27:15.917Z'
      },
      output: {
        filter: {
          since: new Date('2016-09-19T12:27:15.917Z')
        }
      }
    }, {
      input: {
        sort: '-lastChanged,-id'
      },
      output: {
        sort: {
          lastChanged: -1,
          id: -1
        }
      }
    }, {
      input: {
        since: '2016-09-19T12:27:15.917Z',
        sort: '-lastChanged'
      },
      output: {
        filter: {
          since: new Date('2016-09-19T12:27:15.917Z')
        },
        sort: {
          lastChanged: -1
        }
      }
    }
  ];

  FIXTURES.forEach(function(fixture) {
    var input = fixture.input;
    var output = fixture.output;

    it('Should parse ' + JSON.stringify(input) + ' as ' + JSON.stringify(output), function() {
      var options = getTopicsFilterSortOptions(input);
      assert.deepStrictEqual(options, output);
    });

    it('should throw a 400 StatusError if you pass it an incorrect date.', function() {
      return Promise.try(function() {
        return getTopicsFilterSortOptions({ since: 'foo' });
      })
      .then(function() {
        assert.ok(false, "Expected error.");
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 400);
      });
    });
  });
});


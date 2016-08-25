'use strict';

var assert = require('assert');
var recorder = require('../../lib/known-external-access/recorder');

describe('recorder', function() {
  describe('generateQuery', function() {
    var FIXTURES = [{
      name: 'should handle both linkPath and externalId',
      userId: '1',
      type: 'type1',
      policyName: 'policyName',
      linkPath: 'linkPath',
      externalId: '123',
      expected: {
        userId: '1',
        type: 'type1',
        policyName: 'policyName',
        $or: [{
          linkPath: 'linkPath'
        }, {
          externalId: '123'
        }]
      }
    }, {
      name: 'should handle just linkPath',
      userId: '1',
      type: 'type1',
      policyName: 'policyName',
      linkPath: 'linkPath',
      externalId: null,
      expected: {
        userId: '1',
        type: 'type1',
        policyName: 'policyName',
        linkPath: 'linkPath'
      }
    }, {
      name: 'should handle just externalId',
      userId: '1',
      type: 'type1',
      policyName: 'policyName',
      linkPath: null,
      externalId: '123',
      expected: {
        userId: '1',
        type: 'type1',
        policyName: 'policyName',
        externalId: '123'
      }
    }];

    FIXTURES.forEach(function(meta) {
      it(meta.name, function() {
        var query = recorder.testOnly.generateQuery(meta.userId, meta.type, meta.policyName, meta.linkPath, meta.externalId)
        assert.deepEqual(query, meta.expected);
      });

    });
  });


});

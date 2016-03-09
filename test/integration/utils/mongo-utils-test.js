/*jslint node: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var underTest = testRequire('./utils/mongo-utils');
var ObjectID = require('mongodb').ObjectID;
var Promise = require('bluebird');

describe('mongo-utils', function() {

  // The millisecond value seems to float around in some instances, so this test
  // is designed to be spread out over several milliseconds to test this theory
  it('should return the right time, no matter what the current time #slow', function(done) {

    function doLater(i) {
      return Promise.delay(i * 10)
        .then(function() {
          var t = underTest.getDateFromObjectId('51adcd412aefe1576f000005');
          assert.equal(t.getTime(), 1370344769000);
        });
    }

    var promises = [];
    for(var i = 0; i < 10; i++) {
      promises.push(doLater(i));
    }

    Promise.all(promises).then(function() { done(); }, done);

  });


  // The millisecond value seems to float around in some instances, so this test
  // is designed to be spread out over several milliseconds to test this theory
  it('should return the right time, no matter what the current time #slow', function(done) {
    var id = new ObjectID();
    var t = id.getTimestamp().getTime();

    function doLater(i) {
      return Promise.delay(i * 10)
        .then(function() {
          assert.equal(id.getTimestamp().getTime(), t);

        });
    }

    var promises = [];
    for(var i = 0; i < 10; i++) {
      promises.push(doLater(i));
    }

    Promise.all(promises).then(function() { done(); }, done);

  });

  it('should handle ObjectIDs', function() {
    var id = new ObjectID('51adcd412aefe1576f000005');
    var t = underTest.getTimestampFromObjectId(id);
    assert.equal(t, 1370344769000);
  });

  describe('isLikeObjectId', function() {
    it('should parse objectIds', function() {
      var id = new ObjectID('51adcd412aefe1576f000005');
      assert(underTest.isLikeObjectId(id));
    });

    it('should parse objectId strings', function() {
      var id = '51adcd412aefe1576f000005';
      assert(underTest.isLikeObjectId(id));
    });

    it('should not parse the string moo', function() {
      var id = 'moo';
      assert(!underTest.isLikeObjectId(id));
    });

    it('should not parse the string undefined', function() {
      var id = 'undefined';
      assert(!underTest.isLikeObjectId(id));
    });

    it('should not parse random hashes', function() {
      var id = { problems_i_have: 99 };
      assert(!underTest.isLikeObjectId(id));
    });

  });

  describe('serializeObjectId', function() {
    it('should serialise objectIds', function() {
      var id = new ObjectID('51adcd412aefe1576f000005');
      assert.equal('51adcd412aefe1576f000005', underTest.serializeObjectId(id));
    });

    it('should serialise strings', function() {
      var id = '51adcd412aefe1576f000005';
      assert.equal('51adcd412aefe1576f000005', underTest.serializeObjectId(id));
    });

    it('should serialise nulls', function() {
      var id = null;
      assert.equal(null, underTest.serializeObjectId(id));
    });

  });

  describe('conjunctionIds', function() {
    var id1, id2, id3, id4, id5, id6;

    before(function() {
      id1 = new ObjectID('51adcd412aefe1576f000005');
      id2 = new ObjectID('51adcd412aefe1576f000006');
      id3 = new ObjectID('51adcd412aefe1576f000007');
      id4 = new ObjectID('51adcd412aefe1576f000008');
      id5 = new ObjectID('51adcd412aefe1576f000009');
      id6 = new ObjectID('51adcd412aefe1576f00000a');
    });

    it('should deal with sets with less than three items', function() {
      var result = underTest.conjunctionIds([{ x: id1, y: id2 }, { x: id1, y: id3 }], ['x', 'y']);
      assert.deepEqual(result, { $or: [{ x: id1, y: id2 }, { x: id1, y: id3 }] });
    });

    it('should deal with sets where the first item is unique', function() {
      var result;
      for (var i = 0; i < 100000; i++) {
        result = underTest.conjunctionIds([{ x: id1, y: id2 }, { x: id1, y: id3 }, { x: id1, y: id4 }, { x: id1, y: id5 }], ['x', 'y']);
      }
      assert.deepEqual(result, { $and: [{ x: id1 }, { y: { $in: [id2, id3, id4, id5 ] } }] });

    });

    it('should deal with sets where the second item is unique', function() {
      var result = underTest.conjunctionIds([{ x: id2, y: id1 }, { x: id3, y: id1 }, { x: id4, y: id1 }, { x: id5, y: id1 }], ['x', 'y']);
      assert.deepEqual(result, { $and: [{ y: id1 }, { x: { $in: [id2, id3, id4, id5 ] } }] });
    });

    it('should deal with sets with no unique items', function() {
      var terms = [{ x: id1, y: id2 }, { x: id3, y: id4 }, { x: id5, y: id6 }, { x: id1, y: id6 }];
      var result = underTest.conjunctionIds(terms, ['x', 'y']);
      assert.deepEqual(result, { $or: terms });
    });

  });

});

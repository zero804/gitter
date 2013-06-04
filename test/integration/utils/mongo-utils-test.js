/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var underTest = testRequire('./utils/mongo-utils');
var ObjectID = require('mongodb').ObjectID;
var Q = require('q');

describe('mongo-utils', function() {

  // The millisecond value seems to float around in some instances, so this test
  // is designed to be spread out over several milliseconds to test this theory
  it('should return the right time, no matter what the current time', function(done) {

    function doLater(i) {
      var d = Q.defer();
      setTimeout(function() {
        try {
          var t = underTest.getDateFromObjectId('51adcd412aefe1576f000005');
          assert.equal(t.getTime(), 1370344769000);
          d.resolve();
        } catch(e) {
          console.log("ERROR!", e);
          d.reject(e);
        }

      }, i * 10);

      return d.promise;
    }

    var promises = [];
    for(var i = 0; i < 10; i++) {
      promises.push(doLater(i));
    }

    Q.all(promises).then(function() { done(); }, done);

  });


  // The millisecond value seems to float around in some instances, so this test
  // is designed to be spread out over several milliseconds to test this theory
  it('should return the right time, no matter what the current time', function(done) {
    var id = new ObjectID();
    var t = id.getTimestamp().getTime();

    function doLater(i) {
      var d = Q.defer();
      setTimeout(function() {
        try {
          assert.equal(id.getTimestamp().getTime(), t);
          d.resolve();
        } catch(e) {
          console.log("ERROR!", e);
          d.reject(e);
        }

      }, i * 10);

      return d.promise;
    }

    var promises = [];
    for(var i = 0; i < 10; i++) {
      promises.push(doLater(i));
    }

    Q.all(promises).then(function() { done(); }, done);

  });

  it('should handle ObjectIDs', function() {
    var id = new ObjectID('51adcd412aefe1576f000005');
    var t = underTest.getTimestampFromObjectId(id);
    assert.equal(t, 1370344769000);
  });

});
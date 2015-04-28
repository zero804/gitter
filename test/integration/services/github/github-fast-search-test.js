/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../../test-require');
var assert = require("assert");
var Search = testRequire('./services/github/github-fast-search');

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-fast-search #slow', function() {
  it('should find suprememoocow', function(done) {
    var search = new Search(FAKE_USER);

    search.findUsers('andrew newdigate')
      .then(function(results) {
        assert(Array.isArray(results));
        assert(results[0]);
      })
      .nodeify(done);
  });

  it('should not find more than one page of results', function(done) {
    var search = new Search(FAKE_USER);

    search.findUsers('andrew')
      .then(function(results) {
        assert(Array.isArray(results));
        assert.strictEqual(results.length, 30);
        assert(results[0]);
      })
      .nodeify(done);
  });

});

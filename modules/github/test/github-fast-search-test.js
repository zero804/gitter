/* global describe:true, it:true */
"use strict";

var assert = require("assert");
var Search = require('..').GitHubFastSearch;

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

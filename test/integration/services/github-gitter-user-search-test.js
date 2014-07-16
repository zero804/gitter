/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../test-require');
var assert = require("assert");
var Q = require('q');

var FakeGithubSearch = function() {};
FakeGithubSearch.prototype.findUsers = function(query) {
    var results = {
    'gitter-and-github': [{ login: 'some-github-user'}],
    'duplicate-users': [{ login: 'gitter-friend'}]
  };

  return Q(results[query]);
};


var search = testRequire.withProxies('./services/github-gitter-user-search', {
  './user-search-service': {
    searchForUsers: function(userId, query) {
      var results = {
        'gitter-and-github': [{ username: 'gitter-friend'}],
        'duplicate-users': [{ username: 'gitter-friend'}]
      };

      return Q({ results: results[query]});
    }
  },
  './github/github-fast-search': FakeGithubSearch
});

var fakeUser = { id: 'abc123' };

describe('github-gitter-user-serach', function() {
  it('puts gitter connections above strangers', function(done) {

    search('gitter-and-github', fakeUser).then(function(data) {
      assert.equal(data.results[0].username, 'gitter-friend');
      assert.equal(data.results[1].username, 'some-github-user');
    }).nodeify(done);

  });

  it('removes duplicate github users', function(done) {

    search('duplicate-users', fakeUser).then(function(data) {
      assert.equal(data.results[0].username, 'gitter-friend');
      assert.equal(data.results.length, 1);
    }).nodeify(done);

  });

});

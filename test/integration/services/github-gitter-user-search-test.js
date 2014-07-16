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
    'duplicate-users': [{ login: 'gitter-friend'}],
    'include-self': [{ login: 'fake-user'}],
    'github-user-on-gitter': [{ login: 'gitter-user-that-you-dont-know'}],
    'on-gitter-off-gitter': [{ login: 'some-github-user'}, { login: 'gitter-user-that-you-dont-know'}]
  };

  return Q(results[query]);
};

var fakeGitterSearch = {
  searchForUsers: function(userId, query) {
    var results = {
      'gitter-and-github': [{ username: 'gitter-friend'}],
      'duplicate-users': [{ username: 'gitter-friend'}],
      'include-self': [fakeUser],
      'github-user-on-gitter': [],
      'on-gitter-off-gitter': []
    };

    return Q({ results: results[query]});
  }
};

var fakeUserService = {
  githubUsersExists: function() {
    return Q({
      'gitter-user-that-you-dont-know': true,
      'gitter-friend': true,
      'fake-user': true,
    });
  },
  findByUsernames: function(usernames) {
    return Q.fcall(function() {
      return usernames.map(function(username) {
        var user = { username: username };

        if(username === 'fake-user') {
          user.id = 'abc123';
        } else if(username === 'gitter-user-that-you-dont-know') {
          user.id = 'iamnewid1234';
        }
        return user;
      });
    });
  }

};


var search = testRequire.withProxies('./services/github-gitter-user-search', {
  './user-search-service': fakeGitterSearch,
  './github/github-fast-search': FakeGithubSearch,
  './user-service': fakeUserService
});

var fakeUser = { id: 'abc123', username: 'fake-user' };

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

  it('doesnt include yourself', function(done) {

    search('include-self', fakeUser).then(function(data) {
      assert.equal(data.results.length, 0);
    }).nodeify(done);

  });

  describe('adding gitter metatdata to github users', function() {

    it('adds metatdata to a single matching github user', function(done) {

      search('github-user-on-gitter', fakeUser).then(function(data) {
        assert.equal(data.results[0].id, 'iamnewid1234');
        assert.equal(data.results.length, 1);
      }).nodeify(done);

    });

    it('handles sparse matches correctly', function(done) {

      search('on-gitter-off-gitter', fakeUser).then(function(data) {
        assert(!data.results[0].id);
        assert.equal(data.results[1].id, 'iamnewid1234');
        assert.equal(data.results.length, 2);
      }).nodeify(done);

    });

  });

});

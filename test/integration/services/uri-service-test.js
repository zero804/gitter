#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');

var fixture = {};

before(fixtureLoader(fixture, {
  user1: { username: true },
  user2: { },
  user3: { username: true },
  user4: { username: true },
  user5: { },
  troupe1: { users: [ 'user3', 'user4' ] },

  invite1: { fromUser: 'user3', user: 'user5', troupe: 'troupe1' },
  invite2: { fromUser: 'user4', user: 'user5' }

}));

var underTest = testRequire("./services/uri-service");

describe('uri-service', function() {
  // XXX: fix these tests
  xdescribe('#findUriForUser', function() {

    it('01. should find a user for a logged in user', function(done) {
      underTest.findUriForUser(fixture.user2.id, fixture.user1.username)
        .then(function(result) {
          assert(result);
          assert(result.otherUser);
          assert(!result.troupe);
          assert(!result.access);
          assert(!result.invite);
          assert.equal(result.otherUser.id, fixture.user1.id);

        })
        .nodeify(done);
    });

    it('02. should find a user for a an unauthenticated user', function(done) {
      underTest.findUriForUser(null, fixture.user1.username)
        .then(function(result) {
          assert(result);
          assert(result.otherUser);
          assert(!result.troupe);
          assert(!result.access);
          assert(!result.invite);
          assert.equal(result.otherUser.id, fixture.user1.id);

        })
        .nodeify(done);
    });

    it('03. should find a troupe for an authenticated user without access', function(done) {
      underTest.findUriForUser(fixture.user1, fixture.troupe1.uri)
        .then(function(result) {
          assert(result);
          assert(result.troupe);
          assert(result.group);
          assert(!result.access);
          assert.equal(result.troupe.id, fixture.troupe1.id);
        })
        .nodeify(done);
    });

    it('04. should find a troupe for an nonauthenticated user', function(done) {
      underTest.findUriForUser(null, fixture.troupe1.uri)
        .then(function(result) {
          assert(result);
          assert(result.troupe);
          assert(result.group);
          assert(!result.access);
          assert.equal(result.troupe.id, fixture.troupe1.id);
        })
        .nodeify(done);
    });

    it('05. should find a troupe for an authenticated user with access', function(done) {
      underTest.findUriForUser(fixture.user3, fixture.troupe1.uri)
        .then(function(result) {
          assert(result);
          assert(result.troupe);
          assert(result.group);
          assert(result.access);
          assert.equal(result.troupe.id, fixture.troupe1.id);
        })
        .nodeify(done);
    });

    it('06. should connect two users with an implicit connection', function(done) {
      underTest.findUriForUser(fixture.user4, fixture.user3.username)
        .then(function(result) {
          assert(result);
          assert(result.otherUser);
          assert(result.troupe);
          assert(result.access);
          assert(!result.invite);
          assert.equal(result.otherUser.id, fixture.user3.id);

        })
        .nodeify(done);
    });

    it('07. when an invite exists for a connection, should return it', function(done) {
      underTest.findUriForUser(fixture.user5.id, fixture.user4.username)
        .then(function(result) {
          assert(result);
          assert(result.otherUser);
          assert(!result.troupe);
          assert(!result.access);
          assert.equal(result.otherUser.id, fixture.user4.id);
          assert(result.invite);
          assert.equal(result.invite.id, fixture.invite2.id);

        })
        .nodeify(done);
    });


    it('08. when an invite exists for a troupe, should return it', function(done) {
      underTest.findUriForUser(fixture.user5, fixture.troupe1.uri)
        .then(function(result) {
          assert(result);
          assert(result.group);
          assert(result.troupe);
          assert(!result.access);
          assert(result.invite);
          assert.equal(result.invite.id, fixture.invite1.id);

        })
        .nodeify(done);
    });


  });

});

after(function() {
  //fixture.cleanup();
});
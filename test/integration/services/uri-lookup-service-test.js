#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');

var uriLookupService = testRequire("./services/uri-lookup-service");
var promiseUtils = testRequire("./utils/promise-utils");

var fixtureLoader = require('../test-fixtures');
var fixture = {};


describe('uri-lookup-service', function() {

  before(fixtureLoader(fixture, {
    user1: { },
    troupe1: { },
    troupe2: { }, // used in test 3, for missing lookup
    user2: { username: true }, // used in test 3, for missing lookup
    user3: { username: true }
  }));


  it('01. should set a username for a new user, then allow the user to change the username, then remove it', function(done) {
    // Update the username to something new
    var newUsername = fixture.generateUsername();
    var originalUsername = fixture.generateUsername();

    uriLookupService.updateUsernameForUserId(fixture.user1.id, null, originalUsername)
      .then(function() {
        return uriLookupService.lookupUri(originalUsername)
          .then(promiseUtils.required)
          .then(function(uriLookup) {
            assert.equal(uriLookup.userId, fixture.user1.id);
            assert(!uriLookup.troupeId);
          });
      })
      .then(function() {
        return uriLookupService.updateUsernameForUserId(fixture.user1.id, originalUsername, newUsername);
      })
      .then(function() {
        // Check that the username has been updated
        return uriLookupService.lookupUri(newUsername)
          .then(promiseUtils.required)
          .then(function(uriLookup) {
            assert.equal(uriLookup.userId, fixture.user1.id);
            assert(!uriLookup.troupeId);
          });
      })
      .then(function() {
        // Check that the original username is gone
        return uriLookupService.lookupUri(originalUsername)
          .then(function(uriLookup) {
            assert(!uriLookup);
          });
      })
      .then(function() {
        // Remove the username to something new
        return uriLookupService.removeUsernameForUserId(fixture.user1.id, newUsername);
      })
      .then(function() {
        // Check that the original username is gone
        return uriLookupService.lookupUri(newUsername)
          .then(function(uriLookup) {
            assert(!uriLookup);
          });
      })
      .nodeify(done);
  });

  it('02. allow a URI to be reserved for a troupe then removed', function(done) {
    var uri = fixture.troupe1.uri;

    uriLookupService.reserveUriForTroupeId(fixture.troupe1.id, uri)
      .then(function() {
        return uriLookupService.lookupUri(uri)
          .then(promiseUtils.required)
          .then(function(uriLookup) {
            assert.equal(uriLookup.troupeId, fixture.troupe1.id);
            assert(!uriLookup.userId);
          });
      })
      .then(function() {
        return uriLookupService.removeUriForTroupeId(fixture.troupe1.id);
      })
      .then(function() {
        return fixture.troupe1.remove();
      })
      .then(function() {
        // Check that the original username is gone
        return uriLookupService.lookupUri(uri)
          .then(function(uriLookup) {
            assert(!uriLookup, 'URI lookup should not return a value after troupe Uri has been removed');
          });
      })
      .nodeify(done);
  });


  it('03. it should attempt to lookup if a troupe uri is missing', function(done) {
    var uri = fixture.troupe2.uri;

    return uriLookupService.lookupUri(uri)
      .then(promiseUtils.required)
      .then(function(uriLookup) {
        assert.equal(uriLookup.troupeId, fixture.troupe2.id);
      })
      .then(function() {
        return uriLookupService.removeUriForTroupeId(fixture.troupe1.id, uri);
      })
      .nodeify(done);
  });

  it('04. it should attempt to lookup if a username uri is missing', function(done) {
    var uri = fixture.user2.username;

    return uriLookupService.lookupUri(uri)
      .then(promiseUtils.required)
      .then(function(uriLookup) {
        assert.equal(uriLookup.userId, fixture.user2.id);
      })
      .fin(function() {
        return uriLookupService.removeUsernameForUserId(fixture.user2.id);
      })
      .nodeify(done);
  });


  it('05. it should disallow uri clashes', function(done) {
    return uriLookupService.updateUsernameForUserId(fixture.user3.id, null, fixture.user3.username)
      .then(function() {
        return uriLookupService.updateUsernameForUserId(fixture.user1.id, null, fixture.user3.username);
      })
      .then(function() {
        assert(false, 'Expected a 409 conflict exception');
      })
      .fail(function(err) {
        assert.equal(err, 409);
      })
      .fin(function() {
        return uriLookupService.removeUsernameForUserId(fixture.user3.id, fixture.user3.username);
      })
      .nodeify(done);
  });




  after(function() {
    fixture.cleanup();
  });

});
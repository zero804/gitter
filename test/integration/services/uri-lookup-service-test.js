
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


  it('04. it should attempt to lookup if a username uri is missing', function(done) {
    var uri = fixture.user2.username;

    return uriLookupService.lookupUri(uri)
      .then(promiseUtils.required)
      .then(function(uriLookup) {
        assert.equal(uriLookup.userId, fixture.user2.id);
      })
      .finally(function() {
        return uriLookupService.removeUsernameForUserId(fixture.user2.id);
      })
      .nodeify(done);
  });

  it('07. repo style', function(done) {
    return uriLookupService.lookupUri('gitterHQ/cloaked-avenger')
      .nodeify(done);
  });




  after(function() {
    fixture.cleanup();
  });

});

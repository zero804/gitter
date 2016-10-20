"use strict";

var assert = require('assert');

var uriLookupService = require("../lib/uri-lookup-service");
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('uri-lookup-service', function() {

  var fixture = fixtureLoader.setup({
    user1: { },
    troupe1: { },
    troupe2: { }, // used in test 3, for missing lookup
    user2: { username: true }, // used in test 3, for missing lookup
    user3: { username: true }
  });


  it('04. it should attempt to lookup if a username uri is missing', function() {
    var uri = fixture.user2.username;

    return uriLookupService.lookupUri(uri)
      .then(function(uriLookup) {
        assert(uriLookup);
        assert.equal(uriLookup.userId, fixture.user2.id);
      })
      .finally(function() {
        return uriLookupService.removeUsernameForUserId(fixture.user2.id);
      })
  });

  it('07. repo style', function() {
    return uriLookupService.lookupUri('gitterHQ/cloaked-avenger')
      .nodeify();
  });

});

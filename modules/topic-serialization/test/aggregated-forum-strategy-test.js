"use strict";

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Strategy = require('../lib/notifications/aggregated-forum-strategy');
var assertStringifiedEqual = require('./assert-stringified-equal');

describe('aggregated-forum-strategy', function() {

  var fixture = fixtureLoader.setup({
    forum: {}
  });

  it('serializes correctly', function () {
    var strategy = new Strategy();
    var forum = fixture.forum;

    var result = strategy.map(forum);

    assertStringifiedEqual(result, {
      id: forum._id,
      name: forum.name,
      uri: forum.uri,
      tags: []
    });
  });

});


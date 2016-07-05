"use strict";

var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils')
var env = require('gitter-web-env');
var nconf = env.config;
var serialize = testRequire('./serializers/serialize');
var GroupStrategy = testRequire('./serializers/rest/group-strategy');


function getExpectedForGroup(group) {
  return [{
    id: group.id,
    name: group.name,
    uri: group.uri,
    avatarUrl: nconf.get('avatar:officialHost') + '/group/i/' + group.id,
  }];
}

describe('GroupStrategy', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = {};
  before(fixtureLoader(fixture, {
    group1: {}
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('should serialize a group', function() {
    var strategy = new GroupStrategy();
    var group = fixture.group1;
    return serialize([group], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, getExpectedForGroup(group));
      });
  });
});

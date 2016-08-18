"use strict";

var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils')
var env = require('gitter-web-env');
var nconf = env.config;
var serialize = testRequire('./serializers/serialize');
var SuggestedRoomStrategy = testRequire('./serializers/rest/suggested-room-strategy');


function getExpectedForSuggestion(suggestion) {
  return [{
    id: suggestion.id,
    uri: suggestion.uri,
    avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + suggestion.uri.split('/')[0],
    userCount: 1,
    // messageCount: 0,
    tags: [],
    description: '',
    exists: true
  }];
}

describe('SuggestedRoomStrategy', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    troupe1: {
      users: ['user1'],
      githubType: 'USER_CHANNEL',
      security: 'PUBLIC'
    }
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('should serialize a suggestion that is a room object', function() {
    var strategy = new SuggestedRoomStrategy({ currentUserId: fixture.user1._id});
    var suggestion = fixture.troupe1;
    return serialize([suggestion], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, getExpectedForSuggestion(suggestion));
      });
  });

});

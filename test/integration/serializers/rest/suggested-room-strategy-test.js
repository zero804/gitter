"use strict";

var testRequire = require('../../test-require');
var fixtureLoader = require('../../test-fixtures');
var assertUtils = testRequire('./utils/assert-utils')
var serialize = testRequire('./serializers/serialize');
var SuggestedRoomStrategy = testRequire('./serializers/rest/suggested-room-strategy');


// Using user channel rooms to prevent it from going to github unnecessarily,
// but the fixtures aren't creating sane uris for USER_CHANNEL troupes where we
// expect the first component to be the username of the user that created it,
// so just use whatever it ended up generating.
function guessAvatarUrl(url) {
  return '/api/private/user-avatar/'+ url.split('/')[0] +'?s=48';
}

function getExpectedForSuggestion(suggestion) {
  return [{
    id: suggestion.id,
    uri: suggestion.uri,
    avatarUrl: guessAvatarUrl(suggestion.uri),
    userCount: 1,
    messageCount: 0,
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
    var user = fixture.user1;
    var suggestion = fixture.troupe1;
    return serialize([suggestion], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, getExpectedForSuggestion(suggestion));
      });
  });

  it('should serialize a suggestion with a roomId', function() {
    var strategy = new SuggestedRoomStrategy({ currentUserId: fixture.user1._id});
    var user = fixture.user1;
    var suggestion = fixture.troupe1;
    return serialize([{roomId: suggestion.id}], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, getExpectedForSuggestion(suggestion));
      });
  });
});

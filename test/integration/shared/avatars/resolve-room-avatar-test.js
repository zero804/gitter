/*jslint node:true, unused:true*/
/*global describe:true, it:true */
'use strict';

var assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var testRequire = require('../../test-require');
var resolveRoomAvatarUrl = testRequire('../shared/avatars/resolve-room-avatar-url');

describe('avatar url generator', function() {
  const fixture = fixtureLoader.setup({
    group1: {}
  });

  it('should create an avatar url for a repo room', function() {
    var result = resolveRoomAvatarUrl({ uri: '/gitterHQ' }, 48);

    assert.equal(result, 'https://avatars1.githubusercontent.com/gitterHQ?&s=48');
  });

  it('should create an avatar url for a one to one room', function() {
    var result = resolveRoomAvatarUrl({ uri: 'trevorah' }, 48);

    assert.equal(result, 'https://avatars0.githubusercontent.com/trevorah?&s=48');
  });

  it('should create an avatar url for a room in a group', function() {
    var result = resolveRoomAvatarUrl({ groupId: fixture.group1._id }, 48);

    const expected = `/api/private/avatars/group/i/${fixture.group1._id}`;
    assert(
      result.endsWith(expected),
      `Actual: ${result} was expected to end with Expected: ${expected}`
    );
  });
});

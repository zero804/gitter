'use strict';

var generateLeftMenuState = require('../test-require')('gitter-web-shared/parse/left-menu-state');
var assert = require('assert');


var orgListFixture = [
  {
    id: '1',
    name: 'gitterHQ',
    isOrg: true,
    temp: false,
  },
  {
    id: '2',
    name: 'w3c',
    isOrg: true,
    temp: false,
  }
];

var orgListWithTempFixture = orgListFixture.concat({
  id: '3',
  name: 'temp-foo',
  isOrg: true,
  temp: true,
})

describe('left-menu state', function() {
  it('Resolves `/org` as its\' respective org state', function() {
    var leftMenuState = generateLeftMenuState({}, 'gitterHQ', orgListFixture, {});

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'org',
      selectedOrgName: 'gitterHQ'
    });
  });

  it('Org directory resolves to respective org state', function() {
    var leftMenuState = generateLeftMenuState({}, 'orgs/temp-foo/rooms', orgListWithTempFixture, {
      orgName: 'w3c'
    });

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'org',
      selectedOrgName: 'temp-foo'
    });
  });
});

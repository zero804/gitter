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
    var leftMenuState = generateLeftMenuState({}, 'gitterHQ', orgListFixture);

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'org',
      selectedOrgName: 'gitterHQ'
    });
  });

  it('Resolves `/org/room` as its\' respective org state', function() {
    var leftMenuState = generateLeftMenuState({}, 'gitterHQ/gitter', orgListFixture);

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'org',
      selectedOrgName: 'gitterHQ'
    });
  });

  it('Resolves `/home` as the "all" state', function() {
    var leftMenuState = generateLeftMenuState({}, 'home', orgListFixture);

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'all',
      selectedOrgName: 'home'
    });
  });

  it('Org directory resolves to respective org state', function() {
    var leftMenuState = generateLeftMenuState({}, 'orgs/temp-foo/rooms', orgListWithTempFixture);

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'org',
      selectedOrgName: 'temp-foo'
    });
  });


  it('Maintain state if loading when refreshing/unload', function() {
    var beforeLeftMenuState = {
      state: 'org',
      selectedOrgName: 'gitterHQ'
    };
    var leftMenuState = generateLeftMenuState(beforeLeftMenuState, 'w3c/svg', orgListFixture, {
      // Simulate a unload "refresh"
      previousUnloadTime: new Date().getTime()
    });

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'org',
      selectedOrgName: 'gitterHQ'
    });
  });


  it('Resolve to respective URI org if unload/"refresh" time was too far away', function() {
    var beforeLeftMenuState = {
      state: 'org',
      selectedOrgName: 'gitterHQ'
    };
    var leftMenuState = generateLeftMenuState(beforeLeftMenuState, 'w3c/svg', orgListFixture, {
      // Simulate a unload minutes ago
      previousUnloadTime: new Date().getTime() - (5 * 60 * 1000)
    });

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'org',
      selectedOrgName: 'w3c'
    });
  });


  it('Resolve to people-state when visiting one-to-one that is not in your org list', function() {
    var leftMenuState = generateLeftMenuState({}, 'some-person', orgListFixture, {
      isOneToOne: true
    });

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'people',
      selectedOrgName: 'some-person',
    });
  });

});

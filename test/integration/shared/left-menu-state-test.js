'use strict';

var generateLeftMenuState = require('../test-require')('gitter-web-shared/parse/left-menu-state');
var assert = require('assert');


var orgListFixture = [
  {
    id: '1',
    name: 'gitterHQ',
    isOrg: true,
    temp: false,
  }
];

describe('left-menu state', function() {
  it('Resolves `/org` as its\' own org view', function() {
    var leftMenuState = generateLeftMenuState({}, '/gitterHQ', orgListFixture, {});

    assert.deepEqual(leftMenuState,  {
      roomMenuIsPinned: true,
      state: 'org',
      selectedOrgName: 'gitterHQ'
    });
  });
});

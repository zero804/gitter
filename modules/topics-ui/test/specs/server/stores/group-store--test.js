"use strict"

var assert = require('assert');
var groupStore = require('../../../../server/stores/group-store');

describe.skip('groupStore', () => {

  var data = {};

  it('should expose a data object', () => {
    assert(groupStore(data).data);
  });

  it('should expose a getGroup function', () => {
    assert(groupStore(data).getGroup);
  });

  it('should expose a getGroupId function', () => {
    assert(groupStore(data).getGroupId);
  });

  it('should expose a getGroupUri function', () => {
    assert(groupStore(data).getGroupUri);
  });

  it('should expose a getGroupName function', () => {
    assert(groupStore(data).getGroupName);
  });
});

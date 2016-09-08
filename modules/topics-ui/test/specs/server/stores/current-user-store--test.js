"use strict";

var assert = require('assert');
var currentUserStore = require('../../../../server/stores/current-user-store');
var data = require('../../../mocks/mock-data/current-user');

describe('currentUserStore', () => {

  it('should export a data object', () => {
    assert(currentUserStore(data).data);
  });

  it('should an object with getCurrentUser', () => {
    assert(currentUserStore(data).getCurrentUser);
  });

});

"use strict";

var assert = require('assert');
var currentUserStore = require('../../../../server/stores/current-user-store');

describe('currentUserStore', () => {

  var data = {};

  it('should an object with getCurrentUser', () => {
    assert(currentUserStore(data).get);
  });

});

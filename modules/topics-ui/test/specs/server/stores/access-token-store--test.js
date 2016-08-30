"use strict";

var assert = require('assert');
var accessTokenStore = require('../../../../server/stores/access-token-store');

describe('accessTokenStore', () => {

  var data = {};

  it('should an object with getAccessToken', () => {
    assert(accessTokenStore(data).get);
  });

});

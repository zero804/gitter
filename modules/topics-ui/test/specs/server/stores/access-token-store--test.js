"use strict";

var assert = require('assert');
var accessTokenStore = require('../../../../server/stores/access-token-store');

describe('accessTokenStore', () => {

  var data = {};

  it('should export a getAccessToken', () => {
    assert(accessTokenStore(data).getAccessToken);
  });


it('should export a getAccessToken', () => {
    assert(accessTokenStore(data).token);
  });

});

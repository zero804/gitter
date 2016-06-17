'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var uriContextResolverMiddleware = testRequire('./handlers/uri-context/uri-context-resolver-middleware');
var getRedirectUrl = uriContextResolverMiddleware.testOnly.getRedirectUrl;

// see https://github.com/nodejs/node/blob/master/lib/_http_common.js
function checkInvalidHeaderChar(val) {
  val = '' + val;
  var ch;
  for (var i = 0; i < val.length; i++) {
    ch = val.charCodeAt(i);
    if (ch === 9) continue;
    if (ch <= 31 || ch > 255 || ch === 127) return true;
  }
  return false;
}

describe('middleware', function() {
  describe('getRedirectUrl', function() {
    it('deals with chinese characters', function() {
      var input = "/Luzifer1984/路/archives/2014/10/09";
      var output = getRedirectUrl(input, {
        path: '/gitterHQ/~chat',
        query: ''
      });
      assert.strictEqual(checkInvalidHeaderChar(output), false);
    });
  });
});

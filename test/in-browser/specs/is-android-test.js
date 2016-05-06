'use strict';

var isAndroid = require('../../../public/js/utils/is-android');
var assert = require('assert');

describe('phone detection', function() {
  it('detects iPhone is not android', function() {
    var userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10B141 Safari/8536.25';
    assert(!isAndroid(userAgent));
  });

  it('detects iPad is not android', function() {
    var userAgent = 'Mozilla/5.0 (iPad; CPU OS 6_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10B141 Safari/8536.25';
    assert(!isAndroid(userAgent));
  });

  it('detects anthing android is android', function() {
    var userAgent = 'Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; T-Mobile myTouch 3G Slide Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';
    assert(isAndroid(userAgent));
  });

  it('detects desktop is not android', function() {
    var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36';
    assert(!isAndroid(userAgent));
  });

  it('assumes garbage user-agent is not android', function() {
    var userAgent = 'nonsense';
    assert(!isAndroid(userAgent));
  });

  it('assumes test runner is not android', function() {
    assert(!isAndroid());
  });
});

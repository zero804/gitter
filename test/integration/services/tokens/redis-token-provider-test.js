"use strict";

var testRequire = require('../../test-require');
var memoryTokenProvider = testRequire('./services/tokens/redis-token-provider');

describe('redis-token-provider', function() {

  require('./provider-tests-common')(memoryTokenProvider);

});

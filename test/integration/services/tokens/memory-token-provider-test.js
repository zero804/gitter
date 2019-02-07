'use strict';

var testRequire = require('../../test-require');
var memoryTokenProvider = testRequire('./services/tokens/memory-token-provider');

describe('memory-token-provider', function() {
  require('./provider-tests-common')(memoryTokenProvider);
});

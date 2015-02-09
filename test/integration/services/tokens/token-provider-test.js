'use strict';

var testRequire = require('../../test-require');
var tokenProvider = testRequire('./services/tokens/index');

describe('token-provider', function() {

  require('./provider-tests-common-full')(tokenProvider);

});

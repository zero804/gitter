'use strict';

var testRequire = require('../../test-require');
var accessTokenProvider = testRequire('./services/tokens/access-token-provider');

describe('access-token-provider', function() {

  require('./provider-tests-common-full')(accessTokenProvider);

});

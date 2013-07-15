/*jslint node: true, unused:true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../../test-require');

var assert = require('assert');

describe('gravatar-user-info-service', function() {
	it('lookup user information', function(done) {
    var underTest = testRequire('./services/username-suggestion/gravatar-user-info-service');

    underTest.lookupUsernameForEmail('andrewn@datatribe.net')
      .then(function(results) {
        assert(results.length > 1);
      })
      .nodeify(done);
  });
});
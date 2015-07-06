var split = require('../lib/server/split-tests-server');
var assert = require('assert');

describe('split-tests', function() {
  it('sets a request as control by default', function() {
    var req = {
      query: {}
    };
    var res = {};

    var result = split.configure(req, res);

    assert.equal(result, 'control');
  });

  it('reads the group from the query string', function() {
    var req = {
      query: { '_set_variant_mytest': 'treatment' }
    };
    var res = {};
    var testname = 'mytest';

    var result = split.configure(req, res, testname);

    assert.equal(result, 'treatment');
  });

  it('defaults to control if the group from the query string is nonsense', function() {
    var req = {
      query: { '_set_variant_mytest': 'I_AM_NONSENSE' }
    };
    var res = {};
    var testname = 'mytest';

    var result = split.configure(req, res, testname);

    assert.equal(result, 'control');
  });
});

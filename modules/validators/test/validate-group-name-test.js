'use strict';

var validateRoomName = require('../lib/validate-group-name');
var assert = require('assert');

describe('validate-group-name', function() {

  var FIXTURES = {
    'bob': true,
    '38217891729387129873128379123987123912389': false,
    ' 333': false,
    '333': true
  };

  Object.keys(FIXTURES).forEach(function(key) {
    var result = FIXTURES[key];

    var name = result ? 'should validate' : 'should not validate';

    it(name + ' ' + key, function() {
      assert.strictEqual(validateRoomName(key), result);
    });
  })

})

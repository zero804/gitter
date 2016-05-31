"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var sampleChatsService = testRequire("./services/sample-chats-service");

describe('sample-chats-service', function() {

  it('should return sample chats #slow', function(done) {
    sampleChatsService.getSamples()
      .then(function(chats) {
        assert(Array.isArray(chats));
      })
      .nodeify(done);
  });

});

"use strict";

var testRequire   = require('../test-require');
var sampleChatsService = testRequire("./services/sample-chats-service");

describe('sample-chats-service', function() {

  it('should return sample chats', function(done) {
    sampleChatsService.getSamples()
      .then(function(chats) {
        console.log(chats);
        console.log(chats.length);
      })
      .nodeify(done);
  });

});

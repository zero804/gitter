"use strict";

var userService = require("../../../../server/services/user-service");

exports['calculate'] = function (test) {
  userService.findByIds(["4f5b453d74809b2076000001"], function(err, result) {
    test.equal(err, null);
    
    console.log("done");
    test.done();
  });
};

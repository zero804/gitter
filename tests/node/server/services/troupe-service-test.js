"use strict";

var underTest = require("../../../../server/services/troupe-service");

exports['calculate'] = function (test) {
  underTest.distributeEmail({ to: 'v8bk0q@trou.pe', from: 'andrewn@datatribe.net'}, function(err, emailAddresses) {
    console.dir(emailAddresses);
    test.equals(err, null);
    test.done();
  });
};

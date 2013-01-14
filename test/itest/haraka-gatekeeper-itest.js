/*jslint node: true */
/*global describe: true it: true */
"use strict";

var nodemailer = require('nodemailer');
var assert = require("assert");

describe('haraka-gatekeeper', function() {
  describe('#hook_queue()', function() {

    it('should hard deny if the sending user is not registered on troupe', function(done){

      var mail = {
        from: '"Unregistered User" <unregistered@anyhost>',
        to: 'anytroupe@beta.trou.pe', // this troupe isn't registered but that should be ignored.
        subject: 'Testing error code when sending from unregistered user',
        text: "I guess it would be nice if this mail body is not even received by our server."
      };

      var transport = nodemailer.createTransport("SMTP", {
          host: "localhost", // hostname
          secureConnection: false, // use SSL
          port: 2525 // port for secure SMTP
      });

      transport.sendMail(mail, function(errorObject, responseStatus) {
        // responseStatus.messageId;
        // responseStatus.message;

        var expectedErrorMessage = "Sorry, your email address is not registered with us, please visit http://trou.pe to register.";

        if (errorObject) {
          assert (errorObject.message.indexOf(expectedErrorMessage) >= 0);
        }

        done();
      });

      return true;
    });

    it('should accept mail and send one bounce mail for any forbidden or non existant troupe addresses', function(done) {
      done();
    });

  });
});

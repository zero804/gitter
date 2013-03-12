/*jslint node: true */
/*global describe: true, it: true */
"use strict";

var ses = require("../../../server/utils/mail/troupe-ses-transport");

var assert = require("better-assert");

// NOTE: on localhost this test will need to run with a larger mocha timeout (10s) which is done on command line with - t 10s
describe('ses-transport2', function() {
  return
  describe('#sendMail()', function() {
    it('should return multiple messageIds for mails with more than 50 recipients', function(done){

      // TODO who can we route the test emails to, it needs to be a real address. test@troupe.co?
      var from = 'ocn9b4@trou.pe';
      var recipients = [];
      var msg = new Buffer(
        "Date: 7 Jan 2013\n"+
        "From: "+from+"\n"+
        "To: the-troupe-id@trou.pe\n"+
        "Subject: Testing 50 recipient chunking\n"+
        "\n"+
        "Hello How are you?"+
        "\n"
      );

      // generate some recipients to test with
      for (var i = 0; i < 55; i++) {
        recipients.push('test+recipient-'+i+'@troupe.co');
      }

      ses.sendMailString(from, recipients, msg, function(errSendingMail, messageIds) {
        if(errSendingMail) {
          done(errSendingMail);
        }

        // NOTE: check whether the messages recieved includes recipients for the 49/50/51 mark.
        console.log('Message IDS:'+messageIds);

        assert(messageIds.length == 2);
        for(var i = 0; i < messageIds.length; i++)
            assert(messageIds[i] !== null);

        done();
      });
    });
  });
});
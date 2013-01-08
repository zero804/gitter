/*jshint node:true */
/*global OK:true DENY: true DENYSOFT: true */
"use strict";

// troupe service to redeliver mails to troupe users
var conversationService = require("./../../server/services/conversation-service.js");
var troupeService = require("./../../server/services/troupe-service.js");
var nodemailer = require("nodemailer");
var console = require("console");
var TroupeSESTransport = require("./../../server/utils/mail/troupe-ses-transport"),
    RawMailComposer = require("./../../server/utils/mail/raw-mail-composer"),
    nconf = require("./../../server/utils/config");
var winston = require("winston");
var xml2js = require("xml2js");
var Q = require("q");

var emailDomain = nconf.get("email:domain");
var emailDomainWithAt = "@" + emailDomain;

// Create an Amazon SES transport object
var sesTransport = new TroupeSESTransport({
  AWSAccessKeyID: nconf.get("amazon:accessKey"),
  AWSSecretKey: nconf.get("amazon:secretKey")
});

function continueResponse(next) {
  //return next (DENY, "Debug mode bounce.");
  return next(OK);
}

function errorResponse(next, err) {
  winston.error("DENYSOFT due to error", { exception: err });
  return next(DENYSOFT);
}

exports.hook_queue = function(next, connection) {
  console.log("Starting remailer");
	var mailFrom = connection.transaction.mail_from;
	var rcptTo = connection.transaction.rcpt_to;
  var transaction = connection.transaction;
  var from = mailFrom.address();

  // TODO: handle each recipient!
  var to = rcptTo[0].address();

	troupeService.validateTroupeEmailAndReturnDistributionList({ to: to, from: from}, function(err, troupe, fromUser, emailAddresses) {
    if (err) return next(DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");
    if (!troupe) return next (DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");

    if(!emailAddresses) {
      /* If  there's no-one to distribute the email to, don't continue */
      return continueResponse(next);
    }

    console.log("Delivering emails");

    var newSubject = transaction.header.get("Subject");
    newSubject = newSubject ? newSubject.replace(/\n/g,'') : "";

    if(newSubject.indexOf("[" + troupe.name + "]") < 0) {
      newSubject = "[" + troupe.name + "] " + newSubject;
      transaction.remove_header("Subject");
      transaction.add_header("Subject", newSubject);
    }

    transaction.remove_header("From");
    transaction.add_header("From", fromUser.displayName  + " for " + troupe.name + " <" + troupe.uri + emailDomainWithAt + ">");

    transaction.remove_header("To");
    transaction.add_header("To", troupe.name + " <" + troupe.uri + emailDomainWithAt + ">");

    transaction.remove_header("Reply-To");
    transaction.add_header("Reply-To", troupe.name + "<" + troupe.uri + emailDomainWithAt + ">");

    transaction.remove_header("Return-Path");
    transaction.add_header("Return-Path", "troupe-bounces" + emailDomainWithAt);

    var mail = new RawMailComposer({
      source: troupe.uri + emailDomainWithAt,
      destinations: emailAddresses,
      message: transaction.message_stream
    });

    sesTransport.sendMail(mail, function(error, responses){
        if (error) {
          connection.logerror(error);
          return errorResponse(next, error);
        }

        console.log("Apparently I successfully delivered some mails ");
        var promises = responses.map(function(response) {
          var parser = new xml2js.Parser();
          var q = Q.defer();
          parser.parseString(response.message, q.node());
          return q.promise;
        });


        Q.all(promises)
         .then(function(results) {
            var messageIds = results.map(function(result) {
              console.dir(result.SendRawEmailResponse.SendRawEmailResult[0].MessageId);
              return result.SendRawEmailResponse.SendRawEmailResult ?
                result.SendRawEmailResponse.SendRawEmailResult[0].MessageId + "@email.amazonses.com" : null;
            });

            var emailId = connection.transaction.notes.emailId;
            var conversationId = connection.transaction.notes.conversationId;

            conversationService.updateEmailWithMessageIds(conversationId, emailId, messageIds, function(err) {
              if(err)  return errorResponse(next, err);
              return continueResponse(next);
            });
         })
         .fail(function(err) {
            return errorResponse(next, err);
         });

    });


  });

};



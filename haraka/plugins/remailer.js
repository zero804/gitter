/*jshint node:true */
/*global OK:true DENY: true DENYSOFT: true console: true */
"use strict";

// troupe service to redeliver mails to troupe users
var conversationService = require("./../../server/services/conversation-service.js");
var troupeService = require("./../../server/services/troupe-service.js");
var nodemailer = require("nodemailer");
var console = require("console");
var troupeSESTransport = require("./../../server/utils/mail/troupe-ses-transport");
var nconf = require("./../../server/utils/config");
var winston = require("winston");
var xml2js = require("xml2js");
var Q = require("q");

var emailDomain = nconf.get("email:domain");
var emailDomainWithAt = "@" + emailDomain;

function continueResponse(next) {
  //return next (DENY, "Debug mode bounce.");
  return next(OK);
}

function errorResponse(next, err) {
  winston.error("DENYSOFT due to error", { exception: err });
  return next(DENYSOFT);
}

exports.hook_queue = function(next, connection) {
  console.log("Starting remailer (hook_queue)");

  // extract details from haraka transaction
	var mailFrom = connection.transaction.mail_from;
	var rcptTo = connection.transaction.rcpt_to;
  var transaction = connection.transaction;
  var from = mailFrom.address();
  var emailId = connection.transaction.notes.emailId;
  var conversationId = connection.transaction.notes.conversationId;

  // TODO: handle each recipient!
  var to = rcptTo[0].address();

  // looks up the troupe for the mail's TO address
	troupeService.validateTroupeEmailAndReturnDistributionList({ to: to, from: from}, function(errValidating, troupe, fromUser, emailAddresses) {
    if (errValidating | !troupe)
        return next(DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");

    if(!emailAddresses) {
      /* If  there's no-one to distribute the email to, don't continue */
      return continueResponse(next);
    }

    console.log("Delivering emails");

    // normalize headers
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

    // send mail
    var sesFrom = troupe.uri + emailDomainWithAt;
    var sesRecipients = emailAddresses;
    // ERR the above header changes are no longer changing the headers in the message_stream with haraka 2.0
    // which means amazon rejects the sender address.
    var sesStream = transaction.message_stream;

    troupeSESTransport.sendMail(sesFrom, sesRecipients, sesStream, function(errorSendingMail, messageIds){

        if (errorSendingMail) {
          connection.logerror(errorSendingMail);

          return errorResponse(next, errorSendingMail);
        }

        console.log("All messages have been queued on SES and ids have been returned: ");
        console.dir(["messageIds", messageIds]);

        conversationService.updateEmailWithMessageIds(conversationId, emailId, messageIds, function(errorUpdatingMessageIds) {
          if(errorUpdatingMessageIds)
              return errorResponse(next, errorUpdatingMessageIds);

          console.log("Message ids saved in db successfully.");
          return continueResponse(next);
        });

    });

  });

};



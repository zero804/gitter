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
var Fiber = require('./../../server/utils/fiber');
var mimelib = require('mimelib');

var emailDomain = nconf.get("email:domain");
var emailDomainWithAt = "@" + emailDomain;
var skipRemailer = false;

function continueResponse(next) {
  //return next (DENY, "Debug mode bounce.");
  return next(OK);
}

function errorResponse(next, err) {
  winston.error("DENYSOFT due to error", { exception: err });
  return next(DENYSOFT);
}


function distributeForTroupe(from, to, next, connection) {
  var transaction = connection.transaction;

  var conversationAndEmailIdsByTroupe = connection.transaction.notes.conversationAndEmailIdsByTroupe;


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
    var sesStream = transaction.message_stream;

    if (skipRemailer)
      return next(OK);

    troupeSESTransport.sendMailStream(sesFrom, sesRecipients, sesStream, function(errorSendingMail, messageIds){

      if (errorSendingMail) {
        console.log(errorSendingMail);

        return errorResponse(next, errorSendingMail);
      }

      console.log("All messages have been queued on SES and ids have been returned: ");
      console.dir(["messageIds", messageIds]);

      var lookup = conversationAndEmailIdsByTroupe[troupe.id];
      console.dir(conversationAndEmailIdsByTroupe);

      conversationService.updateEmailWithMessageIds(lookup.conversationId, lookup.emailId, messageIds, function(errorUpdatingMessageIds) {
        if(errorUpdatingMessageIds)
          return errorResponse(next, errorUpdatingMessageIds);

        console.log("Message ids saved in db successfully.");
        return continueResponse(next);
      });

    });

  });
}

function parseAddress(address) {
  return (address) ? mimelib.parseAddresses(address)[0].address : '';
}

exports.hook_queue = function(next, connection) {
  console.log("Starting remailer (hook_queue)");

  // we will wait for all mails to be delivered before calling back
  var deliveries = new Fiber();

  // run the distributeForTroupe function asynchronously for each recipient troupe
  // TODO verify: the peristence plugin should have ensured that only valid troupes remain in the haraka transaction rcptTo field
  for (var toI = 0; toI < connection.transaction.rcpt_to.length; toI++) {
    var to = parseAddress(connection.transaction.rcpt_to[toI].address());

    distributeForTroupe(parseAddress(connection.transaction.mail_from), to, deliveries.waitor(), connection);
  }

  deliveries.sync()
   .then(function() {
      // now that all the mails have been delivered, finish the queue plugin
      next(OK);
    })
   .fail(function(harakaErrorCode, errorMessage) {
      // if any of the mails failed to deliver, return their error directly to haraka
      next(harakaErrorCode, errorMessage);
    });
};



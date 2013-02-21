/*jshint node:true, unused: true */
/*global OK:true DENY: true DENYSOFT: true */
"use strict";

// troupe service to redeliver mails to troupe users
var conversationService = require("./../../server/services/conversation-service.js");
var troupeService = require("./../../server/services/troupe-service.js");
var troupeSESTransport = require("./../../server/utils/mail/troupe-ses-transport");
var nconf = require("./../../server/utils/config");
var winston = require("winston");
var Fiber = require('./../../server/utils/fiber');
var mimelib = require('mimelib');
var statsService = require('./../../server/services/stats-service');

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
      // this should never happen because the gateway prevents it (by removing from to address or denying a non-registered user).
      return next(DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");

    if(!emailAddresses) {
      /* If  there's no-one to distribute the email to, don't continue */
      return continueResponse(next);
    }

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

    // amazon will complain about this header which Mail.app includes when you click redirect.
    transaction.remove_header("Resent-Cc");

    // send mail
    var sesFrom = troupe.uri + emailDomainWithAt;
    var sesRecipients = emailAddresses;
    var sesStream = transaction.message_stream;

    if (skipRemailer) // use this flag (cautiously) for debug purposes
      return next(OK);

    troupeSESTransport.sendMailStream(sesFrom, sesRecipients, sesStream, function(errorSendingMail, messageIds){
      if (errorSendingMail) {
        winston.error("Error sending mail through ses: ", { exception: errorSendingMail, from: from, troupe: troupe });

        return errorResponse(next, errorSendingMail);
      }

      statsService.event('remailed_email', { recipients: messageIds.length });

      winston.debug("All messages have been queued on SES and ids have been returned: ", { messageIds: messageIds });

      var lookup = conversationAndEmailIdsByTroupe[troupe.id];

      conversationService.updateEmailWithMessageIds(lookup.conversationId, lookup.emailId, messageIds, function(errorUpdatingMessageIds) {
        if(errorUpdatingMessageIds)
          return errorResponse(next, errorUpdatingMessageIds);

        // winston.debug("Message ids saved in db successfully.");
        return continueResponse(next);
      });

    });

  });
}

function parseAddress(address) {
  return (address) ? mimelib.parseAddresses(address)[0].address : '';
}

exports.hook_queue = function(next, connection) {
  winston.debug("Starting remailer (hook_queue)");

  // we will wait for all mails to be delivered before calling back
  var deliveries = new Fiber();

  // run the distributeForTroupe function asynchronously for each recipient troupe
  // the peristence plugin should have ensured that only valid troupes remain in the haraka transaction rcptTo field
  for (var toI = 0; toI < connection.transaction.rcpt_to.length; toI++) {
    var to = parseAddress(connection.transaction.rcpt_to[toI].address());

    distributeForTroupe(parseAddress(connection.transaction.mail_from), to, deliveries.waitor(), connection);
  }

  deliveries.sync()
   .then(function() {
      // now that all the mails have been delivered, finish the queue plugin
      return next(OK);
    })
   .fail(function(harakaErrorCode, errorMessage) {
      // if any of the mails failed to deliver, return their error directly to haraka
      return next(harakaErrorCode, errorMessage);
    });
};



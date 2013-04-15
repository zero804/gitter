/*jshint node:true, globalstrict:true, trailing:false, unused: true */
/*global require: true, exports: true, OK: true, CONT: true, DENY: true, SOFTDENY: true */
"use strict";

var harakaRequire = require(__dirname + '/haraka-require');

var winston = harakaRequire('./utils/winston');

var userService = harakaRequire('./services/user-service');

var troupeService = harakaRequire("./services/troupe-service");
var mailerService = require(harakaRequire.resolveModuleName('./services/mailer-service')); // UNFORTUNATELY NEED TO DO THIS DUE TO THE PROXY
var statsService = harakaRequire('./services/stats-service');

var winston = harakaRequire('./utils/winston');
var nconf = harakaRequire("./utils/config");
var mimelib = require('mimelib');

var EMAILDOMAIN = nconf.get("email:domain");
var BASEPATH = nconf.get('web:basepath');

harakaRequire('./utils/event-listeners').installLocalEventListeners();


/*
This plugin verfies that the sender can access the requested troupes, and sends bounce emails if necessary.
Any invalid troupes will be removed from the transaction.rcpt_to list so that the subsequent plugins don't need to know about access control.
An additional parsed mail object will be stored on transaction.notes.mail
*/
exports.hook_queue = function (next, connection) {

  var mail = {
    from: parseAddress(connection.transaction.mail_from),
    subject: connection.transaction.header.get("Subject").replace(/\n/g, ""),
    date: connection.transaction.header.get("Date")
  };

  winston.verbose("Gateway: Received mail from " + mail.from);

  // hard deny (smtp bounce) if there is no from field
  if (!validateAddress(mail.from)) {
    winston.verbose("Gateway: Invalid or no sender address, hard bouncing.");
    return next(DENY, "There was no sender email address specified by your SMTP server");
  }

  // ensure that the user is registered
  userService.findByEmail(mail.from, function (err, user) {
    winston.verbose("Gateway: Looked up the user for this mail");

    // get the troupe ids from the to addresses in the mail transaction
    var troupeUris = [];
    for(var toI = 0; toI < connection.transaction.rcpt_to.length; toI++) {
      troupeUris.push(
          parseAddress(connection.transaction.rcpt_to[toI].address()).split('@')[0]
      );
    }

    // accept mail and send our own bounce if this is not a registered sender.
    if(!user) {
      sendBounceMail(false, mail, troupeUris, [], []);

      return next(OK); // no further plugins should run
    }

    // fetch the troupes access control hash,
    // which shows whether the sender can post to each troupe or if any don't exist
    troupeService.validateTroupeUrisForUser(user.id, troupeUris, function(err, troupesLookup) {
      winston.verbose("Gateway: Looked up the requested troupe objects" /*, troupesLookup */);

      if(err) return next(SOFTDENY, "Error saving this mail, please try again later");

      // queue the list of troupes denied, for the bounce email
      var deniedTroupes = [], nonExistantTroupes = [], permittedTroupes = [], addressIndicesToRemove = [], i = 0;

      for(var troupeId in troupesLookup) {
        var troupe = troupesLookup[troupeId];

        if(troupe === false)
        {
          deniedTroupes.push(troupeId); // user is not allowed to post to this troupe
          addressIndicesToRemove.push(i);
          winston.verbose("Gateway: Denying posting to troupe " + troupeId + " (forbidden)");
        }
        else if(troupe === null)
        {
          nonExistantTroupes.push(troupeId); // this troupe doesn't exist
          addressIndicesToRemove.push(i);
          winston.verbose("Gateway: Denying posting to troupe " + troupeId + " (non-existant)");
        }
        else
        {
          permittedTroupes.push(troupeId);
          winston.verbose("Gateway: Permitting posting to troupe " + troupeId);
        }

        i++;
      }

      // remove invalid troupe id's from the rcpt_to field so the other plugins don't see them.
      addressIndicesToRemove.forEach(function(i) {
        connection.transaction.rcpt_to.splice(i, 1);
      });

      // send one bounce mail to the sender if there are any forbidden or non-existant troupes
      if (deniedTroupes.length || nonExistantTroupes.length) {
        sendBounceMail(true, mail, deniedTroupes, nonExistantTroupes, permittedTroupes);
      }

      if (permittedTroupes.length) {
        winston.verbose("Gateway: Returning to next plugin, there are " + permittedTroupes.length + " mails to receive.");

        return next(CONT);
      }
      else {
        winston.verbose("Gateway: Cancelling any further plugin execution, there are no mails for them to receive.");

        return next(OK); // no further plugins should run
      }

    });
  });
};

function sendBounceMail(userIsRegistered, mail, deniedTroupes, nonExistantTroupes, permittedTroupes) {
  winston.verbose("Gateway#sendBounceMail(): I'm gna bounce this mail from " + mail.from + " that silly user can't send to: ", { deniedTroupes: deniedTroupes, nonExistantTroupes: nonExistantTroupes });

  statsService.event('mail_bounce', {
    from: mail.from,
    userIsRegistered: userIsRegistered
  });

  mailerService.sendEmail({
    templateFile: "bounce-email",
    to: mail.from,
    from: 'bouncer' + '@' + EMAILDOMAIN,
    subject: "Sorry. We couldn't deliver your message.",
    // TODO we probably want to put the actual name of the troupe in here
    data: {
      userIsRegistered: userIsRegistered,
      mail: mail,
      deniedTroupes: deniedTroupes,
      nonExistantTroupes: nonExistantTroupes,
      permittedTroupes: permittedTroupes,
      baseServerPath: BASEPATH
    }
  });
}

function parseAddress(address) {
  return (address) ? mimelib.parseAddresses(address)[0].address : '';
}

function validateAddress(address) {
  if (!address)
    return false;

  if (typeof address !== 'string' && !(address instanceof String))
    return false;

  var parts = address.split('@');

  if (parts.length !== 2)
    return false;

  return (parts[0] && parts[1]);
}

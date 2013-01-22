/*jshint globalstrict:true, trailing:false, unused: true */
/*global require: true, exports: true, OK: true, CONT: true, DENY: true, SOFTDENY: true */

"use strict";

var userService = require("./../../server/services/user-service.js");
var troupeService = require("./../../server/services/troupe-service.js");
var mailerService = require('./../../server/services/mailer-service');
var winston = require('./../../server/utils/winston');
var nconf = require("./../../server/utils/config");
var mimelib = require('mimelib');

var EMAILDOMAIN = nconf.get("email:domain");
var BASEPATH = nconf.get('web:basepath');

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

  winston.debug("Gateway: Received mail from " + mail.from);

  // ensure that the user is registered
  userService.findByEmail(mail.from, function (err, user) {
    winston.debug("Gateway: Looked up the user for this mail");

    // hard deny if not a registered sender.
    if(!user) return next(DENY, "Sorry, your email address is not registered with us, please visit http://trou.pe to register.");

    // get the troupe ids from the to addresses in the mail transaction
    var troupeUris = [];
    for(var toI = 0; toI < connection.transaction.rcpt_to.length; toI++) {
      troupeUris.push(
          parseAddress(connection.transaction.rcpt_to[toI].address()).split('@')[0]
      );
    }

    // fetch the troupes access control hash,
    // which shows whether the sender can post to each troupe or if any don't exist
    troupeService.validateTroupeUrisForUser(user.id, troupeUris, function(err, troupesLookup) {
      winston.debug("Gateway: Looked up the requested troupe objects" /*, troupesLookup */);

      if(err) return next(SOFTDENY, "Error saving this mail, please try again later");

      // queue the list of troupes denied, for the bounce email
      var deniedTroupes = [], nonExistantTroupes = [], permittedTroupes = [], addressIndicesToRemove = [], i = 0;

      for(var troupeId in troupesLookup) {
        var troupe = troupesLookup[troupeId];

        if(troupe === false)
        {
          deniedTroupes.push(troupeId); // user is not allowed to post to this troupe
          addressIndicesToRemove.push(i);
          winston.debug("Gateway: Denying posting to troupe " + troupeId + " (forbidden)");
        }
        else if(troupe === null)
        {
          nonExistantTroupes.push(troupeId); // this troupe doesn't exist
          addressIndicesToRemove.push(i);
          winston.debug("Gateway: Denying posting to troupe " + troupeId + " (non-existant)");
        }
        else
        {
          permittedTroupes.push(troupeId);
          winston.debug("Gateway: Permitting posting to troupe " + troupeId);
        }

        i++;
      }

      // remove invalid troupe id's from the rcpt_to field so the other plugins don't see them.
      addressIndicesToRemove.forEach(function(i) {
        connection.transaction.rcpt_to.splice(i, 1);
      });

      // send one bounce mail to the sender if there are any forbidden or non-existant troupes
      if (deniedTroupes.length || nonExistantTroupes.length) {
        sendBounceMail(mail, deniedTroupes, nonExistantTroupes, permittedTroupes);
      }

      if (permittedTroupes.length) {
        winston.debug("Gateway: Returning to next plugin, there are " + permittedTroupes.length + " mails to receive.");

        return next(CONT);
      }
      else {
        winston.debug("Gateway: Cancelling any further plugin execution, there are no mails for them to receive.");

        return next(OK); // no further plugins should run
      }

    });
  });
};

function sendBounceMail(mail, deniedTroupes, nonExistantTroupes, permittedTroupes) {
  winston.debug("Gateway#sendBounceMail(): I'm gna bounce this mail from " + mail.from + " that silly user can't send to: ", { deniedTroupes: deniedTroupes, nonExistantTroupes: nonExistantTroupes });

  mailerService.sendEmail({
    templateFile: "bounce-email",
    to: mail.from,
    from: 'bouncer' + '@' + EMAILDOMAIN,
    subject: "Sorry. We can't let you send to one (or more) of those troupes",
    // TODO we probably want to put the actual name of the troupe in here
    data: {
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

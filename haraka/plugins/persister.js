/*jshint globalstrict:true, trailing:false */
/*global require: true, module: true, exports: true, CONT: true, OK: true, DENY: true, SOFTDENY: true */

"use strict";

// troupe service to deliver mails to mongo database
var userService = require("./../../server/services/user-service.js");
var conversationService = require("./../../server/services/conversation-service.js");
var troupeService = require("./../../server/services/troupe-service.js");
var fileService = require("./../../server/services/file-service.js");
var appEvents = require("./../../server/app-events");
var MailParser = require("mailparser").MailParser;
var temp = require('temp');
var fs = require('fs');
var console = require("console");
var Q = require("q");
var Fiber = require("./../../server/utils/fiber");
var sanitizer = require("./../../server/utils/sanitizer.js");
var winston = require('winston');
var nconf = require("./../../server/utils/config");
var uuid = require('node-uuid');
var mimelib = require('mimelib');

var emailDomain = nconf.get("email:domain");
var emailDomainWithAt = "@" + emailDomain;

function continueResponse(next) {
  //return next (DENY, "Debug mode bounce.");
  return next();
}

function saveFile(troupeId, creatorUserId, fileName, mimeType, content, callback) {
  temp.open('attachment', function(err, tempFileInfo) {
    var tempFileName = tempFileInfo.path;

    var ws = fs.createWriteStream(tempFileName);

    ws.on("close", function() {
      fileService.storeFile({
        troupeId: troupeId,
        creatorUserId: creatorUserId,
        fileName: fileName,
        mimeType: mimeType,
        file: tempFileName
      }, function(err, fileAndVersion) {
        if(err) return callback(err);

        // Delete the temporary file */
        //fs.unlink(tempFileInfo.path);
        callback(null, fileAndVersion);
      });
    });
    ws.write(content);
    ws.end();

    return;
  });
}




exports.hook_data = function(next, connection) {
  // enable mail body parsing
  connection.transaction.parse_body = 1;
  next();
};

exports.hook_queue = function(next, connection) {

  // This hash is used to associate the conversation/email with a given troupe
  connection.transaction.notes.conversationAndEmailIdsByTroupe = {};

  // parse the mail so we can extract details for saving
  var mail;
  var mailparser = new MailParser({});
  mailparser.on("end", mailIsParsed);
  connection.transaction.message_stream.pipe(mailparser);

  function mailIsParsed(mail_object) {

    // Get some stuff from the header to store later
    mail = {
      subject: connection.transaction.header.get("Subject").replace(/\n/g, ""),
      date: connection.transaction.header.get("Date"),
      from: parseAddress(connection.transaction.mail_from),
      inReplyTo: parseAddress(connection.transaction.header.get("In-Reply-To")),
      mail_object: mail_object
    };

    // use a promise to wait for all the mails to be saved
    var fiber = new Fiber();

    // save each mail to it's troupe, queuing the operation onto fiber
    var rcpt_to = connection.transaction.rcpt_to;
    for (var i = 0; i < rcpt_to.length; i++) {
      var to = parseAddress(rcpt_to[i].address());
      // save this mail to this one troupe
      saveMailForTroupe(mail, to, connection, fiber.waitor());
    }

    // return to haraka once all saves have returned
    fiber.sync()
      .then(function() {
        console.log("All saves have been synced, continue to next plugin.");
        // now that all the mails have been saved, return to the next plugin
        next();
      }).fail(function(err) {
        // if any of the mails failed to save, return their error directly to haraka
        console.log("One of the saves failed with code " + err);
        next(DENY);
      });

  }

};


// accepts mailProperties: { from: canonical@address, to: , subject, date: , inReplyTo: }
// should this function exec the callback with the same params as haraka next is given?

function saveMailForTroupe(mail, toAddress, connection, callback) {
  console.log("Saving mail from " + mail.from + " to troupe " + toAddress);
  //console.log("From: " + fromName);
  //console.log("To:" + toAddress);
  //console.log("In-Reply-To:" + inReplyTo);

  var fromAddress = mail.from;
  var notes = connection.transaction.notes;

  // load the troupe object that we are saving the mail to, ensuring the user has access to it
  troupeService.validateTroupeEmail({
    to: toAddress,
    from: fromAddress
  }, function(err, troupe, user) {
    if(err) return callback(err);
    if(!troupe) return callback("User " + mail.from + " does not have access to " + toAddress);

    var mail_object = mail.mail_object;
    var preview;
    // extract a preview from the mail body.
    if(mail_object.text) {
      preview = mail_object.text;
      if(preview.length > 255) preview = preview.substring(0, 252) + "...";
      preview = preview.replace(/\n/g, "");
    }

    // handleAttachments
    var allAttachmentSaves = [];
    var attachmentsByContentId = {};

    /** Creates a callback which will associate a file and an attachment */

    function associateFileVersionWithAttachment(attachment) {
      return function(fileVersion) { /* Store a reference from the content-id to the saved fileVersion so that we can use it later */
        if(attachment.contentId && fileVersion) {
          attachmentsByContentId[attachment.contentId] = fileVersion;
        }
      };
    }

    // save all attachments
    if(mail_object.attachments) {
      for(var i = 0; i < mail_object.attachments.length; i++) {
        var deferred = Q.defer();

        var attachment = mail_object.attachments[i];

        saveFile(troupe.id, user.id, attachment.generatedFileName, attachment.contentType, attachment.content, deferred.node());

        var promise = deferred.promise;
        promise.then(associateFileVersionWithAttachment(attachment));

        allAttachmentSaves.push(promise);
      }
    }
    // sync once attachments are saved
    Q.all(allAttachmentSaves).then(function(savedAttachments) {
      var storedMailBody;

      if(mail_object.html) {
        storedMailBody = mail_object.html;
      } else {
        storedMailBody = mail_object.text;
      }

      if(mail_object.attachments) {
        for(var i = 0; i < mail_object.attachments.length; i++) {
          var attachment = mail_object.attachments[i];

          if(attachment.contentDisposition === 'inline' && attachment.contentId) {
            var fileVersion = attachmentsByContentId[attachment.contentId];

            if(!fileVersion) {
              winston.warn("Unable to find attachment for contentId. Something is probably broken.");
              continue;
            }

            var attachmentUrl = "/troupes/" + troupe.id + "/downloads/" + encodeURI(fileVersion.file.fileName) + "?version=" + fileVersion.version;
            storedMailBody = storedMailBody.replace(new RegExp("\\bcid:" + attachment.contentId + "\\b", "ig"), attachmentUrl);
          }
        }
      }

      storedMailBody = sanitizer.sanitize(storedMailBody);

      var savedAttachmentsForPersist = savedAttachments.map(function(item) {
        return {
          fileId: item.file.id,
          version: item.version
        };
      });

      // strip out the name of the troupe if it appears in the subject, we don't want it duplicated
      var newSubject = mail.subject.replace("[" + troupe.name + "] ", "");

      console.log("storeEmailInConversation()");
      conversationService.storeEmailInConversation({
        fromUserId: user.id,
        troupeId: troupe.id,
        subject: newSubject,
        inReplyTo: mail.inReplyTo,
        date: mail.date,
        fromName: mail.from,
        preview: preview,
        mailBody: storedMailBody,
        attachments: savedAttachmentsForPersist
      }, function(err, conversation, savedMail) {
        if(err) return callback("Failed to store the email");

        appEvents.mailEvent('new', troupe.id, conversation.id, conversation.emails.length);

        connection.logdebug("Stored the email.");

        // Save these values so that the remailer plugin can update the
        // messageId after the message has been remailer
        var lookup = {
          emailId: savedMail.id,
          conversationId: conversation.id
        };
        //console.dir(connection);
        notes.conversationAndEmailIdsByTroupe[troupe.id] = lookup;
        //console.log(">>> Configuring ", lookup);
        return callback();
      });

    }).fail(function(err) {
      connection.logdebug("Unable to save attachment: " + err);
      return callback(err);
    });

  });
}

function parseAddress(address) {
  return (address) ? mimelib.parseAddresses(address)[0].address : '';
}

/*jshint node:true, globalstrict:true, trailing:false, unused: true */
/*global require: true, exports: true, DENY: true, OK:true */

"use strict";

var harakaRequire = require(__dirname + '/haraka-require');

var winston = harakaRequire("./utils/winston");

// troupe service to deliver mails to mongo database
var conversationService = harakaRequire("./services/conversation-service");
var troupeService = harakaRequire("./services/troupe-service");
var fileService = harakaRequire("./services/file-service");
var statsService = harakaRequire('./services/stats-service');
var MailParser = require("mailparser").MailParser;
var temp = require('temp');
var fs   = require('fs');
var Q = require("q");
var Fiber = harakaRequire("./utils/fiber");
var sanitizer = harakaRequire("./utils/sanitizer");
var mimelib = require('mimelib');

harakaRequire('./utils/event-listeners').installLocalEventListeners();


function saveFile(troupeId, creatorUserId, fileName, mimeType, content, callback) {
  temp.open('attachment', function(err, tempFileInfo) {
    var tempFileName = tempFileInfo.path;

    var ws = fs.createWriteStream(tempFileName);

    ws.on("close", function() {
      statsService.event('new_mail_attachment', {
        troupeId: troupeId,
        creatorUserId: creatorUserId
      });

      fileService.storeFile({
        troupeId: troupeId,
        creatorUserId: creatorUserId,
        fileName: fileName,
        mimeType: mimeType,
        file: tempFileName
      }, function(err, fileAndVersion) {
        if (err) return callback(err);

        // Delete the temporary file */
        fs.unlink(tempFileInfo.path);
        callback(null, fileAndVersion);
      });
    });
    ws.write(content);
    ws.end();

    return;
  });
}




exports.hook_data = function (next, connection) {
    // enable mail body parsing
    connection.transaction.parse_body = 1;
  return next();
};

exports.hook_queue = function(next, connection) {

  // parse the mail so we can extract details for saving
  var mail;
  var mailparser = new MailParser({});
  mailparser.on("end", mailIsParsed);
  connection.transaction.message_stream.pipe(mailparser);

  function mailIsParsed(mail_object) {

	// Get some stuff from the header to store later
    mail = {
      subject: mimelib.decodeMimeWord(connection.transaction.header.get("Subject")).replace(/\n/g, ""),
      date: mimelib.decodeMimeWord(connection.transaction.header.get("Date")),
      from: parseAddress(mimelib.decodeMimeWord(connection.transaction.mail_from)),
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
        winston.verbose("All saves have been synced, continue to next plugin.");
        // now that all the mails have been saved, finish transaction processing.
        return next(OK);
      }).fail(function(err) {
        // if any of the mails failed to save, return their error directly to haraka
        winston.error("One of the saves failed: ", { exception: err });
        return next(DENY);
      });

  }

};


// accepts mailProperties: { from: canonical@address, to: , subject, date: , inReplyTo: }
// should this function exec the callback with the same params as haraka next is given?

function saveMailForTroupe(mail, toAddress, connection, callback) {
  winston.verbose("Saving mail from " + mail.from + " to troupe " + toAddress);
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
      if (mail_object.text) {
        preview = mail_object.text;
        if (preview.length>255) preview=preview.substring(0,252) + "...";
        preview = preview.replace(/\n/g,"");
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

          return fileVersion;
        };
      }

    // save all attachments
      if (mail_object.attachments) {
        for(var i = 0; i < mail_object.attachments.length; i++) {
          var deferred = Q.defer();

          var attachment = mail_object.attachments[i];

          saveFile(troupe.id, user.id, attachment.generatedFileName,attachment.contentType,attachment.content, deferred.makeNodeResolver());

          var promise = deferred.promise;
          promise = promise.then(associateFileVersionWithAttachment(attachment));

          allAttachmentSaves.push(promise);
        }
      }

    // sync once attachments are saved
      Q.all(allAttachmentSaves).then(function(savedAttachments) {

        var storedMailBody;

        if (mail_object.html) {
          storedMailBody = mail_object.html;
        } else {
          storedMailBody = mail_object.text;
        }

        if (mail_object.attachments) {
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

        // get the message ids that the remailer save in the transaction notes object
        var messageIds = notes.messageIdsByTroupe[troupe.id];

        conversationService.storeEmailInConversation({
          fromUserId: user.id,
          troupeId: troupe.id,
          subject: newSubject,
          inReplyTo: mail.inReplyTo,
          date: mail.date,
          fromName: mail.from,
          preview: preview,
          mailBody: storedMailBody,
          attachments: savedAttachmentsForPersist,
          messageIds: messageIds
        }, function(err/*, conversation, savedMail*/) {
          if(err) return callback("Failed to store the email");

          connection.logdebug("Stored the email.");

          return callback();
          });

        }).fail(function(err) {
          winston.error("Unable to save attachment: ", { exception: err });
          return callback(err);
        });

      });
}

function parseAddress(address) {
  return (address) ? mimelib.parseAddresses(address)[0].address : '';
}

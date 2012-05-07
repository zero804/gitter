/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */

// troupe service to deliver mails to mongo database

var mailService = require("./../../server/services/mail-service.js");
var troupeService = require("./../../server/services/troupe-service.js");
var fileService = require("./../../server/services/file-service.js");
var MailParser = require("mailparser").MailParser;
var temp = require('temp');
var fs   = require('fs');
var console = require("console");
var Q = require("q");
var sanitizer = require("./../../server/utils/sanitizer.js");

function continueResponse(next) {
  return next (DENY, "Debug mode bounce.");
  //return next(OK);
};

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
    next();
};

exports.hook_queue = function(next, connection) {  
	// Get some stuff from the header to store later
	var subject = connection.transaction.header.get("Subject");
	var date = connection.transaction.header.get("Date");
	var fromName = connection.transaction.header.get("From");
	var toName = connection.transaction.header.get("To");
	var preview;
	var fromEmail;

	var lines = connection.transaction.data_lines;
  if (!lines) return next(DENY);

	toName = toName.replace(/\n/g,"");
	fromName = fromName.replace(/\n/g,"");
	subject = subject.replace(/\n/g,"");

	// do some string parsing for email formats such as Name <email>

	if (fromName.indexOf("<") > 0)  {
    fromEmail = fromName.substring(fromName.indexOf("<") + 1, fromName.indexOf(">"));
    fromName = fromName.substring(0, fromName.indexOf("<")-1);
  }
  else {
    fromEmail = fromName;
  }

  if (toName.indexOf("<") > 0)  {
    toName = toName.substring(toName.indexOf("<") + 1, toName.indexOf(">"));
  }

	troupeService.validateTroupeEmail({ to: toName, from: fromEmail}, function(err, troupe, user) {
    connection.logdebug("From: " + fromEmail);
    connection.logdebug("To:" + toName);
    if (err) return next(DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");
    if (!troupe) return next (DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");


    var mailparser = new MailParser({});

    mailparser.on("end", function(mail_object){
      if (mail_object.text) {
        preview = mail_object.text;
        if (preview.length>255) preview=preview.substring(0,252) + "...";
        preview = preview.replace(/\n/g,"");
      }

      var allAttachmentSaves = [];
      var attachmentsByContentId = {};

      if (mail_object.attachments) {
        for(var i = 0; i < mail_object.attachments.length; i++) {
          var deferred = Q.defer();

          var attachment = mail_object.attachments[i];

          console.dir(["attachment", attachment]);
          saveFile(troupe.id, user.id, attachment.generatedFileName,attachment.contentType,attachment.content, function(err, value) {
            /* Store a reference from the content-id to the saved fileVersion so that we can use it later */
            if(attachment.contentId && value) {
              attachmentsByContentId[attachment.contentId] = value;
            }

            /* Then carry on with promise */
            deferred.node()(err, value);
          });
  
          allAttachmentSaves.push(deferred.promise);
        }
      }

      Q.all(allAttachmentSaves).then(function(savedAttachments) {
        console.dir(attachmentsByContentId);

        var savedAttachmentIds = savedAttachments.map(function(item) { return item.file.id; });

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

              var attachmentUrl = "/troupes/" + troupe.id + "/downloads/" + encodeURI(fileVersion.file.fileName) + "?version=" + fileVersion.version;
              console.log("AA " + attachmentUrl + " <- " + attachment.contentId );
              console.log(storedMailBody);
              storedMailBody = storedMailBody.replace(new RegExp("\\bcid:" + attachment.contentId + "\\b", "ig"), attachmentUrl);
              console.log(storedMailBody);
            }
          }
        }

        storedMailBody = sanitizer.sanitize(storedMailBody);
        
        mailService.storeEmail({ 
          fromEmail: fromEmail, 
          troupeId: troupe.id, 
          subject: subject, 
          date: date, 
          fromName: fromName, 
          preview: preview, 
          mailBody: storedMailBody, 
          plainText: mail_object.text, 
          richText: mail_object.html,
          attachments: savedAttachmentIds }, function(err, savedMail) {
            console.dir(["Saved Mail", arguments]);

            if (err) return next(DENY, "Failed to store the email");
            connection.logdebug("Stored the email.");

            return continueResponse(next);
          });


      }).fail(function(err) {
        connection.logdebug("An error occurred: " + err);
        return next (DENY, "Unable to persist email");
      });

    });

    mailparser.write(lines.join(''));
    mailparser.end();

  });

};



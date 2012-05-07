/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    uuid = require('node-uuid'),
    console = require('console');

function storeEmail(options, callback) {
  var fromEmail = options.fromEmail;
  var troupeId = options.troupeId;
  var subject = options.subject;
  var date = options.date;
  var fromName = options.fromName;
  var mailBody = options.mailBody;
  var preview = options.preview;
  var plainText = options.plainText;
  var richText = options.richText;
  var attachments = options.attachments;
  
  var storeMail = new persistence.Email();
      
  storeMail.from = fromEmail;
  storeMail.troupeId = troupeId;
  storeMail.subject = subject;
  storeMail.date = date;
  storeMail.fromName = fromName;
  storeMail.mail = mailBody;
  storeMail.preview = preview;
  storeMail.delivered = false;
  storeMail.attachments = attachments ? attachments.map(function(item) { return new persistence.EmailAttachment(item)}) : [];

  storeMail.save(function(err) {
      console.dir(["save", arguments]);

      if (err) return callback(err);
      callback(null, storeMail);
  });
}

function compare(a,b) {
  if (a.date > b.date)
     return -1;
  if (a.date < b.date)
    return 1;
  return 0;
}

function findByTroupe(id, callback) {
  //console.log('Looking for emails in' + id);
  persistence.Email.find({troupeId: id}, function(err, mails) {
      mails.sort(compare);
      callback(err, mails);
    });
}

function removeMailQueueItem(id, callback) {
  console.log("Removing mail: " + id);
   persistence.QueueMail.findOne({_id:id} , function(err, mail) {
    mail.remove();
  });
}

function findUndistributed(callback) {
  persistence.QueueMail.find({delivered: false}, function(err,mails) {
      callback(err,mails);
  });
}

function findById(id, callback) {
  console.log('Getting email id: ' + id);
  persistence.Email.findOne({_id:id} , function(err, mail) {
    callback(err,mail);
  });
}

module.exports = {
  storeEmail: storeEmail,
  findById: findById,
  findUndistributed: findUndistributed,
  removeMailQueueItem: removeMailQueueItem,
  findByTroupe: findByTroupe
};
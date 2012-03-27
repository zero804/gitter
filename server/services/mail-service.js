"use strict";

var persistence = require("./persistence-service"),
    uuid = require('node-uuid');


function storeEmail(options, callback) {
  var fromEmail = options.fromEmail;
  var troupeId = options.troupeId;
  var subject = options.subject;
  var date = options.date;
  var fromName = options.fromName;
  var mailBody = options.mailBody;
  var preview = options.preview;
  
  var storeMail = new persistence.Email();
      
  storeMail.from = fromEmail;
  storeMail.troupeId = troupeId;
  storeMail.subject = subject;
  storeMail.date = date;
  storeMail.fromName = fromName;
  storeMail.mail = mailBody;
  storeMail.preview = preview;
  storeMail.delivered = false;
  
  storeMail.save(function(err) {
      if (err) return callback(err);
      callback(null);
  });
}

function findByTroupe(id, callback) {
  //console.log('Looking for emails in' + id);
  persistence.Email.find({troupeId: id}, function(err, mails) {
      // It would probably be a good idea NOT to return back the message body here, because they can be pretty large and all we want is the preview text
      // HTF would I do that?
      callback(err, mails);
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
  findByTroupe: findByTroupe
};
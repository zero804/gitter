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

module.exports = {
  storeEmail: storeEmail
};
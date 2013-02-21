/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var persistence = require("./persistence-service"),
    statsService = require("./stats-service"),
    winston = require('winston');

function findConversation(options, callback) {
  var troupeId = options.troupeId;
  var inReplyTo = options.inReplyTo;

  winston.info("Looking for email with messageId ", inReplyTo);

  persistence.Conversation
        .where('troupeId', troupeId)
        .where('emails.messageIds', inReplyTo)
        .limit(1)
        .sort({ updated: 'desc' })
        .exec(function(err, results) {
          if(err) return callback(err);
          if(!results) return callback(null, null);
          return callback(null, results[0]);
        });
}

exports.storeEmailInConversation = function(options, callback) {
  var troupeId = options.troupeId;
  var subject = options.subject;
  var date = options.date;
  var mailBody = options.mailBody;
  var preview = options.preview;
  var attachments = options.attachments;
  var fromUserId = options.fromUserId;

  var storeMail = new persistence.Email();
  storeMail.fromUserId = fromUserId;
  storeMail.troupeId = troupeId;
  storeMail.subject = subject;
  storeMail.date = date;
  storeMail.mail = mailBody;
  storeMail.preview = preview;
  storeMail.delivered = false;
  storeMail.attachments = attachments ? attachments.map(function(item) { return new persistence.EmailAttachment(item); }) : [];

  findConversation(options, function(err, conversation) {
    if(err) return callback(err);

    if(!conversation) {
      winston.info("No matching conversation found. Creating new conversation");
      /* Create a new conversation */
      conversation = new persistence.Conversation();
      conversation.troupeId = troupeId;
      conversation.updated = Date.now();
      conversation.subject = subject;
      conversation.pushEmail(storeMail);

      conversation.save(function(err) {
          if (err) return callback(err);
          statsService.event('new_conversation', { troupeId: troupeId });
          statsService.event('new_email', { troupeId: troupeId });

          callback(null, conversation, storeMail);
      });

      return;
    }

    winston.info("Updating existing conversation");
    conversation.subject = subject;
    conversation.updated = Date.now();
    conversation.pushEmail(storeMail);
    conversation.save(function(err) {
        if (err) return callback(err);
        statsService.event('new_email', { troupeId: troupeId });

        callback(null, conversation, storeMail);
    });
  });
};

exports.updateEmailWithMessageIds = function(conversationId, emailId, messageIds, callback) {

  persistence.Conversation.findById(conversationId, function(err, conversation) {
    if(err) return callback(err);
    if(!conversation) return callback("Conversation #" + conversationId + " does not exist.");

    conversation.emails
      .filter(function(i) { return i.id == emailId; })
      .forEach(function(i) { i.messageIds = messageIds; });

    conversation.save(function(err) {
        if (err) return callback(err);
        callback(null);
    });
  });

};

exports.findByTroupe = function (id, callback) {
  persistence.Conversation
    .where('troupeId', id)
    .sort({ updated: 'desc' })
    .slaveOk()
    .exec(callback);
};

exports.findById = function (id, callback) {
  persistence.Conversation.findById(id, callback);
};


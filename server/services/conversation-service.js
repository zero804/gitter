/*jslint node: true */
"use strict";

var persistence = require("./persistence-service"),
    uuid = require('node-uuid'),
    console = require('console'),
    winston = require('winston');

function findConversation(options, callback) {
  var troupeId = options.troupeId;
  var inReplyTo = options.inReplyTo;

  winston.info("Looking for email with messageId ", inReplyTo);

  persistence.Conversation
        .where('troupeId', troupeId)
        .where('emails.messageId', inReplyTo)
        .limit(1)
        .sort('updated', 1)
        .exec(function(err, results) {
          if(err) return callback(err);
          if(!results) return callback(null, null);
          return callback(null, results[0]);
        });
}

function storeEmailInConversation(options, callback) {
  var troupeId = options.troupeId;
  var subject = options.subject;
  var date = options.date;
  var mailBody = options.mailBody;
  var preview = options.preview;
  var attachments = options.attachments;
  var fromUserId = options.fromUserId;
  var inReplyTo = options.inReplyTo;

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
      conversation.emails = [storeMail];

      conversation.save(function(err) {
          if (err) return callback(err);
          callback(null, conversation, storeMail);
      });

      return;
    }

    winston.info("Updating existing conversation");
    conversation.subject = subject;
    conversation.updated = Date.now();
    conversation.emails.push(storeMail);
    conversation.save(function(err) {
        if (err) return callback(err);
        callback(null, conversation, storeMail);
    });
  });
}

function updateEmailWithMessageId(conversationId, emailId, messageId, callback) {

  persistence.Conversation.findById(conversationId, function(err, conversation) {
    if(err) return callback(err);

    conversation.emails.filter(function(i) { return i.id == emailId; }).forEach(function(i) { i.messageId = messageId; });
    conversation.save(function(err) {
        if (err) return callback(err);
        callback(null);
    });
  });

}

function findByTroupe(id, callback) {
  persistence.Conversation
    .where('troupeId', id)
    .sort({ updated: 'desc' })
    .slaveOk()
    .exec(callback);
}

function findById(id, callback) {
  persistence.Conversation.findById(id, callback);
}

module.exports = {
  storeEmailInConversation: storeEmailInConversation,
  updateEmailWithMessageId: updateEmailWithMessageId,
  findByTroupe: findByTroupe,
  findById: findById
};
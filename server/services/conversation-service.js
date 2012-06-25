 /*jshint globalstrict:true, trailing:false */
/*global require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    uuid = require('node-uuid'),
    console = require('console');

function findConversation() {
  persistence.Conversation.find();
}

function storeEmail(options, callback) {
  var troupeId = options.troupeId;
  var subject = options.subject;
  var date = options.date;
  var mailBody = options.mailBody;
  var preview = options.preview;
  var plainText = options.plainText;
  var richText = options.richText;
  var attachments = options.attachments;
  var fromUserId = options.fromUserId;
  var inReplyTo = options.inReplyTo;

  findConversation(options);
}

module.exports = {
  storeEmail: storeEmail
};
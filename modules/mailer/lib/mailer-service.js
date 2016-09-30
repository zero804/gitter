"use strict";

var env = require('gitter-web-env');
var mailer = env.mailer;
var Promise = require('bluebird');
var cdn = require('gitter-web-cdn');
var mailerTemplate = require('./mailer-template');

var VALID_TEMPLATES = {
  'added-to-room': addedToRoomMapping,
  'invitation-v2': invitationMapping,
  'invitation-reminder-v2': invitationMapping,
  'unread-notification': unreadNoticationMapping,
  'created-room': createdRoomMapping,
  'new-topic': newTopicMapping,
  'new-topic-reply': newTopicReplyMapping,
  'new-topic-comment': newTopicCommentMapping,
};

exports.sendEmail = function(options) {
  var mandrillTemplateName = options.templateFile.replace(/\_/g,'-');

  var mapper = VALID_TEMPLATES[mandrillTemplateName];
  if(!mapper) return Promise.reject('Unknown mandrill template: ' + mandrillTemplateName);

  options.templateName = mandrillTemplateName;
  options.data = mapper(options.data);

  return mailer(options);
};

function addedToRoomMapping(data) {
  return {
    NAME:    data.recipientName,
    SENDER:  data.senderName,
    ROOMURI: data.roomUri,
    ROOMURL: data.roomUrl,
    UNSUB:   data.unsubscribeUrl,
    LOGOURL: cdn('images/logo/gitter-logo-email-64.png', {email: true})
  };

}

function invitationMapping(data) {
  return {
    NAME: data.recipientName,
    DATE: data.date,
    SENDER: data.senderName,
    ROOMURI: data.roomUri,
    ROOMURL: data.roomUrl,
    INVITEURL: data.inviteUrl,
    LOGOURL: cdn('images/logo/gitter-logo-email-64.png', { email: true })
  };
}

function unreadNoticationMapping(data) {

  return {
    NAME:       data.recipientName,
    SENDER:     data.senderName,
    ROOMURI:    data.roomUri,
    ROOMURL:    data.roomUrl,
    UNSUB:      data.unsubscribeUrl,
    HTML:       mailerTemplate("unread_notification_html", data),
    MICRODATA:  mailerTemplate("unread_notification_microdata", data),
    PLAINTEXT:  mailerTemplate("unread_notification", data),
    LOGOURL:    cdn('images/logo/gitter-logo-email-64.png', {email: true})
  };

}

function createdRoomMapping(data) {
  var twitterSnippet = data.isPublic ? '<tr><td><br><a href="' + data.twitterURL + '" style="text-decoration: none" target="_blank" class="button-twitter">Share on Twitter</a></td></tr>' : '';

  return {
    NAME:        data.recipientName,
    SENDER:      data.senderName,
    ROOMURI:     data.roomUri,
    ROOMURL:     data.roomUrl,
    UNSUB:       data.unsubscribeUrl,
    TWITTERURL:  twitterSnippet,
    ORGNOTE:     '', // No used since splitsville
    ROOMTYPE:    data.roomType,
    LOGOURL:     cdn('images/logo/gitter-logo-email-64.png', {email: true})
  };
}


function newTopicMapping(data) {
  return {
    HTML: mailerTemplate("topic_new_topic_notification_html", data),
    PLAINTEXT: mailerTemplate("topic_new_topic_notification", data),
    LOGOURL: cdn('images/logo/gitter-logo-email-64.png', {email: true})
  };
}

function newTopicReplyMapping(data) {
  return {
    HTML: mailerTemplate("topic_new_reply_notification_html", data),
    PLAINTEXT: mailerTemplate("topic_new_reply_notification", data),
    LOGOURL: cdn('images/logo/gitter-logo-email-64.png', {email: true})
  };
}

function newTopicCommentMapping(data) {
  return {
    HTML: mailerTemplate("topic_new_comment_notification_html", data),
    PLAINTEXT: mailerTemplate("topic_new_comment_notification", data),
    LOGOURL: cdn('images/logo/gitter-logo-email-64.png', {email: true})
  };
}

exports.testOnly = {
  VALID_TEMPLATES: VALID_TEMPLATES
};

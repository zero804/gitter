"use strict";

var env            = require('gitter-web-env');
var mailer         = env.mailer;

var troupeTemplate = require('../utils/troupe-template');
var Promise        = require('bluebird');
var cdn            = require('../web/cdn');


var CACHED = { };
function getCachedTemplate(templateName) {
  if(CACHED[templateName]) return CACHED[templateName];
  CACHED[templateName] = troupeTemplate.compile(templateName);
  return CACHED[templateName];
}

function applyTemplate(templateName, data) {
  return getCachedTemplate(templateName)
    .then(function(template) {
      return template(data);
    });
}

var VALID_TEMPLATES = {
  'added-to-room': addedToRoomMapping,
  'invitation': invitationMapping,
  'invitation-reminder': invitationMapping,
  'unread-notification': unreadNoticationMapping,
  'created-room': createdRoomMapping
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
    LOGOURL: cdn('images/logo-text-blue-pink.png', {email: true})
  };

}

function invitationMapping(data) {
  return {
    NAME:    data.recipientName,
    DATE:    data.date,
    SENDER:  data.senderName,
    ROOMURI: data.roomUri,
    ROOMURL: data.roomUrl,
    LOGOURL: cdn('images/logo-text-blue-pink.png', { email: true })
  };
}

function unreadNoticationMapping(data) {

  return {
    NAME:       data.recipientName,
    SENDER:     data.senderName,
    ROOMURI:    data.roomUri,
    ROOMURL:    data.roomUrl,
    UNSUB:      data.unsubscribeUrl,
    HTML:       applyTemplate("emails/unread_notification_html", data),
    MICRODATA:  applyTemplate("emails/unread_notification_microdata", data),
    PLAINTEXT:  applyTemplate("emails/unread_notification", data),
    LOGOURL:    cdn('images/logo-text-blue-pink.png', {email: true})
  };

}

function createdRoomMapping(data) {
  var twitterSnippet = data.isPublic ? '<tr><td><br><a href="' + data.twitterURL + '" style="text-decoration: none" target="_blank" class="button-twitter">Share on Twitter</a></td></tr>' : '';
  var orgNote = data.isOrg ? '<p>Note that only people within your organisation can join this room.</p>' : '';

  return {
    NAME:        data.recipientName,
    SENDER:      data.senderName,
    ROOMURI:     data.roomUri,
    ROOMURL:     data.roomUrl,
    UNSUB:       data.unsubscribeUrl,
    TWITTERURL:  twitterSnippet,
    ORGNOTE:     orgNote,
    ROOMTYPE:    data.roomType,
    LOGOURL:     cdn('images/logo-text-blue-pink.png', {email: true})
  };
}

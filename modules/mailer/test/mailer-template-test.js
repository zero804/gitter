'use strict';

var mailerTemplate = require('../lib/mailer-template');
var assert = require('assert');

describe('mailer-template', function() {

  var TEMPLATES = [
    'topic_new_comment_notification',
    'topic_new_comment_notification_html',
    'topic_new_reply_notification',
    'topic_new_topic_notification',
    'unread_notification',
    'unread_notification_html',
    'unread_notification_microdata',
  ];

  TEMPLATES.forEach(function(template) {
    it('should generate template ' + template, function() {
      return mailerTemplate(template, {})
        .then(function(html) {
          assert.strictEqual(typeof html, 'string');
        })
    })

  });


})

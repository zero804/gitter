#!/usr/bin/env node
'use strict';

var topicNotificationGenerator = require('../lib/topic-notificaton-generator');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');

onMongoConnect()
  .then(function() {
    return topicNotificationGenerator.generateNotifications();
  })
  .then(function() {
    process.exit()
  })
  .catch(function(err) {
    console.error(err.stack); // eslint-disable-line no-console
    process.exit(1);
  })

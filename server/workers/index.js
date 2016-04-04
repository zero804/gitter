"use strict";

var onMongoConnect = require('../utils/on-mongo-connect');
var debug = require('debug')('gitter:workers');

var listening = false;

exports.listen = function() {
  if (listening) return;
  listening = true;

  debug('Starting scheduler instance');
  require('../utils/worker-queue-redis').startScheduler();

  // Do not start the workers until theres a valid mongo connection
  // A redis connection is implied since resque needs redis to process
  // the workers
  onMongoConnect()
    .then(function() {
      debug('Starting works on successful mongodb connection');
      require('../services/readby-service').listen();
      require('../services/unread-items').listen();
      require('../services/notifications/push-notification-postbox').listen();
    });

};

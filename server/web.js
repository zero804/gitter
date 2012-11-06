/*jslint node: true */
"use strict";

var express = require('express'),
	Resource = require('express-resource'),
  http = require('http'),
  unreadItemService = require('./services/unread-item-service'),
  nconf = require('./utils/config'),
  winston = require('./utils/winston');

var app = express();
var server = http.createServer(app);

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

require('./web/express').installFull(app, server, sessionStore);

require('./web/passport').install();

require('./web/passport').install();
require('./now').install(server, sessionStore);
require('./handlers/').install(app);

// TEMP
require('./services/thumbnail-preview-generator-service').install();
require('./services/notification-generator-service').install();
unreadItemService.installListener(); // TODO: make sure this only happens once. Need to move across to a queue at some point

require('./resources/').install(app);

/* This should be last */
require('./handlers/app').install(app);

var port = nconf.get("PORT");
server.listen(port, function() {
  winston.info("Listening on " + port);
});

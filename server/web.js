/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

/* Listen for SIGUSR1 signals to start/stop profiling */
// require('./utils/profiler');

/* Configure winston before all else! */
var winston = require('./utils/winston');

var express = require('express'),
  http = require('http'),
  unreadItemService = require('./services/unread-item-service'),
  nconf = require('./utils/config'),
  oauth2 = require('./web/oauth2');

/* Load express-resource */
require('express-resource');

var app = express();
var server = http.createServer(app);

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

require('./web/express').installFull(app, server, sessionStore);

require('./web/passport').install();

require('./web/passport').install();
require('./web/bayeux-events-bridge').install(server);
require('./handlers/').install(app);

// TEMP
require('./services/notification-generator-service').install();
unreadItemService.installListener(); // TODO: make sure this only happens once. Need to move across to a queue at some point

require('./services/kue-workers').startWorkers();

// APIS
require('./resources/').install(app);
require('./api/v1/').install(app);

app.get('/oauth/authorize', oauth2.authorization);
app.post('/oauth/authorize/decision', oauth2.decision);
app.post('/oauth/token', oauth2.token);
app.post('/oauth/bearerLogin', oauth2.bearerLogin);

/* This should be last */
require('./handlers/app').install(app);

var port = nconf.get("PORT");
server.listen(port, function() {
  winston.info("Listening on " + port);
});

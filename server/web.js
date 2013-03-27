/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/* Listen for SIGUSR1 signals to start/stop profiling */
// require('./utils/profiler');

/* Configure winston before all else! */
var winston = require('./utils/winston');

var express = require('express'),
  http = require('http'),
  nconf = require('./utils/config'),
  redis = require('./utils/redis'),
  shutdown = require('./utils/shutdown'),
  oauth2 = require('./web/oauth2');

/* Load express-resource */
require('express-resource');

var app = express();
var server = http.createServer(app);

var gracefullyClosing = false;
app.use(function(req, res, next) {
  if(!gracefullyClosing) return next();

  res.setHeader("Connection", "close");
  res.send(502, "Server is in the process of restarting");
});

shutdown.addHandler('web', 10, function(callback) {
  gracefullyClosing = true;
  server.close(callback);
});

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore({
  client: redis.createClient()
});

require('./web/express').installFull(app, server, sessionStore);

require('./web/passport').install();

require('./web/passport').install();

require('./utils/event-listeners').installLocalEventListeners();

if(nconf.get('ws:startFayeInPrimaryApp')) {
  var bayeux = require('./web/bayeux');
  bayeux.attach(server);
}

require('./handlers/').install(app);


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

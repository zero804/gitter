/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/* Listen for SIGUSR1 signals to start/stop profiling */
// require('./utils/profiler');

require('./utils/diagnostics');

var env      = require('./utils/env');

/* Configure winston before all else! */
var winston  = require('./utils/winston');
winston.info('Starting server/web.js');
var express  = require('express');
var http     = require('http');
var nconf    = require('./utils/config');
var domainWrapper = require('./utils/domain-wrapper');
var serverStats = require('./utils/server-stats');
var onMongoConnect = require('./utils/on-mongo-connect');


/* Load express-resource */
require('express-resource');

var app = express();

var server = http.createServer(domainWrapper(app));

require('./web/graceful-shutdown').install(server, app);

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore({
  client: env.redis.createClient(nconf.get("redis_nopersist")),
  ttl: nconf.get('web:sessionTTL')
});

require('./web/express').installFull(app, server, sessionStore);

require('./web/passport').install();

require('./utils/event-listeners').installLocalEventListeners();

if(nconf.get('ws:startFayeInPrimaryApp')) {
  var bayeux = require('./web/bayeux');
  bayeux.attach(server);
}

require('./handlers/').install(app);

require('./services/kue-workers').startWorkers();

// APIS
var auth = require('./web/middlewares/ensure-logged-in-or-get');
require('./api/').install(app, '/api', auth);

/* This should be second last */
require('./handlers/app').install(app);

require('./handlers/catch-all').install(app);

var port = nconf.get("PORT");

onMongoConnect(function() {
  serverStats('web', server);

  server.listen(port, undefined, nconf.get("web:backlog"), function() {
    winston.info("Listening on " + port);
  });
});

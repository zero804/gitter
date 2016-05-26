"use strict";

require('./utils/diagnostics');

/* Configure winston before all else! */
var env = require('gitter-web-env');
var winston = env.logger;
var nconf = env.config;
winston.info('Starting server/web.js');

var express = require('express');
var http = require('http');
var serverStats = require('./utils/server-stats');
var onMongoConnect = require('./utils/on-mongo-connect');

var app = express();

var server = http.createServer(app);

require('./web/graceful-shutdown').install(server, app);

require('./web/express').installFull(app);

require('./web/passport').install();

require('./event-listeners').install();

if(nconf.get('ws:startFayeInPrimaryApp')) {
  var bayeux = require('./web/bayeux');
  bayeux.attach(server);
}

if (nconf.get("web:startApiInPrimaryApp")) {
  app.use('/api', require('./api/'));
}
app.use('/api_web', require('./api-web/'));
app.use('/', require('./handlers/'));

require('./workers').listen();

var port = nconf.get("PORT");

onMongoConnect(function() {
  serverStats('web', server);

  server.listen(port, undefined, nconf.get("web:backlog"), function() {
    winston.info("Listening on " + port);
  });
});

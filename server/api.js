"use strict";

/* Listen for SIGUSR1 signals to start/stop profiling */
// require('./utils/profiler');

require('./utils/diagnostics');

/* Configure winston before all else! */
var env      = require('gitter-web-env');
var winston  = env.logger;
var nconf    = env.config;
var express  = require('express');
var http     = require('http');
var serverStats = require('./utils/server-stats');
var onMongoConnect = require('./utils/on-mongo-connect');

var app = express();

var server = http.createServer(app);

require('./web/graceful-shutdown').install(server, app);

require('./web/express').installApi(app);

require('./web/passport').installApi();

require('./event-listeners').install();

require('./workers').listen();

app.use('/', require('./api/'));

if (!process.env.DISABLE_API_LISTEN) {
  onMongoConnect(function() {
    serverStats('api', server);

    var port = nconf.get("PORT");
    server.listen(port, undefined, nconf.get("web:backlog"), function() {
      winston.info("Listening on " + port);
    });
  });
}

module.exports = server;

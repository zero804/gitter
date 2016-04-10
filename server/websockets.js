"use strict";

require('./utils/diagnostics');

var express    = require('express');
var nconf      = require('./utils/config');
var winston    = require('./utils/winston');
var bayeux     = require('./web/bayeux');
var appVersion = require('app-version');
var http          = require('http');
var shutdown      = require('shutdown');
var serverStats   = require('./utils/server-stats');
var onMongoConnect = require('./utils/on-mongo-connect');

winston.info("Starting http/ws service");

var app = express();
var server = http.createServer(app);

require('./web/graceful-shutdown').install(server, app);

require('./web/express').installSocket(app);

app.get('/', function(req, res) {
  res.send('Nothing to see here. Move along please. ' + appVersion.getVersion());
});

app.get('/api/private/health_check', require('./api/private/health-check'));
app.get('/api/private/health_check/full', require('./api/private/health-check-full'));

require('./event-listeners').install();

var port = nconf.get('PORT') || nconf.get("ws:port");

bayeux.attach(server);

onMongoConnect(function() {
  // Listen to the port
  serverStats('websockets', server);

  server.listen(port, undefined, nconf.get("ws:backlog"), function() {
    winston.info("Websockets listening on port " + port);
  });
});


shutdown.addHandler('websockets', 10, function(callback) {
  server.close(function() {
    callback();
  });
});

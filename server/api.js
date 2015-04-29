/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/* Listen for SIGUSR1 signals to start/stop profiling */
// require('./utils/profiler');

require('./utils/diagnostics');

/* Configure winston before all else! */
var winston  = require('./utils/winston');

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

require('./web/express').installApi(app);

require('./web/passport').installApi();

require('./utils/event-listeners').installLocalEventListeners();

require('./services/kue-workers').startWorkers();

// APIS
require('./api/').install(app, '', require('./web/middlewares/auth-api'));

app.get('/api/private/health_check', require('./api/private/health-check'));
app.get('/api/private/health_check/full', require('./api/private/health-check-full'));

app.get('/', function(req, res) {
  res.redirect('https://developer.gitter.im');
});

require('./handlers/catch-all').install(app);
onMongoConnect(function() {
  serverStats('api', server);

  var port = nconf.get("PORT");
  server.listen(port, undefined, nconf.get("web:backlog"), function() {
    winston.info("Listening on " + port);
  });
});

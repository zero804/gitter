/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var express = require('express');
var fs = require('fs');
var https = require('https');
var http = require('http');
var nconf = require('./utils/config');
var winston = require('./utils/winston');
var shutdown = require('./utils/shutdown');
var bayeux = require('./web/bayeux');

var app = express();
var server;

if(nconf.get("ws:privateKeyFile")) {
  var options = {
    key: fs.readFileSync(nconf.get("ws:privateKeyFile")),
    cert: fs.readFileSync(nconf.get("ws:certificateFile"))
  };
  winston.info("Starting https/wss service");
  server = https.createServer(options, app);
} else {
  winston.info("Starting http/ws service");
  server = http.createServer(app);
}


var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

require('./web/express').installSocket(app, server, sessionStore);

require('./web/passport').install();

app.get('/', function(req, res) {
  res.send('Nothing to see here. You must be lost.');
});

// TEMP
require('./services/notification-generator-service').install();
require('./web/bayeux-events-bridge').install();

var port = nconf.get("ws:port");
var bindIp = nconf.get("ws:bindIp");

winston.info("Binding websockets service to " + bindIp + ":" + port);

// This is the faye endpoint handler
var bayeuxServer = bayeux.server;
bayeuxServer.attach(server);

// Listen to the port
server.listen(port, bindIp);

var gracefullyClosing = false;
app.use(function(req, res, next) {
  if(!gracefullyClosing) return next();

  res.setHeader("Connection", "close");
  res.send(502, "Server is in the process of restarting");
});

shutdown.addHandler('websockets', 10, function(callback) {
  server.close(function() {
    callback();
  });
});

var uid = nconf.get("runtime:uid");
var gid = nconf.get("runtime:gid");

if(uid || gid) {

  process.nextTick(function() {
      winston.info("Switching to UID/GID: " + uid+ ":" + gid);
      if(gid) process.setgid(gid);
      if(uid) process.setuid(uid);
  });

}

"use strict";

var express = require('express');
var http = require('http');
var fs = require('fs');
var https = require('https');
var config = require('./server/utils/config');
var nconf = require("nconf");

config.configure();

var options = {
  key: fs.readFileSync('/etc/nginx/server.key'),
  cert: fs.readFileSync('/etc/nginx/server.crt')
};

var app = express.createServer(options);

app.get('/', function(req, res) {
  res.send('Nothing to see here. You must be lost.');
});

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

require('./server/now').install(app, sessionStore);

var port = nconf.get("ws:port");
var bindIp = nconf.get("ws:bindIp");

console.log("Binding websockets service to " + bindIp + ":" + port);

app.listen(port, bindIp);

process.nextTick(function() {
  var uid = nconf.get("runtime:uid");
  var gid = nconf.get("runtime:gid");

  console.log("Switching to UID/GID: " + uid+ ":" + gid);
  process.setgid(gid);
  process.setuid(uid);
});

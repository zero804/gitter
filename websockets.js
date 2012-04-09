"use strict";

var express = require('express');
var http = require('http');
var fs = require('fs');
var https = require('https');
var config = require('./server/utils/config');
var nconf = require("nconf");

config.configure();

var options = {
  key: fs.readFileSync(nconf.get("web:privateKeyFile")),
  cert: fs.readFileSync(nconf.get("web:certificateFile"))
};

var app = express.createServer(options);

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

app.configure(function() {
  app.use(express.logger());

  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat', store: sessionStore, cookie: { path: '/', httpOnly: true, maxAge: 14400000, domain: nconf.get("web:cookieDomain") }}));

  app.use(express.errorHandler({ showStack: nconf.get('express:showStack'), dumpExceptions: nconf.get('express:dumpExceptions') }));
});

app.get('/', function(req, res) {
  res.send('Nothing to see here. You must be lost.');
});

require('./server/now').install(app, sessionStore);

var port = nconf.get("ws:port");
var bindIp = nconf.get("ws:bindIp");

console.log("Binding websockets service to " + bindIp + ":" + port);

app.listen(port, bindIp);

process.nextTick(function() {
  var uid = nconf.get("runtime:uid");
  var gid = nconf.get("runtime:gid");

  console.log("Switching to UID/GID: " + uid+ ":" + gid);
  if(gid) process.setgid(gid);
  if(uid) process.setuid(uid);
});

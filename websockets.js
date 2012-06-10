/*global console:false, require: true, module: true, process: false, __dirname:false */
"use strict";

var express = require('express');
var http = require('http');
var fs = require('fs');
var https = require('https');
var nconf = require('./server/utils/config').configure();
var passport = require('passport');
var winston = require('winston');
var userService = require('./server/services/user-service');

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
  app.use(express.session({ secret: 'keyboard cat', store: sessionStore, cookie: { path: '/', httpOnly: true, maxAge: 14400000, domain: nconf.get("web:cookieDomain"), secure: nconf.get("web:secureCookies") }}));

  app.use(express.errorHandler({ showStack: nconf.get('express:showStack'), dumpExceptions: nconf.get('express:dumpExceptions') }));
});


passport.deserializeUser(function(id, done) {
  winston.info("Deserializing " + id);
  userService.findById(id, function(err, user) {
    if(err) return done(err);
    if(!user) return done(null, false);

    /* Todo: consider using a seperate object for the security user */
    return done(null, user);
  });

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

  if(uid || gid) {
    console.log("Switching to UID/GID: " + uid+ ":" + gid);
    if(gid) process.setgid(gid);
    if(uid) process.setuid(uid);
  }
});

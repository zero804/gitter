/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var express = require('express');
var fs = require('fs');
var https = require('https');
var nconf = require('./utils/config');
var winston = require('./utils/winston');

var options = {
  key: fs.readFileSync(nconf.get("ws:privateKeyFile")),
  cert: fs.readFileSync(nconf.get("ws:certificateFile"))
};

var app = express();
var server = https.createServer(options, app);

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

require('./web/express').installSocket(app, server, sessionStore);


require('./web/passport').install();

app.get('/', function(req, res) {
  res.send('Nothing to see here. You must be lost.');
});

require('./web/bayeux-events-bridge').install(server);

var port = nconf.get("ws:port");
var bindIp = nconf.get("ws:bindIp");

winston.info("Binding websockets service to " + bindIp + ":" + port);

server.listen(port, bindIp);

var uid = nconf.get("runtime:uid");
var gid = nconf.get("runtime:gid");

if(uid || gid) {

  process.nextTick(function() {
      winston.info("Switching to UID/GID: " + uid+ ":" + gid);
      if(gid) process.setgid(gid);
      if(uid) process.setuid(uid);
  });

}

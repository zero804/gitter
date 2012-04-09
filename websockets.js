"use strict";

var express = require('express');
var http = require('http');
var fs = require('fs');
var https = require('https');

var options = {
  key: fs.readFileSync('/etc/nginx/server.key'),
  cert: fs.readFileSync('/etc/nginx/server.crt')
};

var app = express.createServer(options);

app.get('/', function(req, res) {
  res.send('Nothing to see here.');
});

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

require('./server/now').install(app, sessionStore);

app.listen(443, "10.11.12.14");

process.nextTick(function() {
  console.log("Switching priviledges");
  process.setgid("troupe");
  process.setuid("troupe");
});

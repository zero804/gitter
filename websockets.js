"use strict";

var http = require('http');
var fs = require('fs');
var https = require('https');

var options = {
  key: fs.readFileSync('/etc/nginx/server.key'),
  cert: fs.readFileSync('/etc/nginx/server.crt')
};

/*
var httpServer = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end("Nothing here");
});

var httpsServer = https.createServer(options, function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end("Nothing here");
});

httpServer.listen(80, "10.11.12.14", onServerStartup);
httpsServer.listen(443, "10.11.12.14", onServerStartup);

var serverStartCount = 0;
function onServerStartup() {
  serverStartCount++;
  if(serverStartCount == 2) {
    require('./server/now').install(httpServer, sessionStore);

    process.setgid("troupe");
    process.setuid("troupe");
  }
}
*/


var app = require('express').createServer(options);

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

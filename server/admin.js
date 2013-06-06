/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var express = require('express');
var http = require('http');
var shutdown = require('./utils/shutdown');

var app = express();
var server = http.createServer(app);


console.log( __dirname + "/../public-admin");
app.use(express['static']( __dirname + "/../public-admin"));


require('./admin/api/index').install(app);


// Listen to the port
server.listen(4100);

var gracefullyClosing = false;
app.use(function(req, res, next) {
  if(!gracefullyClosing) return next();

  res.setHeader("Connection", "close");
  res.send(502, "Server is in the process of restarting");
});

shutdown.addHandler('admin', 10, function(callback) {
  gracefullyClosing = true;
  server.close(function() {
    callback();
  });
});


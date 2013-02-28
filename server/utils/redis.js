/*jshint node:true unused:true */
"use strict";

var Q = require('q');
var nconf = require("./config");
var redis = require("redis");
var shutdown = require('./shutdown');
var host = nconf.get("redis:host");
var port = nconf.get("redis:port");
var clients = [];

shutdown.addHandler('redis', 1, function(callback) {
  var promises = [];

  clients.forEach(function(client) {
    var d = Q.defer();
    promises.push(d.promise);

    client.quit(function() {
      d.resolve();
    });
  });

  Q.all(promises).then(function() {
    callback();
  }).fail(function(err) {
    if(err) console.error("Quit failed", err);
    callback(err);
  });
});


exports.createClient = function createClient() {
  var client = redis.createClient(port, host);
  clients.push(client);
  return client;
};

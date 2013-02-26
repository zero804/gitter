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

  clients.forEach(function(client, index) {
    var d = Q.defer();
    promises.push(d.promise);

    console.log("Calling quit on " + index);
    client.quit(function() {
      console.log("Completed quit on " + index);
      d.resolve();
    });
  });

  Q.all(promises).then(function() {
    console.log("Clients have all quit");
    callback();
  }).fail(function(err) {
    console.log("Quit failed", err);
    callback(err);
  });
});


exports.createClient = function createClient() {
  var client = redis.createClient(port, host);
  clients.push(client);
  return client;
};

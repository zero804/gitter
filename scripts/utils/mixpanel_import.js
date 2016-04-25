#!/usr/bin/env node
"use strict";

var env         = require('gitter-web-env');
var winston     = env.logger;
var nconf       = env.config;
var persistence = require('gitter-web-persistence');
var shutdown    = require('shutdown');


function getAllUsers(callback) {
  persistence.User.find(function (err, users) {
    if (err) console.log(err);
    callback("",users);
  });
}

getAllUsers(function(err, users) {

  if (nconf.get("stats:mixpanel")) {

    var Mixpanel  = require('mixpanel');
    var token     = nconf.get("stats:mixpanel:token");
    var mixpanel  = Mixpanel.init(token);

    winston.verbose("[mixpanel] Importing users: ", users.length);

    users.forEach(function(user) {
      var first_name = user.displayName ? user.displayName.split(' ')[0] : 'User';
      var created_at = new Date(user._id.getTimestamp().getTime());

      if (user.email.indexOf("troupetest.local") == -1) {
        mixpanel.people.set(user.id, {
          $first_name: first_name,
          $created_at: created_at.toISOString(),
          $email: user.email,
          $name: user.displayName,
          $username: user.username,
          Status: user.status
        });
      }
    });
  }

  shutdown.shutdownGracefully();

});

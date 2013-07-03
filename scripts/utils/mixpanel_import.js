#!/usr/bin/env node
/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf       = require('../../server/utils/config');
var winston     = require('../../server/utils/winston');
var persistence = require("../../server/services/persistence-service");
var shutdown    = require('../../server/utils/shutdown');


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
      var first_name = user.displayName.split(' ')[0];
      var created_at = new Date(user._id.getTimestamp().getTime());

      mixpanel.people.set(user.id, {
        $first_name: first_name,
        $created_at: created_at.toISOString(),
        $email: user.email,
        $name: user.displayName,
        $username: user.username,
        status: user.status
      });
    });
  }

  shutdown.shutdownGracefully();

});


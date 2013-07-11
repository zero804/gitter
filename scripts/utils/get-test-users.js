#!/usr/bin/env node
/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf       = require('../../server/utils/config');
var winston     = require('../../server/utils/winston');
var persistence = require("../../server/services/persistence-service");
var shutdown    = require('../../server/utils/shutdown');


function getAllUsers(callback) {
  persistence.User.find({email:/troupetest.local/}, function (err, users) {
    if (err) console.log(err);
    callback("",users);
  });
}

getAllUsers(function(err, users) {
  users.forEach(function(user) {
    console.log(user._id);
  });

  shutdown.shutdownGracefully();

});


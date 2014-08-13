#!/usr/bin/env node
/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf               = require('../../server/utils/config');
var winston             = require('../../server/utils/winston');
var persistence         = require("../../server/services/persistence-service");
var shutdown            = require('shutdown');
var async               = require('async');
var emailAddressService = require('../../server/services/email-address-service');
var Q                   = require('q');

function getAllUsers(callback) {
  persistence.User.find(function (err, users) {
    if (err) console.log(err);
    callback("",users);
  });
}

getAllUsers(function(err, users) {

  if (nconf.get("stats:intercom")) {
    var Intercom = require('intercom.io');
    var options = {
      apiKey: nconf.get("stats:intercom:key"),
      appId: nconf.get("stats:intercom:app_id")
    };

    var intercom = new Intercom(options);
    winston.verbose("[intercom] Importing users: ", users.length);

    async.each(users,
      function(user, callback){
        if (user.state !== 'INVITED') {
          var created_at = new Date(user._id.getTimestamp());
          emailAddressService(user).nodeify(function(err, email) {
            if (err) return callback(err);
            intercom.createUser({
              "email" : email,
              "user_id" : user.id,
              "name" : user.displayName,
              "created_at" : created_at,
              "username" : user.username,
              // "companies" : [
              //   {
              //     "id" : 6,
              //     "name" : "Intercom",
              //     "created_at" : 103201,
              //     "plan" : "Messaging",
              //     "monthly_spend" : 50
              //   }
              // ],
            },
            function(err, res) {
              if (err) console.log(err);
              console.log("did something");
              callback();
            });
          });
        } else {
          callback();
        }
      },
      function(err){
        console.log("Shutting down gracefully");
        shutdown.shutdownGracefully();
      }
    );
  }
});




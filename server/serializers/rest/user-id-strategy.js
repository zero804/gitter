/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService       = require("../../services/user-service");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var UserStrategy      = require('./user-strategy');

function UserIdStrategy(options) {
  var self = this;

  var userStategy = new UserStrategy(options);

  this.preload = function(ids, callback) {
    userService.findByIds(ids, function(err, users) {
      if(err) {
        winston.error("Error loading users", { exception: err });
        return callback(err);
      }

      self.users = collections.indexById(users);
      userStategy.preload(users, callback);
    });
  };

  this.map = function(id) {
    var user = self.users[id];
    return userStategy.map(user);
  };
}

module.exports = UserIdStrategy;


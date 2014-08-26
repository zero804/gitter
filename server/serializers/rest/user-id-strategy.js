/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService       = require("../../services/user-service");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var UserStrategy      = require('./user-strategy');

function UserIdStrategy(options) {
  var userStategy = new UserStrategy(options);
  var usersIndexed;

  this.preload = function(ids, callback) {
    userService.findByIds(ids, function(err, users) {
      if(err) {
        winston.error("Error loading users", { exception: err });
        return callback(err);
      }

      usersIndexed = collections.indexById(users);
      userStategy.preload(users, callback);
    });
  };

  this.map = function(id) {
    var user = usersIndexed[id];
    return userStategy.map(user);
  };
}

UserIdStrategy.prototype = {
  name: 'UserIdStrategy'
};

module.exports = UserIdStrategy;


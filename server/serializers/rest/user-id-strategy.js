"use strict";

var userService = require("../../services/user-service");
var UserStrategy = require('./user-strategy');

var idStrategyGenerator = require('../id-strategy-generator');

var UserIdStrategy = idStrategyGenerator('UserIdStrategy', UserStrategy, userService.findByIds);

UserIdStrategy.slim = function(options) {
  var strategy = UserStrategy.slim(options);
  return UserIdStrategy.withStrategy(strategy);
}

module.exports = UserIdStrategy;

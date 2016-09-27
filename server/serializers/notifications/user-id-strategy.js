"use strict";

var idStrategyGenerator = require('gitter-web-serialization/lib/id-strategy-generator');
var userService = require('../../services/user-service');
var UserStrategy = require('./user-strategy');

var UserIdStrategy = idStrategyGenerator('UserIdStrategy', UserStrategy, userService.findByIds);

module.exports = UserIdStrategy;

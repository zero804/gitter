"use strict";

var groupService = require('gitter-web-groups/lib/group-service');
var GroupStrategy = require('./group-strategy');

var idStrategyGenerator = require('../id-strategy-generator');
var GroupIdStrategy = idStrategyGenerator('GroupIdStrategy', GroupStrategy, groupService.findByIds);

module.exports = GroupIdStrategy;

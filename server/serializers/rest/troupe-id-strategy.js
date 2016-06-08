"use strict";

var troupeService = require("../../services/troupe-service");
var TroupeStrategy = require('./troupe-strategy');

var idStrategyGenerator = require('../id-strategy-generator');
var TroupeIdStrategy = idStrategyGenerator('TroupeIdStrategy', TroupeStrategy, troupeService.findByIds);

module.exports = TroupeIdStrategy;

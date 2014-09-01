/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service");
var idStrategyGenerator = require('../id-strategy-generator');
var TroupeStrategy = require('./troupe-strategy');
var TroupeIdStrategy = idStrategyGenerator('TroupeIdStrategy', TroupeStrategy, troupeService.findByIds);

module.exports = TroupeIdStrategy;

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var chatService = require("../../services/chat-service");
var idStrategyGenerator = require('../id-strategy-generator');
var ChatStrategy = require('./chat-strategy');
var ChatIdStrategy = idStrategyGenerator('ChatIdStrategy', ChatStrategy, chatService.findByIds);

module.exports = ChatIdStrategy;

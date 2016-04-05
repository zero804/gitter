"use strict";

var chatService         = require("../../services/chat-service");
var ChatStrategy        = require('./chat-strategy');
var idStrategyGenerator = require('../id-strategy-generator');
var ChatIdStrategy      = idStrategyGenerator('ChatIdStrategy', ChatStrategy, chatService.findByIds);

module.exports = ChatIdStrategy;

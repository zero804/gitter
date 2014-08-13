/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var sampleChatsService = require('../../services/sample-chats-service');

module.exports =  function(req, res) {
  var samples = sampleChatsService.getSamples().reverse();
  res.send(samples);
}

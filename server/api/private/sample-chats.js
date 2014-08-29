/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var sampleChatsService = require('../../services/sample-chats-service');

module.exports =  function(req, res, next) {
  return sampleChatsService.getSamples()
    .then(function(samples) {
      res.send(samples);
    })
    .fail(next);
};

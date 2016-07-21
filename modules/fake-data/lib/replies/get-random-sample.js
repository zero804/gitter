"use strict";

var _ = require('lodash');
var getReplies   = require('./index');
var getRandomInt = require('../utils/get-random-int');

module.exports = function getRandomReplySample(parentId){

  var replies = getReplies();
  return replies.slice(0, replies.length - 1).map(function(reply){
    return _.extend({}, reply, { parentId: parentId });
  });

};

"use strict";

var _ = require('lodash');
var getReplies   = require('./index');
var getRandomInt = require('../utils/get-random-int');

module.exports = function getRandomReplySample(parentId){

  var replies = getReplies();
  var lastIndex = replies.length - 1;

  var start = lastIndex;
  while(start === lastIndex) { start = getRandomInt(0, lastIndex);}

  var end = start;
  while(end === start) { end = getRandomInt(start, lastIndex); }

  return replies.slice(start, end).map(function(reply){
    return _.extend({}, reply, { parentId: parentId });
  });
};

"use strict";

var _ = require('lodash');
var getComments = require('./index');
var getRandomInt = require('../utils/get-random-int');

module.exports = function getRandomCommentsSample(parentId){
  var comments = getComments();
  var lastIndex = comments.length - 1;

  var start = lastIndex;
  while(start === lastIndex) { start = getRandomInt(0, lastIndex);}

  var end = start;
  while(end === start) { end = getRandomInt(start, lastIndex); }

  return comments.slice(start, end).map(function(reply){
    return _.extend({}, reply, { parentId: parentId });
  });
};

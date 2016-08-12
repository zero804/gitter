"use strict";

var getReplies = require('./index');
var getRandomInt = require('../utils/get-random-int');

var replies;
module.exports = function getFakeReply(id) {
  if(!replies) { replies = getReplies(); }
  return replies[id] || replies[getRandomInt(0, replies.length - 1)];
};

"use strict";

var getComments = require('./index');
var getRandomInt = require('../utils/get-random-int');

var comments;
module.exports = function getFakeReply(id) {
  if(!comments) { comments = getComments(); }
  return comments[id] || comments[getRandomInt(0, comments.length - 1)];
};

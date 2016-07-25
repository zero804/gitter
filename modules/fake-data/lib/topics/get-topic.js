"use strict";

var getTopics = require('./index.js');
var getRandomInt = require('../utils/get-random-int');

var topics;
module.exports = function getFakeTopic(id){
  if(!topics) { topics = getTopics(); }
  return topics[id] || topics[getRandomInt(0, topics.length -1)];
};

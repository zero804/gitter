'use strict';

var faker = require('faker');
var _ = require('lodash');
var getRandomInt = require('./utils/get-random-int');
var getRandomBool = require('./utils/get-random-bool');

var forum;

module.exports = function getFakeForumObject(){

  var categories = _.range(getRandomInt(5, 7)).map(function(){
    return faker.hacker.adjective();
  });

  var tags = _.range(getRandomInt(10, 17)).map(function(){
    return faker.hacker.adjective();
  });

  var topics = _.range(getRandomInt(3, 10)).map(function(){
    return {
      repliesTotal:       getRandomInt(1, 8),
      participatingTotal: getRandomInt(8, 25),
      isFaved:            getRandomBool(),
      isParticipating:    getRandomBool(),
      isWatching:         getRandomBool(),
    };
  });

  return {
    name:        faker.commerce.productName(),
    topicsTotal: topics.length,
    topics:      topics,
    categories:  categories,
    tags:        tags,
  };
};

"use strict";

var Promise = require('bluebird');
var _ = require('lodash');

//TODO remove
var faker = require('faker');

// Utils ----------------
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomBool(){
  return getRandomInt(0, 10) % 2;
}

// Forum generation -----------------
var forum;
function buildForum(){

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
    name: faker.commerce.productName(),
    topicsTotal: topics.length,
    topics: topics,
    categories: categories,
    tags: tags,
  };
}

function getForum(){
  if(!forum) { forum = buildForum(); }
  return forum;
}

module.exports = {
  id: 'forumId',
  show: function(req, res){
    return Promise.resolve(getForum());
  }
};

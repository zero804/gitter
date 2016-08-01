'use strict';

var faker = require('faker');
var _ = require('lodash'); // eslint-disable-line node/no-unpublished-require
var getRandomInt = require('../utils/get-random-int');
var getTopics = require('../topics');

var forum;
module.exports = function getFakeForumObject(){
  if(!forum) {
    var categories = _.range(getRandomInt(5, 7)).map(function(){
      return faker.hacker.adjective();
    });

    var tags = _.range(getRandomInt(10, 17)).map(function(){
      return faker.hacker.adjective();
    });

    var topics = getTopics().map(function(topic){
      var data = _.extend({}, topic);
      delete data.replies;
      return data;
    });

    forum = {
      name:        faker.commerce.productName(),
      topicsTotal: topics.length,
      topics:      topics,
      categories:  categories,
      tags:        tags,
    };
  }
  return forum;
};

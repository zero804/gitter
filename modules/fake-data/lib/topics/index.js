"use strict";

var _ = require('lodash');
var faker = require('faker');
var getRandomInt = require('../utils/get-random-int');
var getRandomBool = require('../utils/get-random-bool');

var topics;

module.exports = function getFakeTopicsList(isNested){

  if(!topics) {
    topics = _.range(getRandomInt(3, 10)).map(function(){

      var title = faker.commerce.productName();
      var titleHTML = '<h1>' + title + '</h1>';

      var body = faker.hacker.phrase();
      var bodyHTML = '<p>' + body + '</p>';

      var topic = {
        title: { text: title, html: titleHTML },
        body:  { text: body, html: bodyHTML},
        repliesTotal:       getRandomInt(1, 8),
        participatingTotal: getRandomInt(8, 25),
        isFaved:            getRandomBool(),
        isParticipating:    getRandomBool(),
        isWatching:         getRandomBool(),
      };

      if(!isNested) {
        //Add full details
      }

      return topic;
    });
  }

  return topics;
};

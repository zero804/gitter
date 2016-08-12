"use strict";

var _ = require('lodash'); // eslint-disable-line node/no-unpublished-require
var faker = require('faker');
var getRandomInt = require('../utils/get-random-int');
var getRandomBool = require('../utils/get-random-bool');
var getRandomReplySample = require('../replies/get-random-sample');

var topics;

module.exports = function getFakeTopicsList(){

  if(!topics) {
    topics = _.range(getRandomInt(3, 10)).map(function(val){

      var body = faker.hacker.phrase();
      var bodyHTML = '<p>' + body + '</p>';

      var replies = getRandomReplySample(val).map(function(reply){
        var data = _.extend({}, reply);
        delete data.comments;
        return data;
      });

      var topic = {
        id: val,
        title: faker.commerce.productName(),
        body: { text: body, html: bodyHTML},
        repliesTotal: replies.length,
        replies: replies,
        participatingTotal: getRandomInt(8, 25),
        isFaved: getRandomBool(),
        isParticipating: getRandomBool(),
        isWatching: getRandomBool(),
        user: {
          id: 12345,
          username: 'testy-mc-testface',
          displayName: 'Testy McTestFace',
          url: '/testy-mc-testface',
          staff: true,
          v: 1,
          avatarUrl: 'https://avatars-04.gitter.im/group/iv/1/578f6877c2f0db084a23d707?s=22'
        }
      };

      return topic;
    });
  }

  return topics;
};

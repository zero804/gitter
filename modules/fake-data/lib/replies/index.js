"use strict";

var _ = require('lodash'); // eslint-disable-line node/no-unpublished-require
var faker = require('faker');
var getRandomCommentsSample = require('../comments/get-random-sample');

var replies;

module.exports = function getFakeReplies(){

  if(!replies) {
    replies = _.range(10, 30).map(function(val){

      var body = faker.hacker.phrase();
      var bodyHTML = '<p>' + body + '</p>';

      var comments = getRandomCommentsSample(val);

      return {
        id: val,
        user: {},
        test: body,
        html: bodyHTML,
        sent: faker.date.past(),
        comments: comments,
        commentTotal: comments.length,
      };
    });
  }

  return replies;
};

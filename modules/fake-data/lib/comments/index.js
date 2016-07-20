"use strict";

var _ = require('lodash');
var faker = require('faker');

var comments;
module.exports = function getFakeComments(){
  if(!comments) {

    comments = _.range(30, 50).map(function(val){

      var body = faker.hacker.phrase();
      var bodyHTML = '<p>' + body + '</p>';

      return {
        id: val,
        user: {},
        test: body,
        html: bodyHTML,
        sent: faker.date.past(),
      };
    });
  }
  return comments;
};

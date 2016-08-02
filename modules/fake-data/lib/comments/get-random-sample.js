"use strict";

var _ = require('lodash');
var getComments = require('./index');
var getRandomInt = require('../utils/get-random-int');

module.exports = function getRandomCommentsSample(parentId){

  var comments = getComments();
  return comments.slice(getRandomInt(0, comments.length - 1)).map(function(reply){
    return _.extend({}, reply, { parentId: parentId });
  });

};

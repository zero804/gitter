"use strict";

var Promise = require('bluebird');
var getForum = require('gitter-web-fake-data').getForum;

module.exports = function getForumById(){
  return Promise.resolve(getForum());
};

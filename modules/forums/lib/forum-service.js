"use strict";

var Promise = require('bluebird');
var getForum = require('gitter-web-fake-data').getForum;

function findByName() {
  return Promise.resolve(getForum());
}

module.exports = {
  findByName: findByName
};

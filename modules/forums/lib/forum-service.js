"use strict";

var Promise = require('bluebird');
var getForum = require('gitter-web-fake-data').getForum;

function findById() {
  return Promise.resolve(getForum());
}

module.exports = {
  findById: findById
};

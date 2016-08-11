"use strict";

var Promise = require('bluebird');
var getTopic = require('gitter-web-fake-data').getTopic;

function findById() {
  return Promise.resolve(getTopic());
}

module.exports = {
  findById: findById
};

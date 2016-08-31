"use strict";

var Promise = require('bluebird');
var getTopic = require('gitter-web-fake-data').getTopic;
var getTopics = require('gitter-web-fake-data').getTopics;

function findById() {
  return Promise.resolve(getTopic());
}

function getAllTopics() {
  return Promise.resolve(getTopics());
}

module.exports = {
  findById: findById,
  getAllTopics: getAllTopics,
};

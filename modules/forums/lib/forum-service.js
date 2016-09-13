"use strict";

var Promise = require('bluebird');
var Forum = require('gitter-web-persistence').Forum;
var getForum = require('gitter-web-fake-data').getForum;

function findById(id) {
  return Forum.findById(id)
    .lean()
    .exec();
}

function findByName() {
  return Promise.resolve(getForum());
}

module.exports = {
  findById: findById,
  findByName: findByName
};

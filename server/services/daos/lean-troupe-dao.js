"use strict";

var persistence = require('../persistence-service');
var promiseUtils = require('../../utils/promise-utils');

exports.findByIdRequired = function(id, fields) {
  return persistence.Troupe.findByIdQ(id, fields, { lean: true })
    .then(promiseUtils.required);
}
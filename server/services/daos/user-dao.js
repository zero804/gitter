"use strict";

var persistence = require('../persistence-service');
var promiseUtils = require('../../utils/promise-utils');

function create(lean) {
  var module = {};

  module.findByIdRequired = function(id, fields) {
    return persistence.User.findByIdQ(id, fields, { lean: lean })
      .then(promiseUtils.required);
  };

  module.findById = function(id, fields) {
    return persistence.User.findByIdQ(id, fields, { lean: lean });
  };

  return module;
}


module.exports = {
  lean: create(true), // -> lean: true
  full: create(false) // -> lean: false
};

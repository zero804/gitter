"use strict";

var Q = require('q');
var persistence = require('../persistence-service');
var promiseUtils = require('../../utils/promise-utils');

function create(lean) {
  var module = {};

  module.findByIdRequired = function(id, fields) {
    return persistence.Troupe.findByIdQ(id, fields, { lean: lean })
      .then(promiseUtils.required);
  };

  module.findByUris = function(uris) {
    return Q.fcall(function() {
      if(!uris || !uris.length) return [];

      var lcUris = uris.map(function(f) { return f.toLowerCase(); });

      return persistence.Troupe
                .where('lcUri').in(lcUris)
                .lean(lean)
                .execQ();
    });
  };

  return module;

}


module.exports = {
  lean: create(true), // -> lean: true
  full: create(false) // -> lean: false
};

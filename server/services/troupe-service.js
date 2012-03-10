"use strict";

var persistence = require("./persistence-service"),
    sechash = require('sechash');

module.exports = {

  findByUri: function(uri, callback) {
    persistence.Troupe.findOne({uri: uri}, function(err, troupe) {
      callback(err, troupe);
    });
  }

};
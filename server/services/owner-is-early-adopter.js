"use strict";

var persistence = require('gitter-web-persistence');
var mongoUtils  = require('../utils/mongo-utils');
var env         = require('gitter-web-env');
var config      = env.config;


function isEarlyAdopter(roomUri) {
  var lcUri = roomUri.toLowerCase();
  return persistence.Troupe.findOne({ lcUri: lcUri }, { _id: 1 }, { lean: true })
    .exec()
    .then(function(troupe) {
      if(!troupe) return false;

      var releaseDate = new Date(config.get('premiumRelease'));
      var createdAt = mongoUtils.getDateFromObjectId(troupe._id);
      return releaseDate > createdAt;
    });
}



module.exports = isEarlyAdopter;

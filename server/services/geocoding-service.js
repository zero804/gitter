/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GeoPopulatedPlace = require("./persistence-service").GeoPopulatedPlace;
var winston = require("winston");


var earthRadiansMultiplier = (6371 * Math.PI / 180);

exports.reverseGeocode = function(coordinate, callback) {
  var lon = parseFloat(coordinate.lon);
  var lat = parseFloat(coordinate.lat);

  var maxDistance = 50 / earthRadiansMultiplier;

  GeoPopulatedPlace.collection.geoNear(lon, lat, { maxDistance: maxDistance, distanceMultiplier: earthRadiansMultiplier, num: 1, uniqueDocs: true },
    function(err, docs) {
      if(err) return callback(err);
      if(docs.errmsg) return callback(docs.errmsg);

      if(docs.results.length > 0) {
        callback(null, docs.results[0].obj);
      } else {
        callback(null, null);
      }
  });
};

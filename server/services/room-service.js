/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');
var assert = require("assert");

function findOrCreateRoom(options) {
  assert(options);
  assert(options.uri);
  assert(options.githubType);

  var uri = options.uri;
  var githubType = options.githubType;

  return persistence.Troupe.findOneAndUpdateQ(
    { uri: uri, githubType: githubType },
    {
      $setOnInsert: {
        uri: uri,
        githubType: githubType
      }
    },
    {
      upsert: true
    });

}

exports.findOrCreateRoom = findOrCreateRoom;

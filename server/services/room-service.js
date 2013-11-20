/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');
var assert = require("assert");
var ObjectID = require('mongodb').ObjectID;

function findOrCreateRoom(options) {
  assert(options);
  assert(options.uri);
  assert(options.githubType);

  var uri = options.uri;
  var githubType = options.githubType;
  var user = options.user;


  var users = user ? [{ _id: new ObjectID(), userId: user.id }] : [];

  return persistence.Troupe.findOneAndUpdateQ(
    { uri: uri, githubType: githubType },
    {
      $setOnInsert: {
        uri: uri,
        githubType: githubType,
        users: users
      }
    },
    {
      upsert: true
    })
    .then(function(troupe) {
      if(!user) return troupe;

      if(troupe.containsUserId(user.id)) return troupe;

      troupe.addUserById(user.id);
      return troupe.saveQ().thenResolve(troupe);
    });

}

exports.findOrCreateRoom = findOrCreateRoom;

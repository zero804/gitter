/* jshint node:true */
'use strict';

var speedy      = require ("speedy");
var persistence = require('../../server/services/persistence-service');
var chatService = require('../../server/services/chat-service');
var troupeService = require('../../server/services/troupe-service');
var mongoose    = require('gitter-web-mongoose-bluebird');
var onMongoConnect    = require('../../server/utils/on-mongo-connect');

var ObjectID = mongoose.mongo.ObjectID;
// var troupeId = "54e4bffbf551ca5918c16c29";
var troupeId = "54d244f1c53660e29b9f91d9";

onMongoConnect(function() {
  speedy.run ({
    withSelect: function(done) {
      troupeService.findUserIdsForTroupe(troupeId)
        .nodeify(done);
    },
    withLimit: function(done) {
      troupeService.findUsersForTroupeWithLimit(troupeId, 25)
        // .then(function(f) {
        //   console.log(f.length);
        // })
        // .catch(function(e) {
        //   console.log(e);
        // })
        .nodeify(done);
    }

  });
});

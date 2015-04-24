/* jshint node:true */
'use strict';

var speedy      = require ("speedy");
var persistence = require('../../server/services/persistence-service');
var chatService = require('../../server/services/chat-service');
var troupeService = require('../../server/services/troupe-service');
var mongoose    = require('../../server/utils/mongoose-q');
var onMongoConnect    = require('../../server/utils/on-mongo-connect');

var ObjectID = mongoose.mongo.ObjectID;

onMongoConnect(function() {
  speedy.run ({
    withSelect: function(done) {
      troupeService.findUserIdsForTroupe('54d244f1c53660e29b9f91d9')
        .nodeify(done);
    },

  });
});

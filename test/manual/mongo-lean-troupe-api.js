/* jshint node:true */
'use strict';

var speedy      = require ("speedy");
var persistence = require('gitter-web-persistence');
var chatService = require('../../server/services/chat-service');
var troupeService = require('../../server/services/troupe-service');
var mongoose    = require('gitter-web-mongoose-bluebird');
var onMongoConnect    = require('../../server/utils/on-mongo-connect');

var ObjectID = mongoose.mongo.ObjectID;

onMongoConnect(function() {
  speedy.run ({
    withFindById: function(done) {
      troupeService.findById('54d244f1c53660e29b9f91d9')
        .nodeify(done);
    },

    withAccess: function(done) {
      troupeService.findByIdLeanWithAccess('54d244f1c53660e29b9f91d9', '5435479aa6cf90638955c34a')
        .nodeify(done);
    },

  });
});

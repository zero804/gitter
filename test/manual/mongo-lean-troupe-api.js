'use strict';

var speedy      = require("speedy");
var troupeService = require('../../server/services/troupe-service');
var onMongoConnect    = require('../../server/utils/on-mongo-connect');

onMongoConnect(function() {
  speedy.run({
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

"use strict";

var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var assert        = require("assert");

describe('room-meta-service #slow', function(){
  var fixture = {};
  var roomMetaService;
  var welcomeMessage = 'this is a test';

  before(fixtureLoader(fixture, {
    troupe: {}
  }));


  it('should upsert and retrieve a record', function(){
    roomMetaService = testRequire('./services/room-meta-service');
    return roomMetaService.upsertMetaKey(fixture.troupe.id, 'welcomeMessage', welcomeMessage)
      .then(function(){
        return roomMetaService.findMetaByTroupeId(fixture.troupe.id, 'welcomeMessage');
      })
      .then(function(res){
        assert(!!res);
        //apparently this returns a model ...
        assert.equal(res.toJSON(), welcomeMessage);
      });
  });

});

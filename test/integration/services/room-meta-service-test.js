"use strict";

var testRequire = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var assert = require('assert');
var Promise = require('bluebird');

describe('room-meta-service #slow', function(){
  var roomMetaService;

  var fixture = fixtureLoader.setup({
    troupe1: {},
    troupe2: {},
    troupe3: {}
  });

  before(function() {
    roomMetaService = testRequire('./services/room-meta-service');
  })

  it('should handle missing metadata', function() {
    return roomMetaService.findMetaByTroupeId(fixture.troupe2._id, 'welcomeMessage')
      .then(function(result) {
        assert.equal(result, null);
      });

  });

  it('should upsert and retrieve a record', function() {
    var welcomeMessage = {
      text: 'blah',
      html: 'bob'
    };

    return roomMetaService.upsertMetaKey(fixture.troupe1.id, 'welcomeMessage', welcomeMessage)
      .then(function() {
        return roomMetaService.findMetaByTroupeId(fixture.troupe1.id, 'welcomeMessage');
      })
      .then(function(result) {
        assert.deepEqual(result, welcomeMessage);
        // Make sure one meta doesnt override the other, which was happening before
        return roomMetaService.findMetaByTroupeId(fixture.troupe2.id, 'welcomeMessage');
      })
      .then(function(result) {
        assert.equal(result, null);
      });
  });

  it('should be able to insert two records', function() {
    return Promise.join(
      roomMetaService.upsertMetaKey(fixture.troupe1.id, 'welcomeMessage', { text: 'a' }),
      roomMetaService.upsertMetaKey(fixture.troupe1.id, 'welcomeMessage', { text: 'b' }));
  })

});

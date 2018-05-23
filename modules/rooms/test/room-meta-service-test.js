"use strict";

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var Promise = require('bluebird');
var roomMetaService = require('../lib/room-meta-service');

describe('room-meta-service #slow', function(){
  var fixture = fixtureLoader.setup({
    troupe1: {},
    troupe2: {},
    troupe3: {}
  });

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
      roomMetaService.upsertMetaKey(fixture.troupe2.id, 'welcomeMessage', { text: 'b' }));
  })

});

'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var roomMetaService = require('../lib/room-meta-service');

describe('room-meta-service #slow', function() {
  var fixture = fixtureLoader.setupEach({
    troupe1: {},
    troupe2: {}
  });

  it('should handle missing metadata', function() {
    return roomMetaService
      .findMetaByTroupeId(fixture.troupe2.id, ['welcomeMessage'])
      .then(function(result) {
        assert.deepEqual(result, {});
      });
  });

  it('should upsert and retrieve a record', function() {
    var welcomeMessage = {
      text: 'blah',
      html: 'bob'
    };

    return roomMetaService
      .upsertMetaKey(fixture.troupe1.id, 'welcomeMessage', welcomeMessage)
      .then(function() {
        return roomMetaService.findMetaByTroupeId(fixture.troupe1.id, ['welcomeMessage']);
      })
      .then(function(meta) {
        assert.deepEqual(meta, { welcomeMessage });
        // Make sure one meta doesnt override the other, which was happening before
        return roomMetaService.findMetaByTroupeId(fixture.troupe2.id, ['welcomeMessage']);
      })
      .then(function(result) {
        assert.deepEqual(result, {});
      });
  });

  it('should be able to retrieve multiple keys', async () => {
    await roomMetaService.upsertMetaKey(fixture.troupe1.id, 'welcomeMessage', { text: 'hello' });
    await roomMetaService.upsertMetaKey(fixture.troupe1.id, 'threadedConversations', true);

    const result = await roomMetaService.findMetaByTroupeId(fixture.troupe1.id, [
      'welcomeMessage',
      'threadedConversations'
    ]);

    assert.deepStrictEqual(result, {
      welcomeMessage: { text: 'hello' },
      threadedConversations: true
    });
  });
});

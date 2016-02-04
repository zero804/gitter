"use strict";

var Promise = require('bluebird');
var assert = require('assert');
var collapsedChatService = require('../../../server/services/collapsed-chats-service');

describe('collapsed-chats-service', function() {

  var blockTimer = require('../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var USER = 'TESTUSER';
  var ROOM = 'TESTROOM';
  var MAX_ITEMS = 100;

  /**
   * batchAdd() collapses a number of chat messages on redis
   *
   * n      - Number number of messages to add
   * return - Promise
   */
  function batchAdd(n) {
    var seq = []; // sequence of promises
    for (var i = 0; i < n; i++) {
      seq.push(collapsedChatService.update(USER, ROOM, i, true));
    }
    return Promise.all(seq);
  }

  it('should generate correct UserRoom keys', function () {
    assert.equal('col:TESTUSER:TESTROOM', collapsedChatService.getUserRoomKey(USER, ROOM));
  });

  it('should collapse a chat item', function (done) {
    var chatId = 100;
    collapsedChatService.update(USER, ROOM, chatId, true)
      .then(collapsedChatService.getHash.bind(null, USER, ROOM))
      .then(function (chatItems) {
        assert(chatItems[chatId], 'Chat Message ' + chatId +' is not collapsed.');
      })
      .then(collapsedChatService.update.bind(null, USER, ROOM, chatId, false))
      .then(done)
      .catch(done);
  });

  it('should uncollapse chat item', function (done) {
    var chatId = 'DELETETEST2014';
    collapsedChatService.update(USER, ROOM, chatId, true)
      .then(collapsedChatService.update.bind(null, USER, ROOM, chatId, false))
      .then(collapsedChatService.getHash.bind(null, USER, ROOM))
      .then(function (chatItems) {
        assert(!(chatId in chatItems), 'Chat Message ' + chatId +' is still collapsed.');
      })
      .then(done)
      .catch(done);
  });

  it('should have a maximum of ' + MAX_ITEMS + ' items #slow', function (done) {
    var amount = 150; // keep this above 100

    batchAdd(amount)
      .then(collapsedChatService.getHash.bind(null, USER, ROOM))
      .then(function (chatItems) {
        var keys = Object.keys(chatItems);
        var min = Math.min.apply(null, keys);
        var max = Math.max.apply(null, keys);

        assert(min === amount - MAX_ITEMS, 'the oldest message is incorrect');
        assert(max === amount - 1, 'the latest message is incorrect');
        assert(keys.length <= MAX_ITEMS, 'more than ' + MAX_ITEMS + ' items in array');
      })
      .then(done)
      .catch(done);
  });

  it('should remove all chat items #slow', function (done) {
    batchAdd(100)
      .then(collapsedChatService.removeAll.bind(null, USER, ROOM))
      .then(collapsedChatService.getHash.bind(null, USER, ROOM))
      .then(function (chatItems) {
        assert.deepEqual(chatItems, {}, 'set not clear');
      })
      .then(done)
      .catch(done);
  });
});

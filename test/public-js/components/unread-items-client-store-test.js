/*jslint node:true, unused:true*/
/*global describe:true, it:true */

var UnreadItemsStore = require('../../../public/js/components/unread-items-client-store');
var assert = require('assert');

describe('unread-items-client-store', function() {
  it('should add items', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1");
    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
  });

  it('should add multiple items', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1");
    store._unreadItemAdded("2");
    assert.strictEqual(store.length, 2);
    assert.deepEqual(store.getItems(), ["1", "2"]);
    assert.strictEqual(store.getFirstItem(), "1");
  });

  it('should add mentions', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1", true);
    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);
  });

  it('should add unread items which become mentions', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1", false);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), []);

    store._unreadItemAdded("1", true);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);
  });

  it('should add unread items which become unmentions', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1", true);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);


    store._unreadItemAdded("1", false);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), []);
  });

  it('should remove', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1");
    store._unreadItemRemoved("1");

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);

    assert(store.isMarkedAsRead("1"));
  });

  it('should mark an item as read', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1");
    store._markItemRead("1");

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);

    assert(store.isMarkedAsRead("1"));
  });

  it('should handle bulk unreadItemsAdded', function() {
    var store = new UnreadItemsStore();

    store._unreadItemsAdded({ chat: ["1" ] });

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), []);
  });

  it('should handle bulk unreadItemsAdded with mentions', function() {
    var store = new UnreadItemsStore();

    store._unreadItemsAdded({ chat: ["1"], mention: ["1"] });

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);
  });

  it('should handle bulk unreadItemsRemoved', function() {
    var store = new UnreadItemsStore();

    store._unreadItemAdded("1");
    store._unreadItemAdded("2");

    store._unreadItemsRemoved({ chat: ["1"] });

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["2"]);
    assert.deepEqual(store.getMentions(), []);
  });

  it('should handle bulk unreadItemsRemoved with mentions', function() {
    var store = new UnreadItemsStore();

    store._unreadItemAdded("1", true);
    store._unreadItemAdded("2", true);

    store._unreadItemsRemoved({ chat: ["1"], mention: ["1"] });

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["2"]);
    assert.deepEqual(store.getMentions(), ["2"]);
  });

  it('should handle bulk unreadItemsAdded with mention upgrade', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1", false);

    store._unreadItemsAdded({ mention: ["1"] });

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);
  });

  it('should handle bulk unreadItemsRemoved with mention downgrade', function() {
    var store = new UnreadItemsStore();
    store._unreadItemAdded("1", true);

    store._unreadItemsRemoved({ mention: ["1"] });

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), []);

    assert(!store.isMarkedAsRead("1"));
  });


});

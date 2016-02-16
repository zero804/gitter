'use strict';

var UnreadItemsStore = require('../../../public/js/components/unread-items-client-store');
var assert = require('assert');
var sinon = require('sinon');

describe('unread-items-client-store', function() {
  beforeEach(function() {
    this.store = new UnreadItemsStore();
    this.onUnreadItemRemoved = sinon.spy();
    this.onChangeStatus = sinon.spy();
    this.onItemMarkedRead = sinon.spy();
    this.onAdd = sinon.spy();

    this.store.on('unreadItemRemoved', this.onUnreadItemRemoved);
    this.store.on('change:status', this.onChangeStatus);
    this.store.on('itemMarkedRead', this.onItemMarkedRead);
    this.store.on('add', this.onAdd);
  });

  it('should add items', function() {
    var store = this.store;
    store._unreadItemAdded("1", false);
    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);

    assert.strictEqual(1, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", false));
  });

  it('should add multiple items', function() {
    var store = this.store;
    store._unreadItemAdded("1", false);
    store._unreadItemAdded("2", false);
    assert.strictEqual(store.length, 2);
    assert.deepEqual(store.getItems(), ["1", "2"]);
    assert.strictEqual(store.getFirstItem(), "1");

    assert.strictEqual(2, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", false));
    assert(this.onAdd.calledWith("2", false));
  });

  it('should add mentions', function() {
    var store = this.store;
    store._unreadItemAdded("1", true);
    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);

    assert.strictEqual(1, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", true));
  });

  it('should add unread items which become mentions', function() {
    var store = this.store;
    store._unreadItemAdded("1", false);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), []);

    assert.strictEqual(1, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", false));

    store._unreadItemAdded("1", true);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);

    assert.strictEqual(1, this.onAdd.callCount);
    assert.strictEqual(1, this.onChangeStatus.callCount);

    assert(this.onChangeStatus.calledWith("1", true));

  });

  it('should add unread items which become unmentions', function() {
    var store = this.store;
    store._unreadItemAdded("1", true);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);

    assert.strictEqual(1, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", true));

    store._unreadItemAdded("1", false);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), []);

    assert.strictEqual(1, this.onAdd.callCount);
    assert.strictEqual(1, this.onChangeStatus.callCount);
    assert(this.onChangeStatus.calledWith("1", false));
  });

  it('should remove', function() {
    var store = this.store;
    store._unreadItemAdded("1", false);

    assert.strictEqual(1, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", false));

    store._unreadItemRemoved("1");

    assert.strictEqual(1, this.onUnreadItemRemoved.callCount);
    assert(this.onUnreadItemRemoved.calledWith("1"));

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);

    assert.strictEqual(false, store.isMarkedAsRead("1"));
  });

  it('should mark an item as read', function() {
    var store = this.store;
    store._unreadItemAdded("1", false);
    store.markItemRead("1");

    assert.strictEqual(1, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", false));

    assert.strictEqual(1, this.onItemMarkedRead.callCount);
    assert(this.onItemMarkedRead.calledWith("1", false, false));

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);

    assert(store.isMarkedAsRead("1"));
  });

  it('should handle bulk unreadItemsAdded', function() {
    var store = this.store;

    store.add({ chat: ["1" ] });

    assert.strictEqual(1, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", false));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), []);
  });

  it('should handle bulk unreadItemsAdded with mentions', function() {
    var store = this.store;

    store.add({ chat: ["1"], mention: ["1"] });

    assert.strictEqual(1, this.onAdd.callCount);
    assert(this.onAdd.calledWith("1", true));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);
  });

  it('should handle bulk unreadItemsRemoved', function() {
    var store = this.store;

    store._unreadItemAdded("1");
    store._unreadItemAdded("2");

    store.remove({ chat: ["1"] });

    assert.strictEqual(1, this.onUnreadItemRemoved.callCount);
    assert(this.onUnreadItemRemoved.calledWith("1"));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["2"]);
    assert.deepEqual(store.getMentions(), []);

    assert(!store.isMarkedAsRead("1"));
  });

  it('should handle bulk unreadItemsRemoved with mentions', function() {
    var store = this.store;

    store._unreadItemAdded("1", true);
    store._unreadItemAdded("2", true);

    store.remove({ chat: ["1"], mention: ["1"] });

    assert.strictEqual(1, this.onUnreadItemRemoved.callCount);
    assert(this.onUnreadItemRemoved.calledWith("1"));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["2"]);
    assert.deepEqual(store.getMentions(), ["2"]);

    assert(!store.isMarkedAsRead("1"));
  });

  it('should handle bulk unreadItemsAdded with mention upgrade', function() {
    var store = this.store;
    store._unreadItemAdded("1", false);

    store.add({ mention: ["1"] });

    assert.strictEqual(1, this.onChangeStatus.callCount);
    assert(this.onChangeStatus.calledWith("1", true));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), ["1"]);
  });

  it('should handle bulk unreadItemsRemoved with mention downgrade', function() {
    var store = this.store;
    store._unreadItemAdded("1", true);

    store.remove({ mention: ["1"] });

    assert.strictEqual(1, this.onChangeStatus.callCount);
    assert(this.onChangeStatus.calledWith("1", false));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ["1"]);
    assert.deepEqual(store.getMentions(), []);

    assert(!store.isMarkedAsRead("1"));
  });

  it('should handle an item being added after its been marked as read', function() {
    var store = this.store;
    store.markItemRead("1");

    assert.strictEqual(1, this.onItemMarkedRead.callCount);
    assert.strictEqual(0, this.onAdd.callCount);
    assert(this.onItemMarkedRead.calledWith("1", false, false));

    store.add({ chat: ["1"] });

    assert.strictEqual(2, this.onItemMarkedRead.callCount);
    assert.strictEqual(0, this.onAdd.callCount);

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);
    assert.deepEqual(store.getMentions(), []);

    assert(store.isMarkedAsRead("1"));
  });

  it('should handle markAllAsRead', function() {
    var store = this.store;
    store.add({ chat: ["1", "2"], mention: ["1"] });

    store.markAllRead();

    assert.strictEqual(2, this.onItemMarkedRead.callCount);
    assert(this.onItemMarkedRead.calledWith("1", true, false));
    assert(this.onItemMarkedRead.calledWith("2", false, false));

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);
    assert.deepEqual(store.getMentions(), []);

    assert(store.isMarkedAsRead("1"));
    assert(store.isMarkedAsRead("2"));
  });

  it('should handle markAllReadNotification', function() {
    var store = this.store;
    store.add({ chat: ["1", "2"], mention: ["1"] });

    store.markAllReadNotification();

    assert.strictEqual(0, this.onItemMarkedRead.callCount);
    assert.strictEqual(2, this.onUnreadItemRemoved.callCount);
    assert(this.onUnreadItemRemoved.calledWith("1"));
    assert(this.onUnreadItemRemoved.calledWith("2"));

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);
    assert.deepEqual(store.getMentions(), []);

    assert(!store.isMarkedAsRead("1"));
    assert(!store.isMarkedAsRead("2"));
  });


});

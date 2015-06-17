"use strict";
var _ = require('underscore');
var Backbone = require('backbone');

function limit(fn, context, timeout) {
  return _.throttle(fn.bind(context), timeout || 30, { leading: false });
}

function _iteratePreload(incoming, fn, context) {
  var chats = incoming.chat;      // This is done this way to keep protocol compatibility
  var mentions = incoming.mention;

  var items = {};
  if (chats) {
    chats.forEach(function(itemId) {
      items[itemId] = false;
    });
  }
  if (mentions) {
    mentions.forEach(function(itemId) {
      items[itemId] = true;
    });
  }

  Object.keys(items).forEach(function(itemId) {
    var mentioned = items[itemId];
    fn.call(context, itemId, mentioned);
  });

}

var DeletePit = function() {
  this._items = {};
  this._timer = setInterval(this._gc.bind(this), 60000);
};

DeletePit.prototype = {
  add: function(itemId) {
    this._items[itemId] = Date.now();
  },

  remove: function(itemId) {
    delete this._items[itemId];
  },

  contains: function(itemId) {
    return !!this._items[itemId];
  },

  _gc: function() {
    var horizon = Date.now() - 5 * 60 * 1000; // 5 minutes
    var items = this._items;

    Object.keys(items).forEach(function(itemId) {
      if (items[itemId] < horizon) {
        delete items[itemId];
      }
    });
  }
};


// -----------------------------------------------------
// The main component of the unread-items-store
// Events:
// * newcountvalue: (length)
// * unreadItemRemoved: (itemId)
// * change:status: (itemId, mention)
// * itemMarkedRead: (itemId, mention, lurkMode)
// * add (itemId, mention)
// -----------------------------------------------------
var UnreadItemStore = function(appEvents) {
  this.length = 0;
  this._lurkMode = false;
  this._items = {};
  this._read = new DeletePit();
  this._appEvents = appEvents;

  this.notifyCountLimited = limit(this.notifyCount, this, 30);
};

_.extend(UnreadItemStore.prototype, Backbone.Events, {
  _unreadItemAdded: function(itemId, mention) {
    // Three options here:
    // 1 - new item
    // 2 - item exists and has the same mention status as before (nullop)
    // 3 - item exists and has a different mention status to before

    if (!this._items.hasOwnProperty(itemId)) {
      // Case 1: new item
      this._items[itemId] = mention;
      this.length++;
      this.notifyCountLimited();

      if (mention) {
        // Since the item may already have been read BEFORE
        // the user was mentioned, remove the item from
        // the tarpit
        this._read.remove(itemId);
      }

      this.trigger('add', itemId, mention);
    } else {
      if (this._items[itemId] === mention) {
        // Case 2
        return;
      }

      // Case 3
      this._items[itemId] = mention;
      this.trigger('change:status', itemId, mention);
    }
  },

  _unreadItemRemoved: function(itemId) {
    if (!this._items.hasOwnProperty(itemId)) return; // Does not exist

    delete this._items[itemId];
    this.length--;
    this.notifyCountLimited();

    this._read.add(itemId);

    this.trigger('unreadItemRemoved', itemId);
  },

  _mentionRemoved: function(itemId) {
    if (!this._items.hasOwnProperty(itemId)) return; // Does not exist
    this._items[itemId] = false;
    this.notifyCountLimited();
    this.trigger('change:status', itemId, false);
  },

  _markItemRead: function(itemId) {
    var inStore = this._items.hasOwnProperty(itemId);
    var lurkMode = this._lurkMode;

    if (!inStore) {
      /* Special case for lurk mode, still send the itemMarkedAsRead event
       * so that the model gets updated (even though its not actually unread)
       */
      if (lurkMode) {
        this.trigger('itemMarkedRead', itemId, false, true);
      }
      return;
    }

    var mentioned = this._items[itemId];

    delete this._items[itemId];
    this.length--;
    this.notifyCountLimited();

    this._read.add(itemId);

    this.trigger('itemMarkedRead', itemId, mentioned, lurkMode);
  },

  // via Realtime
  _unreadItemsAdded: function(items) {
    _iteratePreload(items, function(itemId, mention) {
      this._unreadItemAdded(itemId, mention);
    }, this);
  },

  // via Realtime
  _unreadItemsRemoved: function(incoming) {
    function hashArray(array) {
      if (!array) return {};

      return array.reduce(function(memo, value) {
        memo[value] = true;
        return memo;
      }, {});
    }

    var chats = hashArray(incoming.chat);
    var mentions = hashArray(incoming.mention);
    var all = _.extend({}, chats, mentions);
    var self = this;
    Object.keys(all).forEach(function(itemId) {
      var removeChat = chats[itemId];

      if (removeChat) {
        self._unreadItemRemoved(itemId);
      } else {
        // remove mention from chat
        self._mentionRemoved(itemId);
      }
    });

  },

  notifyCount: function() {
    this.trigger('newcountvalue', this.length);
  },

  getItems: function() {
    return Object.keys(this._items);
  },

  getMentions: function() {
    return Object.keys(this._items).reduce(function(accum, itemId) {
      if (this._items[itemId]) accum.push(itemId);
      return accum;
    }.bind(this), []);
  },

  enableLurkMode: function() {
    this._lurkMode = true;
    this.markAllReadNotification();
  },

  disableLurkMode: function() {
    this._lurkMode = false;
  },

  markAllReadNotification: function() {
    Object.keys(this._items).forEach(function(itemId) {
      // Notify that all are read
      var mention = this._items[itemId];
      this.trigger('itemMarkedRead', itemId, mention, this._lurkMode);
    }, this);

    this._items = {};
    this.length = 0;
    this.notifyCountLimited();
  },

  getFirstItem: function() {
    return Object.keys(this._items).reduce(function(memo, value) {
      /* min */
      if (memo === null) return value;
      return memo < value ? memo : value;
    }, null);
  }

});

module.exports = UnreadItemStore;

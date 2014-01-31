/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'utils/context',
  './realtime',
  'log!unread-items-frame-client',
  'utils/appevents'
], function(_, context, realtime, log, appEvents) {
  "use strict";

  function limit(fn, context, timeout) {
    return _.debounce(_.bind(fn, context), timeout || 30);
  }

  // -----------------------------------------------------
  // Sync a troupe collection with unread counts (for other troupes)
  // from the server
  // -----------------------------------------------------

  var TroupeCollectionRealtimeSync = function(troupeCollection) {
    this._collection = troupeCollection;
  };


  TroupeCollectionRealtimeSync.prototype = {
    _subscribe: function() {
       var self = this;
       realtime.subscribe('/api/v1/user/' + context.getUserId(), function(message) {
        switch(message.notification) {
          case 'troupe_unread':
            return self._handleIncomingMessage(message);

          case 'troupe_mention':
            return self._handleIncomingMention(message);
        }
      });
    },

    _handleIncomingMessage: function(message) {
      var troupeId = message.troupeId;
      var totalUnreadItems = message.totalUnreadItems;

      var model = this._collection.get(troupeId);
      if(!model) {
        log("Cannot find model. Refresh might be required....");
        return;
      }

      // TroupeCollectionSync keeps track of the values
      // for this troupe, so ignore those values
      model.set('unreadItems', totalUnreadItems);
      if(totalUnreadItems === 0) {
        // If there are no unread items, there can't be unread mentions
        // either
        model.set('mentions', 0);
      }

    },

    _handleIncomingMention: function(message) {
      var troupeId = message.troupeId;
      var mentions = message.mentions;

      var model = this._collection.get(troupeId);
      if(!model) {
        log("Cannot find model. Refresh might be required....");
        return;
      }

      // TroupeCollectionSync keeps track of the values
      // for this troupe, so ignore those values
      model.set('mentions', mentions);
    }
  };

  // -----------------------------------------------------
  // Counts all the unread items in a troupe collection and
  // publishes notifications on changes
  // -----------------------------------------------------

  var TroupeUnreadNotifier = function(troupeCollection) {
    this._collection = troupeCollection;

    this._currentStoreValueChanged = _.bind(this._currentStoreValueChanged, this);
    context.troupe().on('change:id', _.bind(this._recount, this));

    this._recountLimited = limit(this._recount, this, 50);
    this._collection.on('change:unreadItems', this._recountLimited);
    this._collection.on('reset', this._recountLimited);
    this._collection.on('sync', this._recountLimited);
    this._collection.on('add', this._recountLimited);
    this._collection.on('remove', this._recountLimited);
    this._collection.on('destroy', this._recountLimited);

    this._recountLimited();
  };

  TroupeUnreadNotifier.prototype = {
    _currentStoreValueChanged: function() {
      this._recountLimited();
    },

    _recount: function() {
      function count(memo, troupe) {
        var c = troupe.get('unreadItems');
        return memo + (c > 0 ? 1 : 0);
      }

      var c = this._collection;

      var newTroupeUnreadTotal = c.reduce(count, 0);
      var newPplTroupeUnreadTotal = c.filter(function(trp) { return trp.get('oneToOne'); }).reduce(count, 0);
      var newNormalTroupeUnreadTotal = c.filter(function(trp) { return !trp.get('oneToOne'); }).reduce(count, 0);

      var currentUnreadTotal;
      var currentTroupeId = context.getTroupeId();
      if(currentTroupeId) {
        currentUnreadTotal = c.filter(function(trp) { return trp.id === currentTroupeId; }).reduce(count, 0);
      } else {
        currentUnreadTotal = 0;
      }

      var counts = {
        overall: newTroupeUnreadTotal,
        oneToOne: newPplTroupeUnreadTotal,
        normal: newNormalTroupeUnreadTotal,
        current: currentUnreadTotal
      };

      appEvents.trigger('troupeUnreadTotalChange', counts);
    }

  };

  var unreadItemsClient = {

    installTroupeListener: function(troupeCollection) {
      new TroupeCollectionRealtimeSync(troupeCollection)._subscribe();

      /* Store can be optional below */
      new TroupeUnreadNotifier(troupeCollection);
    }

  };

  // Mainly useful for testing
  unreadItemsClient.TroupeCollectionRealtimeSync = TroupeCollectionRealtimeSync;
  unreadItemsClient.TroupeUnreadNotifier = TroupeUnreadNotifier;

  return unreadItemsClient;
});

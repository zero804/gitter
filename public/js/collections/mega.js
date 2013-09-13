/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone',
  'underscore',
  'log!smart-list'
], function(Backbone, _, log) {
  "use strict";

  function isInvite(model) {
    return model && model.constructor.modelType === 'invite';
  }

  function compareString(a, b) {
    a = a ? a.toLowerCase() : '';
    b = b ? b.toLowerCase() : '';

    if(a === b) return 0;
    if(a > b) return 1;
    return -1;
  }

  var MegaCollection = Backbone.Collection.extend({
    initialize: function(models, options) {
      var troupeList = options.troupes;
      var inviteList = options.invites;

      this.sortLimited = _.debounce(function() { log('limited sort'); this.sort(); }.bind(this), 200);

      this.listenTo(troupeList, 'add', this.parentAdd);
      this.listenTo(inviteList, 'add', this.parentAdd);
      this.listenTo(troupeList, 'change:unreadItems change:name change:favourite change:lastAccessTime', this.sortLimited);

    },

    disconnect: function() {
      this.stopListening();
    },

    parentAdd: function(model) {
      this.add(model);
    },

    parentRemove: function(model) {
      this.remove(model);
    },

    comparator: function(a, b) {
      function defaultCompare() {
        return compareString(a.get('name'), b.get('name'));
      }

      if(isInvite(a)) {
        if(isInvite(b)) {
          // Compare invites on name
          return defaultCompare();
        }

        // Invite always comes first
        return -1;
      }

      if(isInvite(b)) {
        return 1;
      }

      // Now it's troupe on troupe comparison time
      if(a.get('unreadItems') > 0) {
        if(b.get('unreadItems') > 0) {
          return defaultCompare();
        }

        // Otherwise the troupe with the unread items wins
        return -1;
      }

      if(b.get('unreadItems') > 0) {
        return 1;
      }

      if(a.get('favourite')) {
        if(b.get('favourite')) {
          return defaultCompare();
        }

        // Otherwise the troupe with the unread items wins
        return -1;
      }

      if(b.get('favourite')) {
        return 1;
      }

      // Otherwise, use the last access time for comparison
      var da = a.get('lastAccessTime');
      var db = b.get('lastAccessTime');
      var ta = da && da.valueOf() || 0;
      var tb = db && db.valueOf() || 0;


      // Use the reverse order
      var c = tb - ta;
      if(!c) {
        return defaultCompare();
      } else {
        return c;
      }
    }
  });

  var LimitedCollection = Backbone.Collection.extend({
    initialize: function(models, options) {
      var collection = options.collection;

      this.underlying = collection;
      this.limit = 20;
      this.comparator = function(item) {
        return item._sortIndex;
      };

      this.listenTo(collection, 'add', this.underlyingAdd);
      this.listenTo(collection, 'remove', this.underlyingRemove);
      this.listenTo(collection, 'reset', this.underlyingReset);
      this.listenTo(collection, 'sort', this.underlyingSort);
    },

    underlyingAdd: function(model, collection) {
      log('underlyingAdd');

      var position = collection.indexOf(model);
      if(position >= this.limit) return;

      model._sortIndex = position;
      this.add(model, { at: position });
      while(this.length >= this.limit) {
        this.pop();
      }
    },

    underlyingRemove: function(model) {
      log('underlyingRemove');

      this.underlyingSort();
      /*
      log('underlyingRemove', arguments);

      if(this.underlying.contains()) {
        this.remove(model);

        // pull whatever is at position n
      }
      */
    },

    underlyingReset: function() {
      log('underlyingReset');

      this.underlyingSort();
      /*
      log('underlyingReset', arguments);

      var items = this.underlying.take(5);
      this.reset(items);
      */
    },

    underlyingSort: function() {
      log('underlyingSort');
      log('Underlying: ', this.underlying.pluck('name'));
      log(' PRESORT: ', this.pluck('name'));

      var newItems = this.underlying.chain().take(this.limit);
      var originalOrder = this.underlying.reduce(function(memo, value, index) {
        memo[value.id] = index;
        return memo;
      }, {});

      var self = this;
      var removals = [];
      self.forEach(function(item) {
        var i = originalOrder[item.id];

        if(i && i >= 0) {
          newItems = newItems.without(item);
          item._sortIndex = i;
        } else {
          removals.push(item);
        }
      });

      // Bulk the operation for performance
      if(removals.length) {
        this.remove(removals);
      }

      newItems.forEach(function(item) {
        var i = originalOrder[item.id];
        item._sortIndex = i;
        self.add(item, { at: i });
      });

      log('ORDER: ', _.pluck(this.models, '_sortIndex'));
      log('ORDER: ', _.pluck(this.models, 'lastAccessTime'));


      self.sort();

      log('POSTSORT: ', _.pluck(this.models, '_sortIndex'));

      log('POSTSORT: ', this.pluck('name'));
    }
  });

  var Collection = LimitedCollection.extend({
    initialize: function(models, options) {
      var troupeList = options.troupes;
      var inviteList = options.invites;

      Collection.__super__.initialize.call(this, null, {
        collection: new MegaCollection([], { troupes: troupeList, invites: inviteList }),
      });
    }
  });


  return Collection;

});

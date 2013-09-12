/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone',
  'underscore'
], function(Backbone, _) {
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

      this.sortLimited = _.debounce(function() { this.sort(); }.bind(this), 20);

      this.listenTo(troupeList, 'add', this.parentAdd);
      this.listenTo(inviteList, 'add', this.parentAdd);
      this.listenTo(troupeList, 'change:unreadItems change:name change:favourite change:lastAccessTime', this.sortLimited);

    },

    disconnect: function() {
      this.stopListening();
    },

    parentAdd: function(model) {
      this.add(model);
      this.sortLimited();
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

      if(b.get('unreadItems')) {
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
      var db = a.get('lastAccessTime');
      var ta = da && da.valueOf() || 0;
      var tb = db && db.valueOf() || 0;

      return - ta - tb;
    }
  });

  return MegaCollection;
});

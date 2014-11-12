"use strict";
var context = require('utils/context');
var Marionette = require('marionette');
var unreadItemsClient = require('components/unread-items-client');
var appEvents = require('utils/appevents');
var dataset = require('utils/dataset-shim');
var behaviourLookup = require('./lookup');

module.exports = (function() {


  var loggedIn = context.isLoggedIn();

  var Behavior = Marionette.Behavior.extend({
    onRender: function() {
      if(!loggedIn) return;

      var model = this.view.model;
      var unreadItemType = this.options.unreadItemType;
      if(!model) return;

      var id = model.get('id') || model.cid;

      var $e = this.$el;
      var e = $e[0];

      $e.addClass('model-id-' + id);

      var unread = model.get('unread');
      var mentioned = model.get('mentioned');

      if(unread) {
        if(unreadItemsClient.hasItemBeenMarkedAsRead(unreadItemType, id)) {
          unread = false;
        }
      }

      $e.toggleClass('mention', mentioned);

      dataset.set(e, 'itemId', id);
      dataset.set(e, 'mentioned', mentioned);
      dataset.set(e, 'itemType', unreadItemType);

      if(unread) {
        $e.addClass('unread');

        appEvents.trigger('unreadItemDisplayed');
      }
    }
  });

  behaviourLookup.register('UnreadItems', Behavior);
  return Behavior;


})();


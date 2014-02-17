/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'components/unread-items-client',
  'utils/appevents'
], function(unreadItemsClient, appEvents) {
  "use strict";

  return {
    onDomRender: function() {
      if(this.model) {
        var id = this.model.get('id');
        if(!id) id = this.model.cid;
        var $e = this.$el;
        var e = this.el;

        $e.addClass('model-id-' + id);

        var unread = this.model.get('unread');
        var mentioned = this.model.get('mentioned');

        if(unread) {
          if(unreadItemsClient.hasItemBeenMarkedAsRead(this.unreadItemType, id)) {
            unread = false;
          }
        }

        $e.toggleClass('mention', mentioned);

        if(unread) {
          $e.addClass('unread');
          e.dataset.itemId = id;
          e.dataset.mentioned = mentioned;
          e.dataset.itemType = this.unreadItemType;
          appEvents.trigger('unreadItemDisplayed');
        }
      }

    }
  };

});

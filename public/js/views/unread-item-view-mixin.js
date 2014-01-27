/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'components/unread-items-client',
  'utils/appevents'
], function(unreadItemsClient, appEvents) {
  "use strict";

  return {
    onDomRender: function() {
      if(this.model && this.unreadItemType) {
        var id = this.model.get('id');
        if(!id) id = this.model.cid;
        var $e = this.$el;

        $e.addClass('model-id-' + id);

        var unread = this.model.get('unread');
        if(unread) {
          if(unreadItemsClient.hasItemBeenMarkedAsRead(this.unreadItemType, id)) {
            unread = false;
          }
        }

        if(unread) {
          $e.addClass('unread');
          $e.data('itemId', id);
          $e.data('itemType', this.unreadItemType);
          appEvents.trigger('unreadItemDisplayed');
        }
      }

    }
  };

});

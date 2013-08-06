/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'components/unread-items-client'
], function($, unreadItemsClient) {
  "use strict";

  return {
    onDomRender: function(dom) {
      if(this.model && this.unreadItemType) {
        var id = this.model.get('id');
        if(!id) id = this.model.cid;

        dom.addClass('model-id-' + id);

        var unread = this.model.get('unread');
        if(unread) {
          if(unreadItemsClient.hasItemBeenMarkedAsRead(this.unreadItemType, id)) {
            unread = false;
          }
        }

        if(unread) {
          dom.addClass('unread');
          dom.data('itemId', id);
          dom.data('itemType', this.unreadItemType);
          $(document).trigger('unreadItemDisplayed');
        }
      }

    }
  };

});

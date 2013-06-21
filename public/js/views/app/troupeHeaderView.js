/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'views/app/userHeaderView',
  'components/unread-items-client',
  'log!troupe-header-view'
  ], function($, _, Backbone, TroupeViews, UserHeaderView, unreadItemsClient, log) {
  "use strict";

  return UserHeaderView.extend({

    initialize: function() {
      var self = this;

      $(document).on('troupeUpdate', function(e, message) {
        // header title
        $('.trpHeaderTitle').html(message.model.name);
        // window / title bar
        self.updateTitlebar(unreadItemsClient.getCounts());
      });

      function onTroupeUnreadTotalChange(event, values) {
        self.updateTitlebar(values);

        function updateBadge(selector, count) {
          var badge = self.$el.find(selector);
          badge.text(count);
          if(count > 0) {
            badge.show();
          } else {
            badge.hide();
          }
        }

        // overall count
        updateBadge('#unread-badge', values.overall);
      }

      $(document).on('troupeUnreadTotalChange', onTroupeUnreadTotalChange);
      onTroupeUnreadTotalChange(null, unreadItemsClient.getCounts());
    },

    getRenderData: function() {
      var tx = window.troupeContext;
      var user = window.troupeContext.user;
      return {
        headerTitle: tx.troupe.name,
        isTroupe: true,
        troupeContext: tx,
        user: user
      };
    },

    toggleFavourite: function() {
      var favHeader = $('.trpHeaderFavourite');
      favHeader.toggleClass('favourited');
      var isFavourite = favHeader.hasClass('favourited');

      $.ajax({
        url: '/troupes/' + window.troupeContext.troupe.id,
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ favourite: isFavourite }),
        success: function() {

        },
        error: function() {

        }
      });

      window.troupeContext.troupe.favourite = isFavourite;
      var troupe = collections.troupes.get(window.troupeContext.troupe.id);
      troupe.set('favourite', isFavourite);
    },

    updateTitlebar: function(values) {
      $('title').html(this.getTitlebar(values));
    },

    getTitlebar: function(counts) {
      var mainTitle;
      if (window.troupeContext.title) {
        mainTitle = window.troupeContext.title + " - Troupe";
      } else
      {
        mainTitle = "Troupe";
      }

      // TODO this isn't working properly when updating the troupe name, need to be able to poll unreadItems count not just accept the event
      var overall = counts.overall;
      var current = counts.current;
      if(overall <= 0) {
        return mainTitle;
      }

      if(overall <= 10) {
        if(current > 0) {
          return String.fromCharCode(0x2789 + overall) + ' ' + mainTitle;
        }

        return String.fromCharCode(0x277F + overall) + ' ' + mainTitle;
      }

      return '[' + overall + '] ' + window.troupeContext.title + " - Troupe";
    }

  });

});
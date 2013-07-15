/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  "views/base",
  "hbs!./tmpl/appHeader",
  'collections/instances/troupes',
  'utils/context',
  'components/unread-items-client'
  ], function($, TroupeViews, appHeaderTemplate, trpCollections, context, unreadItemsClient) {
  "use strict";

  return TroupeViews.Base.extend({
    template: appHeaderTemplate,

    initialize: function() {
      var self = this;

      trpCollections.troupes.on('change', function(model) {
        if (model.id == context.getTroupeId()) {
          // header title
          $('.trpHeaderTitle').html(model.get('name'));
          // window / title bar
          self.updateTitlebar(unreadItemsClient.getCounts());
        }
      });

      function onTroupeUnreadTotalChange(event, values) {
        self.updateTitlebar(values);

        function updateBadge(selector, count) {
          var badge = $(selector);
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
      var user = window.troupeContext.user;
      return {
        headerTitle: user.displayName,
        isTroupe: false,
        troupeContext: window.troupeContext,
        user: user
      };
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
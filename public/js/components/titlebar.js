/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'components/unread-items-client',
  'utils/context'
], function($, unreadItemsClient, context) {
  "use strict";

    function TitlebarUpdater () {
        var self = this;

        context.troupe().on('change:name', function() {
          self.updateTitlebar(unreadItemsClient.getCounts());
        });

        function onTroupeUnreadTotalChange(event, values) {
            self.updateTitlebar(values);

            function updateBadge(selector, count) {
              var badge = $(selector);
              badge.text(count);
              if(count > 0) {
                // badge.show();
                $("#favicon").attr("href","/images/2/gitter/favicon4-unread.png");
              } else {
                // badge.hide();
                $("#favicon").attr("href","/images/2/gitter/favicon4.png");
              }
            }

            // overall count
            updateBadge('.unread-count', values.overall);
        }

        $(document).on('troupeUnreadTotalChange', onTroupeUnreadTotalChange);
        onTroupeUnreadTotalChange(null, unreadItemsClient.getCounts());

    }

    TitlebarUpdater.prototype.updateTitlebar = function(values) {
      document.title = this.getTitlebar(values);
    };

    TitlebarUpdater.prototype.getTitlebar = function(counts) {
      var mainTitle;
      var name = context.troupe().get('name');
      if (name) {
        mainTitle = name + " - Troupe";
      } else {
        mainTitle = "Gitter";
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

      return '[' + overall + '] ' + mainTitle;
    };

    return TitlebarUpdater;
});
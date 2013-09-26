/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'components/unread-items-client',
  'collections/instances/troupes',
  'utils/context'
], function($, unreadItemsClient, trpCollections, context) {
  "use strict";

    function TitlebarUpdater () {
        var self = this;

        trpCollections.troupes.on('change:name', function(model) {
            if (model.id == context.getTroupeId()) {
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

    }

    TitlebarUpdater.prototype.updateTitlebar = function(values) {
      document.title = this.getTitlebar(values);
    };

    TitlebarUpdater.prototype.getTitlebar = function(counts) {
      var mainTitle;
      if (context.getTroupe() && context.getTroupe().name) {
        mainTitle = context.getTroupe().name + " - Troupe";
      } else {
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

      return '[' + overall + '] ' + mainTitle;
    };

    return TitlebarUpdater;
});
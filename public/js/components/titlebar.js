/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/appevents'
], function($, appEvents) {
  "use strict";

    function TitlebarUpdater () {
        var self = this;

        function onTroupeUnreadTotalChange(values) {
          self._counts = values;
          self.updateTitlebar(null, values);

          function updateBadge(selector, count) {
            var badge = $(selector);
            badge.text(count);
            if(count > 0) {
              // badge.show();
              $("#favicon").attr("href","/images/2/gitter/favicon5-unread.png");
            } else {
              // badge.hide();
              $("#favicon").attr("href","/images/2/gitter/favicon5.png");
            }
          }

          // overall count
          updateBadge('.unread-count', values.overall);
        }

        appEvents.on('troupeUnreadTotalChange', onTroupeUnreadTotalChange);

    }

    TitlebarUpdater.prototype.updateTitlebar = function(name, values) {
      if(!name) {
        name = this.name;
      } else {
        this.name = name;
      }

      if(!values) {
        values = this._counts;
      }

      var title = this.getTitlebar(name, values);
      document.title = title;
    };

    TitlebarUpdater.prototype.getTitlebar = function(name, counts) {
      var mainTitle;
      if (name) {
        mainTitle = name + " - Gitter";
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
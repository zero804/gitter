/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/appevents'
], function($, appEvents) {
  "use strict";

  function updateLeftMenuBadge(unreadCount) {
    $('.unread-count').text(unreadCount);
  }

  function updateFavicon(unreadCount) {
    var image = (unreadCount > 0) ? '/images/2/gitter/favicon5-unread.png' : '/images/2/gitter/favicon5.png';
    $('#favicon').attr('href', image);
  }

  // ➀,➁,➂,➃,➄,➅,➆,➇,➈,➉,[11],[12]...
  function getClearCircleNumber(number) {
    if(number > 0 && number <= 10) {
      return String.fromCharCode(0x277F + number);
    } else {
      return '['+number+']';
    }
  }

  // ➊,➋,➌,➍,➎,➏,➐,➑,➒,➓,[11],[12]...
  function getSolidCircleNumber(number) {
    if(number > 0 && number <= 10) {
      return String.fromCharCode(0x2789 + number);
    } else {
      return '['+number+']';
    }
  }

  function TitlebarUpdater() {
    var self = this;

    appEvents.on('troupeUnreadTotalChange', function(values) {
      self._counts = values;
      self.updateTitlebar(null, values);

      var unreadCount = values.overall;
      updateLeftMenuBadge(unreadCount);
      updateFavicon(unreadCount);
    });
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

    if(current > 0) {
      return getSolidCircleNumber(overall) + ' ' + mainTitle;
    } else {
      return getClearCircleNumber(overall) + ' ' + mainTitle;
    }
  };

  return TitlebarUpdater;
});
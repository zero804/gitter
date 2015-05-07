"use strict";
var Marionette = require('backbone.marionette');
var moment = require('moment');
var context = require('utils/context');
var locale = require('utils/locale');
var widgets = require('views/behaviors/widgets');
require('views/behaviors/tooltip');

module.exports = (function() {

  var lang = context.lang();

  var TimeagoWidget = Marionette.ItemView.extend({
    tagName: 'span',
    template: false,
    behaviors: {
      Tooltip: {
        '': { titleFn: 'getTooltip', positionFn: 'getTooltipPosition', html: true },
      }
    },
    initialize: function(options) {
      this.time = moment(options.time);
      this.compact = options.compact;
      this.position = options.position || "top";
      this.tooltipFormat = options.tooltipFormat || 'LLL';

      this.calculateNextTimeout();
    },

    /** XXX TODO NB: change this to onDestroy once we've moved to Marionette 2!!!! */
    onClose: function() {
      clearTimeout(this.timer);
    },

    getTooltip: function() {
      return this.time.format(this.tooltipFormat, { lang: lang });
    },

    getTooltipPosition: function() {
      return this.position;
    },

    calculateNextTimeout: function() {
      var duration = Math.floor((Date.now() - this.time.valueOf()) / 1000);

      var secondsToRefresh;

      if(duration >= 86400) {
        /* No more updates needed */
        delete this.timer;
        return;
      } else if(duration >= 3600 /* More than an hour */) {
        secondsToRefresh = 3600 - duration % 3600;
      } else {
        secondsToRefresh = 60 - duration % 60;
      }

      if(secondsToRefresh < 1) secondsToRefresh = 1;

      this.timer = window.setTimeout(this.rerenderOnTimeout.bind(this), secondsToRefresh * 1000);
    },

    rerenderOnTimeout: function() {
      this.calculateNextTimeout();
      this.render();
    },

    render: function() {
      var duration = Date.now() - this.time.valueOf();

      var v;
      if(duration >= 86400000 /* One day */) {
        v = this.compact ? this.time.format("MMM DD", { lang: lang }) : this.time.format("LL", { lang: lang });
      } else {
        var momentDuration = moment.duration(duration);

        v = this.compact ? this.time.format("H:mm", { lang: lang }) : locale("%s ago", momentDuration.humanize());
      }

      var fullTime = this.time.format("LLL", { lang: lang });
      this.el.innerText = v;
      this.el.setAttribute('title', fullTime);

      this.triggerMethod("render", this);
    },

  });

  widgets.register({ timeago: TimeagoWidget });

  return TimeagoWidget;


})();

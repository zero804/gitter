"use strict";
var Marionette = require('backbone.marionette');
var moment = require('moment');
var context = require('utils/context');
var widgets = require('views/behaviors/widgets');
var FastAttachMixin = require('views/fast-attach-mixin');
var timeFormat = require('gitter-web-shared/time/time-format');

require('views/behaviors/tooltip');

var ONEDAY = 86400000;

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
      this.time = moment(options.time).locale(lang);
      this.compact = options.compact;
      this.position = options.position || "top";
      this.tooltipFormat = options.tooltipFormat || 'LLL';

      this.calculateNextTimeout();
    },

    onDestroy: function() {
      clearTimeout(this.timer);
    },

    getTooltip: function() {
      return this.time.locale(lang).format(this.tooltipFormat);
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
      this.el.textContent = timeFormat(this.time, { compact: this.compact });

      var longFormat = this.time.format("LLL");
      this.el.setAttribute('title', longFormat);

      this.triggerMethod("render", this);
    },

    attachElContent: FastAttachMixin.attachElContent
  });

  TimeagoWidget.getPrerendered = function(model, id) { // jshint unused:true
    return "<span class='widget' data-widget-id='" + id + "'></span>";
  };

  widgets.register({ timeago: TimeagoWidget });

  return TimeagoWidget;


})();

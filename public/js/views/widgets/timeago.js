"use strict";
var Marionette = require('marionette');
var moment = require('moment');
var context = require('utils/context');
var locale = require('utils/locale');
var widgets = require('views/behaviors/widgets');

module.exports = (function() {

  var maxDaysBeforeDateDisplay = 1;

  var lang = context.lang();

  var TimeagoWidget = Marionette.ItemView.extend({
    tagName: 'span',
    initialize: function(options) {
      this.time = moment(options.time);
      this.compact = options.compact;
      this.position = options.position || "top";
      this.tooltipFormat = options.tooltipFormat || 'LLL';
      var self = this;

      function rerenderOnTimeout() {

        var duration = moment.duration(Date.now() - self.time.valueOf());
        self.render(duration);

        var timeToNextRefresh;

        if(duration.asDays() >= 1 && duration.asDays() < maxDaysBeforeDateDisplay) {
          var days = duration.asHours();
          var partDays = 1 - (days - Math.floor(days));
          timeToNextRefresh = Math.round(24 * 60 * 60 * partDays + 1) * 1000;
        } else if(duration.asHours() >= 1) {
          var hours = duration.asHours();
          var partHours = 1 - (hours - Math.floor(hours));
          timeToNextRefresh = Math.round(60 * 60 * partHours + 1) * 1000;
        } else {
          var minutes = duration.asMinutes();
          var partMinutes = 1 - (minutes - Math.floor(minutes));

          timeToNextRefresh = Math.round(60 * partMinutes + 1) * 1000;
        }

        if(timeToNextRefresh < 100) timeToNextRefresh = 1000;

        self.timer = window.setTimeout(rerenderOnTimeout, timeToNextRefresh);
      }

      rerenderOnTimeout();
    },

    /** XXX TODO NB: change this to onDestroy once we've moved to Marionette 2!!!! */
    onClose: function() {
      clearTimeout(this.timer);
      this.removeTooltip();
    },

    render: function(duration) {
      if(!duration) duration = moment.duration(Date.now() - this.time.valueOf());

      var v;
      if(duration.asDays() >= maxDaysBeforeDateDisplay) {
        v = this.compact ? this.time.format("MMM DD", { lang: lang }) : this.time.format("LL", { lang: lang });
      } else {

        v = this.compact ? this.time.format("H:mm", { lang: lang }) : locale("%s ago", duration.humanize());
      }

      var fullTime = this.time.format(this.tooltipFormat, { lang: lang });
      this.el.innerText = v;
      this.el.setAttribute('title', fullTime);

      if (!window._troupeCompactView) {
        /* Lazy setup the tooltip on mouseover. This means a much faster render (~20%)*/
        this.setupTooltip();
      }
    },

    setupTooltip: function() {
      if (this.ttSetup) return;
      if (this.waitMouseOver) return;

      var self = this;
      this.waitMouseOver = {
        handleEvent: function() {
          self.ttSetup = true;
          self.el.removeEventListener('mouseover', self.waitMouseOver, false);
          delete this.waitMouseOver;

          self.$el.tooltip({ container: 'body', placement: this.position, html: true });
          self.$el.tooltip('show');
        }
      };

      this.el.addEventListener('mouseover', this.waitMouseOver, false);
    },

    removeTooltip: function() {
      if (this.ttSetup) {
        this.$el.tooltip('destroy');
        delete this.ttSetup;
      }

      if (this.waitMouseOver) {
        this.el.removeEventListener('mouseover', this.waitMouseOver, false);
        delete this.waitMouseOver;
      }
    }

  });

  widgets.register({ timeago: TimeagoWidget });

  return TimeagoWidget;


})();

define([
  'views/base',
  'utils/momentWrapper',
  'utils/context',
  'utils/locale'
], function(TroupeViews, moment, context, locale) {
  /*jslint browser: true*/
  "use strict";

  var maxDaysBeforeDateDisplay = 1;

  var lang = context.lang();

  return TroupeViews.Base.extend({
    tagName: 'span',
    initialize: function(options) {
      this.time = moment(options.time);
      this.compact = options.compact;
      this.position = options.position || "top";

      var self = this;

      function rerender() {

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

        window.setTimeout(rerender, timeToNextRefresh);
      }

      rerender();
    },

    render: function(duration) {
      this.$el.find('[title]').tooltip('destroy');
      if(!duration) duration = moment.duration(Date.now() - this.time.valueOf());

      var v;
      if(duration.asDays() >= maxDaysBeforeDateDisplay) {
        v = this.compact ? this.time.format("MMM DD", { lang: lang }) : this.time.format("LL", { lang: lang });
      } else {

        v = this.compact ? this.time.format("H:mm", { lang: lang }) : locale("%s ago", duration.humanize());
      }

      var fullTime = this.time.format("LLL", { lang: lang });
      this.$el.html("<span title='" + fullTime + "'>" + v + "</span>");
      if (!window._troupeCompactView) {
        this.$el.find('[title]').tooltip({ container: 'body', placement: this.position });
      }
    }

  });

});

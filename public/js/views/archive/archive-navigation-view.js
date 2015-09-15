'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var moment = require('moment');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var template = require('./tmpl/archive-navigation-view.hbs');
var CalHeatMap = require('cal-heatmap');
var getTimezoneInfo = require('utils/detect-timezone');

module.exports = (function() {

  var language = context.lang();

  return Marionette.ItemView.extend({
    ui: {
      navigation: '#archive-navigation'
    },
    template: template,
    serializeData: function() {
      var uri = context.troupe().get('uri');

      var p = this.options.previousDate && moment(this.options.previousDate).utc();
      var n = this.options.nextDate && moment(this.options.nextDate).utc();

      var archiveDate = moment(this.options.archiveDate).utc().locale(language);

      var ordinalDate = archiveDate.format('Do');
      var numericDate = archiveDate.format('D');

      var ordinalPart;
      if(ordinalDate.indexOf('' + numericDate) === 0) {
        ordinalPart = ordinalDate.substring(('' + numericDate).length);
      } else {
        ordinalPart = '';
      }
      var monthYearFormatted = archiveDate.format('MMMM YYYY');

      return {
        previousDate: p && p.locale(language).format('Do MMM YYYY'),
        dayName: numericDate,
        dayOrdinal: ordinalPart,
        previousDateLink: p && '/' + uri + '/archives/' + p.format('YYYY/MM/DD'),
        nextDate: n && n.locale(language).format('Do MMM YYYY'),
        nextDateLink: n && '/' + uri + '/archives/' + n.format('YYYY/MM/DD'),
        monthYearFormatted: monthYearFormatted
      };
    },

    onRender: function() {
      var a = moment(this.options.archiveDate).utc();
      // Get the date **in the local timezone** so that the highlighted
      // date does not display incorrectly for west-of-the-meridian locations
      var highlightDate = new Date(a.year(), a.month(), a.date());

      var range = 3;

      // if the first day of the next month is in the future, subtract one from range
      var next = moment(new Date(a.year(), a.month(), 1)).add(1, 'months');
      if (next > moment()) {
        range = 2;
      }

      // start and end is only for elasticsearch, so fine if it is outside of
      // the range we're going to display. In fact we deliberately add a day on
      // each end just in case for timezones
      var start = moment(a).subtract(32, 'days');
      var end = moment(a).add(32, 'days');
      var startIso = start.toISOString()
      var endIso = end.toISOString()
      var troupeId = context.getTroupeId();
      var tz = getTimezoneInfo().iso;
      var heatmapURL = '/chat-heatmap/' + troupeId + '?start=' + startIso + '&end='+ endIso + '&tz=' + tz;

      function mangleHeatmap() {
        var $rects = $('.graph-rect').not('.q1,.q2,.q3,.q4,.q5');
        $rects.each(function(i, el) {
          el.classList.remove('hover_cursor');
          el.classList.add('empty');
        });
      }

      var cal = new CalHeatMap();
      cal.init({
        itemSelector: this.ui.navigation[0],
        start: start.toDate(),
        maxDate: new Date(),
        highlight: [highlightDate],
        minDate: new Date(2013, 10, 1), // 1 November 2013
        range: range,
        domain: "month",
        subDomain: "day",
        verticalOrientation: false,
        considerMissingDataAsZero: false,
        displayLegend: false,
        data: {},
        onClick: function(date, value) {
          if(!value) return;
          var yyyy = date.getFullYear();
          var mm = date.getMonth() + 1;
          if(mm < 10) mm = "0" + mm;

          var dd = date.getDate();
          if(dd < 10) dd = "0" + dd;

          window.location.assign('/' + context.troupe().get('uri') + '/archives/' + yyyy + '/' + mm + '/' + dd + '?tz=' + tz);
        },
        onComplete: function() {
          mangleHeatmap();
        }
      });
      apiClient.priv.get(heatmapURL)
        .then(function(heatmapData) {
          cal.update(heatmapData);
          mangleHeatmap();
        });
    }
  });


})();

/* jshint unused:true, browser:true,  strict:true *//* global define:false */
define([
  'marionette',
  'utils/momentWrapper',
  'utils/context',
  'hbs!./tmpl/archive-navigation-view',
  'cal-heatmap'
], function(Marionette, moment, context, template, CalHeatMap) {
  'use strict';

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

      var archiveDate = moment(this.options.archiveDate);

      var ordinalDate = archiveDate.format('Do', { lang: language });
      var numericDate = archiveDate.format('D', { lang: language });

      var ordinalPart;
      if(ordinalDate.indexOf('' + numericDate) === 0) {
        ordinalPart = ordinalDate.substring(('' + numericDate).length);
      } else {
        ordinalPart = '';
      }
      var monthYearFormatted = archiveDate.format('MMMM YYYY', { lang: language });

      return {
        previousDate: p && p.format('Do MMM YYYY', { lang: language }),
        dayName: numericDate,
        dayOrdinal: ordinalPart,
        previousDateLink: p && '/' + uri + '/archives/' + p.format('YYYY/MM/DD', { lang: 'en' }),
        nextDate: n && n.format('Do MMM YYYY', { lang: language }),
        nextDateLink: n && '/' + uri + '/archives/' + n.format('YYYY/MM/DD', { lang: 'en' }),
        monthYearFormatted: monthYearFormatted
      };
    },

    onRender: function() {
      var a = this.options.archiveDate && moment(this.options.archiveDate).utc();
      var v = a.diff(new Date());
      var range = 3;
      if(moment.duration(v).asMonths() < 1) {
        range = 3;
      }

      var start = moment(a).subtract('months', 1);
      var troupeId = context.getTroupeId();

      var cal = new CalHeatMap();
      cal.init({
        itemSelector: this.ui.navigation[0],
        start: start.toDate(),
        maxDate: new Date(),
        highlight: [new Date(this.options.archiveDate)],
        minDate: new Date(2013, 10, 1), // 1 November 2013
        range: range,
        domain: "month",
        subDomain: "day",
        verticalOrientation: false,
        considerMissingDataAsZero: false,
        displayLegend: false,
        data: '/api/private/chat-heatmap/' + troupeId + '?start={{d:start}}&end={{d:end}}',
        onClick: function(date, value) {
          if(!value) return;
          var yyyy = date.getFullYear();
          var mm = date.getMonth() + 1;
          if(mm < 10) mm = "0" + mm;

          var dd = date.getDate();
          if(dd < 10) dd = "0" + dd;

          window.location.assign('/' + context.troupe().get('uri') + '/archives/' + yyyy + '/' + mm + '/' + dd);
        }
      });
    }
  });

});

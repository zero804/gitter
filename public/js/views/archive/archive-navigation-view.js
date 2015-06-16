'use strict';

var Marionette = require('backbone.marionette');
var moment = require('moment');
var context = require('utils/context');
var template = require('./tmpl/archive-navigation-view.hbs');
var CalHeatMap = require('cal-heatmap');

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

      var archiveDate = moment(this.options.archiveDate).locale(language);

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


})();

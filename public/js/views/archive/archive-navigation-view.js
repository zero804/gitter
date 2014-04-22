/* jshint unused:true, browser:true,  strict:true *//* global define:false */
define([
  'marionette',
  'utils/momentWrapper',
  'utils/context',
  'hbs!./tmpl/archive-navigation-view'
], function(Marionette, moment, context, template) {
  'use strict';

  return Marionette.ItemView.extend({
    ui: {
      navigation: '#archive-navigation'
    },
    template: template,
    serializeData: function() {
      var uri = context.troupe().get('uri');

      var p = this.options.previousDate && moment(this.options.previousDate).utc();
      var n = this.options.nextDate && moment(this.options.nextDate).utc();

      return {
        previousDate: p && p.format('L'),
        previousDateLink: p && '/' + uri + '/archives/' + p.format('YYYY/MM/DD'),
        nextDate: n && n.format('L'),
        nextDateLink: n && '/' + uri + '/archives/' + n.format('YYYY/MM/DD')
      };
    },

    onRender: function() {
      var a = this.options.archiveDate && moment(this.options.archiveDate).utc();

      var start = moment(a).subtract('months', 1);

      var cal = new CalHeatMap();
      cal.init({
        itemSelector: this.ui.navigation[0],
        start: start.toDate(),
        maxDate: new Date(),
        minDate: new Date(2013, 10, 1), // 1 November 2013
        range: 3,
        domain: "month",
        subDomain: "day",
        considerMissingDataAsZero: false,
        data: '/api/private/chat-heatmap/' + troupeId + '?start={{d:start}}&end={{d:end}}',
        onClick: function(date) {
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
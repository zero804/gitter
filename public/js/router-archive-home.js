require([
  'jquery',
  'utils/context',
  'views/app/headerView',
  'components/apiClient',
  'cal-heatmap',

  'views/widgets/preload',      // No ref
  'filtered-collection',        // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/bug-reporting'    // No ref
], function($, context, HeaderView, apiClient, CalHeatMap) {
  "use strict";

  $(document).on("click", "a", function(e) {
    if(this.href) {
      var href = $(this).attr('href');
      if(href.indexOf('#') === 0) {
        e.preventDefault();
        window.location = href;
      }
    }

    return true;
  });

  $('#noindex').on("change", function() {
    var noindex = $('#noindex')[0].checked;

    apiClient.room.put('', { noindex: !noindex })
      .then(function() {
        var msg = 'Room indexing disabled. The change will take effect the next time a search engine crawls this room.';
        $('#noindexStatus').html(!noindex ? msg : '');
      })
      .fail(function() {
        $('#noindexStatus').html('Oops, something went wrong. Reload and try again.');
      });
  });


  // When a user clicks an internal link, prevent it from opening in a new window
  $(document).on("click", "a.link", function(e) {
    var basePath = context.env('basePath');
    var href = e.target.getAttribute('href');
    if(!href || href.indexOf(basePath) !== 0) {
      return;
    }

    e.preventDefault();
    window.parent.location.href = href;
  });

  new HeaderView({ model: context.troupe(), el: '#header' });

  // var Router = Backbone.Router.extend({
  //   routes: {
  //     // TODO: get rid of the pipes
  //     "": "hideModal",
  //   },

  //   hideModal: function() {
  //     appView.dialogRegion.close();
  //   },

  // });

  var troupeId = context.getTroupeId();


  var cal = new CalHeatMap();

  var today = new Date();
  var elevenFullMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  var gitterLaunchDate = new Date(2013, 10, 1); // 1 November 2013

  cal.init({
    start: elevenFullMonthsAgo, // eleven months + this partial month = 12 blocks shown
    maxDate: today,
    minDate: gitterLaunchDate,
    range: 12,
    domain: "month",
    subDomain: "day",
    considerMissingDataAsZero: false,
    displayLegend: false,
    data: apiClient.priv.url('/chat-heatmap/' + troupeId + '?start={{d:start}}&end={{d:end}}'),
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

  // new Router();

  // Backbone.history.start();
});

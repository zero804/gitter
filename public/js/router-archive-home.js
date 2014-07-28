require([
  'jquery',
  'backbone',
  'utils/context',
  'views/app/chatIntegratedView',
  'views/app/headerView',
  'cal-heatmap',

  'views/widgets/preload',      // No ref
  'filtered-collection',        // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/bug-reporting',   // No ref
  'components/csrf',            // No ref
  'components/ajax-errors'      // No ref

], function($, Backbone, context,
    ChatIntegratedView,
    HeaderView, CalHeatMap) {
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
    $.ajax({
      type: 'PUT',
      url: '/api/v1/rooms/' + context.troupe().id,
      data: {
        noindex: !noindex
      },
      success: function() {
        var msg = 'Room indexing disabled. The change will take effect the next time a search engine crawls this room.';
        $('#noindexStatus').html(!noindex ? msg : '');
      },
      error: function() {
        $('#noindexStatus').html('Oops, something went wrong. Reload and try again.');
      }
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

  var appView = new ChatIntegratedView({ el: 'body' });

  new HeaderView({ model: context.troupe(), el: '#header' });

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "": "hideModal",
    },

    hideModal: function() {
      appView.dialogRegion.close();
    },

  });

  var troupeId = context.getTroupeId();


  var cal = new CalHeatMap();
  cal.init({
    start: new Date(Date.now() - 340 * 86400 * 1000),
    maxDate: new Date(),
    minDate: new Date(2013, 10, 1), // 1 November 2013
    range: 12,
    domain: "month",
    subDomain: "day",
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

  new Router();

  Backbone.history.start();
});

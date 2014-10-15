require([
  'jquery',
  'backbone',
  'utils/context',
  'views/app/chatIntegratedView',
  'views/app/headerView',
  'views/archive/archive-navigation-view',

  'views/widgets/preload',      // No ref
  'filtered-collection',        // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/bug-reporting'    // No ref

], function($, Backbone, context,
    ChatIntegratedView,
    HeaderView, ArchiveNavigationView) {
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

  var archiveContext = context().archive;

  new ArchiveNavigationView({
    el: '#archive-navigation',
    archiveDate: archiveContext.archiveDate,
    nextDate: archiveContext.nextDate,
    previousDate: archiveContext.previousDate
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "": "hideModal",
    },

    hideModal: function() {
      appView.dialogRegion.close();
    },

  });

  new Router();

  Backbone.history.start();
});

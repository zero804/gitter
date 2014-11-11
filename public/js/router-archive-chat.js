require([
  'jquery',
  'backbone',
  'utils/context',
  'views/app/chatNliIntegratedView',
  'views/app/headerView',
  'views/archive/archive-navigation-view',

  'views/widgets/preload',      // No ref
  'filtered-collection',        // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/bug-reporting'    // No ref

], function($, Backbone, context,
    ChatNliIntegratedView,
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

  // var appView = new ChatNliIntegratedView({ el: 'body' });

  new HeaderView({ model: context.troupe(), el: '#header' });

  var archiveContext = context().archive;

  new ArchiveNavigationView({
    el: '#archive-navigation',
    archiveDate: archiveContext.archiveDate,
    nextDate: archiveContext.nextDate,
    previousDate: archiveContext.previousDate
  }).render();

  // Adjust header manually: #nasty
  var size = $('#header-wrapper').height() + 15 + 'px';
  var ss = document.styleSheets[2];
  try {
    if (ss.insertRule) {
      ss.insertRule('.trpChatContainer > div:first-child { padding-top: ' + size + ' }', ss.cssRules.length);
    } else if (ss.addRule) {
      ss.addRule('.trpChatContainer > div:first-child', 'padding-top:' + size);
    }
  } catch (err) {
    // TODO: Handle the error? WC.
  }


  // var Router = Backbone.Router.extend({
  //   routes: {
  //     // TODO: get rid of the pipes
  //     "": "hideModal",
  //   },

  //   hideModal: function() {
  //     appView.dialogRegion.close();
  //   },

  // });

  // new Router();

  Backbone.history.start();
});

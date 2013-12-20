/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'marionette',
  'views/base',
  'backbone',
  'require',
  'views/widgets/avatar',
  'components/eyeballs',              // No ref
  'components/unread-items-client',   // No ref
  'template/helpers/all'              // No ref
], function($, Marionette, TroupeViews, Backbone, require, AvatarWidget /*, mobileContext, eyeballsClient, unreadItemsClient */) {
  "use strict";

  var MobileLayout = Marionette.Layout.extend({
    el: 'body',
    regions: {
      primary: "#primary-view"
    }
  });

  return Backbone.Router.extend({
    initialize: function() {

      this.layout = new MobileLayout();

      TroupeViews.preloadWidgets({
        avatar: AvatarWidget
      });

      $('.trpMobileAmuseIcon').click(function() {
        window.location.reload(true);
      });

      // prompt response to requests
      // if (!context.inOneToOneTroupeContext()) {
      //   var requests = new requestModels.RequestCollection();
      //   requests.on('all', promptRequest);
      //   requests.listen();
      // }

      // function promptRequest() {
      //   if (requests.length > 0) {
      //     requests.off('all', promptRequest); // nb must unsubscribe to avoid loop when saving request model.

      //     (new RequestResponseModal({ model: requests.at(0) })).show();
      //   }
      // }

      // Asynchronously load tracker
      require([
        'utils/tracking'
      ], function() {
        // No need to do anything here
      });
    },

    show: function(regionName, view) {
      var c = view.collection, self = this;
      if (c && c.hasLoaded && !c.hasLoaded()) {
        // delay showing the view until the collection is loaded.
        c.once('sync reset', function() {
          self.layout[regionName].show(view);
        });

        return;
      }

      self.layout[regionName].show(view);
    }

  });
});

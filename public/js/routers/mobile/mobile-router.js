/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'backbone',
  'utils/context',
  'require',
  'collections/requests',
  'views/widgets/avatar',
  'views/request/requestDialog',
  'components/eyeballs',              // No ref
  'components/unread-items-client',   // No ref
  'template/helpers/all'              // No ref
], function($, TroupeViews, Backbone, context, require, requestModels, AvatarWidget, RequestResponseModal /*, mobileContext, eyeballsClient, unreadItemsClient */) {
  "use strict";

  return Backbone.Router.extend({
    initialize: function() {

      TroupeViews.preloadWidgets({
        avatar: AvatarWidget
      });

      $('.trpMobileAmuseIcon').click(function() {
        document.location.reload(true);
      });

      // prompt response to requests
      if (!context.inOneToOneTroupeContext()) {
        var requests = new requestModels.RequestCollection();
        requests.on('all', promptRequest);
        requests.listen();
      }

      function promptRequest() {
        if (requests.length > 0) {
          requests.off('all', promptRequest); // nb must unsubscribe to avoid loop when saving request model.

          (new RequestResponseModal({ model: requests.at(0) })).show();
        }
      }

      // Asynchronously load tracker
      require([
        'utils/tracking'
      ], function() {
        // No need to do anything here
      });
    }
  });
});

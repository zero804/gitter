/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false, require:false */
define([
  'jquery',
  'base-router',
  'views/base',
  'utils/context',
  'collections/requests',
  'views/widgets/avatar',
  'views/request/requestDialog',
  'components/mobile-context',        // No ref
  'components/eyeballs',              // No ref
  'components/unread-items-client',   // No ref
  'template/helpers/all'              // No ref
], function($, BaseRouter, TroupeViews, context, requestModels, AvatarWidget, RequestResponseModal /*, mobileContext, eyeballsClient, unreadItemsClient */) {
  "use strict";

  return BaseRouter.extend({
    initialize: function() {

      TroupeViews.preloadWidgets({
        avatar: AvatarWidget
      });

      $('.trpMobileAmuseIcon').click(function() {
        document.location.reload(true);
      });

      // prompt response to requests
      if (!context.getTroupe().oneToOne) {
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

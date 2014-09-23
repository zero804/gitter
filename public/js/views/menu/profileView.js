define([
  'utils/context',
  'marionette',
  'utils/appevents',
  'utils/is-mobile',
  'utils/is-native',
  'hbs!./tmpl/profile',
  'views/behaviors/widgets'      // No ref
], function(context, Marionette, appEvents, isMobile, isNative, template) {
  "use strict";

  return Marionette.ItemView.extend({
    template: template,
    events: {
      "click #link-home": 'homeClicked'
    },
    behaviors: {
      Widgets: {}
    },
    serializeData: function() {
      var user = context.getUser();
      var userModel = context.user();

      var isMobileResult = isMobile();
      var isNativeResult = isNative();

      return {
        displayName: user.displayName || user.username,
        user: userModel,
        billingUrl: context.env('billingUrl'),
        showBilling: !isMobileResult,
        showGetApps: !isMobileResult && !isNativeResult,
        showSignout: !isNativeResult
      };
    },
    homeClicked: function(e) {
      e.preventDefault();
      appEvents.trigger('navigation', context.getUser().url, 'home', ''); // TODO: figure out a title
    }
  });
});

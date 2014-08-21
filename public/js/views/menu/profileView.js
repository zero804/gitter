define([
  'utils/context',
  'views/base',
  'utils/appevents',
  'utils/is-mobile',
  'hbs!./tmpl/profile',
], function(context, TroupeViews, appEvents, isMobile, template) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,
    events: {
      "click #link-home": 'homeClicked'
    },
    getRenderData: function() {
      var user = context.getUser();
      var userModel = context.user();
      return {
        displayName: user.displayName || user.username,
        user: userModel,
        billingUrl: context.env('billingUrl'),
        showExternalLinks: !isMobile()
      };
    },
    homeClicked: function(e) {
      e.preventDefault();
      appEvents.trigger('navigation', context.getUser().url, 'home', ''); // TODO: figure out a title
    }
  });
});

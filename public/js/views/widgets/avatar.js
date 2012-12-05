define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!views/widgets/avatar',
  'components/presence-client',
  'bootstrap'
], function($, _, TroupeViews, template, presenceClient, _bootstrap) {
  return TroupeViews.Base.extend({
    initialize: function(options) {
      this.user = options.user || {};
      this.showEmail = options.showEmail || {};
      this.showBadge = options.showBadge;
      if (options.user.location) {
        this.user.location = options.user.location.description;
      }
      else {
        this.user.location = "";
      }
    },

    render: function() {
      this.$el.html(template({
        id: this.user.id,
        showBadge: this.showBadge,
        userDisplayName: this.user.displayName,
        userAvatarUrl: this.user.avatarUrl,
        userLocation: this.user.location,
        offline: !presenceClient.isOnline(this.user.id)
      }));

      this.$el.find('div').tooltip({
        html : true,
        placement : "right",
      });

      return this;
    }

  });

});

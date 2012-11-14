define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!views/widgets/avatar',
  'components/presence-client'
], function($, _, TroupeViews, template, presenceClient) {
  return TroupeViews.Base.extend({
    initialize: function(options) {
      this.user = options.user || {};
      this.showEmail = options.showEmail || {};
      this.showBadge = options.showBadge;
    },

    render: function() {
      this.$el.html(template({
        id: this.user.id,
        showBadge: this.showBadge,
        userDisplayName: this.user.displayName,
        userAvatarUrl: this.user.avatarUrl,
        offline: !presenceClient.isOnline(this.user.id)
      }));

      this.$el.find('img').tooltip();

      return this;
    }

  });

});

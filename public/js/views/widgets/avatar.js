define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!views/widgets/avatar'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    initialize: function(options) {
      this.user = options.user || {};
    },

    render: function() {
      this.$el.html(template({
        userDisplayName: this.user.displayName,
        userAvatarUrl: this.user.avatarUrl
      }));

      this.$el.find('img').tooltip();

      return this;
    }

  });

});

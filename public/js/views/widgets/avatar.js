define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!views/widgets/avatar',
  'components/presence-client',
  'bootstrap'
], function($, _, TroupeViews, template, presenceClient, _bootstrap) {
  return TroupeViews.Base.extend({
    template: template,
    initialize: function(options) {
      this.user = options.user ? options.user : {};
      this.showEmail = options.showEmail || {};
      this.showBadge = options.showBadge;
    },

    getRenderData: function() {
      var user = this.model ? this.model.toJSON() : this.user;
      return {
        id: user.id,
        showBadge: this.showBadge,
        userDisplayName: user.displayName,
        userAvatarUrl: user.avatarUrl,
        userLocation: user.location ? user.location.description : "",
        offline: !presenceClient.isOnline(user.id)
      };
    },

    // TODO: use base classes render() method
    render: function() {
      var dom = this.template(this.getRenderData());
      this.$el.html(dom);

      this.$el.find('div').tooltip({
        html : true,
        placement : "right"
      });

    }

  });

});

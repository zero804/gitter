/*jshint unused:true browser:true*/
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
      var self = this;
      this.user = options.user ? options.user : {};
      this.showEmail = options.showEmail || {};
      this.showBadge = options.showBadge;
      this.showStatus = options.showStatus;
      this.avatarSize = options.size ? options.size : 's';

      // once this widget has the id of the user,
      // it will listen to changes on the global user collection,
      // so that it knows when to update.
      function avatarChange(event, data) {
        if(data.id === self.getUserId()) {
          if(self.user) {
            self.user = data;
          }

          self.render();
        }
      }

      var isModel = !!this.model;
      if (isModel) {
        this.model.on('change', avatarChange);
      } else {
        $(document).on('avatar:change', avatarChange);
      }

      this.addCleanup(function() {
        if (isModel)
          self.model.off('avatar:change', avatarChange);
        else
          $(document).off('avatar:change', avatarChange);
      });
    },

    getUserId: function() {
      if(this.model) return this.model.id;
      if(this.user) return this.user.id;
      return null;
    },

    getRenderData: function() {
      var user = this.model ? this.model.toJSON() : this.user;
      var avatarUrl = (this.avatarSize == 'm') ? this.user.avatarUrlMedium : this.user.avatarUrlSmall;
      // console.log("Rending avatar with url " + avatarUrl);
      return {
        id: user.id,
        showBadge: this.showBadge,
        showStatus: this.showStatus,
        userDisplayName: user.displayName,
        avatarUrl: avatarUrl,
        avatarSize: this.avatarSize,
        userLocation: user.location ? user.location.description : "",
        offline: !presenceClient.isOnline(user.id)
      };
    },

    // TODO: use base classes render() method
    render: function() {
      var dom = this.template(this.getRenderData());
      this.$el.html(dom);

      this.$el.find(':first-child').tooltip({
        html : true,
        placement : "right"
      });

    }

  });

});

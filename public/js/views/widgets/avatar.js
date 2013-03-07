/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/avatar',
  'bootstrap_tooltip'
], function($, _, TroupeViews, template) {

  return TroupeViews.Base.extend({
    tagName: 'span',
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
      var avatarChange = _.bind(function avatarChangeUnbound(event, data) {
        if(data.id === self.getUserId()) {
          if(self.user) {
            self.user = data;
          }

          self.render();
        }
      }, this);

      var isModel = !!this.model;
      if (isModel) {
        this.listenTo(this.model, 'change', avatarChange);
      } else {
        // Unfortunately we can't use listenTo with jquery events
        $(document).on('avatar:change', avatarChange);
        this.addCleanup(function() {
          $(document).off('avatar:change', avatarChange);
        });

      }
    },

    getUserId: function() {
      if(this.model) return this.model.id;
      if(this.user) return this.user.id;
      return null;
    },

    getRenderData: function() {
      var user = this.model ? this.model.toJSON() : this.user;
      var avatarUrl = (this.avatarSize == 'm') ? this.user.avatarUrlMedium : this.user.avatarUrlSmall;
      var online = !!user.online; // only the people view tries to show avatar status so there is a model object, it won't necessarily work in other cases
      // console.log("Rending avatar with url " + avatarUrl);
      return {
        id: user.id,
        showBadge: this.showBadge,
        showStatus: this.showStatus,
        userDisplayName: user.displayName,
        avatarUrl: avatarUrl,
        avatarSize: this.avatarSize,
        userLocation: user.location ? user.location.description : "",
        online: online,
        offline: !online
      };
    },

    // TODO: use base classes render() method
    render: function() {
      var dom = this.template(this.getRenderData());
      this.$el.html(dom);

      if (!window._troupeCompactView) {
        this.$el.find(':first-child').tooltip({
          html : true,
          placement : "right"
        });
      }
    }

  });

});

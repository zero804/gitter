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

          // re-rendering every avatar when the presence changes is excessive, especially for the viewer's own avatars
          self.updatePresence();
          self.updateTooltip();
          self.updateAvatar();
        }
      }, this);

      var isModel = !!this.model;
      if (isModel) {
        this.listenTo(this.model, 'change:displayName', avatarChange);
      } else {
        // Unfortunately we can't use listenTo with jquery events
        $(document).on('avatar:change', avatarChange);
        this.addCleanup(function() {
          $(document).off('avatar:change', avatarChange);
        });

      }
    },

    updatePresence: function() {
      if (this.showStatus) {
        this.$el.find('.trpDisplayPicture').toggleClass('online', this.user.online);
        this.$el.find('.trpDisplayPicture').toggleClass('offline', !this.user.online);
      }
    },

    updateAvatar: function() {
      this.$el.find('.trpDisplayPicture').css({ 'background-image': "url('" + ((this.avatarSize == 'm') ? this.user.avatarUrlMedium : this.user.avatarUrlSmall) + "')" });
    },

    updateTooltip: function() {
      this.$el.find('.trpDisplayPicture').attr('data-original-title', this.user.displayName + "\n" + ((this.user.location) ? this.user.location.description : ""));
    },

    getUserId: function() {
      if(this.model) return this.model.id;
      if(this.user) return this.user.id;
      return null;
    },

    getRenderData: function() {
      var currentUserId = window.troupeContext.user ? window.troupeContext.user.id : undefined;

      var user = this.model ? this.model.toJSON() : this.user;
      var avatarUrl = (this.avatarSize == 'm') ? user.avatarUrlMedium : user.avatarUrlSmall;
      var online = user.id === currentUserId || !!user.online; // only the people view tries to show avatar status so there is a model object, it won't necessarily work in other cases
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

      this.updateAvatar();
      this.updateTooltip();
      this.updatePresence();
      if (!window._troupeCompactView && (this.model ? this.model.get('displayName') : this.user.displayName)) {
        this.$el.find(':first-child').tooltip({
          html : true,
          placement : function(a, element) {
            var position = $(element).position();
            if (position.top < 110){
                return "bottom";
            }
            return "top";
          },
          container: "body"
        });
      }
    }

  });

});

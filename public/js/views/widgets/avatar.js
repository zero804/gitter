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
      var avatarChange = _.bind(function(event, data) {

        if(data.id === self.getUserId()) {
          if(self.user) {
            self.user = data;
          }

          // re-rendering every avatar when the presence changes is excessive, especially for the viewer's own avatars
          self.update();
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

    update: function() {
      var data = this.getRenderData();
      this.updatePresence(data);
      this.updateAvatar(data);
      this.updateTooltip(data);
    },

    updatePresence: function(data) {
      if (this.showStatus) {
        this.$el.find('.trpDisplayPicture').toggleClass('online', data.online);
        this.$el.find('.trpDisplayPicture').toggleClass('offline', !data.online);
      }
    },

    updateAvatar: function(data) {
      this.$el.find('.trpDisplayPicture').css({ 'background-image': "url('" + data.avatarUrl + "')" });
    },

    updateTooltip: function(data) {
      this.$el.find('.trpDisplayPicture').attr('data-original-title', data.tooltip);
    },

    getUserId: function() {
      if(this.model) return this.model.id;
      if(this.user) return this.user.id;
      return null;
    },

    getRenderData: function() {
      var currentUserId = window.troupeContext.user ? window.troupeContext.user.id : undefined;

      var user = this.model ? this.model.toJSON() : this.user;

      var avatarUrl;
      if (this.avatarSize == 'm') {
        avatarUrl = user.avatarUrlMedium || '/images/2/avatar-default-m.png';
      } else {
        avatarUrl = user.avatarUrlSmall || '/images/2/avatar-default-s.png';
      }

      var online = user.id === currentUserId || !!user.online; // only the people view tries to show avatar status so there is a model object, it won't necessarily work in other cases
      return {
        id: user.id,
        showBadge: this.showBadge,
        showStatus: this.showStatus,
        userDisplayName: user.displayName,
        avatarUrl: avatarUrl,
        avatarSize: this.avatarSize,
        userLocation: user.location ? user.location.description : "",
        tooltip: user.displayName + "<br>" + ((user.location) ? user.location.description : ""),
        online: online,
        offline: !online
      };
    },

    // TODO: use base classes render() method
    render: function() {
      var data = this.getRenderData();
      var dom = this.template(data);
      this.$el.html(dom);

      this.updateAvatar(data);
      this.updateTooltip(data);
      this.updatePresence(data);
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
      return this;
    }

  });

});

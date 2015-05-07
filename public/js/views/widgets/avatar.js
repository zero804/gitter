"use strict";
var Backbone = require('backbone');
var Marionette = require('marionette');
var context = require('utils/context');
var template = require('./tmpl/avatar.hbs');
var UserPopoverView = require('views/people/userPopoverView');
var widgets = require('views/behaviors/widgets');
var resolveAvatarUrl = require('shared/avatars/resolve-avatar-url');
require('views/behaviors/tooltip');

module.exports = (function() {

  var AvatarWidget = Marionette.ItemView.extend({
    tagName: 'span',
    template: template,
    events: {
      'mouseover': 'showDetailIntent',
      'click':     'showDetail'
    },
    ui: {
      tooltip: ':first-child'
    },
    modelEvents: {
      change: 'update'
    },
    behaviors: function() {
      var options = this.options;

      if (options.showTooltip !== false) {
        return {
          Tooltip: {
            ':first-child': { titleFn: 'getTooltip', placement: options.tooltipPlacement || 'vertical' },
          }
        };
      }
    },
    initialize: function (options) {
      // TODO: is it necessary to listen for updates to the invite status?

      this.user = options.user ? options.user : {};
      this.showEmail = options.showEmail || {};
      this.showBadge = options.showBadge;
      this.showStatus = options.showStatus;
      this.avatarSize = options.size ? options.size : 's';
    },

    showDetailIntent: function(e) {
      UserPopoverView.hoverTimeout(e, function() {
        this.showDetail(e);
      }, this);
    },

    showDetail: function(e) {
      if (this.compactView) return;
      e.preventDefault();

      if (this.popover) return;

      this.ui.tooltip.tooltip('hide');

      var model = this.model || new Backbone.Model(this.user);
      var popover = new UserPopoverView({
        model: model,
        targetElement: e.target
      });

      popover.show();
      UserPopoverView.singleton(this, popover);
    },

    update: function () {
      var data = this.serializeData();
      this.updatePresence(data);
      this.updateAvatar(data);
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

    getUserId: function() {
      if (this.model) return this.model.id;
      if (this.user) return this.user.id;
      return null;
    },

    serializeData: function() {
      var currentUserId = context.getUserId();

      var user = this.model ? this.model.toJSON() : this.user;

      var avatarUrl = resolveAvatarUrl({ username: user.username, version: user.gv, size: (this.avatarSize == 'm' ? 60 : 32) });

      var online = user.id === currentUserId || !!user.online; // only the people view tries to show avatar status so there is a model object, it won't necessarily work in other cases

      var presenceClass;
      if (this.showStatus) {
        presenceClass = online ? 'online' : 'offline';
      } else {
        presenceClass = "";
      }

      return {
        id: user.id,
        showBadge: this.showBadge,
        showStatus: this.showStatus,
        userDisplayName: user.displayName,
        avatarUrl: avatarUrl,
        avatarSize: this.avatarSize,
        presenceClass: presenceClass,
        online: online,
        offline: !online,
        role: user.role,
        invited: user.invited,
        removed: user.removed,
        inactive: user.removed || user.invited
      };
    },

    getTooltip: function() {
      if (this.model) {
        return this.model.get('displayName');
      } else if (this.user) {
        return this.user.displayName;
      }
    }

  });

  widgets.register({ avatar: AvatarWidget });
  return AvatarWidget;

})();

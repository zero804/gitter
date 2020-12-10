'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var Popover = require('../popover');
var template = require('./tmpl/userPopoverView.hbs');
var footerTemplate = require('./tmpl/userPopoverFooterView.hbs');
var appEvents = require('../../utils/appevents');
var context = require('gitter-web-client-context');
var SyncMixin = require('../../collections/sync-mixin');
var avatars = require('gitter-web-avatars');
const checkForMatrixUsername = require('gitter-web-users/lib/virtual-users/check-for-matrix-username');

module.exports = (function() {
  var UserView = Marionette.ItemView.extend({
    template: template,
    modelEvents: {
      change: 'render'
    },
    serializeData: function() {
      var data = this.model.toJSON();
      data.inactive = data.removed;
      data.avatarUrl = data.avatarUrl || avatars.getForUser(data);
      return data;
    }
  });

  var UserPopoverFooterView = Marionette.ItemView.extend({
    template: footerTemplate,
    modelEvents: {
      change: 'render'
    },
    events: {
      'click #button-onetoone': function() {
        this.parentPopover.hide();
        var username = this.model.get('username');
        appEvents.trigger('dispatchVueAction', 'changeDisplayedRoomByUrl', `/${username}`);
      },
      'click #button-mention': function() {
        this.parentPopover.hide();
        var username = this.model.get('username');
        appEvents.trigger('input.append', '@' + username + ' ');
      },
      'click #button-remove': function() {
        this.parentPopover.hide();
        var username = this.model.get('username');
        appEvents.trigger('command.room.remove', username);
      }
    },
    serializeData: function() {
      var data = this.model.toJSON();
      var isntSelf = data.username !== context.user().get('username');
      var inactive = data.removed;
      var chatPrivately = data.has_gitter_login && isntSelf && !inactive;
      var mentionable = isntSelf;

      const removable =
        // Can't remove yourself
        isntSelf &&
        // You can't remove Matrix users
        !checkForMatrixUsername(data.username) &&
        // Need to be an admin to remove someone
        context.isTroupeAdmin();

      // Special case
      if (context.inOneToOneTroupeContext()) {
        if (context.troupe().get('user').username === data.username) {
          chatPrivately = false;
        }
      }

      data.avatarUrl = data.avatarUrl || avatars.getForUser(data);
      data.inactive = data.removed;
      data.chatPrivately = chatPrivately;
      data.mentionable = mentionable;
      data.removable = removable;
      data.loaded = !!this.model.loaded;
      return data;
    }
  });

  var UserPopoverView = Popover.extend({
    initialize: function(options) {
      options.placement = 'horizontal';
      options.minHeight = '88px';

      var m;
      if (this.model) {
        m = this.model.toJSON();
      } else {
        m = {
          username: options.username,
          displayName: options.displayName
        };
      }

      var username = m.username;
      var ghModel = new Backbone.Model(m);
      ghModel.sync = SyncMixin.sync; // XXX This is less than ideal
      ghModel.url = '/v1/users/' + username;
      ghModel.fetch(function() {
        ghModel.loaded = true;
      });

      options.footerView = new UserPopoverFooterView({ model: ghModel });

      Popover.prototype.initialize.apply(this, arguments);
      this.view = new UserView({ model: ghModel, userCollection: options.userCollection });
    }
  });

  return UserPopoverView;
})();

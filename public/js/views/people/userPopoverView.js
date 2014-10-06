define([
  'marionette',
  'backbone',
  'views/popover',
  'hbs!./tmpl/userPopoverView',
  'hbs!./tmpl/userPopoverFooterView',
  'utils/appevents',
  'utils/context',
  'utils/cdn',
], function(Marionette, Backbone, Popover, template, footerTemplate, appEvents, context, cdn) {
  "use strict";

  var failoverImage = cdn('images/logo-mark-grey-64.png');

  function largeAvatar(url) {
    if(!url) return failoverImage;

    if(url.indexOf('?') >= 0) {
      return url + '&s=128';
    }

    return url + '?s=128';
  }

  var UserView = Marionette.ItemView.extend({
    template: template,
    modelEvents: {
        'change': 'render',
    },
    serializeData: function() {
      var data = this.model.toJSON();

      if(data.blog) {
        if(!data.blog.match(/^https?:\/\//)) {
          data.blogUrl = 'http://' + data.blog;
        } else {
          data.blogUrl = data.blog;
        }
      }
      data.inactive = data.invited || data.removed;
      data.avatarUrl = largeAvatar(data.avatar_url);

      return data;
    }
  });

  var UserPopoverFooterView = Marionette.ItemView.extend({
    template: footerTemplate,
    modelEvents: {
        'change': 'render',
    },
    events: {
      'click #button-onetoone': function() {
        this.parentPopover.hide();
        var username = this.model.get('login');
        appEvents.trigger('navigation', '/' + username, 'chat', username, this.model.id);
      },
      'click #button-mention': function() {
        this.parentPopover.hide();
        var username = this.model.get('login');
        appEvents.trigger('input.append', '@' + username);
      },
      'click #button-remove': function() {
        this.parentPopover.hide();
        var username = this.model.get('login');
        appEvents.trigger('command.room.remove', username);
      }
    },
    serializeData: function() {
      var data = this.model.toJSON();
      var isntSelf = data.login !== context.user().get('username');
      var chatPrivately = data.has_gitter_login && isntSelf;
      var mentionable = isntSelf;
      var removable = isntSelf && context().permissions.admin;

      // Special case
      if(context.inOneToOneTroupeContext()) {
        if(context.troupe().get('user').username === data.login) {
          chatPrivately = false;
        }
      }

      data.inactive = data.invited || data.removed;
      data.chatPrivately = chatPrivately;
      data.mentionable = mentionable;
      data.removable = removable;
      return data;
    }

  });

  var UserPopoverView = Popover.extend({
    initialize: function(options) {
      options.placement = 'horizontal';
      options.minHeight = '88px';
      var username, displayName;

      if (this.model) {
        username = this.model.get('username');
        displayName = this.model.get('displayName'); // leave those in, optimistic loading.
      } else {
        username = options.username;
        displayName = options.displayName; // leave those in, optimistic loading.
      }

      var ghModel = new Backbone.Model({
        login: username,
        name: displayName
      });

      ghModel.url = '/api/private/gh/users/' + username;
      ghModel.fetch();

      options.footerView = new UserPopoverFooterView({ model: ghModel });

      Popover.prototype.initialize.apply(this, arguments);
      this.view = new UserView({ model: ghModel, userCollection: options.userCollection });
    }
  });

  return UserPopoverView;
});

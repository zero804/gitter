/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'backbone',
  'views/popover',
  'hbs!./tmpl/userPopoverView',
  'hbs!./tmpl/userPopoverFooterView',
  'utils/appevents',
  'utils/context',
  'utils/cdn',
  'underscore'
], function(Marionette, Backbone, Popover, template, footerTemplate, appEvents, context, cdn, _) {
  "use strict";

  var failoverImage = cdn('images/2/gitter/logo-mark-grey-64.png');

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

      data.avatarUrl = data.avatar_url && data.avatar_url + "&s=128" || failoverImage;

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
        var username = this.model.get('login');
        appEvents.trigger('navigation', '/' + username, 'chat', username, this.model.id);
        this.parentPopover.hide();
      },
      'click #button-mention': function() {
        var username = this.model.get('login');
        appEvents.trigger('input.append', '@' + username);
        this.parentPopover.hide();
      }
    },
    serializeData: function() {
      var data = this.model.toJSON();
      var chatPrivately = data.has_gitter_login && data.login !== context.user().get('username');
      var mentionable = data.login !== context.user().get('username');

      // Special case
      if(context.inOneToOneTroupeContext()) {
        if(context.troupe().get('user').username === data.login) {
          chatPrivately = false;
        }
      }

      data.chatPrivately = chatPrivately;
      data.mentionable = mentionable;
      return data;
    }

  });

  var UserPopoverView = Popover.extend({
    options: _.extend({}, Popover.prototype.options, {
      placement: 'horizontal',
      minHeight: '88px'
    }),
    initialize: function(options) {
      var username, displayName;
      if(this.model) {
        username = this.model.get('username');
        displayName = this.model.get('displayName');
      } else {
        username = options.username;
        displayName = options.displayName;
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

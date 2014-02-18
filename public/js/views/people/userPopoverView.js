/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'backbone',
  'views/popover',
  'hbs!./tmpl/userPopoverView',
  'utils/appevents',
  'utils/context',
  'underscore',
  'utils/momentWrapper'
], function(Marionette, Backbone, Popover, template, appEvents, context, _, moment) {
  "use strict";

  var UserView = Marionette.ItemView.extend({
    template: template,
    modelEvents: {
        'change': 'render',
    },
    events: {
      'click #button-onetoone': function() {
        var username = this.model.get('login');
        appEvents.trigger('navigation', '/' + username, 'chat', username, this.model.id);
      }
    },
    serializeData: function() {
      var data = this.model.toJSON();
      var chatPrivately = data.has_gitter_login && data.login !== context.user().get('username');

      // Special case
      if(context.inOneToOneTroupeContext()) {
        if(context.troupe().get('user').username === data.login) {
          chatPrivately = false;
        }
      }

      data.avatarUrl = data.avatar_url && data.avatar_url + "&s=200";
      data.joined = data.created_at && moment(data.created_at).format('LL');
      data.chatPrivately = chatPrivately;

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

      Popover.prototype.initialize.apply(this, arguments);
      this.view = new UserView({ model: ghModel, userCollection: options.userCollection });
    }
  });

  return UserPopoverView;
});

/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'backbone',
  'views/popover',
  'hbs!./tmpl/userPopoverView',
  'utils/momentWrapper'
], function(Marionette, Backbone, Popover, template, moment) {
  "use strict";

  var UserView = Marionette.ItemView.extend({
    template: template,
    modelEvents: {
        'change': 'render'
    },
    serializeData: function() {
      var data = this.model.toJSON();
      data.avatarUrl = data.avatar_url && data.avatar_url + "&s=200";
      data.joined = data.created_at && moment(data.created_at).format('LL');
      return data;
    }
  });

  var UserPopoverView = Popover.extend({
    initialize: function(options) {
      var ghModel = new Backbone.Model({
        login: this.model.get('username'),
        name: this.model.get('displayName')
      });
      ghModel.url = '/api/private/gh/users/' + this.model.get('username');

      ghModel.fetch();

      Popover.prototype.initialize.apply(this, arguments);
      this.view = new UserView({ model: ghModel, userCollection: options.userCollection });
    }
  });

  return UserPopoverView;
});

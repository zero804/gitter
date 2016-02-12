"use strict";

var Marionette             = require('backbone.marionette');
var _                      = require('underscore');
var context                = require('utils/context');
var apiClient              = require('components/apiClient');
var ModalView              = require('./modal');
var troupeSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var log                    = require('utils/log');
var notifications          = require('components/notifications');


var View = Marionette.ItemView.extend({
  template: troupeSettingsTemplate,
  events: {
    'click #save-troupe-settings': 'saveSettings',
    'click #close-settings' : 'destroySettings',
    'change #notification-options' : 'formChange'
  },

  ui: {
    options: '#notification-options'
  },

  initialize: function() {
    this.model = context.troupe();
  },

  onRender: function() {
    if (this.settings) {
      this.ui.options.val(this.settings);
    } else {
      apiClient.userRoom.get('/settings/notifications')
        .bind(this)
        .then(function(settings) {
          this.settings = settings && settings.push || "all";
          this.ui.options.val(this.settings);
        });
    }
  },

  formChange: function() {
    this.saveSettings();
  },

  destroySettings : function () {
    this.dialog.hide();
    this.dialog = null;
  },

  serializeData: function() {
    return _.extend({},
      context.getTroupe(), {
        notificationsBlocked: notifications.hasBeenDenied(),
        isNativeDesktopApp: context().isNativeDesktopApp,
        troupeUrl: '//' + window.location.host + window.location.pathname
      });
  },

  saveSettings: function(e) {
    if(e) e.preventDefault();

    var push = this.ui.options.val();
    apiClient.userRoom.put('/settings/notifications', { push: push });
  }
});

module.exports = ModalView.extend({
    initialize: function(options) {
      options.title = "Notification Settings";
      ModalView.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    }
});

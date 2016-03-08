"use strict";

var Marionette             = require('backbone.marionette');
var _                      = require('underscore');
var context                = require('utils/context');
var apiClient              = require('components/apiClient');
var ModalView              = require('./modal');
var troupeSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var notifications          = require('components/notifications');

var View = Marionette.ItemView.extend({
  template: troupeSettingsTemplate,
  events: {
    'click #close-settings' : 'destroySettings',
    'change #notification-options' : 'formChange'
  },
  modelEvents: {
    change: 'update'
  },
  ui: {
    options: '#notification-options',
    nonstandard: '#nonstandard',
    lurkmode: '#lurkmode'
  },

  initialize: function() {
    apiClient.userRoom.get('/settings/notifications')
      .bind(this)
      .then(function(settings) {
        this.model.set(settings);
      });

  },

  getNotificationOption: function() {
    var model = this.model;
    var value = model.get('mode') || model.get('push');
    var lurk = model.get('lurk');

    switch(value) {
      case 'all':
        return { selectValue: 'all', nonStandard: lurk === true, lurk: lurk };

      case 'annoucement':
      case 'annoucements':
      case 'mention':
        return { selectValue: 'mention', nonStandard: lurk === false, lurk: lurk };

      case 'mute':
        return { selectValue: 'mute', nonStandard: lurk === false, lurk: lurk };

      default:
        return null;
    }
  },

  update: function() {
    var val = this.getNotificationOption();
    if (val) {
      this.ui.options.val(val.selectValue);
      this.ui.lurkmode.text(val.lurk ? 'Lurk on' : 'Lurk off');
      if (val.nonStandard) {
        this.ui.nonstandard.show();
      } else {
        this.ui.nonstandard.hide();
      }
    } else {
      this.ui.options.val('');
      this.ui.nonstandard.hide();
    }
  },

  onRender: function() {
    this.update();
  },

  formChange: function(e) {
    if(e) e.preventDefault();

    var mode = this.ui.options.val();
    apiClient.userRoom.put('/settings/notifications', { mode: mode })
      .bind(this)
      .then(function(settings) {
        this.model.set(settings);
      });
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
  }

});

module.exports = ModalView.extend({
    initialize: function(options) {
      options.title = "Notification Settings";
      ModalView.prototype.initialize.apply(this, arguments);
      this.view = new View(options);
    }
});

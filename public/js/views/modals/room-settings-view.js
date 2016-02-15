"use strict";

var Marionette             = require('backbone.marionette');
var _                      = require('underscore');
var context                = require('utils/context');
var apiClient              = require('components/apiClient');
var ModalView              = require('./modal');
var troupeSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var notifications          = require('components/notifications');

function getNotificationSetting(value) {
  switch(value) {
    case 'all': return 'all';
    case 'annoucements': return 'mention';
    case 'mention': return 'mention';
    // TODO: CODEDEBT: https://github.com/troupe/gitter-webapp/issues/988
    case 'mute': return 'mention';
    default:
      return 'mention';
  }
}

var View = Marionette.ItemView.extend({
  template: troupeSettingsTemplate,
  events: {
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
          this.settings = getNotificationSetting(settings && settings.mode);
          this.ui.options.val(this.settings);
        });
    }
  },

  formChange: function(e) {
    if(e) e.preventDefault();

    var mode = this.ui.options.val();
    apiClient.userRoom.put('/settings/notifications', { mode: mode });
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
      this.view = new View({ });
    }
});

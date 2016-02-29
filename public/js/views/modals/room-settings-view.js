"use strict";

var Marionette             = require('backbone.marionette');
var _                      = require('underscore');
var context                = require('utils/context');
var apiClient              = require('components/apiClient');
var ModalView              = require('./modal');
var troupeSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var log                    = require('utils/log');
var userNotifications      = require('components/user-notifications');


var View = Marionette.ItemView.extend({
  template: troupeSettingsTemplate,
  events: {
    'click #save-troupe-settings': 'saveSettings',
    'click #close-settings' : 'destroySettings',
    'click #enable-lurk-mode' : 'enableLurkMode',
    'change #notification-options' : 'formChange',
    'change #unread-checkbox' : 'formChange'
  },

  initialize: function() {
    this.model = context.troupe();

    this.listenTo(this.model, 'change:lurk', this.setShowUnreadBadgeValue);
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked, this);

    var self = this;
    apiClient.userRoom.get('/settings/notifications')
      .then(function(settings) {
        self.settings = settings && settings.push || "all";
        self.$el.find("#notification-options").val(self.settings);
        self.setLurkButton();
      })
      .catch(function(err) {
        log.error('An error occurred while communicating with notification settings', err);
      });
  },

  menuItemClicked: function (type){
    switch (type) {
      case 'lurk':
        this.enableLurkMode();
      break;
    }
  },

  formChange: function() {
    this.saveSettings();
  },

  enableLurkMode: function() {
    this.$el.find('#notification-options').val("mention");
    this.$el.find('#unread-checkbox').prop('checked', true);
    this.saveSettings();
    this.destroySettings();
  },

  setShowUnreadBadgeValue: function() {
    var lurk = this.model.get('lurk');
    this.el.querySelector("#unread-checkbox").checked = lurk;
  },

  setLurkButton: function() {
    if (this.$el.find('#unread-checkbox').prop('checked') && (this.$el.find('#notification-options').val() == "mention" || this.$el.find('#notification-options').val() == "mute")) {
      this.$el.find('#enable-lurk-mode').hide();
      this.$el.find('#is-lurking').show();
    }
    else {
      this.$el.find('#is-lurking').hide();
      this.$el.find('#enable-lurk-mode').show();
    }
  },

  destroySettings : function () {
    this.dialog.hide();
    this.dialog = null;
  },

  onRender: function() {
    if (this.settings) {
      this.setLurkButton();
      this.$el.find("#notification-options").val(this.settings);
    }
  },

  serializeData: function() {
    return _.extend({},
      context.getTroupe(), {
        lurk: context.troupe().get('lurk'),
        notificationsBlocked: userNotifications.isAccessDenied(),
        isNativeDesktopApp: context().isNativeDesktopApp,
        troupeUrl: '//' + window.location.host + window.location.pathname
      });
  },

  saveSettings: function(e) {
    if(e) e.preventDefault();

    var self = this;
    var push = self.$el.find("#notification-options").val();
    var lurk = self.el.querySelector("#unread-checkbox").checked;

    function done() {
      self.setLurkButton();
    }

    apiClient.userRoom.put('/settings/notifications', { push: push })
      .then(done);

    apiClient.userRoom.put('', { lurk: lurk })
      .then(done);

  }
});

module.exports = ModalView.extend({
    initialize: function(options) {
      options.title = "Notification Settings";
      ModalView.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    },
    menuItems: [
      { action: "lurk", text: "Enable lurk mode", pull: 'left', className: "modal--default__footer__link" },
    ]
  });

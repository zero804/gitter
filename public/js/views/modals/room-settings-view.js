"use strict";

var Marionette             = require('backbone.marionette');
var apiClient              = require('components/apiClient');
var ModalView              = require('./modal');
var troupeSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var notifications          = require('components/notifications');

var OPTIONS = [
  { val: 'all', text: 'All: Notify me for all messages' },
  { val: 'mention', text: 'Announcements: Notify me for mentions and announcements' },
  { val: 'mute', text: 'Mute: Notify me only when I\'m directly mentioned' }
];

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
    var nonStandard = false;

    if (val) {
      if (val.nonStandard) {
        nonStandard = true;
        this.setOption('', 'Legacy setting: ' + val.selectValue + ' mode, with ' + (val.lurk ? 'lurk on' : 'lurk off'));
      } else {
        this.setOption(val.selectValue);
      }
    } else {
      this.setOption('', 'Please wait...');
    }

    if (nonStandard) {
      this.ui.nonstandard.show();
    } else {
      this.ui.nonstandard.hide();
    }
  },

  setOption: function(val, text) {
    var selectInput = this.ui.options;
    selectInput.empty();

    var found = false;
    var items = OPTIONS.map(function(o) {
      var option = document.createElement("option");
      option.value = o.val;
      option.textContent = o.text;
      var selected = o.val === val;
      option.selected = selected;
      if (selected) {
        found = true;
      }
      return option;
    });
    selectInput.append(items);

    if (!found) {
      var option = document.createElement("option");
      option.value = val;
      option.textContent = text;
      option.selected = true;
      option.style.display = 'none';
      selectInput.append(option);
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
    return {
      notificationsBlocked: notifications.hasBeenDenied(),
    };
  }

});

module.exports = ModalView.extend({
    initialize: function(options) {
      options.title = "Notification Settings";
      ModalView.prototype.initialize.apply(this, arguments);
      this.view = new View(options);
    }
});

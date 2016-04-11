"use strict";

var Marionette             = require('backbone.marionette');
var Backbone               = require('backbone');
var _                      = require('underscore');
var apiClient              = require('components/apiClient');
var ModalView              = require('./modal');
var troupeSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var userNotifications      = require('components/user-notifications');

var OPTIONS = [
  { val: 'all', text: 'All: Notify me for all messages' },
  { val: 'announcement', text: 'Announcements: Notify me for mentions and announcements' },
  { val: 'mute', text: 'Mute: Notify me only when I\'m directly mentioned' }
];

var View = Marionette.LayoutView.extend({
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
    notifyFeatures: '#notify-features'
  },
  regions: {
    notifyFeatures: '#notify-features'
  },

  initialize: function() {
    // TODO: this should go to the userRoom endpoint as a get
    // or better yet should be a live field on the room
    apiClient.userRoom.get('/settings/notifications')
      .bind(this)
      .then(function(settings) {
        this.model.set(settings);
      });

    this.notifyFeatureCollection = new Backbone.Collection([]);
  },

  getNotificationOption: function() {
    var model = this.model;

    if (!model.attributes.hasOwnProperty('mode')) {
      // Not yet loaded...
      return null;
    }
    var value = model.get('mode');
    var lurk = model.get('lurk');

    var nonStandard;

    var defaultDescription = 'Legacy setting: ' + value + ' mode, with ' + (lurk ? 'unread item count off' : 'unread item count on');

    switch(value) {
      case 'all':
        nonStandard = lurk === true;
        return {
          selectValue: 'all',
          nonStandard: nonStandard,
          description: nonStandard ?  defaultDescription : null
        };

      case 'announcement':
      case 'mention':
        nonStandard = lurk === true;

        return {
          selectValue: 'announcement',
          nonStandard: nonStandard,
          description: nonStandard ?  defaultDescription : null
        };

      case 'mute':
        nonStandard = lurk === false;

        return {
          selectValue: 'mute',
          nonStandard: nonStandard,
          description: nonStandard ?  defaultDescription : null
        };

      default:
        return {
          selectValue: 'mute',
          nonStandard: true,
          description: 'Custom legacy setting (details below)'
        };
    }
  },

  update: function() {
    var val = this.getNotificationOption();

    if (val) {
      if (val.nonStandard) {
        this.ui.nonstandard.show();
      } else {
        this.ui.nonstandard.hide();
      }

      var isDefault = this.model.get('default');

      if (isDefault) {
        this.setOption('default');
      } else {
        if (val.nonStandard) {
          this.setOption('', val.description);
        } else {
          this.setOption(val.selectValue);
        }
      }

    } else {
      this.setOption('', 'Please wait...');
      this.ui.nonstandard.hide();
    }

    var attributes = this.model.attributes;
    var features = [];
    if (attributes.unread) {
      features.push({ id: 1, text: 'Show unread item counts' });
    }

    if (attributes.activity) {
      features.push({ id: 2, text: 'Show activity indicator on chat' });
    }

    if (attributes.desktop) {
      features.push({ id: 5, text: 'Notify for all chats' });
    }

    if (attributes.mention) {
      features.push({ id: 3, text: 'Notify when you\'re mentioned' });
    }

    if (attributes.announcement) {
      features.push({ id: 4, text: 'Notify on @/all announcements' });
    }

    // For now, desktop = mobile so don't confuse the user
    // if (attributes.mobile) {
    //   features.push({ id: 6, text: 'Mobile notifications for chats' });
    // }

    this.notifyFeatureCollection.reset(features);
    if (features.length) {
      this.ui.notifyFeatures.show();
    } else {
      this.ui.notifyFeatures.hide();
    }
  },

  setOption: function(val, text) {
    var selectInput = this.ui.options;
    selectInput.empty();
    var found = false;

    var defaultOption = document.createElement("option");
    defaultOption.value = 'default';
    defaultOption.textContent = this.getDefaulDescription();
    if (val === 'default') {
      defaultOption.selected = true;
      found = true;
    }
    selectInput.append(defaultOption);

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

  getDefaulDescription: function() {
    var model = this.model;
    var defaultSettings = model.get('defaultSettings');
    if (!defaultSettings) return "Default settings";

    if (!defaultSettings.mode) return "Default settings: legacy";
    return "Default settings: " + defaultSettings.mode;
  },

  onRender: function() {
    this.update();
    this.getRegion('notifyFeatures').show(new Marionette.CollectionView({
      tagName: 'ul',
      collection: this.notifyFeatureCollection,
      childView: Marionette.ItemView.extend({
        tagName: 'li',
        template: _.template("<%= text %>")
      })
    }));
  },

  formChange: function(e) {
    if(e) e.preventDefault();

    var mode = this.ui.options.val();
    // TODO: this should go to the userRoom endpoint as a patch
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
      notificationsBlocked: userNotifications.isAccessDenied(),
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

"use strict";

var Marionette             = require('backbone.marionette');
var _                      = require('underscore');
var apiClient              = require('components/apiClient');
var ModalView              = require('./modal');
var troupeSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var userNotifications      = require('components/user-notifications');
var FeaturesView           = require('./notification-features-collection-view');

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

    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
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

    var count = 0;
    if(this.featuresView) {
      count = this.featuresView.resetFromHash(this.model.attributes);
    } else {
      count = 0;
    }

    if (count > 0) {
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
    this.featuresView = new FeaturesView({ });
    this.getRegion('notifyFeatures').show(this.featuresView);
    this.update();
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
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'set-defaults':
        window.location.href = "#notification-defaults";
        break;
    }
  }
});

module.exports = ModalView.extend({
    initialize: function(options) {
      options = _.extend({
        title: "Notification Settings",
        menuItems: [
          { action: "set-defaults", pull: 'left', text: "Configure Defaults", className: "modal--default__footer__btn"}
        ]
      }, options);

      ModalView.prototype.initialize.call(this, options);
      this.view = new View(options);
    }
});

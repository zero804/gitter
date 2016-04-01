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

    this.notifyFeatureCollection = new Backbone.Collection([{
      text: 'moo'
    }]);
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
          description: 'Legacy value with ' + (lurk ? 'unread item count off' : 'unread item count on')
        };
    }
  },

  update: function() {
    var val = this.getNotificationOption();

    if (val) {
      if (val.nonStandard) {
        this.ui.nonstandard.show();
        this.setOption('', val.description);
      } else {
        this.ui.nonstandard.hide();
        this.setOption(val.selectValue);
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
      features.push({ id: 2, text: 'Pulse activity indicator for room on new chat' });
    }

    if (attributes.mention) {
      features.push({ id: 3, text: 'Show unread mentions' });
    }

    if (attributes.announcement) {
      features.push({ id: 4, text: 'Show unread announcements' });
    }

    if (attributes.desktop) {
      features.push({ id: 5, text: 'Desktop notifications for new chats' });
    }

    if (attributes.desktop) {
      features.push({ id: 6, text: 'Mobile notifications for new chats' });
    }

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

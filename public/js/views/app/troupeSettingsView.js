define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'collections/instances/integrated-items',
  'hbs!./tmpl/troupeSettingsTemplate',
  'log!troupe-settings-view',
  'components/notifications'
], function($, _, context, TroupeViews, itemCollections, troupeSettingsTemplate, log, notifications) {
  "use strict";


  var View = TroupeViews.Base.extend({
    template: troupeSettingsTemplate,
    events: {
      'click #save-troupe-settings': 'saveSettings',
      'click #close-settings' : 'closeSettings',
      'click #enable-lurk-mode' : 'enableLurkMode',
      'change #notification-options' : 'formChange',
      'change #unread-checkbox' : 'formChange'
    },

    initialize: function() {
      this.model = context.troupe();
      this.userCollection = itemCollections.users;

      this.listenTo(this.model, 'change:lurk', this.setShowUnreadBadgeValue);

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId() + '/settings/notifications',
        type: "GET",
        context: this,
        success: function(settings) {
          this.settings = settings && settings.push || "all";
          this.$el.find("#notification-options").val(this.settings);
          // this.trigger('settingsLoaded', settings);
          this.setLurkButton();

        },
        error: function() {
          log('An error occurred while communicating with notification settings');
        }
      });
    },

    formChange: function() {
      this.saveSettings();
    },

    enableLurkMode: function() {
      this.$el.find('#notification-options').val("mention");
      this.$el.find('#unread-checkbox').prop('checked', true);
      this.saveSettings();
      this.closeSettings();
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

    closeSettings : function () {
      this.dialog.hide();
      this.dialog = null;
    },

    afterRender: function() {
      if (this.settings) {
        this.setLurkButton();
        this.$el.find("#notification-options").val(this.settings);
      }
    },

    getRenderData: function() {
      return _.extend({},
        context.getTroupe(), {
          lurk: context.troupe().get('lurk'),
          notificationsBlocked: notifications.hasBeenDenied(),
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

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId() + '/settings/notifications',
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ push: push }),
        success: done
      });


      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ lurk: lurk }),
        success: done
      });
    }
  });

  return TroupeViews.Modal.extend({
      initialize: function(options) {
        options.title = "Settings";
        TroupeViews.Modal.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      }
    });
  });

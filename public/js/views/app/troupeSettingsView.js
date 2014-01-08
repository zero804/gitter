/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'collections/instances/integrated-items',
  'hbs!./tmpl/troupeSettingsTemplate',
  'log!troupe-settings-view',
  'utils/validate-wrapper',
  'components/notifications'
], function($, _, context, TroupeViews, itemCollections, troupeSettingsTemplate, log, validation, notifications) {
  "use strict";


  var View = TroupeViews.Base.extend({
    template: troupeSettingsTemplate,
    events: {
      'click #save-troupe-settings': 'saveSettings',
      'click #cancel-troupe-settings' : 'closeSettings',
      'click #enable-browser-notifications': 'enableBrowserNotifications'
    },

    initialize: function() {
      this.model = context.troupe();
      this.userCollection = itemCollections.users;

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/troupes/' + context.getTroupeId() + '/settings/notifications',
        type: "GET",
        context: this,
        success: function(settings) {
          this.settings = settings && settings.push || "all";
          this.$el.find("#notification-options").val(this.settings);
          // this.trigger('settingsLoaded', settings);
        },
        error: function() {
          log('An error occurred while communicating with notification settings');
        }
      });

    },

    closeSettings : function () {
      this.dialog.hide();
      this.dialog = null;
    },

    enableBrowserNotifications: function() {
      notifications.enable();
    },

    afterRender: function() {
      this.validateForm();
      if (this.settings) {
        this.$el.find("#notification-options").val(this.settings);
      }
    },

    getRenderData: function() {
      return _.extend({},
        context.getTroupe(), {
        showNotificationsButton: notifications.hasNotBeenSetup(),
        showNotificationsWarning: notifications.hasBeenDenied(),
        isNativeDesktopApp: context().isNativeDesktopApp,
        troupeUrl: '//' + window.location.host + window.location.pathname
      });
    },

    validateForm : function () {
      var validateEl = this.$el.find('#troupeSettings');
      validateEl.validate({
        rules: {
          name: validation.rules.troupeName()
        },
        messages: {
          name: validation.messages.troupeName()
        },
        showErrors: function(errorMap) {
          var errors = "";

          _.each(_.keys(errorMap), function(key) {
            var errorMessage = errorMap[key];
            errors += errorMessage + "<br>";
          });

          $('#failure-text').html(errors);
          if(errors) {
            $('#request_validation').show();
          } else {
             $('#request_validation').hide();
          }
        }
     });
    },


    saveSettings: function(e) {
      if(e) e.preventDefault();

      var self = this;

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/troupes/' + context.getTroupeId() + '/settings/notifications',
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ push: self.$el.find("#notification-options").val() }),
        success: function() {
          self.dialog.hide();
          self.dialog = null;
        }
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

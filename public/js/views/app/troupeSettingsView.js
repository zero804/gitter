/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
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
      'click #cancel-troupe-settings' : 'closeSettings'
    },

    initialize: function() {
      this.model = context.troupe();
      this.userCollection = itemCollections.users;

      this.listenTo(this.model, 'change:lurk', this.setLurkValue);

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

    setLurkValue: function() {
      var lurk = this.model.get('lurk');
      this.el.querySelector("#lurk-checkbox").checked = lurk;
    },

    closeSettings : function () {
      this.dialog.hide();
      this.dialog = null;
    },

    afterRender: function() {
      if (this.settings) {
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
      var lurk = self.el.querySelector("#lurk-checkbox").checked;


      var count = 0;
      function done() {
        if(++count === 2) {
          self.dialog.hide();
          self.dialog = null;
        }
      }

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/troupes/' + context.getTroupeId() + '/settings/notifications',
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ push: push }),
        success: done
      });


      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/troupes/' + context.getTroupeId(),
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

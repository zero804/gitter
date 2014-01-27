/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'collections/instances/integrated-items',
  'hbs!./tmpl/troupeSettingsTemplate',
  'components/notifications'
], function($, _, context, TroupeViews, itemCollections, troupeSettingsTemplate, notifications) {
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
      this.listenTo(this.model, 'change:notify', this.setNotifyValue);
    },

    setNotifyValue: function() {
      var notify = this.model.get('notify');
      this.$el.find("#notification-options").val(notify ? 'all' : 'mention');
    },

    closeSettings : function () {
      this.dialog.hide();
      this.dialog = null;
    },

    afterRender: function() {
      this.setNotifyValue();
    },

    getRenderData: function() {
      return _.extend({},
        context.getTroupe(), {
        notify: this.model.get('notify') ? 'all' : 'mention',
        notificationsBlocked: notifications.hasBeenDenied(),
        isNativeDesktopApp: context().isNativeDesktopApp,
        troupeUrl: '//' + window.location.host + window.location.pathname
      });
    },

    saveSettings: function(e) {
      if(e) e.preventDefault();

      var self = this;
      var notify = self.$el.find("#notification-options").val() == 'all';

      context.troupe().set('notify', notify);

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/troupes/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ notify: notify }),
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

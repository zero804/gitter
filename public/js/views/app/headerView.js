/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'marionette',
  'hbs!./tmpl/headerViewTemplate',
  'utils/autolink',
  'underscore',
  'components/notifications'
], function($, context, Marionette, headerViewTemplate, autolink, _, notifications)  {
  "use strict";

  return Marionette.ItemView.extend({
    template: headerViewTemplate,
    modelEvents: {
        'change': 'render'
    },
    events: {
      'click #leave-room': 'leaveRoom',
      'click #activity-feed-toggle' : 'toggleActivityFeed',
      'click #notifications-settings-link': 'enableBrowserNotifications'
    },

    initialize: function() {
      this.showActivity = true;
    },

    leaveRoom: function() {
      $.ajax({
        url: "/api/v1/troupes/" + context.getTroupeId() + "/users/" + context.getUserId(),
        data: "",
        type: "DELETE",
      });
    },

    showActivityFeed: function () {
      $('.webhook').parent().parent().slideDown();
      $('#activity-feed-toggle').addClass("show-activity");
    },

    hideActivityFeed: function () {
      $('.webhook').parent().parent().slideUp();
      $('#activity-feed-toggle').removeClass("show-activity");
    },

    toggleActivityFeed: function() {
      if (this.showActivity) {
        this.hideActivityFeed();
        this.showActivity = false;
      } else {
        this.showActivityFeed();
        this.showActivity = true;
      }
    },

    enableBrowserNotifications: function() {
      if(context().desktopNotifications) {
        notifications.enable();
      }
    },

    serializeData: function() {
      var troupe = this.model.toJSON();
      var topic = troupe.topic;
      if (topic) {
        var safeTopic = _.escape(topic);
        topic = autolink(safeTopic);
      }

      return {
        isNativeDesktopApp: context().isNativeDesktopApp,
        permissions: context().permissions,
        oneToOne: troupe.oneToOne,
        troupeName: troupe.name,
        troupeTopic: topic,
        troupeUri : troupe.url,
        troupeFavourite: troupe.favourite
      };
    }
  });

});

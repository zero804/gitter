/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'marionette',
  'hbs!./tmpl/headerViewTemplate',
  'autolink',
  'components/notifications',
  'views/controls/dropdown'
], function($, context, Marionette, headerViewTemplate, autolink, notifications, Dropdown)  {
  "use strict";

  return Marionette.ItemView.extend({
    template: headerViewTemplate,
    modelEvents: {
        'change': 'render'
    },
    ui: {
      cog: '.dropdown-toggle',
      dropdownMenu: '#cog-dropdown'
    },
    events: {
      'click @ui.cog': 'showDropdown',
      'click #leave-room': 'leaveRoom',
      'click #activity-feed-toggle' : 'toggleActivityFeed',
      'click #notifications-settings-link': 'enableBrowserNotifications'
    },

    initialize: function() {
      this.showActivity = true;
    },

    showDropdown: function() {
      this.dropdown.show();
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

      return {
        isNativeDesktopApp: context().isNativeDesktopApp,
        troupeUrl: window.location.origin+troupe.url,
        permissions: context().permissions,
        oneToOne: troupe.oneToOne,
        privateRoom: context().troupe.security,
        troupeName: troupe.name,
        troupeTopic:  troupe.topic,
        troupeUri : troupe.url,
        troupeFavourite: troupe.favourite
      };
    },

    onRender: function() {
      if(!this.dropdown) {
        this.dropdown = new Dropdown({ targetElement: this.ui.cog[0], el: this.ui.dropdownMenu[0], placement: 'right' });
      }
      autolink(this.el);
    }
  });

});

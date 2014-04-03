/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'marionette',
  'backbone',
  'autolink',
  'components/notifications',
  'views/controls/dropdown'
], function($, context, Marionette, Backbone, /*headerViewTemplate, */ autolink, notifications, Dropdown)  {
  "use strict";

  return Marionette.ItemView.extend({
    // template: headerViewTemplate,
    modelEvents: {
        'change': 'redisplay'
    },
    ui: {
      cog: '.dropdown-toggle',
      dropdownMenu: '#cog-dropdown',
      topic: '#trpTopic',
      name: '#name-label',
      favourite: '#favourite-button'
    },
    events: {
      'click @ui.cog': 'showDropdown',
      'click #leave-room': 'leaveRoom',
      'click #activity-feed-toggle' : 'toggleActivityFeed',
      'click #notifications-settings-link': 'enableBrowserNotifications'
    },

    initialize: function() {
      this.bindUIElements();

      this.showActivity = true;
      this.dropdown = new Dropdown({
        allowClickPropagation: true,
        collection: new Backbone.Collection(this.createMenu()),
        targetElement: this.ui.cog[0],
        placement: 'right'
      });

      this.listenTo(this.dropdown, 'selected', function(e) {
        if(e.get('href') === '#leave') {
          this.leaveRoom();
        }
      });
    },

    showDropdown: function() {
      this.dropdown.show();
    },

    createMenu: function() {
        var menuItems = [
          { title: 'Add people to this room', href: '#add' }
        ];

        var c = context();
        var url = this.model.get('url');

        if(context.troupe().get('security') !== 'PRIVATE')
          menuItems.push({ title: 'Share this chat room', href: '#inv' });

        menuItems.push({ divider: true });
        menuItems.push({ title: 'Notifications', href: '#notifications' });

        if(c.permissions.admin) {
          if(c.isNativeDesktopApp) {
            menuItems.push({ title: 'Integrations', href: window.location.origin + url + '#integrations', target: '_blank' });
          } else {
            menuItems.push({ title: 'Integrations', href: '#integrations' });
          }
        }

        menuItems.push({ divider: true });

        var githubType = this.model.get('githubType');
        if(githubType === 'REPO' || githubType === 'ORG') {
          menuItems.push({ title: 'Open in GitHub', href: 'https://www.github.com' + url, target: '_blank' });
        }
        menuItems.push({ title: 'Leave this room', href: '#leave' });

        return menuItems;
      },

    leaveRoom: function() {
      $.ajax({
        url: "/api/v1/rooms/" + context.getTroupeId() + "/users/" + context.getUserId(),
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

    redisplay: function() {
      var model = this.model;

      this.ui.name.text(model.get('name'));

      this.ui.topic.text(model.get('topic'));
      autolink(this.ui.topic[0]);

      this.ui.favourite.toggleClass('favourited', !!model.get('favourite'));
    }

  });

});

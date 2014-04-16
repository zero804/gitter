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
    modelEvents: {
      change: 'redisplay'
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
      'click @ui.favourite': 'toggleFavourite'
    },

    initialize: function() {
      this.bindUIElements();

      this.showActivity = true;
      if(context.isLoggedIn()) {
        this.dropdown = new Dropdown({
          allowClickPropagation: true,
          collection: new Backbone.Collection(this.createMenu()),
          targetElement: this.ui.cog[0],
          placement: 'right'
        });

        this.listenTo(this.dropdown, 'selected', function(e) {
          var href = e.get('href');
          if(href === '#leave') {
            this.leaveRoom();
          } else if(href === '#notifications') {
            this.requestBrowserNotificationsPermission();
          }
        });
      } else {
        this.ui.favourite.css({ visibility: 'hidden' });
      }
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

        if(c.permissions && c.permissions.admin) {
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
      if(!context.isLoggedIn()) return;

      $.ajax({
        url: "/api/v1/rooms/" + context.getTroupeId() + "/users/" + context.getUserId(),
        data: "",
        type: "DELETE",
      });
    },

    toggleFavourite: function() {
      if(!context.isLoggedIn()) return;

      this.ui.favourite.toggleClass('favourited');
      var isFavourite = this.ui.favourite.hasClass('favourited');

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ favourite: isFavourite })
      });
    },


    requestBrowserNotificationsPermission: function() {
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

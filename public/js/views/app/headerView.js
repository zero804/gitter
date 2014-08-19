define([
  'jquery',
  'utils/context',
  'marionette',
  'backbone',
  'autolink',
  'components/notifications',
  'views/controls/dropdown'
], function($, context, Marionette, Backbone, autolink, notifications, Dropdown)  {
  "use strict";

  return Marionette.ItemView.extend({

    modelEvents: {
      change: 'redisplay'
    },
    ui: {
      cog: '.js-chat-settings',
      dropdownMenu: '#cog-dropdown',
      topic: '.js-chat-topic',
      name: '.js-chat-name',
      favourite: '.js-favourite-button'
    },
    events: {
      'click @ui.cog': 'showDropdown',
      'click #leave-room': 'leaveRoom',
      'click @ui.favourite': 'toggleFavourite',
      'dblclick @ui.topic': 'showInput',
      'keydown textarea': 'detectKeys',
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
      this.redisplay();
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

        menuItems.push({ title: 'Archives', href: 'archives/all', target: '_blank'});

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

      this.ui.favourite.toggleClass('favourite');
      var isFavourite = this.ui.favourite.hasClass('favourite');

      $.ajax({
        url: '/api/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ favourite: isFavourite })
      });
    },

    saveTopic: function() {
      var topic = this.$el.find('textarea').val();
      context.troupe().set('topic', topic);
      $.ajax({
        url: '/api/v1/rooms/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ topic: topic })
      });
      // TODO: once saved topic recalculate the header size
      this.editingTopic = false;
    },

    cancelEditTopic: function() {
      this.editingTopic = false;
      this.redisplay();
    },

    detectKeys: function(e) {
      this.detectReturn(e);
      this.detectEscape(e);
    },

    detectReturn: function(e) {
      if(e.keyCode === 13 && (!e.ctrlKey && !e.shiftKey)) {
        // found submit
        this.saveTopic();
        e.stopPropagation();
        e.preventDefault();
      }
    },

    detectEscape: function(e) {
      if (e.keyCode === 27) {
        // found escape, cancel edit
        this.cancelEditTopic();
      }
    },

    showInput: function() {
      if (!context().permissions.admin) return;
      if (this.editingTopic === true) return;
      this.editingTopic = true;

      var topicInputText = this.$el.find('.js-chat-topic');
      var unsafeText = topicInputText.text();

      this.oldTopic = unsafeText;

      // create inputview
      topicInputText.html("<textarea class='topic-input'></textarea>");

      var textarea = topicInputText.find('textarea').val(unsafeText);

      setTimeout(function() {
        textarea.select();
      }, 10);

    },

    requestBrowserNotificationsPermission: function() {
      if(context().desktopNotifications) {
        notifications.enable();
      }
    },

    redisplay: function(e) {
      var model = this.model;
      this.ui.name.text(model.get('name'));
      this.ui.topic.text(model.get('topic'));
      autolink(this.ui.topic[0]);
      this.ui.favourite.toggleClass('favourite', !!model.get('favourite'));
    },


  });

});

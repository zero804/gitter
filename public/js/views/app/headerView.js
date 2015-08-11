"use strict";
var $ = require('jquery');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var autolink = require('autolink');
var notifications = require('components/notifications');
var Dropdown = require('views/controls/dropdown');
var appEvents = require('utils/appevents');
require('bootstrap_tooltip');

module.exports = (function() {


  function generateTooltip(troupe) {
    if (troupe.get('security') === 'PUBLIC') return 'Anyone can join';

    switch(troupe.get('githubType')) {
      case 'REPO':
        return 'All repo collaborators can join';

      case 'ORG':
        return 'All org members can join';

      case 'REPO_CHANNEL':
        var repoName = troupe.get('uri').split('/')[1];
        var repoRealm = troupe.get('security') === 'PRIVATE' ? 'Only invited users' : 'Anyone in ' + repoName;
        return repoRealm + ' can join';

      case 'ORG_CHANNEL':
        var orgName = troupe.get('uri').split('/')[0];
        var orgRealm = troupe.get('security') === 'PRIVATE' ? 'Only invited users' : 'Anyone in ' + orgName;
        return orgRealm + ' can join';

      case 'USER_CHANNEL':
        return 'Only invited users can join';

      default:
        return troupe.get('oneToOne') ? 'This chat is just between you two' : 'Only invited users can join';
    }
  }

  return Marionette.ItemView.extend({

    modelEvents: {
      change: 'redisplay'
    },

    ui: {
      cog: '.js-chat-settings',
      dropdownMenu: '#cog-dropdown',
      topic: '.js-chat-topic',
      name: '.js-chat-name',
      favourite: '.js-favourite-button',
      orgrooms: '.js-org-page'
    },

    events: {
      'click @ui.cog': 'showDropdown',
      'click #leave-room': 'leaveRoom',
      'click @ui.favourite': 'toggleFavourite',
      'dblclick @ui.topic': 'showInput',
      'keydown textarea': 'detectKeys',
      'click @ui.orgrooms': 'goToOrgRooms'
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

      $('.js-chat-name').tooltip({ placement: 'right', title: function() {
        return generateTooltip(context.troupe());
      }});

      $('.js-org-page').tooltip({ placement: 'left', title: function() {
        var orgName = context().troupe.uri.split('/')[0];
        return 'More ' + orgName + ' rooms';
      }});

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
        var isAdmin = c.permissions && c.permissions.admin;
        var url = this.model.get('url');

        menuItems.push({ title: 'Share this chat room', href: '#share' });
        menuItems.push({ divider: true });
        menuItems.push({ title: 'Notifications', href: '#notifications' });

        if(isAdmin) {
          if(c.isNativeDesktopApp) {
            menuItems.push({ title: 'Integrations', href: context.env('basePath') + url + '#integrations', target: '_blank', dataset: { disableRouting: 1 } });
          } else {
            menuItems.push({ title: 'Integrations', href: '#integrations' });
          }
          if(context().troupe.githubType !== 'USER_CHANNEL'){
            menuItems.push({ title: 'Edit tags', href: '#tags/' + context().troupe.id });
          }
        }

        menuItems.push({ divider: true });

        menuItems.push({ title: 'Archives', href: 'archives/all', target: '_blank'});

        var githubType = this.model.get('githubType');
        if(githubType === 'REPO' || githubType === 'ORG') {
          menuItems.push({ title: 'Open in GitHub', href: 'https://www.github.com' + url, target: '_blank' });
        }

        menuItems.push({ divider: true });

        if (isAdmin) {
          menuItems.push({ title: 'Delete this room', href: '#delete' });
        }

        menuItems.push({ title: 'Leave this room', href: '#leave' });

        return menuItems;
      },

    leaveRoom: function() {
      if(!context.isLoggedIn()) return;

      apiClient.room.delete('/users/' + context.getUserId(), { })
        .then(function() {
          appEvents.trigger('navigation', '/home', 'home', ''); // TODO: figure out a title
        });
    },

    goToOrgRooms: function() {
      var orgName = context().troupe.uri.split('/')[0];
      appEvents.trigger('navigation', '/orgs/' + orgName + '/rooms', 'iframe', orgName + ' rooms');
    },


    toggleFavourite: function() {
      if(!context.isLoggedIn()) return;

      this.ui.favourite.toggleClass('favourite');
      var isFavourite = this.ui.favourite.hasClass('favourite');

      apiClient.userRoom.put('', { favourite: isFavourite });

    },

    saveTopic: function() {
      var topic = this.$el.find('textarea').val();
      context.troupe().set('topic', topic);

      apiClient.room.put('', { topic: topic });

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

      var unsafeText = this.ui.topic.text();

      this.oldTopic = unsafeText;

      // create inputview
      this.ui.topic.html("<textarea class='topic-input'></textarea>");

      var textarea = this.ui.topic.find('textarea').val(unsafeText);

      setTimeout(function() {
        textarea.select();
      }, 10);

    },

    requestBrowserNotificationsPermission: function() {
      if(context().desktopNotifications) {
        notifications.enable();
      }
    },

    redisplay: function() {
      var model = this.model;

      if (this.ui.topic.length) {
        this.ui.topic.text(model.get('topic'));
        autolink(this.ui.topic[0]);
      }

      this.ui.favourite.toggleClass('favourite', !!model.get('favourite'));
    }

  });


})();

/* eslint complexity: ["error", 16] */
'use strict';
var _ = require('underscore');
var context = require('utils/context');
var clientEnv = require('gitter-client-env');
var apiClient = require('components/apiClient');
var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var cocktail = require('cocktail');
var autolink = require('autolink');
var userNotifications = require('components/user-notifications');
var Dropdown = require('views/controls/dropdown');
var appEvents = require('utils/appevents');
var KeyboardEventMixin = require('views/keyboard-events-mixin');
var headerViewTemplate = require('./tmpl/headerViewTemplate.hbs');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
var toggleClass = require('utils/toggle-class');
var avatars = require('gitter-web-avatars');

require('views/behaviors/tooltip');


function getPrivateStatus(data) {
  if (data.security === 'PUBLIC') {
    return false;
  }
  // actually everything not-public in getChatNameTitle says it is private in
  // some way, but be safe for now.
  return (data.security === 'PRIVATE' || ['REPO', 'ORG', 'REPO_CHANNEL', 'ORG_CHANNEL', 'USER_CHANNEL', 'ONETOONE'].indexOf(data.githubType) !== -1);
}

function getGithubUrl(data) {
  if (data.githubType !== 'REPO') return;
  return 'https://github.com' + data.url;
}

/**
 * TODO: this should be using the user object to
 * get room information in a one-to-one room
 */
function getAvatarUrlForRoom(model) {
  if (model.get('oneToOne')) {
    if (model.get('user')) {
      return avatars.getForUser(model.get('user'));
    }

    // TODO: investigate if and why this is happening...
    return avatars.getForRoomUri(model.get('name'));
  }

  return avatars.getForRoomUri(model.get('uri'))
}

var HeaderView = Marionette.ItemView.extend({
  template: headerViewTemplate,

  modelEvents: {
    change:       'renderIfRequired',
  },

  ui: {
    cog:            '.js-chat-settings',
    dropdownMenu:   '#cog-dropdown',
    topic:          '.js-room-topic',
    topicWrapper:   '.js-room-topic-wrapper',
    topicActivator: '.js-room-topic-edit-activator',
    name:           '.js-chat-name',
    favourite:      '.js-favourite-button',
    orgrooms:       '.js-chat-header-org-page-action',
    toggleRightToolbarButton: '.js-right-toolbar-toggle-button',
  },

  events: {
    'click @ui.cog':               'showDropdown',
    'click #leave-room':           'leaveRoom',
    'click @ui.favourite':         'toggleFavourite',
    'dblclick @ui.topicActivator': 'showInput',
    'keydown textarea':            'detectKeys',
    'click @ui.orgrooms':          'goToOrgRooms',
    'click @ui.toggleRightToolbarButton': 'toggleRightToolbar'
  },

  keyboardEvents: {
     'room-topic.edit': 'showInput'
   },

  behaviors: {
    Tooltip: {
      '.js-chat-name': { titleFn: 'getChatNameTitle', placement: 'right' },
      '.js-chat-header-org-page-action': { placement: 'left' },
      '.js-favourite-button': { placement: 'left' },
      '.js-chat-settings': { placement: 'left' }
    },
  },

  initialize: function(options) {
    this.rightToolbarModel = options.rightToolbarModel;
    this.menuItemsCollection = new Backbone.Collection([]);
    this.buildDropdown();

    this.listenTo(this.rightToolbarModel, 'change:isPinned', this.onPanelPinStateChange, this);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    var orgName = getOrgNameFromTroupeName(data.name);
    var orgPageHref = '/orgs/' + orgName + '/rooms/';
    _.extend(data, {
      headerView: {
        avatarUrl: getAvatarUrlForRoom(this.model)
      },
      troupeName:      data.name,
      troupeFavourite: !!data.favourite,
      troupeTopic:     data.topic,
      user:            !!context.isLoggedIn(),
      isAdmin:         context.isTroupeAdmin(),
      archives:        this.options.archives,
      oneToOne:        (data.githubType === 'ONETOONE'),
      githubLink:      getGithubUrl(data),
      isPrivate:       getPrivateStatus(data),
      orgName:         orgName,
      orgPageHref:     orgPageHref,
      shouldShowPlaceholderRoomTopic: data.userCount <= 1,
      isRightToolbarPinned: this.getIsRightToolbarPinned()
    });

    return data;
  },

  buildDropdown: function() {
    if (context.isLoggedIn()) {
      this.dropdown = new Dropdown({
        allowClickPropagation: true,
        collection: this.menuItemsCollection,
        placement: 'right',

        // Do not set the target element for now as it's re-rendered on room
        // change. We'll set it dynamically before showing the dropdown
      });

      this.listenTo(this.dropdown, 'selected', function(e) {
        var href = e.get('href');
        if (href === '#leave') {
          this.leaveRoom();
        } else if (href === '#notifications') {
          this.requestBrowserNotificationsPermission();
        }
      });
    }
  },

  getIsRightToolbarPinned: function() {
    var isRightToolbarPinned = true;
    if(this.rightToolbarModel) {
      isRightToolbarPinned = this.rightToolbarModel.get('isPinned');
    }

    return isRightToolbarPinned;
  },

  onPanelPinStateChange: function() {
    // Archives don't have certain actions
    if(this.ui.toggleRightToolbarButton.length > 0) {
      toggleClass(this.ui.toggleRightToolbarButton[0], 'pinned', this.getIsRightToolbarPinned());
    }
  },

  getChatNameTitle: function() {
    var model = this.model;
    if (model.get('security') === 'PUBLIC') return 'Anyone can join';

    switch (model.get('githubType')) {
      case 'REPO':
        return 'All repo collaborators can join';

      case 'ORG':
        return 'All org members can join';

      case 'REPO_CHANNEL':
        var repoName = model.get('uri').split('/')[1];
        var repoRealm = model.get('security') === 'PRIVATE' ? 'Only invited users' : 'Anyone in ' + repoName;
        return repoRealm + ' can join';

      case 'ORG_CHANNEL':
        var orgName = model.get('uri').split('/')[0];
        var orgRealm = model.get('security') === 'PRIVATE' ? 'Only invited users' : 'Anyone in ' + orgName;
        return orgRealm + ' can join';

      case 'USER_CHANNEL':
        return 'Only invited users can join';

      default:
        return model.get('oneToOne') ? 'This chat is just between you two' : 'Only invited users can join';
    }
  },

  onRender: function() {
    if (this.dropdown) {
      // Deal with re-renders
      this.dropdown.hide();
    }

    this.ui.favourite.css({ visibility: context.isLoggedIn() ? 'visible' : 'hidden' });
    this.ui.favourite.toggleClass('favourite', !!this.model.get('favourite'));
    var topicEl = this.ui.topic[0];
    if (topicEl) {
      autolink(topicEl);
    }

    this.onPanelPinStateChange();
  },

  showDropdown: function() {
    this.dropdown.setTargetElement(this.ui.cog[0]);
    this.menuItemsCollection.reset(this.createMenu());
    this.dropdown.show();
  },

  createMenu: function() {
      var menuItems = [];
      var c = context();
      var isStaff = context.isStaff();
      var isAdmin = context.isTroupeAdmin();
      var isRoomMember = context.isRoomMember();
      var githubType = this.model.get('githubType');
      var isOneToOne = githubType === 'ONETOONE';
      var security = this.model.get('security');
      var url = this.model.get('url');

      if (!isOneToOne) {
        menuItems.push({ title: 'Add people to this room', href: '#add' });
        menuItems.push({ title: 'Share this chat room', href: '#share' });
        menuItems.push({ divider: true });
      }

      if (isRoomMember) menuItems.push({ title: 'Notifications', href: '#notifications' });

      if (!isOneToOne) {
        if (isAdmin) {
          if (c.isNativeDesktopApp) {
            menuItems.push({ title: 'Integrations', href: clientEnv['basePath'] + url + '#integrations', target: '_blank', dataset: { disableRouting: 1 } });
          } else {
            menuItems.push({ title: 'Integrations', href: '#integrations' });
          }
        }

        if (isStaff || isAdmin) {
          menuItems.push({ title: 'Tags', href: '#tags' });
          if (security == 'PUBLIC') {
            menuItems.push({ title: 'Settings', href: '#settings' });
          }
          menuItems.push({ divider: true });
        }

        menuItems.push({ title: 'Archives', href: url + '/archives/all', target: '_blank'});

        if (githubType === 'REPO' || githubType === 'ORG') {
          menuItems.push({ title: 'Open in GitHub', href: 'https://www.github.com' + url, target: '_blank' });
        }

        if (isAdmin || isRoomMember) {
          menuItems.push({ divider: true });
        }

        if (isAdmin) {
          menuItems.push({ title: 'Delete this room', href: '#delete' });
        }

        if (isRoomMember) {
          menuItems.push({ title: 'Leave this room', href: '#leave' });
        }
      }

      return menuItems;
    },

  leaveRoom: function() {
    if (!context.isLoggedIn()) return;

    apiClient.room.delete('/users/' + context.getUserId(), { })
      .then(function() {
        appEvents.trigger('navigation', '/home', 'home', ''); // TODO: figure out a title
        //context.troupe().set('roomMember', false);
      });
  },

  goToOrgRooms: function(e) {
    e.preventDefault();
    var orgName = getOrgNameFromTroupeName(context.troupe().get('name'));
    appEvents.trigger('navigation', '/orgs/' + orgName + '/rooms', 'iframe', orgName + ' rooms');
  },

  toggleFavourite: function() {
    if (!context.isLoggedIn()) return;

    this.model.set('favourite', !this.model.get('favourite'));
    var isFavourite = !!this.model.get('favourite');
    this.ui.favourite.toggleClass('favourite', isFavourite);

    apiClient.userRoom.put('', { favourite: isFavourite });

  },

  toggleRightToolbar: function() {
    this.rightToolbarModel.set({
      isPinned: !this.rightToolbarModel.get('isPinned')
    });
  },

  saveTopic: function() {
    var topic = this.$el.find('textarea').val();
    context.troupe().set('topic', topic);

    apiClient.room.put('', { topic: topic });

    this.editingTopic = false;
  },

  cancelEditTopic: function() {
    this.editingTopic = false;
    this.render();
  },

  detectKeys: function(e) {
    this.detectReturn(e);
    this.detectEscape(e);
  },

  detectReturn: function(e) {
    if (e.keyCode === 13 && (!e.ctrlKey && !e.shiftKey)) {
      // found submit
      e.stopPropagation();
      e.preventDefault();
      this.saveTopic();
    }
  },

  detectEscape: function(e) {
    if (e.keyCode === 27) {
      // found escape, cancel edit
      this.cancelEditTopic();
    }
  },

  showInput: function() {
    if (!context.isTroupeAdmin()) return;
    if (this.editingTopic === true) return;
    this.editingTopic = true;

    var unsafeText = this.model.get('topic');

    this.oldTopic = unsafeText;

    toggleClass(this.ui.topicActivator[0], 'is-editing', true);
    toggleClass(this.ui.topicWrapper[0], 'is-editing', true);
    toggleClass(this.ui.topic[0], 'is-editing', true);
    // create inputview
    this.ui.topic.html('<textarea class=\'topic-input\'></textarea>');

    var textarea = this.ui.topic.find('textarea').val(unsafeText);

    setTimeout(function() {
      textarea.select();
    }, 10);

  },

  requestBrowserNotificationsPermission: function() {
    userNotifications.requestAccess();
  },

  // Look at the attributes that have changed
  // and decide whether to re-render
  renderIfRequired: function() {
    var model = this.model;

    function changedContains(changedAttributes) {
      var changed = model.changed;
      if (!changed) return;
      for (var i = 0; i < changedAttributes.length; i++) {
        if (changed.hasOwnProperty(changedAttributes[i])) return true;
      }
    }

    if (changedContains(['name', 'id', 'githubType', 'favourite', 'topic', 'ownerIsOrg', 'roomMember'])) {
      // The template may have been set to false
      // by the Isomorphic layout
      this.options.template = headerViewTemplate;
      this.render();


      // If it is a new chat header, we can edit the topic again
      this.editingTopic = false;
    }
  },
});

cocktail.mixin(HeaderView, KeyboardEventMixin);


module.exports = HeaderView;

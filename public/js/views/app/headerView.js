'use strict';

var _ = require('underscore');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var cocktail = require('cocktail');
var autolink = require('autolink');
var clientEnv = require('gitter-client-env');
var context = require('utils/context');
var toggleClass = require('utils/toggle-class');
var MenuBuilder = require('utils/menu-builder');
var appEvents = require('utils/appevents');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');

var apiClient = require('components/apiClient');
var userNotifications = require('components/user-notifications');
var Dropdown = require('views/controls/dropdown');
var KeyboardEventMixin = require('views/keyboard-events-mixin');
var headerViewTemplate = require('./tmpl/headerViewTemplate.hbs');
var getHeaderViewOptions = require('gitter-web-shared/templates/get-header-view-options');

require('views/behaviors/tooltip');
require('transloadit');


var TRANSLOADIT_DEFAULT_OPTIONS = {
  wait: true,
  modal: false,
  autoSubmit: false,
  debug: false
};



var HeaderView = Marionette.ItemView.extend({
  template: headerViewTemplate,

  modelEvents: {
    change: 'renderIfRequired',
  },

  ui: {
    avatarImage: '.js-chat-header-avatar-image',
    groupAvatarUploadForm: '.js-chat-header-group-avatar-upload-form',
    groupAvatarFileInput: '.js-chat-header-group-avatar-upload-input',
    groupAvatarSignatureInput: '.js-chat-header-group-avatar-upload-signature',
    groupAvatarParamsInput: '.js-chat-header-group-avatar-upload-params',
    groupAvatarProgress: '.js-chat-header-group-avatar-upload-progress',
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
    'change @ui.groupAvatarFileInput': 'onGroupAvatarUploadChange',
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
      '.js-chat-header-group-avatar-upload-label': { placement: 'right' },
      '.js-chat-name': { titleFn: 'getChatNameTitle', placement: 'right' },
      '.js-chat-header-org-page-action': { placement: 'left' },
      '.js-favourite-button': { placement: 'left' },
      '.js-chat-settings': { placement: 'left' }
    },
  },

  initialize: function(options) {
    this.groupsCollection = options.groupsCollection;
    this.roomCollection = options.roomCollection;
    this.rightToolbarModel = options.rightToolbarModel;
    this.menuItemsCollection = new Backbone.Collection([]);
    this.buildDropdown();

    this.listenTo(this.rightToolbarModel, 'change:isPinned', this.onPanelPinStateChange, this);
  },

  serializeData: function() {
    var data = this.model.toJSON();

    var isStaff = context.isStaff();
    var isAdmin = context.isTroupeAdmin();
    var canChangeGroupAvatar = isStaff || isAdmin;
    _.extend(data, {
      headerView: getHeaderViewOptions(data),
      user: !!context.isLoggedIn(),
      archives: this.options.archives,
      shouldShowPlaceholderRoomTopic: data.userCount <= 1,
      isRightToolbarPinned: this.rightToolbarModel.get('isPinned'),
      canChangeGroupAvatar: canChangeGroupAvatar
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

  onPanelPinStateChange: function() {
    // Archives don't have certain actions
    if(this.ui.toggleRightToolbarButton.length > 0) {
      toggleClass(this.ui.toggleRightToolbarButton[0], 'pinned', this.rightToolbarModel.get('isPinned'));
    }
  },

  getChatNameTitle: function() {
    var model = this.model;
    if (model.get('public')) {
      return 'Anyone can join';
    }

    if (model.get('oneToOne')) {
      return 'This chat is just between you two';
    }

    var backend = model.get('backend');

    switch (backend && backend.type) {
      case 'GH_REPO':
        return 'All repo collaborators can join';

      case 'GH_ORG':
        return 'All org members can join';

      default:
        return 'Only invited users can join';
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
    var c = context();
    var isStaff = context.isStaff();
    var isAdmin = context.isTroupeAdmin();
    var isRoomMember = context.isRoomMember();
    var backend = this.model.get('backend');
    var type = backend && backend.type;
    var isOneToOne = this.model.get('oneToOne');
    var isPublic = this.model.get('public');
    var url = this.model.get('url');
    var staffOrAdmin = isStaff || isAdmin;
    var isGitHubObject = type === 'GH_REPO' || type === 'GH_ORG';

    var menuBuilder = new MenuBuilder();

    menuBuilder.addConditional(!isOneToOne, { title: 'Add people to this room', href: '#add' });
    menuBuilder.addConditional(!isOneToOne, { title: 'Share this chat room', href: '#share' });
    menuBuilder.addDivider();
    menuBuilder.addConditional(isRoomMember, { title: 'Notifications', href: '#notifications' });

    if (!isOneToOne) {
      var settingMenuItem = c.isNativeDesktopApp ?
          { title: 'Integrations', href: clientEnv['basePath'] + url + '#integrations', target: '_blank', dataset: { disableRouting: 1 } } :
          { title: 'Integrations', href: '#integrations' };

      menuBuilder.addConditional(isAdmin, settingMenuItem);

      menuBuilder.addConditional(staffOrAdmin, { title: 'Tags', href: '#tags' });
      menuBuilder.addConditional(isPublic && staffOrAdmin ,{ title: 'Settings', href: '#settings' });
      menuBuilder.addDivider();

      menuBuilder.add({ title: 'Archives', href: url + '/archives/all', target: '_blank'});
      menuBuilder.addConditional(isGitHubObject, { title: 'Open in GitHub', href: 'https://www.github.com' + url, target: '_blank' });

      menuBuilder.addDivider();

      menuBuilder.addConditional(isAdmin, { title: 'Delete this room', href: '#delete' });
      menuBuilder.addConditional(isRoomMember, { title: 'Leave this room', href: '#leave' });
    }

    return menuBuilder.getItems();
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
    var group = this.model.get('group');
    if (!group) return;
    var groupUri = group.uri;
    appEvents.trigger('navigation', '/orgs/' + groupUri + '/rooms', 'iframe', groupUri + ' rooms');
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
    this.ui.topic.html('<textarea class="topic-input"></textarea>');

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

    if (changedContains(['uri', 'name', 'id', 'favourite', 'topic', 'avatarUrl', 'group', 'roomMember', 'backend', 'public'])) {
      // The template may have been set to false
      // by the Isomorphic layout
      this.options.template = headerViewTemplate;
      this.render();


      // If it is a new chat header, we can edit the topic again
      this.editingTopic = false;
    }
  },

  onGroupAvatarUploadChange: function() {
    this.uploadGroupAvatar();
  },

  updateProgressBar: function(spec) {
    var bar = this.ui.groupAvatarProgress;
    var value = spec.value && (spec.value * 100) + '%';
    bar.css('width', value);
  },

  resetProgressBar: function() {
    this.ui.groupAvatarProgress.addClass('hidden');
    this.updateProgressBar({
      value: 0
    });
  },

  handleUploadStart: function() {
    this.ui.groupAvatarProgress.removeClass('hidden');
    this.updateProgressBar({
      // Just show some progress
      value: .2
    });
  },

  handleUploadProgress: function(done, expected) {
    this.updateProgressBar({
      value: done / expected
    });
  },

  handleUploadSuccess: function(/*res*/) {
    this.resetProgressBar();
    appEvents.triggerParent('user_notification', {
      title: 'Avatar upload complete',
      text: 'Wait a few moments for your new avatar to appear...'
    });

    // TODO: Make this work not on refresh
    // See snippet below
    setTimeout(function() {
      appEvents.triggerParent('navigation', null, null, null, {
        refresh: true
      });
    }.bind(this), 1000);
    /* * /
    var urlParse = require('url-parse');
    var urlJoin = require('url-join');
    var avatars = require('gitter-web-avatars');
    setTimeout(function() {
      var currentRoom = context.troupe();
      var currentGroup = this.groupsCollection.get(currentRoom.get('groupId'));

      // Assemble the new URL
      // We cache bust the long-running one so we can show the updated avatar
      // When the user refreshes, they will go back to using the version avatar URL
      var unversionedAvatarUrl = avatars.getForGroupId(currentGroup.get('id'));
      var parsedAvatarUrl = urlParse(unversionedAvatarUrl, true);
      parsedAvatarUrl.query.cacheBuster = Math.ceil(Math.random() * 9999);
      var newAvatarUrl = parsedAvatarUrl.toString();

      currentGroup.set('avatarUrl', newAvatarUrl);
      currentRoom.set('avatarUrl', newAvatarUrl);
      // TODO: This does not work because it is empty and is not shared with parent frame
      if(this.roomCollection) {
        console.log(this.roomCollection.where({ groupId: currentGroup.get('id') }));
      }
    }.bind(this), 5000);
    /* */
  },

  handleUploadError: function(err) {
    appEvents.triggerParent('user_notification', {
      title: 'Error Uploading File',
      text:  err.message
    });
    this.resetProgressBar();
  },

  uploadGroupAvatar: function() {
    var currentRoom = context.troupe();
    if(!this.groupsCollection || !currentRoom) {
      return;
    }

    var currentGroup = this.groupsCollection.get(currentRoom.get('groupId'));
    // For groups that were created within page lifetime
    var groupId = currentGroup ? currentGroup.get('id') : currentRoom.get('groupId');
    var groupUri = currentGroup ? currentGroup.get('uri') : getOrgNameFromUri(document.location.pathname);

    this.handleUploadStart();

    apiClient.priv.get('/generate-signature', {
      type: 'avatar',
        group_id: groupId,
        group_uri: groupUri
      })
      .then(function(res) {
        this.ui.groupAvatarParamsInput[0].setAttribute('value', res.params);
        this.ui.groupAvatarSignatureInput[0].setAttribute('value', res.sig);

        var formData = new FormData(this.ui.groupAvatarUploadForm[0]);

        this.ui.groupAvatarUploadForm.unbind('submit.transloadit');
        this.ui.groupAvatarUploadForm.transloadit(_.extend(TRANSLOADIT_DEFAULT_OPTIONS, {
          formData: formData,
          onStart: this.handleUploadStart.bind(this),
          onProgress: this.handleUploadProgress.bind(this),
          onSuccess: this.handleUploadSuccess.bind(this),
          onError: this.handleUploadError.bind(this)
        }));

        this.ui.groupAvatarUploadForm.trigger('submit.transloadit');
      }.bind(this));
  }
});

cocktail.mixin(HeaderView, KeyboardEventMixin);


module.exports = HeaderView;

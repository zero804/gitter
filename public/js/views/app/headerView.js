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
var toggleClass = require('utils/toggle-class');
var getHeaderViewOptions = require('gitter-web-shared/templates/get-header-view-options');
var MenuBuilder = require('../../utils/menu-builder');

require('views/behaviors/tooltip');

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

    _.extend(data, {
      headerView:      getHeaderViewOptions(data),
      user:            !!context.isLoggedIn(),
      archives:        this.options.archives,
      shouldShowPlaceholderRoomTopic: data.userCount <= 1,
      isRightToolbarPinned: this.rightToolbarModel.get('isPinned')
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

    if (changedContains(['uri', 'name', 'id', 'favourite', 'topic', 'group', 'roomMember', 'backend', 'public'])) {
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

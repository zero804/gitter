'use strict';

var Promise = require('bluebird');
var _ = require('underscore');
var Marionette = require('backbone.marionette');
var fuzzysearch = require('fuzzysearch');
var urlJoin = require('url-join');
var FilteredCollection = require('backbone-filtered-collection');
var fastdom = require('fastdom');
var toggleClass = require('utils/toggle-class');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');
var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');
var apiClient = require('components/apiClient');
var appEvents = require('utils/appevents');
var context = require('../../utils/context');
var GroupSelectView = require('views/create-room/groupSelectView');
var ModalView = require('./modal');
var FilteredSelect = require('./filtered-select');
var roomAvailabilityStatusConstants = require('../create-room/room-availability-status-constants');
var scopeUpgrader = require('../../components/scope-upgrader');

var template = require('./tmpl/create-room-view.hbs');
var repoTypeaheadItemTemplate = require('./tmpl/create-room-repo-typeahead-item-view.hbs');

var checkForRepoExistence = function(orgName, repoName) {
  if(orgName && repoName) {
    var repoUri = (orgName + '/' + repoName).toLowerCase();
    return apiClient.priv.get('/gh/repos/' + repoUri)
      .then(function() {
        return true;
      })
      .catch(function() {
        return false;
      });
  }

  return Promise.resolve(false);
};

function promptForHook() {
  appEvents.trigger('user_notification', {
    title: 'Authorisation',
    text: 'Your room has been created, but we weren\'t able ' +
      'to integrate with the repository as we need write ' +
      'access to your GitHub repositories. Click here to ' +
      'give Gitter access to do this.',
    timeout: 12000,
    click: function() {
      return scopeUpgrader('public_repo')
        .then(function() {
          return apiClient.room.put('', { autoConfigureHooks: 1 });
        })
        .then(function() {
          appEvents.trigger('user_notification', {
            title: 'Thank You',
            text: 'Your integrations have been setup.',
          });
        });
    },
  });
}

var CreateRoomView = Marionette.LayoutView.extend({
  template: template,

  ui: {
    nameInput: '.js-create-room-name-input',
    clearNameButton: '.js-create-room-clear-name-button',
    associatedProjectName: '.js-associated-github-project-name',
    associatedProjectLink: '.js-associated-github-project-link',
    securityOptions: '.js-create-room-security-radio',
    publicSecurityOption: '.js-create-room-security-public-radio',
    privateSecurityOption: '.js-create-room-security-private-radio',
    roomDetailSection: '.js-create-room-detail-section',
    onlyGithubUsersOption: '.js-create-room-only-github-users-option',
    onlyGithubUsersOptionInput: '.js-create-room-only-github-users-option-input',
    onlyOrgUsersOption: '.js-create-room-only-org-users-option',
    onlyOrgUsersOptionInput: '.js-create-room-only-org-users-option-input',
    onlyOrgUsersOptionOrgName: '.js-create-room-only-org-users-option-org-name',
    allowBadgerOption: '.js-create-room-allow-badger',
    allowBadgerOptionInput: '.js-create-room-allow-badger-option-input',
    roomAvailabilityStatusMessage: '.js-room-availability-status-message'
  },

  regions: {
    groupSelectRegion: '.js-create-room-group-input',
  },

  events: {
    'input @ui.nameInput': 'onNameInput',
    'click @ui.clearNameButton': 'onNameClearActivated',
    'change @ui.securityOptions': 'onSecurityChange',
    'change @ui.onlyGithubUsersOptionInput': 'onOnlyGitHubUsersOptionChange',
    'change @ui.onlyOrgUsersOptionInput': 'onOnlyOrgUsersOptionChange',
    'change @ui.allowBadgerOptionInput': 'onAllowBadgerOptionChange'
  },

  modelEvents: {
    'change:groupId': 'onGroupIdChange',
    'change:roomName': 'onRoomNameChange',
    'change:associatedGithubProject': 'safeUpdateFields',
    'change:security': 'safeUpdateFields',
    'change:roomAvailabilityStatus': 'onRoomAvailabilityStatusChange'
  },

  initialize: function(attrs) {
    this.model = attrs.model;
    this.groupsCollection = attrs.groupsCollection;
    this.troupeCollection = attrs.troupeCollection;
    this.repoCollection = attrs.repoCollection;
    this.hasRendered = false;

    this.filteredRepoCollection = new FilteredCollection({
      collection: this.repoCollection
    });

    this.model.set({
      groupId: attrs.initialGroupId || null,
      roomName: attrs.initialRoomName || ''
    });

    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    this.listenToOnce(this.groupsCollection, 'sync', this.selectInitialGroup);
  },

  onRender: function() {
    this.groupSelect = new GroupSelectView({
      groupsCollection: this.groupsCollection,
      dropdownClass: 'create-room-group-typeahead-dropdown',
    });
    this.groupSelectRegion.show(this.groupSelect);

    this.repoNameTypeahead = new FilteredSelect({
      el: this.ui.nameInput[0],
      collection: this.filteredRepoCollection,
      itemTemplate: repoTypeaheadItemTemplate,
      dropdownClass: 'create-room-repo-name-typeahead-dropdown',
      filter: function(input, model) {
        var mName = model.get('name') || '';
        return fuzzysearch(input.toLowerCase(), mName.toLowerCase());
      }
    });

    this.listenTo(this.repoNameTypeahead, 'selected', this.onRepoSelected, this);
    this.listenTo(this.groupSelect, 'selected', this.onGroupSelected, this);

    this.selectInitialGroup();

    this.updateFields();
    this.hasRendered = true;
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'create':
        if(this.model.isValid()) {
          this.sendCreateRoomRequest();
        }
        // Update the fields with any errors after validation
        this.safeUpdateFields();
        break;

      case 'upgrade':
        window.location.href = '#upgraderepoaccess/createroom'
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

  getGroupFromId: function(groupId) {
    if(groupId) {
      return this.groupsCollection.get(groupId);
    }
  },

  sendCreateRoomRequest: function() {
    var roomName = this.model.get('roomName');
    var selectedGroup = this.getGroupFromId(this.model.get('groupId'));
    var associatedGithubProject = this.model.get('associatedGithubProject');
    var security = this.model.get('security');
    var onlyGithubUsers = this.model.get('onlyGithubUsers');
    var onlyOrgUsers = this.model.get('onlyOrgUsers');
    var allowBadger = this.model.get('allowBadger');

    // You should be stopped before this in the UI validation but a good sanity check
    if(!selectedGroup) {
      this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.GROUP_REQUIRED);
      throw new Error('A group needs to be selected in order to create a room');
    }

    var type = null;
    var linkPath = null;
    if(associatedGithubProject) {
      type = 'GH_REPO';
      linkPath = associatedGithubProject.get('uri');
    }
    else if((onlyOrgUsers && security === 'PRIVATE') || security === 'PUBLIC') {
      var backedBy = selectedGroup.get('backedBy');
      type = backedBy.type;
      linkPath = backedBy.linkPath;
    }

    var apiUrl = urlJoin('/v1/groups/', selectedGroup.get('id'), '/rooms');
    var payload = {
      name: roomName,
      security: {
        // null or GH_ORG or GH_REPO
        type: type,
        security: security,
        linkPath: linkPath
      },
      addBadge: allowBadger
    };

    if(onlyGithubUsers) {
      payload.providers = ['github'];
    }

    apiClient.post(apiUrl, payload)
      .then(function(data) {
        if (data.extra && data.extra.hookCreationFailedDueToMissingScope) {
           setTimeout(promptForHook, 1500);
        }
        this.dialog.hide();
        // url, type, title
        appEvents.trigger('navigation', urlJoin('/', data.uri), 'chat#add', data.uri);
      }.bind(this))
      .catch(function(err) {
        var status = err.status;
        var message = 'Unable to create channel.';

        switch (status) {
          case 400:
            // TODO: send this from the server
            if (err.response && err.response.illegalName) {
              this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.ILLEGAL_NAME);
            } else {
              this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.VALIDATION_FAILED);
            }
            break;

          case 403:
            this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.INSUFFICIENT_PERMISSIONS);
            break;

          case 409:
            this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.UNAVAILABLE);
            break;
        }

        this.ui.roomAvailabilityStatusMessage[0].textContent = message;
      }.bind(this));
  },

  onGroupSelected: function(group) {
    this.model.set({
      groupId: group.get('id')
    });
  },

  onRepoSelected: function(repo) {
    var roomName = getRoomNameFromTroupeName(repo.get('name'));
    this.model.set({
      roomName: roomName,
      associatedGithubProject: repo,
      security: repo.get('private') ? 'PRIVATE' : 'PUBLIC'
    });

    this.debouncedCheckForRoomConflict();

    this.repoNameTypeahead.hide();
  },

  onNameInput: function() {
    var newName = this.ui.nameInput[0].value;
    // For the CSS selectors
    this.ui.nameInput[0].setAttribute('value', newName);

    this.model.set({
      roomName: newName
    });
  },

  onNameClearActivated: function() {
    this.model.set({
      roomName: '',
      associatedGithubProject: null
    });
    this.groupSelect.hide();
  },

  onSecurityChange: function() {
    var security = Array.prototype.reduce.call(this.ui.securityOptions, function(previousSecurity, securityOptionElement) {
      if(securityOptionElement.checked) {
        return securityOptionElement.value;
      }

      return previousSecurity;
    }, 'PUBLIC');

    this.model.set('security', security);
  },

  onOnlyGitHubUsersOptionChange: function() {
    this.model.set('onlyGithubUsers', this.ui.onlyGithubUsersOptionInput[0].checked);
  },

  onOnlyOrgUsersOptionChange: function() {
    this.model.set('onlyOrgUsers', this.ui.onlyOrgUsersOptionInput[0].checked);
  },

  onAllowBadgerOptionChange: function() {
    this.model.set('allowBadger', this.ui.allowBadgerOptionInput[0].checked);
  },

  onGroupIdChange: function() {
    var previousGroup = this.getGroupFromId(this.model.previous('groupId'));

    var roomName = this.model.get('roomName');
    var associatedGithubProject = this.model.get('associatedGithubProject');
    // Reset the room name if unchanged from the same as the associated GitHub project
    if(associatedGithubProject && getRoomNameFromTroupeName(associatedGithubProject.get('name')) === roomName) {
      this.model.set('roomName', '');
    }
    // Reset the associated project on group change
    this.model.set('associatedGithubProject', null);



    this.filterReposForSelectedGroup();
    // Don't run this on the initial group filling because it adds unnecessary error texts to the user
    if(previousGroup) {
      this.debouncedCheckForRoomConflict();
    }

    this.safeUpdateFields();
  },

  onRoomNameChange: function() {
    this.debouncedCheckForRoomConflict();
    this.safeUpdateFields();
  },

  debouncedCheckForRoomConflict: _.debounce(function() {
    var group = this.getGroupFromId(this.model.get('groupId'));
    var roomName = this.model.get('roomName');

    var repoCheckString = group.get('uri') + '/' + roomName;
    var roomAlreadyExists = roomName && this.troupeCollection.findWhere({ uri: repoCheckString });
    if(roomAlreadyExists) {
      this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.UNAVAILABLE);
    }
    else {
      var associatedGithubProject = this.model.get('associatedGithubProject');
      this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.PENDING);
      checkForRepoExistence(group.get('uri'), roomName)
        .then(function(doesExist) {
          var doesCurrentGitHubProjectMatchRequest = false;
          if(associatedGithubProject) {
            var requestRepoUri = (group.get('uri') + '/' + roomName).toLowerCase();
            doesCurrentGitHubProjectMatchRequest = requestRepoUri === (associatedGithubProject.get('uri') || '').toLowerCase();
          }

          if(!doesExist) {
            this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.AVAILABLE);
          }
          // You can still create a room with the same name as the repo if you associate it with project
          else if(doesExist && doesCurrentGitHubProjectMatchRequest) {
            this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.AVAILABLE);
          }
          else {
            this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.REPO_CONFLICT);
          }
        }.bind(this));
    }
  }, 300),

  onRoomAvailabilityStatusChange: function() {
    this.model.isValid();
    this.safeUpdateFields();
  },

  safeUpdateFields: function() {
    if(this.hasRendered) {
      this.updateFields();
    }
  },

  updateFields: function() {
    var roomName = this.model.get('roomName');
    var group = this.getGroupFromId(this.model.get('groupId'));
    var associatedGithubProject = this.model.get('associatedGithubProject');
    var security = this.model.get('security');

    fastdom.mutate(function() {
      // Room name
      this.ui.nameInput[0].value = roomName;

      // Associated github project
      this.ui.associatedProjectName[0].textContent = associatedGithubProject ? associatedGithubProject.get('name') : '';
      toggleClass(this.ui.associatedProjectLink[0], 'hidden', !associatedGithubProject);
      this.ui.associatedProjectLink[0].setAttribute('href', associatedGithubProject ? urlJoin('https://github.com', associatedGithubProject.get('uri')) : '');

      // Security Options
      this.ui.publicSecurityOption[0].disabled = associatedGithubProject && associatedGithubProject.get('private');
      this.ui.privateSecurityOption[0].disabled = associatedGithubProject && !associatedGithubProject.get('private');
      // Only change if there is a project
      if(associatedGithubProject) {
        this.ui.publicSecurityOption[0].checked = !associatedGithubProject.get('private');
        this.ui.privateSecurityOption[0].checked = associatedGithubProject.get('private');
      }

      // Details
      var groupBackedBy = group && group.get('backedBy');
      var isBackedByGitHub = groupBackedBy && (groupBackedBy.type === 'GH_ORG' || groupBackedBy.type === 'GH_REPO');

      var shouldHideOnlyGitHubUsersOption = !isBackedByGitHub || security !== 'PUBLIC';
      toggleClass(this.ui.onlyGithubUsersOption[0], 'hidden', shouldHideOnlyGitHubUsersOption);

      var shouldHideOnlyOrgUsersOption = !isBackedByGitHub || security !== 'PRIVATE';
      toggleClass(this.ui.onlyOrgUsersOption[0], 'hidden', shouldHideOnlyOrgUsersOption);
      this.ui.onlyOrgUsersOptionOrgName[0].textContent = groupBackedBy && groupBackedBy.linkPath;

      var groupBackedByRepo = null;
      if(groupBackedBy && groupBackedBy.type === 'GH_REPO') {
        groupBackedByRepo = this.repoCollection.findWhere({ uri: groupBackedBy.linkPath });
      }
      var isGroupBackedByRepo = groupBackedByRepo && !groupBackedByRepo.get('private');
      var isAssociatedWithPublicRepo = associatedGithubProject && !associatedGithubProject.get('private');
      var shouldHideAllowBadgerOption = !(isGroupBackedByRepo || isAssociatedWithPublicRepo) || security !== 'PUBLIC';
      toggleClass(this.ui.allowBadgerOption[0], 'hidden', shouldHideAllowBadgerOption);

      toggleClass(this.ui.roomDetailSection[0], 'hidden', shouldHideOnlyGitHubUsersOption && shouldHideOnlyOrgUsersOption && shouldHideAllowBadgerOption);

      // Validation and Errors
      var roomAvailabilityStatusMessage = '';
      (this.model.validationError || []).forEach(function(validationError) {
        if(validationError.key === 'group' || validationError.key === 'roomName') {
          roomAvailabilityStatusMessage = validationError.message;
        }
      }.bind(this));

      // Only show pending message after a 1 second
      var roomAvailabilityStatus = this.model.get('roomAvailabilityStatus');
      if(roomAvailabilityStatus === roomAvailabilityStatusConstants.PENDING) {
        setTimeout(function() {
          // Only show if still pending after the timeout
          var newRoomAvailabilityStatus = this.model.get('roomAvailabilityStatus');
          if(newRoomAvailabilityStatus === roomAvailabilityStatusConstants.PENDING) {
            this.ui.roomAvailabilityStatusMessage[0].textContent = roomAvailabilityStatusMessage;
          }
        }.bind(this), 1000);
      }
      else {
        this.ui.roomAvailabilityStatusMessage[0].textContent = roomAvailabilityStatusMessage;
      }
    }.bind(this));
  },

  filterReposForSelectedGroup: function() {
    var selectedGroup = this.getGroupFromId(this.model.get('groupId'));
    if(selectedGroup) {
      this.filteredRepoCollection.setFilter(function(model) {
        return getOrgNameFromUri(model.get('uri')).toLowerCase() === selectedGroup.get('name').toLowerCase();
      });
    }
  },

  selectInitialGroup: function() {
    this.filterReposForSelectedGroup();

    if(this.groupSelect) {
      var groupId = this.model.get('groupId');
      this.groupSelect.selectGroupId(groupId);
    }
  },

});


var Modal = ModalView.extend({
  disableAutoFocus: true,

  initialize: function(options) {
    options = options || {};
    options.title = options.title || 'Create a room';

    ModalView.prototype.initialize.call(this, options);
    this.view = new CreateRoomView(options);
  },

  menuItems: function() {
    var result = [];
    var user = context.user();
    var scopes = user.get('scopes');

    if (user.id && scopes && !scopes.private_repo) {
      // GitHub user, without private repo access?
      result.push({
        action: "upgrade",
        text: "GitHub Private Access",
        pull: 'left',
        className: "modal--default__footer__btn--neutral"
      });
    }

    result.push({
      action: 'create',
      pull: 'right',
      text: 'Create',
      className: 'modal--default__footer__btn'
    });

    return result;
  }
});


module.exports = {
  View: CreateRoomView,
  Modal: Modal
};

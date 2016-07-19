'use strict';

var Promise = require('bluebird');
var Marionette = require('backbone.marionette');
var fuzzysearch = require('fuzzysearch');
var urlJoin = require('url-join');
var FilteredCollection = require('backbone-filtered-collection');
var toggleClass = require('utils/toggle-class');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');
var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');
var apiClient = require('components/apiClient');
var appEvents = require('utils/appevents');

var troupeCollections = require('collections/instances/troupes');
var GroupSelectView = require('views/createRoom/groupSelectView');
var ModalView = require('./modal');
var FilteredSelect = require('./filtered-select');
var roomAvailabilityStatusConstants = require('./room-availability-status-constants');

var template = require('./tmpl/create-room-view-v2.hbs');
var repoTypeaheadItemTemplate = require('./tmpl/create-room-repo-typeahead-item-view.hbs');



var checkForRepoExistence = function(repoUri) {
  if(repoUri) {
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


var CreateRoomView = Marionette.LayoutView.extend({
  template: template,

  ui: {
    nameInput: '.js-create-room-name-input',
    clearNameButton: '.js-create-room-clear-name-button',
    associatedProjectName: '.js-associated-github-project-name',
    associatedProjectLink: '.js-associated-github-project-link',
    securityOptions: '[name="create-room-security"]',
    onlyGithubUsersOption: '.js-create-room-only-github-users-option',
    onlyGithubUsersOptionInput: '.js-create-room-only-github-users-option-input',
    onlyOrgUsersOption: '.js-create-room-only-org-users-option',
    onlyOrgUsersOptionInput: '.js-create-room-only-org-users-option-input',
    onlyOrgUsersOptionOrgName: '.js-create-room-only-org-users-option-org-name',
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
    'change @ui.onlyOrgUsersOptionInput': 'onOnlyOrgUsersOptionChange'
  },

  modelEvents: {
    // TODO: Why does `change:group` not trigger?
    'change:group': 'updateFields',
    'change:roomName': 'onRoomNameChange',
    'change:associatedGithubProject': 'updateFields',
    'change:security': 'updateFields',
    'change:roomAvailabilityStatus': 'onRoomAvailabilityStatusChange'
  },

  initialize: function(attrs) {
    this.model = attrs.model;
    this.groupsCollection = attrs.groupsCollection;
    this.repoCollection = attrs.repoCollection;
    this.initialGroupId = attrs.initialGroupId;

    this.filteredRepoCollection = new FilteredCollection({
      collection: this.repoCollection
    });

    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    this.listenTo(this.groupsCollection, 'sync', this.selectSuggestedGroup);
  },

  onRender: function() {
    this.groupSelect = new GroupSelectView({
      groupsCollection: this.groupsCollection
    });
    var repoNameTypeahead = new FilteredSelect({
      el: this.ui.nameInput[0],
      collection: this.filteredRepoCollection,
      itemTemplate: repoTypeaheadItemTemplate,
      filter: function(input, model) {
        var mName = model.get('name') || '';
        return fuzzysearch(input.toLowerCase(), mName.toLowerCase());
      }
    });

    this.groupSelectRegion.show(this.groupSelect);

    this.listenTo(repoNameTypeahead, 'selected', this.onRepoSelected, this);
    this.listenTo(this.groupSelect, 'selected', this.onGroupSelected, this);

    this.selectSuggestedGroup();
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'create':
        this.sendCreateRoomRequest();
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

  sendCreateRoomRequest: function() {
    var roomName = this.model.get('roomName');
    var selectedGroup = this.model.get('group');
    var associatedGithubProject = this.model.get('associatedGithubProject');
    var security = this.model.get('security');
    var onlyGithubUsers = this.model.get('onlyGithubUsers');
    var onlyOrgUsers = this.model.get('onlyOrgUsers');

    if(onlyOrgUsers && security === 'PRIVATE') {
      security = 'INHERITED'
    }

    var apiUrl = '/v1/groups/' + selectedGroup.get('id') + '/rooms';
    var payload = {
      name: roomName,
      security: {
        // null or GH_ORG or GH_REPO
        type: associatedGithubProject ? 'GH_REPO' : null,
        security: security,
        linkPath: associatedGithubProject ? associatedGithubProject.get('uri') : null
      }
    };

    // TODO: Does this work?
    // not sure if you can add providers to the POST creation
    if(onlyGithubUsers) {
      payload.providers = ['github'];
    }

    apiClient.post(apiUrl, payload)
      .then(function(data) {
        this.dialog.hide();
        appEvents.trigger('navigation', '/' + data.uri, 'chat#add', '/' + data.uri);
      }.bind(this))
      .catch(function(err) {
        var status = err.status;
        var message = 'Unable to create channel.';

        switch (status) {
          case 400:
            // TODO: send this from the server
            if (err.response && err.response.illegalName) {
              message = 'Please choose a channel name consisting of letter and number characters.';
              self.ui.roomNameInput.focus();
            } else {
              message = 'Validation failed';
            }
            break;

          case 403:
            message = 'You don\'t have permission to create that room.';
            break;

          case 409:
            message = 'There is already a Github repository or a room with that name.';
            break;
        }

        this.ui.roomAvailabilityStatusMessage[0].textContent = message;
      }.bind(this));
  },

  onGroupSelected: function(group) {
    this.model.set('group', group);
    this.filterReposForSelectedGroup();
  },

  onRepoSelected: function(repo) {
    var roomName = getRoomNameFromTroupeName(repo.get('name'));
    this.model.set({
      roomName: roomName,
      associatedGithubProject: repo
    });
    this.ui.nameInput[0].value = roomName;

    this.groupSelect.hide();
  },

  onNameInput: function() {
    this.model.set('roomName', this.ui.nameInput[0].value);
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
    }, 'PUBLIC')

    this.model.set('security', security);
  },

  onOnlyGitHubUsersOptionChange: function() {
    this.model.set('onlyGithubUsers', this.ui.onlyGithubUsersOptionInput[0].checked);
  },

  onOnlyOrgUsersOptionChange: function() {
    this.model.set('onlyOrgUsers', this.ui.onlyOrgUsersOptionInput[0].checked);
  },

  onRoomNameChange: function() {
    var roomName = this.model.get('roomName');
    var group = this.model.get('group');
    var associatedGithubProject = this.model.get('associatedGithubProject');

    var repoCheckString = group.get('name') + '/' + roomName;
    var roomAlreadyExists = roomName && troupeCollections.troupes.findWhere({ uri: repoCheckString });
    if(roomAlreadyExists) {
      this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.UNAVAILABLE);
    }
    else {
      this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.PENDING);
      checkForRepoExistence(repoCheckString)
        .then(function(doesExist) {
          if(doesExist && associatedGithubProject) {
            this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.AVAILABLE);
          }
          else {
            this.model.set('roomAvailabilityStatus', roomAvailabilityStatusConstants.REPO_CONFLICT);
          }
        }.bind(this));
    }

    this.updateFields();
  },

  onRoomAvailabilityStatusChange: function() {
    (this.model.validationError || []).forEach(function(validationError) {
      if(validationError.key === 'roomName') {
        this.ui.roomAvailabilityStatusMessage[0].textContent = validationError.message;
      }
    });
  },

  updateFields: function() {
    var roomName = this.model.get('roomName');
    var group = this.model.get('group');
    var associatedGithubProject = this.model.get('associatedGithubProject');
    var security = this.model.get('security');

    this.ui.nameInput[0].value = roomName;

    this.ui.associatedProjectName[0].textContent = associatedGithubProject ? associatedGithubProject.get('name') : '';
    toggleClass(this.ui.associatedProjectLink[0], 'hidden', !associatedGithubProject);
    this.ui.associatedProjectLink[0].setAttribute('href', associatedGithubProject ? urlJoin('https://github.com', associatedGithubProject.get('uri')) : '');

    toggleClass(this.ui.onlyGithubUsersOption[0], 'hidden', security !== 'PUBLIC');

    var groupBackedBy = group.get('backedBy');
    var isBackedByGitHub = groupBackedBy.type === 'GH_ORG' || groupBackedBy.type === 'GH_REPO';
    toggleClass(this.ui.onlyOrgUsersOption[0], 'hidden', !isBackedByGitHub || security !== 'PRIVATE');
    this.ui.onlyOrgUsersOptionOrgName[0].textContent = associatedGithubProject ? associatedGithubProject.get('name') : '';
  },

  filterReposForSelectedGroup: function() {
    var selectedGroup = this.model.get('group');
    this.filteredRepoCollection.setFilter(function(model) {
      return getOrgNameFromUri(model.get('uri')).toLowerCase() === selectedGroup.get('name').toLowerCase();
    });
  },

  selectSuggestedGroup: function() {
    if (this.initialGroupId) {
      this.groupSelect.selectGroupId(this.initialGroupId);
    }
  },

});


var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = options.title || 'Create a room';

    ModalView.prototype.initialize.call(this, options);
    this.view = new CreateRoomView(options);
  },
  menuItems: [
    {
      action: 'create',
      pull: 'right',
      text: 'Create',
      className: 'modal--default__footer__btn'
    },
  ]
});


module.exports = {
  View: CreateRoomView,
  Modal: Modal
};

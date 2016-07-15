"use strict";

var $ = require('jquery');
var _ = require('underscore');
var Marionette = require('backbone.marionette');
var troupeCollections = require('collections/instances/troupes');
var ModalView = require('./modal');
var apiClient = require('components/apiClient');
var GroupSelectView = require('views/createRoom/groupSelectView');
var template = require('./tmpl/create-room-view.hbs');
var appEvents = require('utils/appevents');


/* We do a better job on the server with checking names, as we have XRegExp there */
function safeRoomName(val) {
  if (val.length < 1) return false;
  if (/[<>\\\/\{\}|\#@\&\.\(\)\'\"]/.test(val)) return false;
  return true;
}

function checkForRepoExistence(repo, cb) {
  apiClient.priv.get('/gh/repos/' + repo)
    .then(function () {
      return true;
    })
    .catch(function () {
      return false;
    })
    .then(function(result) {
      cb(result);
    });
}

var View = Marionette.LayoutView.extend({
  template: template,

  ui: {
    permissions: '#permissions',
    permPublic: '#perm-select-public',
    permPrivate: '#perm-select-private',
    permInheritedOrg: '#perm-select-inherited-org',
    permInheritedRepo: '#perm-select-inherited-repo',
    validation: '#modal-failure',
    existing: '#existing',
    orgNameLabel: '#org-name',
    repoNameLabel: '#repo-name',
    roomNameInput: '#room-name',
    dropDownButton: '#dd-button',
  },

  events: {
    'change @ui.roomNameInput': 'roomNameChange',
    'cut @ui.roomNameInput': 'roomNameChange',
    'paste @ui.roomNameInput': 'roomNameChange',
    'input @ui.roomNameInput': 'roomNameChange',
    'click @ui.dropDownButton': 'clickDropDown',
    'change input[type=radio]': 'permissionsChange'
  },

  regions: {
    ownerSelect: '#owner-region',
  },

  initialize: function(attrs) {
    this.groupsCollection = attrs.groupsCollection;
    this.listenTo(this.groupsCollection, 'sync', this.selectSuggestedGroup);

    this.listenTo(self, 'menuItemClicked', this.menuItemClicked);
    this.recalcViewDebounced = _.debounce(function() {
      this.recalcView(true);
    }.bind(this), 300);
    this.bindUIElements();
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'create':
        this.validateAndCreate();
        break;

      case 'back':
        window.location.hash = "#createroom";
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

  clickDropDown: function() {
    this.groupSelect.focus();
    this.groupSelect.show();
  },

  showValidationMessage: function (message) {
    var validation = $(this.ui.validation);
    if (!message) return validation.slideUp('fast');

    validation.text(message);
    validation.slideDown('fast');

    setTimeout(function () {
      validation.slideUp('fast');
    }, 2000);
  },

  validateAndCreate: function() {
    var self = this;

    var group = self.selectedGroup;
    if (!group) {
      self.groupSelect.show();
      return;
    }

    var groupId = group.get('id');
    var groupBackedBy = group.get('backedBy');
    var groupType = groupBackedBy.type;
    var groupLinkPath = groupBackedBy.linkPath;
    var permissions = self.$el.find('input[type=radio]:visible:checked').val();
    var roomName = self.ui.roomNameInput.val().trim();

    if (permissions !== 'public' && permissions !== 'inherited' && permissions !== 'private') {
      self.showValidationMessage('Please select the permissions for the room');
      return;
    }

    if (permissions === 'inherited' && groupType !== 'GH_ORG' && groupType !== 'GH_REPO') {
      self.showValidationMessage('Please select the permissions for the room');
      return;
    }

    if (!roomName) {
      self.showValidationMessage('You need to specify a room name');
      self.ui.roomNameInput.focus();
      return;
    }

    if (roomName && !safeRoomName(roomName)) {
      self.showValidationMessage('Please choose a channel name consisting of letter and number characters');
      self.ui.roomNameInput.focus();
      return;
    }

    var apiUrl = '/v1/groups/' + groupId + '/rooms';
    var security = permissions.toUpperCase();
    var payload;
    if (security === 'PUBLIC' || security === 'INHERITED') {
      payload = {
        name: roomName,
        security: {
          type: groupType, // null or GH_ORG or GH_REPO
          // the backend only understands PUBLIC or PRIVATE. INHERITED is what
          // it understands as a PRIVATE GH_GROUP or GH_REPO room.
          security: (security === 'PUBLIC') ? 'PUBLIC' : 'PRIVATE',
          linkPath: (groupType !== null) ? groupLinkPath : null
        }
      };
    } else {
      // PRIVATE rooms don't have a backing object regardless of the group
      payload = {
        name: roomName,
        security: {
          type: null,
          security: 'PRIVATE',
        }
      };
    }
    return apiClient.post(apiUrl, payload)
      .then(function(data) {
        self.dialog.hide();
        appEvents.trigger('navigation', '/'+data.uri , 'chat#add', '/'+data.uri);
      })
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

        self.showValidationMessage(message);
      });
  },

  groupSelected: function(group, animated) {
    this.selectedGroup = group;
    this.recalcView(animated);
  },

  recalcView: function (animated) {
    if (!this._uiBindings) return; // ui may not be bound yet.
    var self = this;

    var showHide = {
      'permissions': false,
      'permPublic': false,
      'permPrivate': false,
      'permInheritedOrg': false,
      'permInheritedRepo': false,
      'existing': false,
    };

    var placeholder = "Required";
    var group = this.selectedGroup;

    var checkForRepo;
    var createButtonEnabled;

    if (group) {
      createButtonEnabled = true;
      var roomName = this.ui.roomNameInput.val();
      var groupUri = group.get('uri');
      var groupBackedBy = group.get('backedBy');
      var groupType = groupBackedBy.type;
      var orgName = groupBackedBy.linkPath || '';
      var repoName = groupBackedBy.linkPath || '';

      if (groupType === 'GH_ORG') {
        // rooms inside github org based groups can have inherited permissions
        ['permissions', 'permPublic', 'permPrivate', 'permInheritedOrg'].forEach(function (f) { showHide[f] = true; });
        checkForRepo = roomName && groupUri + '/' + roomName;

      } else if (groupType === 'GH_REPO') {
        // rooms inside github repo based groups can have inherited permissions
        ['permissions', 'permPublic', 'permPrivate', 'permInheritedRepo'].forEach(function (f) { showHide[f] = true; });
        checkForRepo = roomName && groupUri + '/' + roomName;

      } else {
        // other rooms can only have public or private permissions
        ['permissions', 'permPublic', 'permPrivate'].forEach(function(f) { showHide[f] = true; });
        checkForRepo = roomName && groupUri + '/' + roomName;
      }

      createButtonEnabled = false;
      var existing = roomName && troupeCollections.troupes.findWhere({ uri: groupUri + '/' + roomName});
      createButtonEnabled = !existing;

      if (existing) {
        // TODO: make a reset() and use that
        showHide = {
          'permissions': false,
          'permPublic': false,
          'permPrivate': false,
          'permInheritedOrg': false,
          'permInheritedRepo': false,
          'existing': true
        };
        checkForRepo = null;
      }
    }

    // TODO: do we still have to check for this? Until we break the uri link, I
    // guess.
    if (checkForRepo) {
      createButtonEnabled = false;
      checkForRepoExistence(checkForRepo, function (exists) {
        createButtonEnabled = !exists;

        if (exists) {
          // TODO: make a reset() and use that
          showHide = {
            'permissions': false,
            'permPublic': false,
            'permPrivate': false,
            'permInheritedOrg': false,
            'permInheritedRepo': false,
            'existing': false
          };
          self.showValidationMessage('You cannot create a channel with this name as a repo with the same name already exists.');
        }
        applyShowHides();
      });
    } else {
      applyShowHides();
    }


    function applyShowHides() {
      if (!self.dialog) return; // callback but room has already been created, therefore self.dialog is null

      self.dialog.setButtonState('create', createButtonEnabled); // set button state

      function arrayToJq(value) {
        var elements = [];
        Object.keys(showHide).forEach(function(f) {
          if(showHide[f] === value) {
            elements = elements.concat(self.ui[f].get());
          }
        });
        return $(elements);
      }

      self.dialog.showActions();

      if(animated === false) {
        arrayToJq(true).removeClass('hide');
        arrayToJq(false).addClass('hide');
      } else {
        arrayToJq(true).filter(':hidden').removeClass('hide');
        arrayToJq(false).filter(':visible').addClass('hide');
      }
    }
    self.ui.orgNameLabel.text(orgName);
    self.ui.repoNameLabel.text(repoName);
    self.ui.roomNameInput.attr('placeholder', placeholder);
  },

  onRender: function() {
    // TODO: this.groupsCollection is probably not loaded yet
    var groupSelect = new GroupSelectView({
      groupsCollection: this.groupsCollection
    });

    this.groupSelect = groupSelect;
    this.ownerSelect.show(groupSelect);

    this.listenTo(groupSelect, 'selected', this.groupSelected);

    if (this.options.roomName) {
      this.ui.roomNameInput.val(this.options.roomName);
    }

    this.selectSuggestedGroup();

    this.recalcView(false);
  },

  selectSuggestedGroup: function() {
    if (this.options.initialGroupId) {
      var group = this.groupSelect.selectGroupId(this.options.initialGroupId);
      this.groupSelected(group, false);
    } else {
      this.groupSelected(null, false);
    }
  },

  roomNameChange: function() {
    this.recalcViewDebounced();
  },

  permissionsChange: function() {
    this.recalcViewDebounced();
  }
});

var Modal = ModalView.extend({
  disableAutoFocus: true,
  initialize: function(options) {
    options = options || {};
    options.title = options.title || "Create a channel";

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  },
  menuItems: [
    { action: "back", pull: 'left', text: "Back", className: "modal--default__footer__link" },
    { action: "create", pull: 'right', text: "Create", className: "modal--default__footer__btn" },
  ]
});

module.exports = {
  View: View,
  Modal: Modal
};

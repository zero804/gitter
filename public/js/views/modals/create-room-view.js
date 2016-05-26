"use strict";

var $ = require('jquery');
var _ = require('underscore');
var Marionette = require('backbone.marionette');
var troupeCollections = require('collections/instances/troupes');
var ModalView = require('./modal');
var apiClient = require('components/apiClient');
var ParentSelectView = require('views/createRoom/parentSelectView');
var template = require('./tmpl/create-room-view.hbs');
var appEvents = require('utils/appevents');

var View = Marionette.LayoutView.extend({
  template: template,

  ui:                     {
    autoJoin:             "#auto-join",
    permPublic:           "#perm-select-public",
    permPrivate:          "#perm-select-private",
    permInheritedOrg:     "#perm-select-inherited-org",
    validation:           '#modal-failure',
    selectParentRequired: "#perm-select-required",
    existing:             '#existing',
    parentNameLabel:      "#parent-name",
    permInheritedLabel:   '#perm-inherited-label',
    roomNameInput:        '#room-name',
    dropDownButton:       '#dd-button',
    permissionsLabel:     '#permissions-label',
  },

  events:                       {
    'change @ui.roomNameInput': 'roomNameChange',
    'cut @ui.roomNameInput':    'roomNameChange',
    'paste @ui.roomNameInput':  'roomNameChange',
    'input @ui.roomNameInput':  'roomNameChange',
    'click @ui.dropDownButton': 'clickDropDown',
    'change input[type=radio]': 'permissionsChange'
  },

  regions: {
    ownerSelect: '#owner-region',
  },

  initialize: function() {
    var self = this;
    self.listenTo(self, 'menuItemClicked', self.menuItemClicked);
    self.recalcViewDebounced = _.debounce(function() {
      self.recalcView(true);
    }, 300);
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
    this.parentSelect.focus();
    this.parentSelect.show();
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
    /* We do a better job on the server with checking names, as we have XRegExp there */
    function safeRoomName(val) {
      if(val.length < 1) return false;
      if(/[<>\\\/\{\}|\#@\&\.\(\)\'\"]/.test(val)) return false;
      return true;
    }

    var ownerModel = self.selectedModel;
    if(!ownerModel) {
      self.parentSelect.show();
      return;
    }

    var permissions = self.$el.find('input[type=radio]:visible:checked').val();
    var channelName = self.ui.roomNameInput.val().trim();

    var payload = { security: permissions && permissions.toUpperCase(), name: channelName };

    var promise;

    switch(ownerModel.get('type')) {
      case 'user':
        if(permissions !== 'public' && permissions !== 'private') {
          self.showValidationMessage('Please select the permissions for the room');
          // TODO: better error reporting!
          return;
        }

        if(permissions === 'public' && !channelName) {
          self.showValidationMessage('You need to specify a room name');
          self.ui.roomNameInput.focus();
          return;
        }

        if(channelName && !safeRoomName(channelName)) {
          self.showValidationMessage('Please choose a channel name consisting of letter and number characters');
          self.ui.roomNameInput.focus();
          return;
        }

        promise = apiClient.user.post('/channels', payload);
        break;

      case 'repo':
      case 'org':
        if(permissions !== 'public' && permissions !== 'private' && permissions !== 'inherited') {
          self.showValidationMessage('Please select the permissions for the room');
          // TODO: better error reporting!
          return;
        }

        if(!channelName || !safeRoomName(channelName)) {
          self.showValidationMessage('Please choose a channel name consisting of letter and number characters');
          self.ui.roomNameInput.focus();
          return;
        }

        payload.ownerUri = ownerModel.get('uri');
        // we use a special endpoint that can create an empty owner room if it hasnt been created yet
        // the current /v1/:room/channels api requires owner room membership, so we need to use our
        // special endpoint if the owner room is empty as well.
        promise = apiClient.post('/v1/private/channels', payload);
        break;
    }

    promise
      .then(function(data) {
        self.dialog.hide();
        appEvents.trigger('navigation', data.url , 'chat#add', data.uri);
      })
      .catch(function(err) {
        var status = err.status;
        var message = 'Unable to create channel.';

        switch (status) {
          case 400:
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

  parentSelected: function(model, animated) {
    this.selectedModel = model;
    this.recalcView(animated);
  },

  recalcView: function (animated) {

    if (!this._uiBindings) return; // ui may not be bound yet.
    var self = this;

    var showHide = {
      'selectParentRequired': false,
      'autoJoin': false,
      'permPublic': false,
      'permPrivate': false,
      'permInheritedOrg': false,
      'existing': false,
      'permissionsLabel': true
    };

    var placeholder = "";
    var model = this.selectedModel;
    var checkForRepo;
    var parentName = "";
    var createButtonEnabled = true;

    if (model) {
      parentName = model.get('name');
      var roomName = this.ui.roomNameInput.val();
      var parentUri = model.get('uri');

      switch(model.get('type')) {
        case 'org':
          [/*'autoJoin', */'permPublic', 'permPrivate', 'permInheritedOrg'].forEach(function (f) { showHide[f] = true; });
          checkForRepo = roomName && parentUri + '/' + roomName;
          placeholder = "Required";
          break;

        case 'repo':
          [/*'autoJoin', */'permPublic', 'permPrivate'].forEach(function (f) { showHide[f] = true; });
          placeholder = "Required";
          break;

        case 'user':
          [/*'autoJoin', */'permPublic', 'permPrivate'].forEach(function(f) { showHide[f] = true; });
          var permissions = this.$el.find('input[type=radio]:visible:checked').val();
          switch(permissions) {
            case 'public':
              placeholder = "Required";
              break;

            case 'private':
              placeholder = "Optional";
              break;

            default:
              placeholder = "Required for public channels";
          }
          checkForRepo = roomName && parentUri + '/' + roomName;
          break;
      }

      createButtonEnabled = false;
      var existing = roomName && troupeCollections.troupes.findWhere({ uri: parentUri + '/' + roomName});
      createButtonEnabled = !existing;

      if (existing) {
        showHide = {
          'selectParentRequired': false,
          'autoJoin': false,
          'permPublic': false,
          'permPrivate': false,
          'permInheritedOrg': false,
          'permissionsLabel': false,
          'existing': true
        };
        checkForRepo = null;
      }
    }

    if (checkForRepo) {
      createButtonEnabled = false;
      checkForRepoExistence(checkForRepo, function (exists) {
        createButtonEnabled = !exists;

        if (exists) {
          showHide = {
            'selectParentRequired': false,
            'autoJoin': false,
            'permPublic': false,
            'permPrivate': false,
            'permInheritedOrg': false,
            'permissionsLabel': false,
            'existing': false
          };
          self.showValidationMessage('You cannot create a channel with this name as a repo with the same name already exists.');
        }
        applyShowHides();
      });
    } else {
      applyShowHides();
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
        self.ui.roomNameInput.attr('placeholder', placeholder);
        self.ui.parentNameLabel.text(parentName);
      } else {
        arrayToJq(true).filter(':hidden').removeClass('hide'); //.slideDown('fast').css('display','flex');
        arrayToJq(false).filter(':visible').addClass('hide');//.slideUp('fast').css('display','flex');

        self.ui.parentNameLabel.text(parentName);
        self.ui.roomNameInput.attr('placeholder', placeholder);
      }
    }
  },

  onRender: function() {
    var parentSelect = new ParentSelectView({
      orgsCollection: troupeCollections.orgs,
      troupesCollection: troupeCollections.troupes
    });

    this.parentSelect = parentSelect;
    this.ownerSelect.show(parentSelect);

    this.listenTo(parentSelect, 'selected', this.parentSelected);

    if(this.options.roomName) {
      this.ui.roomNameInput.val(this.options.roomName);
    }

    if(this.options.initialParent) {
      var model = this.parentSelect.selectUri(this.options.initialParent);
      this.parentSelected(model, false);
    } else {
      this.parentSelected(null, false);
    }

    this.recalcView(false);
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

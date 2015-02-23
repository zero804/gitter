"use strict";
var $ = require('jquery');
var _ = require('underscore');
var Marionette = require('marionette');
var troupeCollections = require('collections/instances/troupes');
var TroupeViews = require('views/base');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var ParentSelectView = require('./parentSelectView');
var template = require('./tmpl/createRoom.hbs');
var appEvents = require('utils/appevents');

module.exports = (function() {


  var View = Marionette.Layout.extend({
    template: template,

    ui: {
      autoJoin: "#auto-join",
      permPublic: "#perm-select-public",
      permPrivate: "#perm-select-private",
      permInheritedOrg: "#perm-select-inherited-org",
      permInheritedRepo: "#perm-select-inherited-repo",
      validation: '#modal-failure',
      selectParentRequired: "#perm-select-required",
      existing: '#existing',
      parentNameLabel: "#parent-name",
      permInheritedLabel: '#perm-inherited-label',
      roomNameInput: '#room-name',
      dropDownButton: '#dd-button',
      permissionsLabel: '#permissions-label',
      premiumRequired: '#premium-required'
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

    initialize: function() {
      var self = this;
      self.listenTo(self, 'menuItemClicked', self.menuItemClicked);
      self.recalcViewDebounced = _.debounce(function() {
        self.recalcView(true);
      }, 300);
      this.bindUIElements();
    },

    billingUrl: function() {
      var userOrOrg = this.selectedModel.get('uri').split('/')[0];
      return context.env('billingUrl') + '/bill/' + userOrOrg + '?r=' + window.location.pathname;
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

        case 'get-plan':
          window.open(this.billingUrl());
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
      var url;

      if(self.selectedOptionsRequireUpgrade()) {
        return;
      }

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
          if(permissions !== 'public' && permissions !== 'private' && permissions != 'inherited') {
            self.showValidationMessage('Please select the permissions for the room');
            // TODO: better error reporting!
            return;
          }

          if(!channelName || !safeRoomName(channelName)) {
            self.showValidationMessage('Please choose a channel name consisting of letter and number characters');
            self.ui.roomNameInput.focus();
            return;
          }


          promise = apiClient.post("/v1/rooms/" + ownerModel.get('id') + '/channels', payload);
      }

      promise
        .then(function(data) {
          self.dialog.hide();
          appEvents.trigger('navigation', data.url , 'chat#add', data.uri);
        })
        .fail(function(xhr) {
          var response;
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) {
            // Ignore
          }

          var status = xhr.status;
          var message = 'Unable to create channel.';

          switch (status) {
            case 400:
              if (response && response.illegalName) {
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

      if (this.selectedModel) {
        this.stopListening(this.selectedModel, 'change:premium', this.selectedModelPremiumChanged);
      }

      this.selectedModel = model;

      if (this.selectedModel) {
        this.listenTo(this.selectedModel, 'change:premium', this.selectedModelPremiumChanged);
      }

      this.recalcView(animated);
    },

    selectedModelPremiumChanged: function() {
      this.recalcView(true);
    },

    selectedOptionsRequireUpgrade: function() {
      var userIsPremium = context.user().get('premium');

      var ownerModel = this.selectedModel;
      if(!ownerModel) return false;

      var ownerIsPremium = ownerModel.get('premium');

      var permissions = this.$el.find('input[type=radio]:visible:checked').val();
      if(permissions === 'public' || !permissions) return false;

      switch(ownerModel.get('type')) {
        case 'user':
          return !userIsPremium;

        case 'repo':

          if(permissions === 'inherited') {
            if(ownerModel.get('security') === 'PUBLIC') {
              return false; // No need to upgrade, but this would be odd.
            }

            return !ownerIsPremium;
          }

          /* private */
          return !ownerIsPremium;

        case 'org':
          /* private or inherited */
          return !ownerIsPremium;
      }

      return false;
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
        'permInheritedRepo': false,
        'premiumRequired': false,
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
            [/*'autoJoin', */'permPublic', 'permPrivate', 'permInheritedRepo'].forEach(function (f) { showHide[f] = true; });
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
            'permInheritedRepo': false,
            'permissionsLabel': false,
            'existing': true
          };
          checkForRepo = null;
        }
      }
      showHide.premiumRequired = this.selectedOptionsRequireUpgrade();

      if (showHide.premiumRequired) {
        createButtonEnabled = !showHide.premiumRequired;
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
              'permInheritedRepo': false,
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
            cb(true);
          })
          .fail(function () {
            cb(false);
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


        if (showHide.premiumRequired) {
          self.dialog.hideActions();
          self.dialog.showPremium();
        } else {
          self.dialog.showActions();
          self.dialog.hidePremium();
        }


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

  var Modal = TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create a channel";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: [
      { action: "create", text: "Create", className: "trpBtnGreen action" },
      { action: "back", text: "Back", className: "trpBtnLightGrey action" },
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey action"},
      { action: "get-plan", text: "Get Premium", className: "trpBtnGreen premium hidden"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };


})();


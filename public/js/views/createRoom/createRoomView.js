define([
  'jquery',
  'underscore',
  'marionette',
  'collections/instances/troupes',
  'views/base',
  'utils/context',
  './parentSelectView',
  'hbs!./tmpl/createRoom',
  'utils/appevents'
], function($, _, Marionette, troupeCollections, TroupeViews, context, ParentSelectView, template, appEvents) {
  "use strict";

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

    showValidationMessage: function(message) {
      this.ui.validation.text(message);
      if(message) {
        this.ui.validation.slideDown('fast');
      } else {
        this.ui.validation.slideUp('fast');
      }
    },

    validateAndCreate: function() {
      /* We do a better job on the server with checking names, as we have XRegExp there */
      function safeRoomName(val) {
        if(val.length < 1) return false;
        if(/[<>\\\/\{\}|\#@\&\.\(\)\'\"]/.test(val)) return false;
        return true;
      }

      var ownerModel = this.selectedModel;
      if(!ownerModel) {
        this.parentSelect.show();
        return;
      }

      var permissions = this.$el.find('input[type=radio]:visible:checked').val();
      var channelName = this.ui.roomNameInput.val().trim();
      var url;

      if(this.selectedOptionsRequireUpgrade()) {
        return;
      }

      switch(ownerModel.get('type')) {
        case 'user':
          if(permissions !== 'public' && permissions !== 'private') {
            this.showValidationMessage('Please select the permissions for the room');
            // TODO: better error reporting!
            return;
          }

          if(permissions === 'public' && !channelName) {
            this.showValidationMessage('You need to specify a room name');
            this.ui.roomNameInput.focus();
            return;
          }

          if(channelName && !safeRoomName(channelName)) {
            this.showValidationMessage('Please choose a channel name consisting of letter and number characters');
            this.ui.roomNameInput.focus();
            return;
          }

          url = "/api/v1/user/" + context.getUserId() + '/channels';
          break;

        case 'repo':
        case 'org':
          if(permissions !== 'public' && permissions !== 'private' && permissions != 'inherited') {
            this.showValidationMessage('Please select the permissions for the room');
            // TODO: better error reporting!
            return;
          }

          if(!channelName || !safeRoomName(channelName)) {
            this.showValidationMessage('Please choose a channel name consisting of letter and number characters');
            this.ui.roomNameInput.focus();
            return;
          }

          url = "/api/v1/rooms/" + ownerModel.get('id') + '/channels';
      }

      $.ajax({
        url: url,
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify({ security: permissions.toUpperCase(), name: channelName }),
        context: this,
        statusCode: {
          400: function(data) {
            if ($.parseJSON(data.responseText).illegalName) {
              this.showValidationMessage('Please choose a channel name consisting of letter and number characters');
              this.ui.roomNameInput.focus();
            }
          },
          403: function() {
            this.showValidationMessage('You don\'t have permission to create that room');
          },
          409: function() {
            this.showValidationMessage('There is already a Github repository with that name');
          }
        },
        success: function(data) {
          this.dialog.hide();
          appEvents.trigger('navigation', data.url , 'chat#add', data.uri);
        }
      });
    },

    parentSelected: function(model, animated) {
      this.selectedModel = model;
      this.recalcView(animated);
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

    recalcView: function(animated) {
      if (!this.ui || !this._uiBindings) { return; }
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

      if(model) {
        parentName = model.get('name');
        var roomName = this.ui.roomNameInput.val();
        var parentUri = model.get('uri');

        switch(model.get('type')) {
          case 'org':
            [/*'autoJoin', */'permPublic', 'permPrivate', 'permInheritedOrg'].forEach(function(f) { showHide[f] = true; });
            checkForRepo = roomName && parentUri + '/' + roomName;
            placeholder = "Required";
            break;

          case 'repo':
            [/*'autoJoin', */'permPublic', 'permPrivate', 'permInheritedRepo'].forEach(function(f) { showHide[f] = true; });
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

        var existing = roomName && troupeCollections.troupes.findWhere({ uri: parentUri + '/' + roomName});
        if(existing) {
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
      createButtonEnabled = !showHide.premiumRequired;

      if(checkForRepo) {
        checkForRepoExistence(checkForRepo, function(exists) {
          createButtonEnabled = !exists;

          if(exists) {
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
          } else {
            self.showValidationMessage();
          }

          applyShowHides();
        });
      } else {
        applyShowHides();
      }

      function checkForRepoExistence(repo, cb) {
        $.ajax({
          url: '/api/private/gh/repos/' + repo,
          contentType: "application/json",
          dataType: "json",
          global: false, // Don't raise an error globally
          type: "GET",
          error: function() {
            cb(false);
          },
          success: function() {
            cb(true);
          }
        });
      }

      function applyShowHides() {
        function arrayToJq(value) {
          var elements = [];
          Object.keys(showHide).forEach(function(f) {
            if(showHide[f] === value) {
              elements = elements.concat(self.ui[f].get());
            }
          });
          return $(elements);
        }

        self.dialog.setButtonState('create', createButtonEnabled);

        if (showHide.premiumRequired) {
          self.dialog.hideActions();
          self.dialog.showPremium();
        } else {
          self.dialog.showActions();
          self.dialog.hidePremium();
        }
        

        if(animated === false) {
          arrayToJq(true).show();
          arrayToJq(false).hide();
          self.ui.roomNameInput.attr('placeholder', placeholder);
          self.ui.parentNameLabel.text(parentName);
        } else {
          arrayToJq(true).filter(':hidden').slideDown("fast");
          arrayToJq(false).filter(':visible').slideUp("fast");

          window.setTimeout(function() {
            this.ui.parentNameLabel.text(parentName);
            this.ui.roomNameInput.attr('placeholder', placeholder);
          }.bind(self), 200);
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
      { action: "get-plan", text: "Get Plan", className: "trpBtnGreen premium hidden"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };

});

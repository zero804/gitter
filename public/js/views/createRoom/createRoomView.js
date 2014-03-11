/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

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
      permExistingRepo: "#perm-select-existing-repo",

      selectParentRequired: "#perm-select-required",
      existing: '#existing',
      parentNameLabel: "#parent-name",
      permInheritedLabel: '#perm-inherited-label',
      roomNameInput: '#room-name',
      dropDownButton: '#dd-button'
    },

    events: {
      'change @ui.roomNameInput': 'roomNameChange',
      'cut @ui.roomNameInput': 'roomNameChange',
      'paste @ui.roomNameInput': 'roomNameChange',
      'input @ui.roomNameInput': 'roomNameChange',
      'click @ui.dropDownButton': 'clickDropDown'
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
      $('#input-parent').focus();
    },

    validateAndCreate: function() {
      /* We do a better job on the server with checking names, as we have XRegExp there */
      function safeRoomName(val) {
        if(!val) return false;
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
      var channelName = this.ui.roomNameInput.val();
      var url;

      switch(ownerModel.get('type')) {
        case 'user':
          if(permissions !== 'public' && permissions !== 'private') {
            // TODO: better error reporting!
            return;
          }

          if(channelName && !safeRoomName(channelName)) {
            this.ui.roomNameInput.focus();
            return;
          }

          url = "/api/v1/user/" + context.getUserId() + '/channels';
          break;

        case 'repo':
        case 'org':
          if(permissions !== 'public' && permissions !== 'private' && permissions != 'inherited') {
            // TODO: better error reporting!
            return;
          }

          if(!safeRoomName(channelName)) {
            this.ui.roomNameInput.focus();
            return;
          }

          url = "/api/v1/troupes/" + ownerModel.get('id') + '/channels';
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
              window.alert('The name you have chosen is illegal');
              this.ui.roomNameInput.focus();
            }
          },
          403: function() {
            window.alert('You don\'t have permission to create that room');
          },
          409: function() {
            window.alert('There is already a Github repository with that name');
          }
        },
        success: function(data) {
          this.dialog.hide();
          appEvents.trigger('navigation', data.url , 'chat', data.uri);
        }
      });
    },

    parentSelected: function(model, animated) {
      this.selectedModel = model;
      this.recalcView(animated);
    },

    recalcView: function(animated) {

      var self = this;
      var showHide = {
        'selectParentRequired': false,
        'autoJoin': false,
        'permPublic': false,
        'permPrivate': false,
        'permInheritedOrg': false,
        'permInheritedRepo': false,
        'permExistingRepo': false,
        'existing': false
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
            placeholder = "Optional";
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
            'existing': true
          };
          checkForRepo = null;
        }
      }


      if(checkForRepo) {
        checkForRepoExistence(checkForRepo, function(exists) {
          if(exists) {
            createButtonEnabled = !exists;
            showHide = {
              'selectParentRequired': false,
              'autoJoin': false,
              'permPublic': false,
              'permPrivate': false,
              'permInheritedOrg': false,
              'permInheritedRepo': false,
              'permExistingRepo': true,
              'existing': false
            };
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
      { action: "create", text: "Create", className: "trpBtnGreen" },
      { action: "back", text: "Back", className: "trpBtnLightGrey" },
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };

});

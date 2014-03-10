/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'marionette',
  'collections/instances/troupes',
  'views/base',
  'utils/context',
  './parentSelectView',
  'hbs!./tmpl/createRoom',
  'utils/appevents'
], function($, Marionette, troupeCollections, TroupeViews, context, ParentSelectView, template, appEvents) {
  "use strict";

  var View = Marionette.Layout.extend({
    template: template,

    ui: {
      autoJoin: "#auto-join",
      permPublic: "#perm-select-public",
      permPrivate: "#perm-select-private",
      permInherited: "#perm-select-inherited",
      selectParentRequired: "#perm-select-required",
      parentNameLabel: "#parent-name",
      permInheritedLabel: '#perm-inherited-label',
      roomNameInput: '#room-name'
    },

    events: {

    },

    regions: {
      ownerSelect: '#owner-region',
    },

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'create':
          this.validateAndCreate();
          break;

        case 'cancel':
          this.dialog.hide();
          break;
      }
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

      var hide = [this.ui.autoJoin, this.ui.permPublic, this.ui.permPrivate, this.ui.permInherited];
      var show = [this.ui.selectParentRequired];
      var placeholder = "";

      if(model) {
        this.ui.parentNameLabel.text(model.get('name'));
        switch(model.get('type')) {
          case 'org':
          case 'repo':
            this.ui.permInheritedLabel.text(model.get('type') === 'repo' ? 'Repository' : 'Organisation');
            show = [/*this.ui.autoJoin, */this.ui.permPublic, this.ui.permPrivate, this.ui.permInherited];
            hide = [this.ui.selectParentRequired, /* REMOVE */this.ui.autoJoin];
            placeholder = "Required";
            break;
          case 'user':
            show = [this.ui.permPublic, this.ui.permPrivate];
            hide = [this.ui.selectParentRequired, this.ui.permInherited, this.ui.autoJoin];
            placeholder = "Optional";
            break;
        }
      }

      function arrayToJq(array) {
        var elements = [];
        array.forEach(function(a) {
          elements = elements.concat(a.get());
        });
        return $(elements);
      }

      this.ui.roomNameInput.attr('placeholder', placeholder);
      if(animated === false) {
        arrayToJq(show).show();
        arrayToJq(hide).hide();
      } else {
        arrayToJq(show).filter(':hidden').slideDown("fast");
        arrayToJq(hide).filter(':visible').slideUp("fast");
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
    },


  });

  var Modal = TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create a chat room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: [
      { action: "create", text: "Create", className: "trpBtnGreen" },
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };

});

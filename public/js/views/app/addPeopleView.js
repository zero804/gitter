"use strict";
var Marionette = require('marionette');
var Backbone = require('backbone');
var cocktail = require('cocktail');
var TroupeViews = require('views/base');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var template = require('./tmpl/addPeople.hbs');
var userSearchItemTemplate = require('./tmpl/userSearchItem.hbs');
var itemTemplate = require('./tmpl/addPeopleItemView.hbs');
var Typeahead = require('views/controls/typeahead');
require('views/behaviors/widgets');

module.exports = (function() {


  var UserSearchModel = Backbone.Model.extend({
    idAttribute: "id",
  });

  var UserSearchCollection = Backbone.Collection.extend({
    url: '/v1/user',
    model: UserSearchModel,
    parse: function (response) {
      return response.results;
    }
  });

  var RowView = Marionette.ItemView.extend({
    events: {
      'submit form': 'invite'
    },
    modelEvents: {
      'change': 'render'
    },
    behaviors: {
      Widgets: {}
    },
    ui: {
      email: "input[type=email]"
    },
    tagName: "div",
    className: "gtrPeopleRosterItem",
    template: itemTemplate,
    invite: function(e) {
      e.preventDefault();
      var model = this.model;
      var email = this.ui.email.val();

      var self = this;

      var data = {
        username: this.model.get('username'),
        email: email,
        roomId: context.getTroupeId()
      };

      apiClient.priv.post('/invite-user', data)
        .then(function() {
          model.set({
            email: email,
            unreachable: false,
            invited: true,
            added: false
          });
        })
        .fail(function(e) {
          var json = e.responseJSON;
          var message = json && (json.message || json.error) || "Unable to invite user to Gitter";

          self.trigger('invite:error', message);
        });

    }
  });

  var View = Marionette.CompositeView.extend({
    itemViewContainer: ".gtrPeopleAddRoster",
    itemView: RowView,
    template: template,
    ui: {
      input: 'input.gtrInput',
      share: '.js-add-people-share',
      loading: '.js-add-roster-loading',
      validation: '#modal-failure',
      success: '#modal-success'
    },

    initialize: function() {
      if(!this.collection) {

        var ResultsCollection = Backbone.Collection.extend({
          comparator: function(a, b) {
            return b.get('timeAdded') - a.get('timeAdded');
          }
        });

        this.collection = new ResultsCollection();
      }

      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    onItemviewInviteError: function(itemView, message) {
      this.ui.loading.toggleClass('hide', true);
      this.showValidationMessage(message);
    },

    selected: function (m) {
      this.addUserToRoom(m);
      this.typeahead.dropdown.hide();
    },

    strTemplate: function (str, o) {
      return str.replace(/{{([a-z_$]+)}}/gi, function (m, k) {
          return (typeof o[k] !== 'undefined' ? o[k] : '');
      });
    },

    menuItemClicked: function (button) {
      switch (button) {
        case 'share':
          this.dialog.hide();
          window.location.hash = "#share";
          break;

        case 'done':
          this.dialog.hide();
          break;
      }
    },

    /**
     * showMessage() slides the given element down then up
     *
     * el   DOM Element - element to be animated
     */
    showMessage: function (el) {
      el.slideDown('fast');
      setTimeout(function () {
        el.slideUp('fast');
        return;
      }, 3000);
    },

    showValidationMessage: function(message) {
      this.ui.validation.text(message);
      this.showMessage(this.ui.validation);
    },

    showSuccessMessage: function(message) {
      this.ui.success.text(message);
      this.showMessage(this.ui.success);
    },

    handleError: function (res, status, message) {

    },

    /**
     * addUserToRoom() sends request and handles reponse of adding an user to a room
     *
     * m    BackboneModel - the user to be added to the room
     */
    addUserToRoom: function (m) {
      var self = this;

      self.ui.loading.toggleClass('hide');

      apiClient.room.post('/users', { username: m.get('username') })
        .then(function(res) {
          self.ui.loading.toggleClass('hide');
          var user = res.user;
          m.set({
            added: !user.invited,
            invited: user.invited && user.email,
            unreachable: user.invited && !user.email,
            timeAdded: Date.now(),
            email: user.email,
            user: user,
            username: user.username
          });

          self.collection.add(m);
          self.typeahead.clear();
        })
        .fail(function (xhr) {
          var json = xhr.responseJSON;
          self.ui.loading.toggleClass('hide');
          var m = json && json.message || 'Error';
          self.showValidationMessage(m);
          self.typeahead.clear();
        });
    },

    serializeData: function() {
      var isOverLimit = context.troupe().get('userCount') > 0;
      var org = context.troupe().get('uri').split('/')[0];
      var billingUrl = context.env('billingUrl') + '/create/' + org + '/pro?r=' + window.location.pathname;

      return {
        isOverLimit: isOverLimit,
        billingUrl: billingUrl
      };
    },

    onRender: function () {
      var self = this;

      setTimeout(function() {
        self.ui.input.focus();
      }, 10);

      this.typeahead = new Typeahead({
        collection: new UserSearchCollection(),
        itemTemplate: userSearchItemTemplate,
        el: this.ui.input[0],
        autoSelector: function(input) {
          return function(m) {
            var displayName = m.get('displayName');
            var username = m.get('username');

            return displayName && displayName.indexOf(input) >= 0 ||
                   username && username.indexOf(input) >= 0;
          };
        }
      });

      this.listenTo(this.typeahead, 'selected', this.selected);
    },

    onClose: function() {
      if(this.typeahead) {
        this.typeahead.close();
      }
    }
  });

  var modalButtons = [
    { action: "done", text: "Done", className: "trpBtnLightGrey"}
  ];

  if(context.troupe().get('security') !== 'PRIVATE') {
    modalButtons.push({ action: "share", text: "Share this room", className: "trpBtnBlue trpBtnRight"});
  }

  cocktail.mixin(View, TroupeViews.SortableMarionetteView);

  return TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Add people to this room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: modalButtons
  });


})();


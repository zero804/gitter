"use strict";
var Marionette = require('backbone.marionette');
var ModalView = require('views/modals/modal');
var Backbone = require('backbone');
var context = require('utils/context');
var clientEnv = require('gitter-client-env');
var apiClient = require('components/apiClient');
var template = require('./tmpl/addPeople.hbs');
var userSearchItemTemplate = require('./tmpl/userSearchItem.hbs');
var itemTemplate = require('./tmpl/addPeopleItemView.hbs');
var Typeahead = require('views/controls/typeahead');
var userSearchModels = require('collections/user-search');
require('views/behaviors/widgets');


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
      .catch(function(e) {
        var message = e.friendlyMessage || "Unable to invite user to Gitter";
        self.trigger('invite:error', message);
      });

  }
});

var View = Marionette.CompositeView.extend({
  childViewContainer: ".gtrPeopleAddRoster",
  childView: RowView,
  template: template,
  ui: {
    input: '.gtrInput',
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

  onChildviewInviteError: function(childView, message) { // jshint unused:true
    this.ui.loading.toggleClass('hide', true);
    this.showValidationMessage(message);
  },

  selected: function (m) {
    this.addUserToRoom(m);
    this.typeahead.dropdown.hide();
  },

  strTemplate: function (str, o) {
    return str.replace(/{{([a-z_$]+)}}/gi, function (m, k) { // jshint unused:true
        return (typeof o[k] !== 'undefined' ? o[k] : '');
    });
  },

  billingUrl: function() {
    var orgName = context.troupe().get('uri').split('/')[0];
    var billingUrl = clientEnv['billingUrl'] + '/create/' + orgName + '/pro?r=' + context.troupe().get('url');
    return billingUrl;
  },

  menuItemClicked: function (button) {
    switch (button) {
      case 'share':
        this.dialog.hide();
        window.location.hash = "#share";
        break;

      case 'get-pro':
        window.open(this.billingUrl());
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
    }, 10000);
  },

  showValidationMessage: function(message) {
    this.ui.validation.text(message);
    this.showMessage(this.ui.validation);
  },

  showSuccessMessage: function(message) {
    this.ui.success.text(message);
    this.showMessage(this.ui.success);
  },

  handleError: function (/*res, status, message */) {
    // TODO: what should go here?
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
      .catch(function (e) {
        self.ui.loading.toggleClass('hide');
        var m = e.friendlyMessage || 'Error';

        // XXX: why not use the payment required status code for this?
        if (m.match(/has reached its limit/)) self.dialog.showPremium();
        self.showValidationMessage(m);
        self.typeahead.clear();
      });
  },

  onRender: function () {
    var self = this;

    setTimeout(function() {
      self.ui.input.focus();
    }, 10);

    this.typeahead = new Typeahead({
      collection: new userSearchModels.Collection(),
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

  onDestroy: function() {
    if(this.typeahead) {
      this.typeahead.destroy();
    }
  }
});

var modalButtons = [
  { action: "get-pro", text: "Upgrade to Pro", className: "modal--default__footer__link premium hidden" }
];

if(context.troupe().get('security') !== 'PRIVATE') {
  modalButtons.push({ action: "share", pull: 'right', text: "Share this room", className: "modal--default__footer__link"});
}

module.exports = ModalView.extend({
  disableAutoFocus: true,
  initialize: function(options) {
    options = options || {};
    options.title = options.title || "Add people to this room";

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  },
  menuItems: modalButtons
});


define([
  'jquery',
  'underscore',
  'marionette',
  'backbone',
  'views/base',
  'utils/context',
  'utils/mailto-gen',
  'hbs!./tmpl/addPeople',
  'hbs!./tmpl/userSearchItem',
  'hbs!./tmpl/addItemTemplate',
  'views/controls/dropdown',
  'views/controls/typeahead'
], function($, _, Marionette, Backbone, TroupeViews, context, mailto, template, userSearchItemTemplate,
  itemTemplate, Dropdown, Typeahead) {
  "use strict";

  var UserSearchModel = Backbone.Model.extend({
    idAttribute: "id",
  });

  var UserSearchCollection = Backbone.Collection.extend({
    url: '/api/v1/user',
    model: UserSearchModel,
    parse: function (response) {
      return response.results;
    }
  });

  var RowView = Marionette.ItemView.extend({
    tagName: "div",
    className: "gtrPeopleRosterItem",
    template: itemTemplate,
    ui: {
      remove: '.remove'
    },
    triggers: {
      'click @ui.remove': 'remove:clicked'
    }
  });


  var View = Marionette.CompositeView.extend({
    itemViewContainer: ".gtrPeopleAddRoster",
    itemView: RowView,
    template: template,

    ui: {
      input: 'input.gtrInput',
      share: '.js-add-people-share',
      validation: '#modal-failure',
      success: '#modal-success'
    },

    itemEvents: {
      "remove:clicked": function(event, view) {
        this.collection.remove(view.model);
      }
    },

    initialize: function() {
      if(!this.collection) {
        this.collection = new Backbone.Collection();
        // TODO: this collection should be sorted by latest model added
        // this.collection.comparator = function (m) {};
      }
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    selected: function (m) {
      this.addUserToRoom(m);
      this.typeahead.dropdown.hide();
    },

    menuItemClicked: function (button) {
      switch (button) {
        // case 'create':
        //   this.validateAndCreate();
        //   break;

        case 'share':
          this.dialog.hide();
          window.location.hash = "#inv";
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

    /** TODO
     * computeFeedback() produces feedback for the action of adding a user to a room
     *
     * user    Object - user object in which the logic is applied to
     * returns Object - contans the outcome `class` and the message to be displayed on the current item.
     */
    computeFeedback: function (user) {
      var fb = {
        outcome: null,
        message: null,
        action: { href: null, text: null }
      };

      if (!user.invited) {
        fb.outcome = 'added';
        fb.message = 'was added.';
      } else if (user.invited && user.email) {
        fb.outcome = 'invited';
        fb.message = 'has been invited to Gitter.';
      } else {
        fb.outcome = 'unreachable';
        fb.message = 'is not on Gitter and has no email.';
        var email = mailto.el({ subject: 'Gitter Invite', body: 'Hi <b>' + user.username + '</b>, I\'ve messaged you on Gitter. Join me! ' + context.env('basePath') + context.troupe().get('url') });
        fb.action.href = email.href;
        fb.action.text = 'Invite.';
      }

      return fb;
    },

    /**
     * addUserToRoom() sends request and handles reponse of adding an user to a room
     *
     * m    BackboneModel - the user to be added to the room
     */
    addUserToRoom: function (m) {
      $.ajax({
        url: '/api/v1/rooms/' + context.getTroupeId()  + '/users',
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify({ usernames: [ m.get('username') ] }),
        context: this,
        statusCode: {
          400: function() {
            this.showValidationMessage('Unable to complete the request. Please try again later.');
          },
          403: function() {
            this.showValidationMessage('You cannot add people to this room. Only members of the channels owner can add people to a private channel.');
          },
          500: function () {
            this.showValidationMessage('Server error. Please try again later.');
          }
        },
        success: function (res) {
          if (!res.users.length) return this.showValidationMessage('User is already in the room.');
          var feedback = this.computeFeedback(res.users[0]);
          m.set('message', feedback.message);
          m.set('outcome', feedback.outcome);
          m.set('action', feedback.action);
          this.typeahead.clear();
          this.collection.add(m);
        }
      });
    },

    onRender: function() {
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
    // { action: "create", text: "Add", className: "trpBtnGreen" },
    { action: "done", text: "Done", className: "trpBtnLightGrey"},
  ];

  if(context.troupe().get('security') !== 'PRIVATE') {
    modalButtons.push({ action: "share", text: "Share this room", className: "trpBtnBlue trpBtnRight"});
  }

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

});

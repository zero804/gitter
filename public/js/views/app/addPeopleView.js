
define([
  'jquery',
  'underscore',
  'marionette',
  'backbone',
  'cocktail',
  'views/base',
  'utils/context',
  'utils/mailto-gen',
  'hbs!./tmpl/addPeople',
  'hbs!./tmpl/userSearchItem',
  'hbs!./tmpl/addItemTemplate',
  'views/controls/dropdown',
  'views/controls/typeahead'
], function($, _, Marionette, Backbone, cocktail, TroupeViews, context, mailto, template, userSearchItemTemplate,
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
    template: itemTemplate
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

    /*
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
        fb.message = 'is not on Gitter and has no public email.';
        var email = mailto.el({
          subject: 'Gitter Invite',
          body: this.strTemplate('Hi {{user}}, I\'ve added you to a room on Gitter. Join me! {{base}}{{roomUrl}}', { user: user.username, base: context.env('basePath'), roomUrl: context.troupe().get('url') })
        });
        fb.action.href = email.href;
        fb.action.text = 'Invite.';
      }

      return fb;
    },


    handleError: function (res, status, message) {
      var json = res.responseJSON;
      this.ui.loading.toggleClass('hide');
      this.showValidationMessage((json) ? json.error : res.status + ': ' + res.statusText);
      this.typeahead.clear();
    },

    /**
     * addUserToRoom() sends request and handles reponse of adding an user to a room
     *
     * m    BackboneModel - the user to be added to the room
     */
    addUserToRoom: function (m) {
      this.ui.loading.toggleClass('hide');
      $.ajax({
        url: '/api/v1/rooms/' + context.getTroupeId()  + '/users',
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify({ username: m.get('username') }),
        context: this,
        timeout: 45 * 1000,
        error: this.handleError,
        success: function (res) {
          this.ui.loading.toggleClass('hide');
          var feedback = this.computeFeedback(res.user);
          if (res.user.email) m.set('email', res.user.email);
          m.set({
            message: feedback.message,
            outcome: feedback.outcome,
            action: feedback.action,
            timeAdded: Date.now()
          });
          this.collection.add(m);
          this.typeahead.clear();
        }
      });
    },

    onRender: function () {
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

});

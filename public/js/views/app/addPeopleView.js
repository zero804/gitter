define([
  'jquery',
  'marionette',
  'backbone',
  'cocktail',
  'views/base',
  'utils/context',
  'components/apiClient',
  'hbs!./tmpl/addPeople',
  'hbs!./tmpl/userSearchItem',
  'hbs!./tmpl/addPeopleItemView',
  'views/controls/typeahead',
  'views/behaviors/widgets'      // No ref
], function($, Marionette, Backbone, cocktail, TroupeViews, context, apiClient, template, userSearchItemTemplate,
  itemTemplate, Typeahead) {
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

      var data = {
        username: this.model.get('username'),
        email: email,
        roomId: context.getTroupeId()
      };

      apiClient.post('/api/private/invite-user', data)
        .then(function() {
          model.set({
            email: email,
            unreachable: false,
            invited: true,
            added: false
          });
        })
        .fail(function() {
          console.log(arguments);
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

    handleError: function (res/*, status, message*/) {
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

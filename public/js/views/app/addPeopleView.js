
define([
  'jquery',
  'underscore',
  'marionette',
  'backbone',
  'views/base',
  'utils/context',
  'hbs!./tmpl/addPeople',
  'hbs!./tmpl/userSearchItem',
  'hbs!./tmpl/addItemTemplate',
  'views/controls/dropdown',
  'views/controls/typeahead'
], function($, _, Marionette, Backbone, TroupeViews, context, template, userSearchItemTemplate,
  itemTemplate, Dropdown, Typeahead) {
  "use strict";

  var UserSearchModel = Backbone.Model.extend({
    idAttribute: "id",
  });

  var UserSearchCollection = Backbone.Collection.extend({
    url: '/api/v1/user',
    model: UserSearchModel,
    parse: function(response) {
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
      validation: '#modal-failure'
    },

    itemEvents: {
      "remove:clicked": function(event, view) {
        this.collection.remove(view.model);
      }
    },
    initialize: function() {
      if(!this.collection) {
        this.collection = new Backbone.Collection();
      }

      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    selected: function(m) {
      this.collection.add(m);
      this.typeahead.dropdown.hide();
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'create':
          this.validateAndCreate();
          break;

        case 'share':
          this.dialog.hide();
          window.location.hash = "#inv";
          break;


        case 'cancel':
          this.dialog.hide();
          break;
      }
    },


    showValidationMessage: function(message) {
      this.ui.validation.text(message);
      if(message) {
        this.ui.validation.slideDown('fast');
      } else {
        this.ui.validation.slideUp('fast');
      }
    },

    /**
     * Validate the form and send the request
     */
    validateAndCreate: function() {
      if(this.collection.length === 0) {
        this.showValidationMessage('Search for some people to add');
        this.ui.input.focus();
        return;
      }

      $.ajax({
        url: '/api/v1/rooms/' + context.getTroupeId()  + '/users',
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify({ usernames: this.collection.pluck('username') }),
        context: this,
        statusCode: {
          400: function() {
            this.showValidationMessage('Unable to complete the request. Please try again later.');
          },
          403: function() {
            this.showValidationMessage('You cannot add people to this room. Only members of the channels owner can add people to a private channel.');
          }
        },
        success: function() {
          this.dialog.hide();
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
    { action: "create", text: "Add", className: "trpBtnGreen" },
    { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"},
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

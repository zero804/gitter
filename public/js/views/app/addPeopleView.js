/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

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
], function($, _, Marionette, Backbone, TroupeViews, context, template, userSearchItemTemplate, itemTemplate, Dropdown, Typeahead) {
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
      select: '#select-button'
    },

    events: {
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

        case 'cancel':
          this.dialog.hide();
          break;
      }
    },

    onRender: function() {
      this.typeahead = new Typeahead({ collection: new UserSearchCollection(), itemTemplate: userSearchItemTemplate, el: this.ui.input[0] });
      this.listenTo(this.typeahead, 'selected', this.selected);
    },

    onClose: function() {
      if(this.typeahead) {
        this.typeahead.close();
      }
    }

  });

  return TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Add people to this room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: [
      { action: "create", text: "Add", className: "trpBtnGreen" },
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

});

'use strict';

var Marionette = require('backbone.marionette');
var avatars = require('gitter-web-avatars');
var fuzzysearch = require('fuzzysearch');
var toggleClass = require('../../utils/toggle-class');
var apiClient = require('../../components/apiClient');
var ModalView = require('./modal');
var Typeahead = require('../controls/typeahead');
var userSearchModels = require('../../collections/user-search');
var userSearchItemTemplate = require('../app/tmpl/userSearchItem.hbs');
var PermissionsPeopleListView = require('./permissions/permisions-people-list-view');

var template = require('./tmpl/permissions-view.hbs');

var CreateRoomView = Marionette.LayoutView.extend({
  template: template,

  ui: {
    peopleInput: '.js-permissions-people-input'
  },

  behaviors: {
    Isomorphic: {
      adminListView: { el: '.js-permissions-admin-list-root', init: 'initAdminListView' }
    },
  },

  initAdminListView: function(optionsForRegion) {
    this.adminListView = new PermissionsPeopleListView(optionsForRegion({
      collection: this.model.adminCollection
    }));

    this.listenTo(this.adminListView, 'invite:remove', this.onAdminRemoved, this);
    return this.adminListView;
  },

  initialize: function(/*attrs, options*/) {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'done':
        // done
        break;
    }
  },

  onRender: function() {

    this.typeahead = new Typeahead({
      collection: new userSearchModels.Collection(),
      itemTemplate: userSearchItemTemplate,
      el: this.ui.peopleInput[0],
      autoSelector: function(input) {
        return function(m) {
          var displayName = (m.get('displayName') || '').toLowerCase();
          var username = (m.get('username') || '').toLowerCase();

          return fuzzysearch(input.toLowerCase(), displayName) ||
            fuzzysearch(input.toLowerCase(), username);
        };
      },
      fetch: function(input, collection, fetchSuccess) {
        this.collection.fetch({
          data: {
            q: input
          }
        }, {
          add: true,
          remove: true,
          merge: true,
          success: fetchSuccess
        });
      }
    });

    this.listenTo(this.typeahead, 'selected', this.onPersonSelected);
  },

  onPersonSelected: function (m) {
    this.model.adminCollection.add([m]);
    this.typeahead.dropdown.hide();
  },

});


var Modal = ModalView.extend({
  disableAutoFocus: true,

  initialize: function(options) {
    options = options || {};
    options.title = options.title || 'Community Permissions';

    ModalView.prototype.initialize.call(this, options);
    this.view = new CreateRoomView(options);
  },

  menuItems: function() {
    var result = [];

    result.push({
      action: 'done',
      pull: 'right',
      text: 'Done',
      className: 'modal--default__footer__btn'
    });

    return result;
  }
});


module.exports = {
  View: CreateRoomView,
  Modal: Modal
};

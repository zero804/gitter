'use strict';

var Promise = require('bluebird');
var Marionette = require('backbone.marionette');
var fuzzysearch = require('fuzzysearch');
var urlJoin = require('url-join');
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
    peopleInput: '.js-permissions-people-input',
    permissionsOptionsWrapper: '.js-permissions-options-wrapper',
    permissionsOptionsSelect: '.js-permissions-options-select',
    permissionsOptionsCheckbox: '.js-permissions-options-checkbox'
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

    this.listenTo(this.adminListView, 'user:remove', this.onAdminRemoved, this);
    return this.adminListView;
  },

  initialize: function(/*attrs, options*/) {
    this.initializeForEntity();
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  modelEvents: {
    'change:entity': 'onEntityChange'
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'switch-to-group-entity':
        var entity = this.model.get('entity');
        var groupId = entity && entity.get('groupId');

        var group = null;
        if(groupId) {
          group = this.model.groupCollection.get(groupId);
        }

        this.model.set({
          entity: group
        })
        break;
      case 'done':
        // done
        break;
    }
  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.entity = data.entity && data.entity.toJSON();
    console.log('data', data);

    // `backedBy` vs `backend`, see https://github.com/troupe/gitter-webapp/issues/2051
    var backedBy = data.entity && (data.entity.backedBy || data.entity.backend);

    data.isPermissionOptsEnabled = this.getIsPermissionOptsEnabled();
    data.permissionOptions = this.getPermissionOptions();

    return data;
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

  initializeForEntity: function() {
    this.fetchSecurityDescriptor();
    this.fetchAdminUsers();
    this.listenTo(this.model.get('entity'), 'change:backedBy', this.onEntityBackedByChange);
  },

  onEntityChange: function() {
    this.model.adminCollection.reset();
    this.initializeForEntity();
    this.render();
  },

  onEntityBackedByChange: function() {
    var entity = this.model.get('entity');
    var permissionOptions = this.getPermissionOptions();

    this.ui.permissionsOptionsSelect.html('');
    permissionOptions.forEach(function(opt) {
      console.log('onEntityBackedByChange', opt);
      this.ui.permissionsOptionsSelect.append('<option value="' + opt.value + '" ' + (opt.selected ? 'selected' : '') + '>' + opt.label + '</option>');
    });

    // `backedBy` vs `backend`, see https://github.com/troupe/gitter-webapp/issues/2051
    var backedBy = entity && (entity.get('backedBy') || entity.get('backend'));

    toggleClass(this.permissionsOptionsWrapper[0], 'disabled', !entity || (entity && backedBy.type === null))
    var isPermissionOptsEnabled = this.getIsPermissionOptsEnabled();
    this.ui.permissionsOptionsCheckbox.attr('checked', isPermissionOptsEnabled)
  },

  onPersonSelected: function(user) {
    this.model.adminCollection.add([user]);
    this.typeahead.dropdown.hide();
  },

  onAdminRemoved: function(user) {
    this.model.adminCollection.remove(user);
  },

  getIsPermissionOptsEnabled: function() {
    var entity = this.model.get('entity');

    // `backedBy` vs `backend`, see https://github.com/troupe/gitter-webapp/issues/2051
    var backedBy = entity.get('backedBy') || entity.get('backend');

    var isPermissionOptsEnabled = backedBy && backedBy.type !== undefined && backedBy.type !== null;

    return isPermissionOptsEnabled;
  },

  getPermissionOptions: function() {
    var entity = this.model.get('entity');
    var permissionOptions = [];

    if(entity) {
      // `backedBy` vs `backend`, see https://github.com/troupe/gitter-webapp/issues/2051
      var backedBy = entity.get('backedBy') || entity.get('backend');

      if(backedBy && backedBy.type === 'GH_ORG') {
        permissionOptions.push({
          value: 'GH_ORG',
          label: 'Members of GitHub\'s' + entity.security.linkPath,
          selected: backedBy.type === 'GH_ORG'
        });
      }
      else if(backedBy && backedBy.type === 'GH_REPO') {
        permissionOptions.push({
          value: 'GH_REPO',
          label: 'People with push access to GitHub\'s' + backedBy.linkPath,
          selected: backedBy.type === 'GH_REPO'
        });
      }
    }

    return permissionOptions;
  },

  getBaseApiEndpointForEntity: function() {
    var entity = this.model.get('entity');
    var baseEntityApiUrl = '/v1/groups';
    // TODO: Better way to tell if it is a room or how to determine associated endpoint???
    var isRoom = entity && entity.get('groupId');
    if(isRoom) {
      baseEntityApiUrl = '/v1/rooms';
    }

    return baseEntityApiUrl;
  },

  getApiEndpointForEntity: function() {
    var entity = this.model.get('entity');
    if(entity) {
      return urlJoin(this.getBaseApiEndpointForEntity(), entity.get('id'));
    }
  },

  fetchSecurityDescriptor: function() {
    var entity = this.model.get('entity');
    if(entity) {
      var securityApiUrl = urlJoin(this.getApiEndpointForEntity(), 'security');
      return apiClient.get(securityApiUrl)
        .then(function(sd) {
          // TODO: Verify works once API is in place
          this.model.set('backedBy', sd);
        })
        .catch(function(err) {
          // TODO: Show error in UI
          console.log('err', err);
        });
    }

    return Promise.resolve();
  },

  fetchAdminUsers: function() {
    var entity = this.model.get('entity');

    if(entity) {
      this.model.adminCollection.url = urlJoin(this.getApiEndpointForEntity(), 'security/extraAdmins');
        // TODO: Verify works once API is in place
      this.model.adminCollection.fetch();
    }
  }

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
    var options = this.options || {};
    var model = options.model;
    var entity = model && model.get('entity');

    var items = [];

    if(entity) {
      var groupId = entity.get('groupId');
      if(groupId) {
        items.push({
          action: 'switch-to-group-entity',
          pull: 'left',
          text: 'Edit Community Permissions',
          className: 'modal--default__footer__link'
        });
      }
    }

    items.push({
      action: 'done',
      pull: 'right',
      text: 'Done',
      className: 'modal--default__footer__btn'
    });


    return items;
  }
});


module.exports = {
  View: CreateRoomView,
  Modal: Modal
};

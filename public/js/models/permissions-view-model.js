'use strict';

var Backbone = require('backbone');

var PermissionsViewModel = Backbone.Model.extend({
  defaults: {
    entity: null,
    securityDescriptor: {
      type: undefined,
      linkPath: undefined,
      public: undefined,
      externalId: undefined,
      internalId: undefined,
      //extraAdmins: see `adminCollection`
      //extraMembers: NA
    },
    requestingSecurityDescriptorStatus: null,
    submitSecurityDescriptorStatus: null
  },

  initialize: function(attrs, options) {
    options = options || {};

    this.groupCollection = options.groupCollection || new Backbone.Collection([]);
    this.adminCollection = new Backbone.Collection(options.adminCollection ? options.adminCollection.models : []);
  },

  validate: function() {
    var errors = [];

    var sd = this.get('securityDescriptor');

    if(sd.type === null && this.adminCollection.length === 0) {
      errors.push({
        key: 'extra-admins',
        message: 'At least one admin needs to be added when manual type set.'
      });
    }

    return errors.length > 0 ? errors : undefined;
  }
});

module.exports = PermissionsViewModel;

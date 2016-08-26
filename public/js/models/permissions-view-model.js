'use strict';

var Backbone = require('backbone');

var PermissionsViewModel = Backbone.Model.extend({
  defaults: {

  },

  initialize: function(attrs, options) {
    this.adminCollection = new Backbone.Collection([]);
  },

  validate: function() {
    var errors = [];

    var foo = this.get('foo') || '';

    var hasFoo = foo.length > 0;
    if(!hasFoo) {
      errors.push({
        key: 'foo',
        message: 'Please fill in foo'
      });
    }

    return errors.length > 0 ? errors : undefined;
  }
});

module.exports = PermissionsViewModel;

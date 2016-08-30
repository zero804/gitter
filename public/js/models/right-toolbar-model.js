'use strict';

var Backbone = require('backbone');
var apiClient = require('../components/apiClient');
var autoModelSave = require('../utils/auto-model-save');

module.exports = Backbone.Model.extend({
  defaults: {
    isPinned: true
  },

  initialize: function() {
    autoModelSave(this, ['isPinned'], this.autoPersist);
  },

  toJSON: function() {
    // Get around circular structure
    var attrs = this.attributes;
    return Object.keys(this.defaults).reduce(function(memo, key) {
      memo[key] = attrs[key];
      return memo;
    }, {});
  },

  /**
   * Used by autoModelSave
   */
  autoPersist: function() {
    return apiClient.user.put('/settings/rightToolbar', this.toJSON(), {
      // No need to get the JSON back from the server...
      dataType: 'text'
    });
  }
});

'use strict';

var _ = require('underscore');
var Backbone = require('backbone');
var apiClient = require('components/apiClient');

module.exports = Backbone.Model.extend({
   defaults: {
      isPinned: true
   },

   initialize: function() {
      this.listenTo(this, 'change', _.throttle(this.save.bind(this), 1500));
   },


  toJSON: function() {
    // Get around circular structure
    var attrs = this.attributes;
    return Object.keys(this.defaults).reduce(function(memo, key) {
      memo[key] = attrs[key];
      return memo;
    }, {});
  },

   sync: function(method, model, options) {
      var successCb = options.success.bind(this) || function() {};

      // Save
      if (method === 'create' || method === 'update' || method === 'patch') {
         return apiClient.user.put('/settings/rightToolbar', this.toJSON(), {
             // No need to get the JSON back from the server...
             dataType: 'text'
           })
           .then(function(data) { successCb(data); })
           .catch(function(err) { if (options.error) options.error(err); });
      }

      // TODO: Is this correct???
      return apiClient.user.get('/settings/rightToolbar')
         .then(function(result) {
            this.set(result);
            successCb();
         });
   }
});

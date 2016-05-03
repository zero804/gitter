'use strict';

var Backbone = require('backbone');

var CommuntiyCreateModel = Backbone.Model.extend({
  defaults: {
    communityName: '',
    communitySlug: '',
    isUsingCustomSlug: false
  },

  initialize: function() {
    
  }
});

module.exports = CommuntiyCreateModel;

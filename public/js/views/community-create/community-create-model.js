'use strict';

var Backbone = require('backbone');

var Model = Backbone.Model.extend({
  defaults: {
    communityName: '',
    communitySlug: '',
    isUsingCustomSlug: false
  },

  initialize: function() {
    console.log('cc-main-view model init');
  }
});

module.exports = Model;

'use strict';

var Backbone = require('backbone');

var CommunityCreateStepViewModel = Backbone.Model.extend({
  defaults: {
    active: true,
    valid: true
  },

  initialize: function() {

  }
});

module.exports = CommunityCreateStepViewModel;

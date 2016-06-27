'use strict';

var Backbone = require('backbone');

var CommunityCreateStepViewModel = Backbone.Model.extend({
  defaults: {
    active: true
  },

  initialize: function(options) {
    this.communityCreateModel = options.communityCreateModel;
  }
});

module.exports = CommunityCreateStepViewModel;

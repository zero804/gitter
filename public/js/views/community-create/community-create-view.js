'use strict';

var Marionette = require('backbone.marionette');

var template = require('./community-create-view.hbs');
var CommunityCreationMainView = require('./views/community-creation-main-view');
var CommunityCreateModel = require('./community-create-model');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  template: template,

  behaviors: {
    Isomorphic: {
      mainStepView: { el: '.community-create-main-step-root', init: 'initMainStepView' },
    },
  },

  initMainStepView: function(optionsForRegion) {
    this.mainStepView = new CommunityCreationMainView(optionsForRegion({
      model: this.communityCreateModel
    }));
    return this.mainStepView;
  },

  initialize: function(options) {
    console.log('cc-view init');
    this.communityCreateModel = new CommunityCreateModel({});
  },

  onRender: function() {
    console.log('onRender');
  }
});

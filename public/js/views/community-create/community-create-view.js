'use strict';

var Marionette = require('backbone.marionette');

var template = require('./community-create-view.hbs');
var CommunityCreateModel = require('./community-create-model');
var CommunityCreationMainView = require('./views/community-creation-main-view');
var CommunityCreationInvitePeopleView = require('./views/community-creation-invite-people-view');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  template: template,

  behaviors: {
    Isomorphic: {
      mainStepView: { el: '.community-create-main-step-root', init: 'initMainStepView' },
      invitePeopleStepView: { el: '.community-create-invite-people-step-root', init: 'initInvitePeopleView' },
    },
  },

  initMainStepView: function(optionsForRegion) {
    this.mainStepView = new CommunityCreationMainView(optionsForRegion({
      communityCreateModel: this.communityCreateModel
    }));
    return this.mainStepView;
  },

  initInvitePeopleView: function(optionsForRegion) {
    this.invitePeopleStepView = new CommunityCreationInvitePeopleView(optionsForRegion({
      communityCreateModel: this.communityCreateModel
    }));
    return this.invitePeopleStepView;
  },

  initialize: function(options) {
    console.log('cc-view init');
    this.communityCreateModel = new CommunityCreateModel({});
  },

  onRender: function() {
    console.log('onRender');
  }
});

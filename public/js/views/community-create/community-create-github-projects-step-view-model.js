'use strict';

var _ = require('underscore');
var Backbone = require('backbone');

var CommunityCreateStepViewModel = require('./community-create-step-view-model');

var CommunityCreateGitHubProjectsStepViewModel = CommunityCreateStepViewModel.extend({
  defaults: _.extend({}, CommunityCreateStepViewModel.prototype.defaults, {
    isOrgAreaActive: true,
    isRepoAreaActive: false,

    selectedOrgId: null,
    selectedOrgName: null
  })
});

module.exports = CommunityCreateGitHubProjectsStepViewModel;

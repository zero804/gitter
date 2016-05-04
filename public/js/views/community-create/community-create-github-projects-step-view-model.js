'use strict';

var _ = require('underscore');
var Backbone = require('backbone');

var CommunityCreateStepViewModel = require('./community-create-step-view-model');

var CommunityCreateGitHubProjectsStepViewModel = CommunityCreateStepViewModel.extend({
  defaults: _.extend({}, CommunityCreateStepViewModel.prototype.defaults, {
    isOrgAreaActive: false,
    isRepoAreaActive: true
  })
});

module.exports = CommunityCreateGitHubProjectsStepViewModel;

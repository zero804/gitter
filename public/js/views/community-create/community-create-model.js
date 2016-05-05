'use strict';

var Backbone = require('backbone');

var STEP_CONSTANT_MAP = {
  main: 'MAIN',
  githubProjects: 'GITHUB_PROJECTS',
  invite: 'INVITE'
};

var CommunityCreateModel = Backbone.Model.extend({
  STEP_CONSTANT_MAP: STEP_CONSTANT_MAP,

  defaults: {
    active: false,
    stepState: STEP_CONSTANT_MAP.main,

    communityName: '',
    communitySlug: '',
    isUsingCustomSlug: false,
    githubOrgId: null
  },

  initialize: function() {

  }
});

CommunityCreateModel.STEP_CONSTANT_MAP = STEP_CONSTANT_MAP;

module.exports = CommunityCreateModel;

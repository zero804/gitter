'use strict';

var Backbone = require('backbone');

var STEP_CONSTANT_MAP = {
  main: 'main',
  githubProjects: 'githubProjects',
  invite: 'invite',
  overview: 'overview'
};

var CommunityCreateModel = Backbone.Model.extend({
  STEP_CONSTANT_MAP: STEP_CONSTANT_MAP,

  defaults: {
    active: false,
    stepState: STEP_CONSTANT_MAP.main,

    communityName: '',
    communitySlug: '',
    isUsingCustomSlug: false,
    githubOrgId: null,
    githubRepoId: null,

    subRooms: new Backbone.Collection([{
      name: 'lobby'
    }]),

    peopleToInvite: new Backbone.Collection()
  },

  initialize: function() {

  }
});

CommunityCreateModel.STEP_CONSTANT_MAP = STEP_CONSTANT_MAP;

module.exports = CommunityCreateModel;

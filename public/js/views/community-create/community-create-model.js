'use strict';

var Backbone = require('backbone');
var urlJoin = require('url-join');

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

  },

  getGithubProjectInfo: function(orgCollection, repoCollection) {
    var info = {
      name: null,
      url: null
    };

    var githubOrgId = this.get('githubOrgId');
    var githubRepoId = this.get('githubRepoId');
    if(githubOrgId) {
      var githubOrgModel = orgCollection.get(githubOrgId);
      info.name = githubOrgModel.get('name');
      info.url = urlJoin('https://github.com', githubOrgModel.get('name'));
    }
    else if(githubRepoId) {
      var githubRepoModel = repoCollection.get(githubRepoId);
      info.name = githubRepoModel.get('name');
      info.url = urlJoin('https://github.com', githubRepoModel.get('uri'));
    }

    return info;
  }
});

CommunityCreateModel.STEP_CONSTANT_MAP = STEP_CONSTANT_MAP;

module.exports = CommunityCreateModel;

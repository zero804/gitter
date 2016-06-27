'use strict';

var Backbone = require('backbone');
var urlJoin = require('url-join');
var stepConstants = require('./step-constants');

var CommunityCreateModel = Backbone.Model.extend({

  defaults: {
    active: false,
    stepState: stepConstants.MAIN,

    communityName: '',
    communitySlug: '',
    isUsingCustomSlug: false,
    githubOrgId: null,
    githubRepoId: null,

    /* * /
    subRooms: new Backbone.Collection([{
      name: 'lobby'
    }]),
    /* */

  },

  initialize: function() {
    // user models
    this.peopleToInvite = new Backbone.Collection();
    // { emailAddress }
    this.emailsToInvite = new Backbone.Collection();
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

module.exports = CommunityCreateModel;

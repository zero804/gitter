'use strict';

var _ = require('underscore');
var Backbone = require('backbone');
var urlJoin = require('url-join');
var stepConstants = require('./step-constants');
//var slugAvailabilityStatusConstants = require('./slug-availability-status-constants');
var peopleToInviteStatusConstants = require('./people-to-invite-status-constants');

var PeopleToInviteModel = Backbone.Model.extend({
  defaults: {
    inviteStatus: peopleToInviteStatusConstants.PENDING
  }
});

var PeopleToInviteCollection = Backbone.Collection.extend({
  model: PeopleToInviteModel
});


var CommunityCreateModel = Backbone.Model.extend({
  defaults: {
    active: false,
    stepState: stepConstants.MAIN,

    communityName: '',
    communitySlug: '',
    // slugAvailabilityStatusConstants
    communitySlugAvailabilityStatus: null,
    isUsingCustomSlug: false,
    isUsingExplicitGitHubProject: false,
    githubOrgId: null,
    githubRepoId: null,
    allowBadger: true,
    allowTweetBadger: true
  },

  initialize: function() {
    // user models
    this.peopleToInvite = new PeopleToInviteCollection();
    // { emailAddress }
    this.emailsToInvite = new Backbone.Collection();
  },

  reset: function(options) {
    // Get around the infinite recursion
    this.clear(options).set(_.omit(this.defaults, 'active'));
    this.peopleToInvite.reset([], options);
    this.emailsToInvite.reset([], options);
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

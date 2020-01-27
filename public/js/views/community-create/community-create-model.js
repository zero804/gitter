'use strict';

var Backbone = require('backbone');
var urlJoin = require('url-join');
var stepConstants = require('./step-constants');
var Promise = require('bluebird');

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
    selectedModel: null,
    allowBadger: true,
    allowTweetBadger: true
  },

  initialize: function(attrs, options) {
    this.orgs = options.orgs;
    this.repos = options.repos;
  },

  getSecurityData: function() {
    const selectedModel = this.get('selectedModel');
    const selectedType = selectedModel && selectedModel.get('type');
    const selectedLinkPath = (selectedModel && selectedModel.get('uri')) || '';

    if (selectedType) {
      return {
        type: selectedType,
        linkPath: selectedLinkPath
      };
    }

    return undefined; // No security info
  },

  getSerializedCreateData: function() {
    var security = this.getSecurityData();

    return {
      name: this.get('communityName'),
      uri: this.get('communitySlug'),
      security: security,
      addBadge: this.get('allowBadger'),
      allowTweeting: true
    };
  },

  refreshCollection: function(collection, data) {
    data.cb = Date.now();

    return new Promise(function(resolve, reject) {
      collection.fetch({
        reset: true,
        data: data,
        success: function() {
          resolve();
        },
        error: reject
      });
    });
  },

  refreshGitHubCollections: function(options) {
    var resetOrgs = !options;
    var resetRepos = !options || options.repo;
    return Promise.all([
      resetOrgs && this.refreshCollection(this.orgs, {}),
      resetRepos && this.refreshCollection(this.repos, { type: 'admin' })
    ]);
  },

  findGitHubObjectForSlug: function(slug) {
    if (!slug) {
      return {
        githubOrgId: null,
        githubRepoId: null
      };
    }

    slug = slug.toLowerCase();

    // TODO: Why does this match the first item always?
    var matchingOrgItem = this.orgs.filter(function(org) {
      return (org.get('name') || '').toLowerCase() === slug;
    })[0];

    if (matchingOrgItem) {
      return {
        githubOrgId: matchingOrgItem.get('id'),
        githubRepoId: null
      };
    }

    var matchingRepoItem = this.repos.filter(function(repo) {
      return (repo.get('uri') || '').toLowerCase() === slug;
    })[0];

    if (matchingRepoItem) {
      return {
        githubOrgId: null,
        githubRepoId: matchingRepoItem.get('id')
      };
    }

    return {
      githubOrgId: null,
      githubRepoId: null
    };
  },

  updateGitHubInfoToMatchSlug: function() {
    if (this.get('isUsingExplicitGitHubProject')) return;
    var communitySlug = this.get('communitySlug');
    var githubInfo = this.findGitHubObjectForSlug(communitySlug);
    this.set(githubInfo);
  }
});

module.exports = CommunityCreateModel;

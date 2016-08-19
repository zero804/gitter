'use strict';

// var _ = require('underscore');
var Backbone = require('backbone');
var urlJoin = require('url-join');
var stepConstants = require('./step-constants');
var apiClient = require('components/apiClient');

var peopleToInviteStatusConstants = require('./people-to-invite-status-constants');

var INVITE_STATUS_READY = peopleToInviteStatusConstants.READY;
var INVITE_STATUS_NEEDS_EMAIL = peopleToInviteStatusConstants.NEEDS_EMAIL;

function inviteNeedsEmailPredicate(invite) {
  return invite.get('inviteStatus') !== INVITE_STATUS_READY;
}

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

  initialize: function(attrs, options) {
    this.orgCollection = options.orgCollection;
    this.repoCollection = options.repoCollection;
    this.invites = new Backbone.Collection([]);
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
  },

  addInvitation: function(type, externalId, displayName, avatarUrl) {
    var id = type + ':' + externalId;
    if (this.invites.get(id)) {
      // Ignore
      return;
    }

    var inviteStatus = null;
    var emailAddress = null;

    if (type === 'email') {
      inviteStatus = INVITE_STATUS_READY;
      emailAddress = externalId;
    }

    var invite = this.invites.add({
      id: id,
      type: type,
      externalId: externalId,
      displayName: displayName,
      avatarUrl: avatarUrl,
      emailAddress: emailAddress,
      inviteStatus: inviteStatus
    });

    if (type !== 'email') {
      // Check if we need to capture the email address
      apiClient.priv.get('/check-invite', { type: type, externalId: externalId })
        .then(function(result) {
          invite.set({
            maskedEmail: result.email,
            inviteStatus: INVITE_STATUS_READY
          });
        })
        .catch(function() {
          invite.set('inviteStatus', INVITE_STATUS_NEEDS_EMAIL);
        });
    }

    return invite;
  },

  /**
   * Returns true if manual entry is required for some email addresses
   */
  hasInvitesRequiringEmailEntry: function() {
    // Are all invites set to 'ready?'
    return this.invites.some(inviteNeedsEmailPredicate);
  },

  getSecurityData: function() {
    var githubOrgId = this.get('githubOrgId');
    // Org based?
    if (githubOrgId) {
      var selectedOrg = this.orgCollection.get(githubOrgId);
      return {
        type: 'GH_ORG',
        linkPath: selectedOrg.get('name')
      }
    }

    // Repo based?
    var githubRepoId = this.get('githubRepoId');
    if (githubRepoId) {
      var selectedRepo = this.repoCollection.get(githubRepoId);
      return {
        type: 'GH_REPO',
        linkPath: selectedRepo.get('uri')
      }
    }
  },

  getInviteData: function() {
    return this.invites.map(function(item) {
      var attributes = item.attributes;
      return {
        type: attributes.type,
        externalId: attributes.externalId,
        emailAddress: attributes.emailAddress
      };
    });
  },

  getSerializedCreateData: function() {
    var security = this.getSecurityData();
    var invites = this.getInviteData();

    return {
      name: this.get('communityName'),
      uri: this.get('communitySlug'),
      security: security,
      invites: invites,
      addBadge: this.get('allowBadger'),
      allowTweeting: true
    };
  },
});

// Static Methods
CommunityCreateModel.inviteNeedsEmailPredicate = inviteNeedsEmailPredicate;

module.exports = CommunityCreateModel;

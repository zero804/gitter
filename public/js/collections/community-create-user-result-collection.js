'use strict';

var _ = require('underscore');
var ProxyCollection = require('backbone-proxy-collection');
var userSearchModels = require('collections/user-search');
var UserSuggestionCollection = require('collections/user-suggestions');

var _super = ProxyCollection.prototype;

var UserResultCollection = function(models, attrs, options) {
  if (!attrs || !attrs.stepViewModel) {
    throw new Error('A valid instance of CommunityCreateStepViewModel should be passed to a new UserResultCollection');
  }
  this.stepViewModel = attrs.stepViewModel;

  if (!attrs || !attrs.searchModel) {
    throw new Error('A valid instance of SearchModel should be passed to a new UserResultCollection');
  }
  this.searchModel = attrs.searchModel;

  if (!attrs || !attrs.communityCreateModel) {
    throw new Error('A valid instance of CommunityCreateModel should be passed to a new UserResultCollection');
  }

  this.communityCreateModel = attrs.communityCreateModel;

  this.userSearchCollection = new userSearchModels.Collection();
  this.userSuggestionCollection = new UserSuggestionCollection();

  attrs.collection = this.userSuggestionCollection;
  ProxyCollection.call(this, attrs, options);

  this.listenTo(this.stepViewModel, 'change:active', this.onActiveChange, this);
  this.listenTo(this.searchModel, 'change:searchInput', this.getResults, this);
  this.listenTo(this.communityCreateModel, 'change:communityName change:communitySlug change:githubOrgId', this.getResults, this);
};


_.extend(UserResultCollection.prototype, _super, {

  onActiveChange: function() {
    if(this.stepViewModel.get('active')) {
      this.fetchSuggestions();
    }
  },

  getResults: function() {
    if(this.stepViewModel.get('active')) {
      var searchInput = this.searchModel.get('searchInput');
      if(searchInput.length) {
        this.switchCollection(this.userSearchCollection);
        this.fetchUsers();
      }
      else {
        this.switchCollection(this.userSuggestionCollection);
      }
    }
  },

  fetchUsers: _.throttle(function() {
    var searchInput = this.searchModel.get('searchInput');
    this.userSearchCollection.fetch({
      data: {
          q: searchInput,
          limit: 12
        }
      },
      {
        add: true,
        remove: true,
        merge: true
      }
    );
  }, 300),


  fetchSuggestions: function() {
    var githubProjectInfo = this.communityCreateModel.getGithubProjectInfo();
    var type = null;

    if(this.communityCreateModel.get('githubOrgId')) {
      type = 'GH_ORG';
    } else if(this.communityCreateModel.get('githubRepoId')) {
      type = 'GH_REPO';
    }

    this.userSuggestionCollection.fetch({
      data: {
        type: type,
        linkPath: githubProjectInfo.name
      }
    });
  },

});

module.exports = UserResultCollection;

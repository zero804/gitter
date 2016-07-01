/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var $ = require('jquery');
var Backbone = require('backbone');
var context = require('utils/context');

var stepConstants = require('public/js/views/community-create/step-constants');
var CommunityCreateModel = require('public/js/views/community-create/community-create-model');
var CommunityCreateGitHubProjectsStepViewModel = require('public/js/views/community-create/github-projects-step/community-create-github-projects-step-view-model');
var GithubProjectsView = require('public/js/views/community-create/github-projects-step/community-creation-github-projects-view');

describe('community-creation-github-projects-view', function() {

  var communityCreateModel;
  var viewModel;
  var el;
  var view;

  var generateBeforeEachCb = function(newTroupeContext) {
    return function() {
      if(newTroupeContext) {
        context.testOnly.resetTroupeContext(newTroupeContext);
      }

      el = document.createElement('div');
      communityCreateModel = new CommunityCreateModel({
        active: true,
        stepState: stepConstants.GITHUB_PROJECTS
      });
      viewModel = new CommunityCreateGitHubProjectsStepViewModel({
        communityCreateModel: communityCreateModel,
        active: true
      });

      view = new GithubProjectsView({
        el: el,
        model: viewModel,
        communityCreateModel: communityCreateModel,
        orgCollection: new (Backbone.Collection.extend({
          defaults: {
            id: undefined,
            name: '',
            active: false
          },
          fetch: function() {}
        }))([
          {
            id: 4264183,
            name: 'troupe'
          },
          {
            id: 5990364,
            name: 'gitterHQ'
          }
        ]),
        repoCollection: new (Backbone.Collection.extend({
          fetch: function() {}
        }))([
          {
            id: 14522445,
            name: 'troupe/gitter-webapp'
          },
          {
            id: 14863998,
            name: 'gitterHQ/gitter'
          }
        ])
      });
      view.render();
    }
  };

  beforeEach(generateBeforeEachCb({
    user: {
      scopes: {
        'public_repo': true
      }
    }
  }));


  it('should have only one tab active at a time', function() {
    assert.strictEqual(viewModel.get('isOrgAreaActive'), true);
    assert.strictEqual(viewModel.get('isRepoAreaActive'), false);
    view.ui.reposToggle.trigger('click');
    assert.strictEqual(viewModel.get('isOrgAreaActive'), false);
    assert.strictEqual(viewModel.get('isRepoAreaActive'), true);
  });

  it('should move to main view after selecting org', function() {
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.GITHUB_PROJECTS);
    var orgItem = view.orgListView.children.findByIndex(0);
    $(orgItem.el).trigger('click');
    assert.strictEqual(viewModel.get('selectedOrgId'), orgItem.model.get('id'));
    assert.strictEqual(viewModel.get('selectedOrgName'), orgItem.model.get('name'));
    assert.strictEqual(communityCreateModel.get('githubOrgId'), orgItem.model.get('id'));
    assert.strictEqual(communityCreateModel.get('githubRepoId'), null);
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.MAIN);
  });

  it('should move to main view after selecting repo', function() {
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.GITHUB_PROJECTS);
    var repoItem = view.repoListView.children.findByIndex(0);
    // Make the repo tab active
    view.ui.reposToggle.trigger('click');
    // Click the repo item
    $(repoItem.el).trigger('click');
    assert.strictEqual(viewModel.get('selectedRepoId'), repoItem.model.get('id'));
    assert.strictEqual(viewModel.get('selectedRepoName'), repoItem.model.get('name'));
    assert.strictEqual(communityCreateModel.get('githubOrgId'), null);
    assert.strictEqual(communityCreateModel.get('githubRepoId'), repoItem.model.get('id'));
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.MAIN);
  });


  it('should move to main view after changing mind and choosing org', function() {
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.GITHUB_PROJECTS);
    var repoItem = view.repoListView.children.findByIndex(0);
    var orgItem = view.orgListView.children.findByIndex(0);
    // Make the repo tab active
    view.ui.reposToggle.trigger('click');
    // Click the repo item
    $(repoItem.el).trigger('click');
    // Make the org tab active
    view.ui.orgsToggle.trigger('click');
    // Click the org item
    $(orgItem.el).trigger('click');
    // Make sure the item on the other tab is inactive
    assert.strictEqual(repoItem.model.get('active'), false);

    // Assert the final state is in a good place
    assert.strictEqual(viewModel.get('selectedRepoId'), null);
    assert.strictEqual(viewModel.get('selectedRepoName'), null);
    assert.strictEqual(viewModel.get('selectedOrgId'), orgItem.model.get('id'));
    assert.strictEqual(viewModel.get('selectedOrgName'), orgItem.model.get('name'));
    assert.strictEqual(communityCreateModel.get('githubOrgId'), orgItem.model.get('id'));
    assert.strictEqual(communityCreateModel.get('githubRepoId'), null);
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.MAIN);
  });

  it('should move back to the main step after pressing skip', function() {
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.GITHUB_PROJECTS);
    view.ui.nextStep.trigger('click');
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.MAIN);
  });

  it('should move back to the main step after back', function() {
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.GITHUB_PROJECTS);
    view.ui.backStep.trigger('click');
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.MAIN);
  });



  describe('without private repo scope', function() {
    beforeEach(generateBeforeEachCb({
      user: {
        scopes: {
          'public_repo': true
        }
      }
    }));

    it('should show the private repo scope missing note', function() {
      assert.ok(view.ui.repoScopeMissingNote.children().length > 0);
    });
  });

  describe('with private repo scope', function() {
    beforeEach(generateBeforeEachCb({
      user: {
        scopes: {
          'private_repo': true,
          'public_repo': true
        }
      }
    }));

    it('should not show the private repo scope missing note', function() {
      assert.ok(view.ui.repoScopeMissingNote.children().length === 0);
    });
  });


});

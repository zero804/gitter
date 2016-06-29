/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var context = require('utils/context');

var stepConstants = require('public/js/views/community-create/step-constants');
var CommunityCreateModel = require('public/js/views/community-create/community-create-model');
var CommunityCreatMainStepViewModel = require('public/js/views/community-create/main-step/community-create-main-step-view-model');
var MainView = require('public/js/views/community-create/main-step/community-creation-main-view');

describe('community-creation-main-view', function() {

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
        stepState: stepConstants.MAIN
      });
      viewModel = new CommunityCreatMainStepViewModel({
        communityCreateModel: communityCreateModel,
        active: true
      });

      view = new MainView({
        el: el,
        model: viewModel,
        communityCreateModel: communityCreateModel,
        orgCollection: new Backbone.Collection(),
        repoCollection: new Backbone.Collection()
      });
      view.render();
    }
  };

  beforeEach(generateBeforeEachCb());


  it('should update slug when typing in the name input', function() {
    view.ui.communityNameInput.val('foo');
    view.ui.communityNameInput.trigger('input');
    assert.strictEqual(communityCreateModel.get('communitySlug'), 'foo');
  });

  it('should properly slugify name input', function() {
    view.ui.communityNameInput.val('foo bar');
    view.ui.communityNameInput.trigger('input');
    assert.strictEqual(communityCreateModel.get('communitySlug'), 'foo-bar');
  });

  it('should not update slug when typing in the name input after editing the slug', function() {
    view.ui.communityNameInput.val('foo');
    view.ui.communityNameInput.trigger('input');
    view.ui.communitySlugInput.val('bar');
    view.ui.communitySlugInput.trigger('input');
    assert.strictEqual(communityCreateModel.get('communityName'), 'foo');
    assert.strictEqual(communityCreateModel.get('communitySlug'), 'bar');

    view.ui.communityNameInput.val('foo-asdf');
    view.ui.communityNameInput.trigger('input');
    assert.strictEqual(communityCreateModel.get('communityName'), 'foo-asdf');
    assert.strictEqual(communityCreateModel.get('communitySlug'), 'bar');
  });


  it('should not move to the invite step if name/slug is not filled in', function() {
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.MAIN);
    view.ui.nextStep.trigger('click');
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.MAIN);
  });

  it('should move to the invite step when things are valid', function() {
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.MAIN);
    view.ui.communityNameInput.val('foo');
    view.ui.communityNameInput.trigger('input');
    view.ui.communitySlugInput.val('bar');
    view.ui.communitySlugInput.trigger('input');
    view.ui.nextStep.trigger('click');
    assert.strictEqual(communityCreateModel.get('stepState'), stepConstants.INVITE);
  });


  describe('with GitHub user', function() {
    beforeEach(generateBeforeEachCb({
      user: {
        providers: [
          'github'
        ]
      }
    }));

    it('should show the associated project area', function() {
      assert.ok(view.ui.githubProjectLink.length > 0);
    });
  });

  describe('with non-GitHub user', function() {
    beforeEach(generateBeforeEachCb({
      user: {
        providers: [
          'twitter'
        ]
      }
    }));

    it('should not show the associated project area', function() {
      assert.strictEqual(view.ui.githubProjectLink.length, 0);
    });
  });

});
